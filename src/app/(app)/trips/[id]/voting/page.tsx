import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import ItineraryItemDetails from "@/components/itinerary-item-details";
import {
  clearSuggestionVote,
  scheduleSuggestion,
  setSuggestionVote,
} from "../itinerary/actions";
import {
  formatTripDay,
  getItemAuthor,
  getItineraryTypeLabel,
  getTripDates,
  type ItineraryItem,
  type ItineraryVote,
  type ProfileSummary,
  type SuggestionReaction,
} from "@/lib/itinerary";

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
    label: "Don't want to go",
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

export default async function VotingPage({
  params,
  searchParams,
}: VotingPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const supabase =
    await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  // Load trip
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
    redirect("/dashboard");
  }

  if (trip.trip_type !== "group") {
    redirect(
      `/trips/${trip.id}/itinerary`
    );
  }

  const isTripCreator =
    trip.owner_id === userId;

  /*
   * Load suggestions without embedded profile joins.
   */
  const {
    data: rawSuggestionData,
    error: suggestionError,
  } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", trip.id)
    .eq(
      "planning_status",
      "suggested"
    )
    .order("created_at", {
      ascending: true,
    });

  if (suggestionError) {
    console.error(
      "Failed to load suggestions:",
      suggestionError
    );
  }

  const rawSuggestions =
    (rawSuggestionData ??
      []) as ItineraryItem[];

  // Load authors separately
  const authorIds = [
    ...new Set(
      rawSuggestions.map(
        (item) => item.created_by
      )
    ),
  ];

  const authorMap =
    new Map<
      string,
      ProfileSummary
    >();

  if (authorIds.length > 0) {
    const {
      data: profiles,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username"
      )
      .in("id", authorIds);

    if (profileError) {
      console.error(
        "Failed to load suggestion authors:",
        profileError
      );
    } else {
      profiles?.forEach(
        (profile) => {
          authorMap.set(
            profile.id,
            {
              display_name:
                profile.display_name ??
                "Traveller",

              username:
                profile.username ??
                null,
            }
          );
        }
      );
    }
  }

  const suggestions: ItineraryItem[] =
    rawSuggestions.map(
      (item) => ({
        ...item,

        author:
          authorMap.get(
            item.created_by
          ) ?? null,
      })
    );

  // Load votes
  let votes: ItineraryVote[] =
    [];

  let voteErrorMessage:
    | string
    | null = null;

  if (suggestions.length > 0) {
    const {
      data: voteData,
      error: voteError,
    } = await supabase
      .from("itinerary_votes")
      .select(
        "item_id, user_id, reaction, preferred_date"
      )
      .in(
        "item_id",
        suggestions.map(
          (item) => item.id
        )
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

  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <BackButton
          fallbackHref={`/trips/${trip.id}/itinerary`}
        />

        {/* Heading */}
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
                React to suggestions
                and choose which day
                you&apos;d prefer.
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

        {/* Error */}
        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {/* Success */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Loading error */}
        {suggestionError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            Unable to load suggestions:{" "}
            {suggestionError.message}
          </div>
        )}

        {voteErrorMessage && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Suggestions loaded, but
            votes could not be loaded.
          </div>
        )}

        {/* Empty */}
        {!suggestionError &&
        suggestions.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
            <h2 className="font-semibold text-ink">
              Nothing to vote on
            </h2>

            <p className="mt-2 text-sm text-muted">
              Add a suggestion to start
              the discussion.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {suggestions.map(
              (item) => {
                const author =
                  getItemAuthor(item);

                const itemVotes =
                  votes.filter(
                    (vote) =>
                      vote.item_id ===
                      item.id
                  );

                const currentVote =
                  itemVotes.find(
                    (vote) =>
                      vote.user_id ===
                      userId
                  );

                const dayCounts =
                  new Map<
                    string,
                    number
                  >();

                itemVotes.forEach(
                  (vote) => {
                    if (
                      !vote.preferred_date
                    ) {
                      return;
                    }

                    dayCounts.set(
                      vote.preferred_date,
                      (dayCounts.get(
                        vote.preferred_date
                      ) ?? 0) + 1
                    );
                  }
                );

                return (
                  <article
                    key={item.id}
                    id={`item-${item.id}`}
                    className="scroll-mt-28 rounded-2xl border border-line bg-surface p-6 sm:p-8"
                  >
                    {/* Suggestion heading */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                          {getItineraryTypeLabel(
                            item.item_type
                          )}
                        </span>

                        <h2 className="mt-4 text-xl font-semibold text-ink">
                          {item.title}
                        </h2>

                        <p className="mt-1 text-xs text-subtle">
                          Suggested by{" "}
                          {author?.display_name ??
                            "Traveller"}

                          {author?.username
                            ? ` (@${author.username})`
                            : ""}
                        </p>
                      </div>

                      {(isTripCreator ||
                        (
                            item.origin === "suggestion" &&
                            item.created_by === userId
                        )) && (
                        <Link
                            href={`/trips/${trip.id}/itinerary/edit/${item.id}`}
                            className="text-sm font-medium text-brand-700"
                        >
                            Edit details
                        </Link>
                    )}
                    </div>

                    <ItineraryItemDetails
                      item={item}
                    />

                    {/* Results */}
                    <div className="mt-6 border-t border-line pt-6">
                      <h3 className="text-sm font-semibold text-ink">
                        Reactions
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {reactions.map(
                          (reaction) => {
                            const count =
                              itemVotes.filter(
                                (vote) =>
                                  vote.reaction ===
                                  reaction.value
                              ).length;

                            return (
                              <span
                                key={
                                  reaction.value
                                }
                                className="rounded-full border border-line bg-surface-soft px-3 py-1.5 text-sm text-muted"
                              >
                                {
                                  reaction.symbol
                                }{" "}
                                {
                                  reaction.label
                                }{" "}
                                {count}
                              </span>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* User vote */}
                    <form
                      action={
                        setSuggestionVote
                      }
                      className="mt-6 rounded-2xl border border-line bg-surface-soft p-5"
                    >
                      <input
                        type="hidden"
                        name="tripId"
                        value={trip.id}
                      />

                      <input
                        type="hidden"
                        name="itemId"
                        value={item.id}
                      />

                      <h3 className="font-semibold text-ink">
                        Your vote
                      </h3>

                      {/* Preferred day */}
                      <div className="mt-4">
                        <label
                          htmlFor={`preferredDate-${item.id}`}
                          className="mb-1.5 block text-sm font-medium text-ink"
                        >
                          Preferred day
                        </label>

                        <select
                          id={`preferredDate-${item.id}`}
                          name="preferredDate"
                          defaultValue={
                            currentVote?.preferred_date ??
                            ""
                          }
                          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:max-w-sm"
                        >
                          <option value="">
                            No preference
                          </option>

                          {tripDates.map(
                            (
                              date,
                              index
                            ) => (
                              <option
                                key={date}
                                value={date}
                              >
                                Day{" "}
                                {index + 1} —{" "}
                                {formatTripDay(
                                  date
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* Reactions */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {reactions.map(
                          (reaction) => {
                            const active =
                              currentVote?.reaction ===
                              reaction.value;

                            return (
                              <button
                                key={
                                  reaction.value
                                }
                                type="submit"
                                name="reaction"
                                value={
                                  reaction.value
                                }
                                className={
                                  active
                                    ? "cursor-pointer rounded-xl border border-brand-500 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700"
                                    : "cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
                                }
                              >
                                {
                                  reaction.symbol
                                }{" "}
                                {
                                  reaction.label
                                }
                              </button>
                            );
                          }
                        )}
                      </div>
                    </form>

                    {/* Clear vote */}
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
                          value={trip.id}
                        />

                        <input
                          type="hidden"
                          name="itemId"
                          value={item.id}
                        />

                        <button
                          type="submit"
                          className="cursor-pointer text-xs font-medium text-muted hover:text-ink"
                        >
                          Clear my vote
                        </button>
                      </form>
                    )}

                    {/* Preferred days */}
                    {dayCounts.size > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-ink">
                          Preferred days
                        </h3>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {tripDates.map(
                            (
                              date,
                              index
                            ) => {
                              const count =
                                dayCounts.get(
                                  date
                                ) ?? 0;

                              if (
                                count === 0
                              ) {
                                return null;
                              }

                              return (
                                <span
                                  key={date}
                                  className="rounded-full border border-line bg-surface-soft px-3 py-1.5 text-sm text-muted"
                                >
                                  Day{" "}
                                  {index + 1}:{" "}
                                  {count}
                                </span>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trip creator decision */}
                    {isTripCreator && (
                      <div className="mt-8 border-t border-line pt-6">
                        <h3 className="font-semibold text-ink">
                          Add to itinerary
                        </h3>

                        <p className="mt-1 text-sm text-muted">
                          Once the group
                          has decided,
                          move this option
                          into the
                          confirmed plan.
                        </p>

                        <form
                          action={
                            scheduleSuggestion
                          }
                          className="mt-5"
                        >
                          <input
                            type="hidden"
                            name="tripId"
                            value={trip.id}
                          />

                          <input
                            type="hidden"
                            name="itemId"
                            value={item.id}
                          />

                          {/* Activity scheduling */}
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
                                    ""
                                  }
                                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none"
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
                                    ) ?? ""
                                  }
                                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none"
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
                                    ) ?? ""
                                  }
                                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none"
                                />
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                          >
                            Add to itinerary
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}