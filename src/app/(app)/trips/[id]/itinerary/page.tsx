import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import BackButton from "@/components/back-button";
import ItineraryItemDetails from "@/components/itinerary-item-details";
import ItineraryPlan from "@/components/itinerary-plan";

import {
  ItineraryWeatherNotice,
  TripWeatherProvider,
} from "@/components/trip-weather";

import {
  getItemAuthor,
  getItineraryTypeLabel,
  getTripDates,
  type ItineraryItem,
  type ItineraryVote,
  type ProfileSummary,
} from "@/lib/itinerary";

type ItineraryPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ItineraryPage({
  params,
  searchParams,
}: ItineraryPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  // Check authentication
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

  // Load trip
  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      destination,
      start_date,
      end_date,
      trip_type,
      owner_id,
      group_id,
      groups (
        id,
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (tripError) {
    console.error(
      "Failed to load itinerary trip:",
      tripError
    );
  }

  // Trip deleted or access removed
  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  const isTripCreator =
    trip.owner_id ===
    userId;

  // Load itinerary items
  const {
    data: rawItemData,
    error: itemError,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .select("*")
    .eq(
      "trip_id",
      trip.id
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (itemError) {
    console.error(
      "Failed to load itinerary items:",
      itemError
    );
  }

  const rawItems =
    (rawItemData ??
      []) as ItineraryItem[];

  // Load itinerary authors
  const authorIds = [
    ...new Set(
      rawItems.map(
        (item) =>
          item.created_by
      )
    ),
  ];

  const authorMap =
    new Map<
      string,
      ProfileSummary
    >();

  let profileLoadError:
    | string
    | null = null;

  if (
    authorIds.length >
    0
  ) {
    const {
      data: profiles,
      error:
        profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username"
      )
      .in(
        "id",
        authorIds
      );

    if (profileError) {
      console.error(
        "Failed to load itinerary authors:",
        profileError
      );

      profileLoadError =
        profileError.message;
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

  // Add author details
  const items:
    ItineraryItem[] =
    rawItems.map(
      (item) => ({
        ...item,

        author:
          authorMap.get(
            item.created_by
          ) ?? null,
      })
    );

  // Confirmed itinerary
  const plannedItems =
    items.filter(
      (item) =>
        item.planning_status ===
        "planned"
    );

  // Suggestion backlog
  const suggestions =
    items.filter(
      (item) =>
        item.planning_status ===
        "suggested"
    );

  // Load backlog vote summaries
  let votes:
    ItineraryVote[] = [];

  let voteLoadError:
    | string
    | null = null;

  if (
    suggestions.length >
    0
  ) {
    const {
      data: voteData,
      error: voteError,
    } = await supabase
      .from(
        "itinerary_votes"
      )
      .select(
        "item_id, user_id, reaction, preferred_date"
      )
      .in(
        "item_id",
        suggestions.map(
          (item) =>
            item.id
        )
      );

    if (voteError) {
      console.error(
        "Failed to load itinerary votes:",
        voteError
      );

      voteLoadError =
        voteError.message;
    } else {
      votes =
        (voteData ??
          []) as ItineraryVote[];
    }
  }

  // Generate every trip day
  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <BackButton
          fallbackHref={`/trips/${trip.id}`}
        />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                {
                  trip.name
                }
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                Itinerary
              </h1>

              <p className="mt-2 text-muted">
                {
                  trip.destination
                }
              </p>
            </div>

            {/* Main action */}
            <Link
              href={`/trips/${trip.id}/itinerary/new?mode=${
                isTripCreator
                  ? "planned"
                  : "suggested"
              }&type=activity`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
            >
              {isTripCreator
                ? "Add item"
                : "Suggest something"}
            </Link>
          </div>
        </header>

        {/* Action error */}
        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {
              query.error
            }
          </div>
        )}

        {/* Action success */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {
              query.success
            }
          </div>
        )}

        {/* Database error */}
        {itemError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            Unable to
            load itinerary
            items:{" "}
            {
              itemError.message
            }
          </div>
        )}

        {/* Author warning */}
        {profileLoadError && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Itinerary
            items loaded,
            but some
            author names
            could not be
            loaded.
          </div>
        )}

        {/* Voting warning */}
        {voteLoadError && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Itinerary
            items loaded,
            but voting
            totals could
            not be loaded.
          </div>
        )}

        {/* Weather + itinerary */}
        <TripWeatherProvider
          tripId={
            trip.id
          }
          destination={
            trip.destination
          }
          startDate={
            trip.start_date
          }
          endDate={
            trip.end_date
          }
        >
          <ItineraryWeatherNotice />

          <ItineraryPlan
            tripId={
              trip.id
            }
            tripDates={
              tripDates
            }
            items={
              plannedItems
            }
            currentUserId={
              userId
            }
            isTripCreator={
              isTripCreator
            }
          />
        </TripWeatherProvider>

        {/* Suggestion backlog */}
        {trip.trip_type ===
          "group" && (
          <details
            open
            className="group mt-14 overflow-hidden rounded-2xl border border-line bg-surface"
          >
            {/* Collapsible backlog header */}
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-ink">
                    Suggestion
                    backlog
                  </h2>

                  <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                    {
                      suggestions.length
                    }{" "}
                    {suggestions.length ===
                    1
                      ? "idea"
                      : "ideas"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted">
                  Ideas that
                  haven&apos;t
                  been added
                  to the
                  itinerary
                  yet.
                </p>
              </div>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>

            <div className="border-t border-line p-5 sm:p-6">
              <div className="flex justify-end">
                <Link
                  href={`/trips/${trip.id}/voting`}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  Open group
                  voting →
                </Link>
              </div>

              {/* Empty backlog */}
              {suggestions.length ===
              0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
                  <p className="font-medium text-ink">
                    Backlog is
                    empty
                  </p>

                  <p className="mt-2 text-sm text-muted">
                    Add an idea
                    for the group
                    to vote on.
                  </p>

                  <Link
                    href={`/trips/${trip.id}/itinerary/new?mode=suggested&type=activity`}
                    className="mt-5 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                  >
                    Suggest
                    something
                  </Link>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {suggestions.map(
                    (item) => {
                      const author =
                        getItemAuthor(
                          item
                        );

                      const itemVotes =
                        votes.filter(
                          (vote) =>
                            vote.item_id ===
                            item.id
                        );

                      const yes =
                        itemVotes.filter(
                          (vote) =>
                            vote.reaction ===
                            "yes"
                        ).length;

                      const no =
                        itemVotes.filter(
                          (vote) =>
                            vote.reaction ===
                            "no"
                        ).length;

                      const unsure =
                        itemVotes.filter(
                          (vote) =>
                            vote.reaction ===
                            "not_sure"
                        ).length;

                      const dontMind =
                        itemVotes.filter(
                          (vote) =>
                            vote.reaction ===
                            "dont_mind"
                        ).length;

                      // Creator or original
                      // suggester can edit.
                      const canEditItem =
                        isTripCreator ||
                        (
                          item.origin ===
                            "suggestion" &&
                          item.created_by ===
                            userId
                        );

                      return (
                        <article
                          key={
                            item.id
                          }
                          className="rounded-2xl border border-line bg-surface-soft p-5 sm:p-6"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                                {getItineraryTypeLabel(
                                  item.item_type
                                )}
                              </span>

                              <h3 className="mt-4 text-lg font-semibold text-ink">
                                {
                                  item.title
                                }
                              </h3>

                              <p className="mt-1 text-xs text-subtle">
                                Suggested
                                by{" "}
                                {author?.display_name ??
                                  "Traveller"}
                                {author?.username
                                  ? ` (@${author.username})`
                                  : ""}
                              </p>
                            </div>

                            {canEditItem && (
                              <Link
                                href={`/trips/${trip.id}/itinerary/edit/${item.id}`}
                                className="shrink-0 text-sm font-medium text-brand-700 transition hover:text-brand-800"
                              >
                                Edit
                              </Link>
                            )}
                          </div>

                          <ItineraryItemDetails
                            item={
                              item
                            }
                          />

                          {/* Vote summary */}
                          <div className="mt-5 border-t border-line pt-4">
                            <div className="flex flex-wrap gap-2 text-sm text-muted">
                              <span className="rounded-full border border-line bg-surface px-2.5 py-1">
                                👍{" "}
                                {
                                  yes
                                }
                              </span>

                              <span className="rounded-full border border-line bg-surface px-2.5 py-1">
                                👎{" "}
                                {
                                  no
                                }
                              </span>

                              <span className="rounded-full border border-line bg-surface px-2.5 py-1">
                                ?{" "}
                                {
                                  unsure
                                }
                              </span>

                              <span className="rounded-full border border-line bg-surface px-2.5 py-1">
                                ↔{" "}
                                {
                                  dontMind
                                }
                              </span>
                            </div>

                            <div className="mt-4 flex justify-end">
                              <Link
                                href={`/trips/${trip.id}/voting#item-${item.id}`}
                                className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
                              >
                                Vote →
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </details>
        )}

        {/* Location attribution */}
        <p className="mt-10 text-center text-xs text-subtle">
          Location
          search powered
          by Geoapify
          and
          OpenStreetMap
          data.
        </p>
      </div>
    </main>
  );
}