import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import ItineraryItemDetails from "@/components/itinerary-item-details";
import PersonName from "@/components/person-name";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  clearSuggestionVote,
  scheduleSuggestion,
} from "../itinerary/actions";

import {
  setSuggestionDecision,
} from "./actions";

import {
  formatTripDay,
  getItemAuthor,
  getItineraryTypeLabel,
  getSuggestionDisplayStatus,
  getSuggestionStatusLabel,
  getTripDates,
  type ItineraryItem,
  type ItineraryVote,
  type ProfileSummary,
  type SuggestionReaction,
} from "@/lib/itinerary";

import SuggestionVoteControls from "@/components/suggestion-vote-controls";

type VotingPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const reactions: {
  value: SuggestionReaction;
  symbol: string;
  label: string;
}[] = [
  {
    value: "yes",
    symbol: "👍",
    label: "Want to go",
  },
  {
    value: "no",
    symbol: "👎",
    label:
      "Don't want to go",
  },
  {
    value: "not_sure",
    symbol: "?",
    label: "Not sure",
  },
  {
    value: "dont_mind",
    symbol: "↔",
    label: "Don't mind",
  },
];

type VoteStats = {
  yes: number;
  no: number;
  notSure: number;
  dontMind: number;
  total: number;
};

function getVoteStats(
  votes: ItineraryVote[]
): VoteStats {
  return {
    yes:
      votes.filter(
        (vote) =>
          vote.reaction ===
          "yes"
      ).length,

    no:
      votes.filter(
        (vote) =>
          vote.reaction ===
          "no"
      ).length,

    notSure:
      votes.filter(
        (vote) =>
          vote.reaction ===
          "not_sure"
      ).length,

    dontMind:
      votes.filter(
        (vote) =>
          vote.reaction ===
          "dont_mind"
      ).length,

    total:
      votes.length,
  };
}

function statusClasses(
  status:
    | "suggested"
    | "accepted"
    | "rejected"
    | "archived"
) {
  if (
    status ===
      "suggested" ||
    status ===
      "accepted"
  ) {
    return "border-brand-500 bg-brand-50 text-brand-700";
  }

  if (
    status ===
    "rejected"
  ) {
    return "border-danger-border bg-danger-surface text-danger-text";
  }

  return "border-line bg-surface-soft text-muted";
}

export default async function VotingPage({
  params,
  searchParams,
}: VotingPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  // Trip
  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      trip_type,
      owner_id,
      start_date,
      end_date
    `)
    .eq("id", id)
    .maybeSingle();

  if (tripError) {
    console.error(
      "Failed to load voting trip:",
      tripError
    );
  }

  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  // Store the confirmed trip ID so nested
  // helper functions retain TypeScript narrowing.
  const tripId =
    trip.id;

  if (
    trip.trip_type !==
    "group"
  ) {
    redirect(
      `/trips/${tripId}/itinerary`
    );
  }

  const isTripCreator =
    trip.owner_id ===
    userId;

  // Keep every suggestion so accepted,
  // rejected and archived history remains visible.
  const {
    data: rawSuggestionData,
    error: suggestionError,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .select("*")
    .eq(
      "trip_id",
      trip.id
    )
    .eq(
      "origin",
      "suggestion"
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (suggestionError) {
    console.error(
      "Failed to load suggestions:",
      suggestionError
    );
  }

  const rawSuggestions =
    (rawSuggestionData ??
      []) as ItineraryItem[];

  const suggestionIds =
    rawSuggestions.map(
      (item) =>
        item.id
    );

  // Votes remain visible after a decision.
  let votes:
    ItineraryVote[] = [];

  let voteErrorMessage:
    | string
    | null = null;

  if (
    suggestionIds.length >
    0
  ) {
    const {
      data: voteData,
      error: voteError,
    } = await supabase
      .from(
        "itinerary_votes"
      )
      .select(`
        item_id,
        user_id,
        reaction,
        preferred_date
      `)
      .in(
        "item_id",
        suggestionIds
      );

    if (voteError) {
      console.error(
        "Failed to load suggestion votes:",
        voteError
      );

      voteErrorMessage =
        voteError.message;
    } else {
      votes =
        (voteData ??
          []) as ItineraryVote[];
    }
  }

  // Load both suggestion authors
  // and everyone who voted.
  const profileIds = [
    ...new Set([
      ...rawSuggestions.map(
        (item) =>
          item.created_by
      ),

      ...votes.map(
        (vote) =>
          vote.user_id
      ),
    ]),
  ];

  const profileMap =
    new Map<
      string,
      ProfileSummary
    >();

  if (
    profileIds.length >
    0
  ) {
    const {
      data: profiles,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        username,
        avatar_url
      `)
      .in(
        "id",
        profileIds
      );

    if (profileError) {
      console.error(
        "Failed to load voting profiles:",
        profileError
      );
    }

    profiles?.forEach(
      (profile) => {
        profileMap.set(
          profile.id,
          {
            display_name:
              profile.display_name ??
              "Traveller",

            username:
              profile.username ??
              null,

            avatar_url:
              profile.avatar_url ??
              null,
          }
        );
      }
    );
  }

  const suggestions:
    ItineraryItem[] =
    rawSuggestions.map(
      (item) => ({
        ...item,

        author:
          profileMap.get(
            item.created_by
          ) ?? null,
      })
    );

  const votesByItem =
    new Map<
      string,
      ItineraryVote[]
    >();

  votes.forEach(
    (vote) => {
      const current =
        votesByItem.get(
          vote.item_id
        ) ?? [];

      current.push(
        vote
      );

      votesByItem.set(
        vote.item_id,
        current
      );
    }
  );

  const activeSuggestions =
    suggestions
      .filter(
        (item) =>
          item.planning_status ===
          "suggested"
      )
      .sort(
        (a, b) => {
          const aStats =
            getVoteStats(
              votesByItem.get(
                a.id
              ) ?? []
            );

          const bStats =
            getVoteStats(
              votesByItem.get(
                b.id
              ) ?? []
            );

          // Most Want to go votes first.
          if (
            aStats.yes !==
            bStats.yes
          ) {
            return (
              bStats.yes -
              aStats.yes
            );
          }

          // Fewer Don't want votes wins tie.
          if (
            aStats.no !==
            bStats.no
          ) {
            return (
              aStats.no -
              bStats.no
            );
          }

          // Then most responses.
          if (
            aStats.total !==
            bStats.total
          ) {
            return (
              bStats.total -
              aStats.total
            );
          }

          return a.created_at.localeCompare(
            b.created_at
          );
        }
      );

  const acceptedSuggestions =
    suggestions.filter(
      (item) =>
        item.planning_status ===
        "planned"
    );

  const rejectedSuggestions =
    suggestions.filter(
      (item) =>
        item.planning_status ===
        "rejected"
    );

  const archivedSuggestions =
    suggestions.filter(
      (item) =>
        item.planning_status ===
        "archived"
    );

  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );

  function getName(
    profileId: string
  ) {
    return (
      profileMap.get(
        profileId
      )?.display_name ??
      "Traveller"
    );
  }

  function getAvatarUrl(
    profileId: string
  ) {
    return (
      profileMap.get(
        profileId
      )?.avatar_url ??
      null
    );
  }

  function renderVoteBreakdown(
    itemVotes:
      ItineraryVote[]
  ) {
    if (
      itemVotes.length ===
      0
    ) {
      return (
        <p className="text-sm text-muted">
          Nobody has voted yet.
        </p>
      );
    }

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {reactions.map(
          (reaction) => {
            const matchingVotes =
              itemVotes.filter(
                (vote) =>
                  vote.reaction ===
                  reaction.value
              );

            return (
              <div
                key={
                  reaction.value
                }
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">
                    {
                      reaction.symbol
                    }{" "}
                    {
                      reaction.label
                    }
                  </p>

                  <span className="text-sm font-semibold text-ink">
                    {
                      matchingVotes.length
                    }
                  </span>
                </div>

                {matchingVotes.length >
                0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matchingVotes.map(
                      (vote) => (
                        <PersonName
                          key={
                            vote.user_id
                          }
                          userId={
                            vote.user_id
                          }
                          currentUserId={
                            userId
                          }
                          displayName={getName(
                            vote.user_id
                          )}
                          avatarUrl={getAvatarUrl(
                            vote.user_id
                          )}
                          highlightCurrentUser
                          variant="badge"
                          className="text-xs"
                        />
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-subtle">
                    No votes
                  </p>
                )}
              </div>
            );
          }
        )}
      </div>
    );
  }

  function renderPreferredDays(
    itemVotes:
      ItineraryVote[]
  ) {
    const dayVotes =
      tripDates.map(
        (
          date,
          index
        ) => {
          const matching =
            itemVotes.filter(
              (vote) =>
                vote.preferred_date ===
                date
            );

          return {
            date,
            index,
            votes:
              matching,
          };
        }
      );

    const highestCount =
      Math.max(
        0,
        ...dayVotes.map(
          (day) =>
            day.votes.length
        )
      );

    const usedDays =
      dayVotes.filter(
        (day) =>
          day.votes.length >
          0
      );

    if (
      usedDays.length ===
      0
    ) {
      return (
        <p className="text-sm text-muted">
          No preferred days have
          been chosen yet.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {usedDays.map(
          (day) => {
            const top =
              day.votes.length ===
              highestCount;

            return (
              <div
                key={
                  day.date
                }
                className={`rounded-xl border p-4 ${
                  top
                    ? "border-brand-500 bg-brand-50"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Day{" "}
                      {day.index +
                        1}
                    </p>

                    <p className="mt-0.5 text-xs text-muted">
                      {formatTripDay(
                        day.date
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {top && (
                      <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-brand-contrast">
                        Top
                        choice
                      </span>
                    )}

                    <span className="text-sm font-semibold text-ink">
                      {
                        day.votes
                          .length
                      }{" "}
                      {day.votes
                        .length ===
                      1
                        ? "vote"
                        : "votes"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {day.votes.map(
                    (vote) => (
                      <PersonName
                        key={
                          vote.user_id
                        }
                        userId={
                          vote.user_id
                        }
                        currentUserId={
                          userId
                        }
                        displayName={getName(
                          vote.user_id
                        )}
                        highlightCurrentUser
                        variant="badge"
                        className="text-xs"
                      />
                    )
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    );
  }

  function renderHistoricalCard(
    item: ItineraryItem
  ) {
    const itemVotes =
      votesByItem.get(
        item.id
      ) ?? [];

    const stats =
      getVoteStats(
        itemVotes
      );

    const status =
      getSuggestionDisplayStatus(
        item
      );

    if (!status) {
      return null;
    }

    const author =
      getItemAuthor(
        item
      );

    return (
      <details
        key={item.id}
        id={`item-${item.id}`}
        className="group scroll-mt-40 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                  status
                )}`}
              >
                {getSuggestionStatusLabel(
                  status
                )}
              </span>

              <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                {getItineraryTypeLabel(
                  item.item_type
                )}
              </span>
            </div>

            <h3 className="mt-3 font-semibold text-ink">
              {item.title}
            </h3>

            <p className="mt-1 flex items-center gap-1 text-xs text-subtle">
              <span>
                Suggested by
              </span>

              <PersonName
                userId={
                  item.created_by
                }
                currentUserId={
                  userId
                }
                displayName={
                  author?.display_name ??
                  "Traveller"
                }
                avatarUrl={
                  author?.avatar_url ??
                  null
                }
                highlightCurrentUser
              />
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <span className="text-xs text-muted">
              👍{" "}
              {stats.yes}
              {" · "}
              👎{" "}
              {stats.no}
            </span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5 text-muted transition-transform group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </summary>

        <div className="border-t border-line p-5 sm:p-6">
          <ItineraryItemDetails
            item={item}
          />

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-ink">
              Final vote breakdown
            </h4>

            <div className="mt-3">
              {renderVoteBreakdown(
                itemVotes
              )}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-ink">
              Preferred days
            </h4>

            <div className="mt-3">
              {renderPreferredDays(
                itemVotes
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            {status ===
              "accepted" && (
              <Link
                href={`/trips/${tripId}/itinerary`}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
              >
                View in
                itinerary
              </Link>
            )}

            {isTripCreator &&
              status !==
                "accepted" && (
                <>
                  <form
                    action={
                      setSuggestionDecision
                    }
                  >
                    <input
                      type="hidden"
                      name="tripId"
                      value={
                        tripId
                      }
                    />

                    <input
                      type="hidden"
                      name="itemId"
                      value={
                        item.id
                      }
                    />

                    <input
                      type="hidden"
                      name="decision"
                      value="suggested"
                    />

                    <button
                      type="submit"
                      className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                    >
                      Restore
                      to voting
                    </button>
                  </form>

                  {status ===
                    "rejected" && (
                    <form
                      action={
                        setSuggestionDecision
                      }
                    >
                      <input
                        type="hidden"
                        name="tripId"
                        value={
                          tripId
                        }
                      />

                      <input
                        type="hidden"
                        name="itemId"
                        value={
                          item.id
                        }
                      />

                      <input
                        type="hidden"
                        name="decision"
                        value="archived"
                      />

                      <button
                        type="submit"
                        className="cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink"
                      >
                        Archive
                      </button>
                    </form>
                  )}

                  {status ===
                    "archived" && (
                    <form
                      action={
                        setSuggestionDecision
                      }
                    >
                      <input
                        type="hidden"
                        name="tripId"
                        value={
                          tripId
                        }
                      />

                      <input
                        type="hidden"
                        name="itemId"
                        value={
                          item.id
                        }
                      />

                      <input
                        type="hidden"
                        name="decision"
                        value="rejected"
                      />

                      <button
                        type="submit"
                        className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-4 py-2.5 text-sm font-medium text-danger-text"
                      >
                        Mark
                        rejected
                      </button>
                    </form>
                  )}
                </>
              )}
          </div>
        </div>
      </details>
    );
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <BackButton
          fallbackHref={`/trips/${trip.id}/itinerary`}
        />

        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                {trip.name}
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                Group voting
              </h1>

              <p className="mt-2 max-w-2xl text-muted">
                Vote on ideas,
                compare the group&apos;s
                preferences and turn
                the best suggestions
                into confirmed plans.
              </p>
            </div>

            <Link
              href={`/trips/${trip.id}/itinerary/new?mode=suggested&type=activity`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
            >
              Add suggestion
            </Link>
          </div>
        </header>

        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {suggestionError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            Unable to load
            suggestions:{" "}
            {
              suggestionError.message
            }
          </div>
        )}

        {voteErrorMessage && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Suggestions loaded, but
            votes could not be
            loaded.
          </div>
        )}

        {/* Overview */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Voting
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                activeSuggestions.length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Accepted
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                acceptedSuggestions.length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Rejected
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                rejectedSuggestions.length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Archived
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                archivedSuggestions.length
              }
            </p>
          </div>
        </section>

        {/* Active voting */}
        <section className="mt-12">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Open for voting
            </h2>

            <p className="mt-1 text-sm text-muted">
              Ranked first by
              Want to go votes,
              then by fewer negative
              votes and overall
              participation.
            </p>
          </div>

          {activeSuggestions.length ===
          0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center">
              <h3 className="font-semibold text-ink">
                Nothing to vote on
              </h3>

              <p className="mt-2 text-sm text-muted">
                Add a suggestion to
                start the discussion.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {activeSuggestions.map(
                (
                  item,
                  index
                ) => {
                  const author =
                    getItemAuthor(
                      item
                    );

                  const itemVotes =
                    votesByItem.get(
                      item.id
                    ) ?? [];

                  const stats =
                    getVoteStats(
                      itemVotes
                    );

                  const currentVote =
                    itemVotes.find(
                      (vote) =>
                        vote.user_id ===
                        userId
                    );

                  const currentReaction =
                    reactions.find(
                      (reaction) =>
                        reaction.value ===
                        currentVote?.reaction
                    );

                  const dayCounts =
                    tripDates.map(
                      (
                        date,
                        dayIndex
                      ) => ({
                        date,
                        dayIndex,

                        count:
                          itemVotes.filter(
                            (vote) =>
                              vote.preferred_date ===
                              date
                          ).length,
                      })
                    );

                  const highestDayCount =
                    Math.max(
                      0,
                      ...dayCounts.map(
                        (day) =>
                          day.count
                      )
                    );

                  const topDays =
                    dayCounts.filter(
                      (day) =>
                        day.count >
                          0 &&
                        day.count ===
                          highestDayCount
                    );

                  const canEditItem =
                    isTripCreator ||
                    item.created_by ===
                      userId;

                  return (
                    <details
                      key={
                        item.id
                      }
                      id={`item-${item.id}`}
                      open={
                        index === 0
                      }
                      className="group scroll-mt-40 overflow-hidden rounded-2xl border border-line bg-surface"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {index ===
                              0 && (
                              <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-brand-contrast">
                                Top
                                suggestion
                              </span>
                            )}

                            <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                              Voting
                            </span>

                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                              {getItineraryTypeLabel(
                                item.item_type
                              )}
                            </span>
                          </div>

                          <h3 className="mt-3 text-xl font-semibold text-ink">
                            {
                              item.title
                            }
                          </h3>

                          <p className="mt-1 text-xs text-subtle">
                            Suggested
                            by{" "}
                            {author?.display_name ??
                              "Traveller"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-muted">
                              👍{" "}
                              {
                                stats.yes
                              }
                            </span>

                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-muted">
                              👎{" "}
                              {
                                stats.no
                              }
                            </span>

                            {currentReaction && (
                              <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                                Your
                                vote:{" "}
                                {
                                  currentReaction.symbol
                                }{" "}
                                {
                                  currentReaction.label
                                }
                              </span>
                            )}

                            {topDays.length >
                              0 && (
                              <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-muted">
                                Top
                                day:{" "}
                                {topDays
                                  .map(
                                    (
                                      day
                                    ) =>
                                      `Day ${
                                        day.dayIndex +
                                        1
                                      }`
                                  )
                                  .join(
                                    " / "
                                  )}
                              </span>
                            )}
                          </div>
                        </div>

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>

                      <div className="border-t border-line p-5 sm:p-6">
                        <div className="flex justify-end">
                          {canEditItem && (
                            <Link
                              href={`/trips/${trip.id}/itinerary/edit/${item.id}`}
                              className="text-sm font-medium text-brand-700"
                            >
                              Edit
                              details
                            </Link>
                          )}
                        </div>

                        <ItineraryItemDetails
                          item={
                            item
                          }
                        />

                        {/* Detailed reactions */}
                        <div className="mt-8 border-t border-line pt-6">
                          <h4 className="font-semibold text-ink">
                            Who
                            voted
                            what
                          </h4>

                          <div className="mt-4">
                            {renderVoteBreakdown(
                              itemVotes
                            )}
                          </div>
                        </div>

                        {/* Preferred days */}
                        <div className="mt-8 border-t border-line pt-6">
                          <h4 className="font-semibold text-ink">
                            Preferred
                            days
                          </h4>

                          <div className="mt-4">
                            {renderPreferredDays(
                              itemVotes
                            )}
                          </div>
                        </div>

                        {/* Current user's vote */}
                        <SuggestionVoteControls
                          tripId={
                            tripId
                          }
                          itemId={
                            item.id
                          }
                          tripDates={
                            tripDates
                          }
                          currentVote={
                            currentVote
                              ? {
                                  reaction:
                                    currentVote.reaction,

                                  preferred_date:
                                    currentVote.preferred_date,
                                }
                              : null
                          }
                        />

                        {currentVote && (
                          <form
                            action={
                              clearSuggestionVote
                            }
                            className="mt-2"
                          >
                            <input
                              type="hidden"
                              name="tripId"
                              value={
                                trip.id
                              }
                            />

                            <input
                              type="hidden"
                              name="itemId"
                              value={
                                item.id
                              }
                            />

                            <button
                              type="submit"
                              className="cursor-pointer text-xs font-medium text-muted hover:text-ink"
                            >
                              Clear
                              my vote
                            </button>
                          </form>
                        )}

                        {/* Creator decision */}
                        {isTripCreator && (
                          <div className="mt-8 border-t border-line pt-6">
                            <h4 className="font-semibold text-ink">
                              Group
                              decision
                            </h4>

                            <p className="mt-1 text-sm text-muted">
                              Accept
                              this
                              suggestion
                              into the
                              trip,
                              reject it
                              or archive
                              it for
                              later.
                            </p>

                            <div className="mt-5 space-y-5">
                              {/* Accept */}
                              <form
                                action={
                                  scheduleSuggestion
                                }
                                className="rounded-xl border border-line bg-surface-soft p-4"
                              >
                                <input
                                  type="hidden"
                                  name="tripId"
                                  value={
                                    trip.id
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="itemId"
                                  value={
                                    item.id
                                  }
                                />

                                {item.item_type ===
                                  "activity" && (
                                  <div className="mb-4 grid gap-4 sm:grid-cols-3">
                                    <div>
                                      <label
                                        htmlFor={`scheduledDate-${item.id}`}
                                        className="mb-1.5 block text-sm font-medium text-ink"
                                      >
                                        Day
                                      </label>

                                      <input
                                        id={`scheduledDate-${item.id}`}
                                        name="scheduledDate"
                                        type="date"
                                        required
                                        min={
                                          trip.start_date
                                        }
                                        max={
                                          trip.end_date
                                        }
                                        defaultValue={
                                          item.scheduled_date ??
                                          currentVote?.preferred_date ??
                                          topDays[0]?.date ??
                                          ""
                                        }
                                        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label
                                        htmlFor={`startTime-${item.id}`}
                                        className="mb-1.5 block text-sm font-medium text-ink"
                                      >
                                        Start
                                      </label>

                                      <input
                                        id={`startTime-${item.id}`}
                                        name="startTime"
                                        type="time"
                                        defaultValue={
                                          item.start_time?.slice(
                                            0,
                                            5
                                          ) ??
                                          ""
                                        }
                                        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label
                                        htmlFor={`endTime-${item.id}`}
                                        className="mb-1.5 block text-sm font-medium text-ink"
                                      >
                                        End
                                      </label>

                                      <input
                                        id={`endTime-${item.id}`}
                                        name="endTime"
                                        type="time"
                                        defaultValue={
                                          item.end_time?.slice(
                                            0,
                                            5
                                          ) ??
                                          ""
                                        }
                                        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none"
                                      />
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                                >
                                  Accept
                                  into
                                  itinerary
                                </button>
                              </form>

                              <div className="flex flex-wrap gap-3">
                                <form
                                  action={
                                    setSuggestionDecision
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="tripId"
                                    value={
                                      trip.id
                                    }
                                  />

                                  <input
                                    type="hidden"
                                    name="itemId"
                                    value={
                                      item.id
                                    }
                                  />

                                  <input
                                    type="hidden"
                                    name="decision"
                                    value="rejected"
                                  />

                                  <ConfirmActionButton
                                    message={`Reject "${item.title}"? Votes will be kept in the decision history.`}
                                    className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-4 py-2.5 text-sm font-medium text-danger-text"
                                  >
                                    Reject
                                  </ConfirmActionButton>
                                </form>

                                <form
                                  action={
                                    setSuggestionDecision
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="tripId"
                                    value={
                                      trip.id
                                    }
                                  />

                                  <input
                                    type="hidden"
                                    name="itemId"
                                    value={
                                      item.id
                                    }
                                  />

                                  <input
                                    type="hidden"
                                    name="decision"
                                    value="archived"
                                  />

                                  <button
                                    type="submit"
                                    className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-hover"
                                  >
                                    Archive
                                  </button>
                                </form>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* Accepted */}
        {acceptedSuggestions.length >
          0 && (
          <details className="group mt-12 overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden sm:p-6">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Accepted
                </h2>

                <p className="mt-1 text-sm text-muted">
                  {
                    acceptedSuggestions.length
                  }{" "}
                  added to the
                  itinerary
                </p>
              </div>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 text-muted transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>

            <div className="space-y-3 border-t border-line p-5 sm:p-6">
              {acceptedSuggestions.map(
                renderHistoricalCard
              )}
            </div>
          </details>
        )}

        {/* Rejected */}
        {rejectedSuggestions.length >
          0 && (
          <details className="group mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden sm:p-6">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Rejected
                </h2>

                <p className="mt-1 text-sm text-muted">
                  {
                    rejectedSuggestions.length
                  }{" "}
                  declined ideas
                </p>
              </div>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 text-muted transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>

            <div className="space-y-3 border-t border-line p-5 sm:p-6">
              {rejectedSuggestions.map(
                renderHistoricalCard
              )}
            </div>
          </details>
        )}

        {/* Archived */}
        {archivedSuggestions.length >
          0 && (
          <details className="group mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden sm:p-6">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Archived
                </h2>

                <p className="mt-1 text-sm text-muted">
                  {
                    archivedSuggestions.length
                  }{" "}
                  saved for later
                </p>
              </div>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 text-muted transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>

            <div className="space-y-3 border-t border-line p-5 sm:p-6">
              {archivedSuggestions.map(
                renderHistoricalCard
              )}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}