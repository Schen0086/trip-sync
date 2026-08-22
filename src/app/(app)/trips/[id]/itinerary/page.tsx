import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import ItineraryItemDetails from "@/components/itinerary-item-details";
import {
  formatTripDay,
  getItemAuthor,
  getItineraryItemDate,
  getItineraryItemTime,
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

  if (!trip) {
    redirect("/dashboard");
  }

  const isTripCreator =
    trip.owner_id === userId;

  /*
   * Load itinerary items directly.
   *
   * Do not embed profiles here.
   * A failed embedded relationship query previously looked
   * exactly like an empty itinerary because the error was ignored.
   */
  const {
    data: rawItemData,
    error: itemError,
  } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", trip.id)
    .order("created_at", {
      ascending: true,
    });

  if (itemError) {
    console.error(
      "Failed to load itinerary items:",
      itemError
    );
  }

  const rawItems =
    (rawItemData ??
      []) as ItineraryItem[];

  // Load authors separately
  const authorIds = [
    ...new Set(
      rawItems.map(
        (item) => item.created_by
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

  // Attach author details
  const items: ItineraryItem[] =
    rawItems.map((item) => ({
      ...item,

      author:
        authorMap.get(
          item.created_by
        ) ?? null,
    }));

  const plannedItems =
    items.filter(
      (item) =>
        item.planning_status ===
        "planned"
    );

  const suggestions =
    items.filter(
      (item) =>
        item.planning_status ===
        "suggested"
    );

  // Load votes for backlog cards
  let votes: ItineraryVote[] =
    [];

  let voteLoadError:
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

  // Generate trip days
  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );

  // Sort confirmed items
  plannedItems.sort(
    (a, b) => {
      const aDate =
        getItineraryItemDate(a) ??
        "9999-12-31";

      const bDate =
        getItineraryItemDate(b) ??
        "9999-12-31";

      if (aDate !== bDate) {
        return aDate.localeCompare(
          bDate
        );
      }

      return (
        getItineraryItemTime(a) ??
        "99:99"
      ).localeCompare(
        getItineraryItemTime(b) ??
          "99:99"
      );
    }
  );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <BackButton
          fallbackHref={`/trips/${trip.id}`}
        />

        {/* Heading */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                {trip.name}
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                Itinerary
              </h1>

              <p className="mt-2 text-muted">
                {trip.destination}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {trip.trip_type ===
                "group" && (
                <Link
                  href={`/trips/${trip.id}/voting`}
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                >
                  Voting
                </Link>
              )}

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
          </div>
        </header>

        {/* Action error */}
        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {/* Action success */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Database loading error */}
        {itemError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            Unable to load itinerary
            items: {itemError.message}
          </div>
        )}

        {/* Non-critical profile error */}
        {profileLoadError && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Itinerary items loaded, but
            some author names could not
            be loaded.
          </div>
        )}

        {/* Non-critical voting error */}
        {voteLoadError && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Itinerary items loaded, but
            voting totals could not be
            loaded.
          </div>
        )}

        {/* Trip plan */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Trip plan
          </h2>

          <p className="mt-1 text-muted">
            Confirmed activities,
            transport and accommodation
            organised by day.
          </p>

          <div className="mt-8 space-y-8">
            {tripDates.map(
              (date, index) => {
                const dayItems =
                  plannedItems.filter(
                    (item) =>
                      getItineraryItemDate(
                        item
                      ) === date
                  );

                return (
                  <section
                    key={date}
                    className="grid gap-5 lg:grid-cols-[180px_1fr]"
                  >
                    {/* Day */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                        Day {index + 1}
                      </p>

                      <h3 className="mt-1 font-semibold text-ink">
                        {formatTripDay(
                          date
                        )}
                      </h3>
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                      {dayItems.length ===
                      0 ? (
                        <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
                          Nothing planned
                          for this day yet.
                        </div>
                      ) : (
                        dayItems.map(
                          (item) => {
                            const author =
                              getItemAuthor(
                                item
                              );

                            return (
                              <article
                                key={
                                  item.id
                                }
                                className="rounded-2xl border border-line bg-surface p-6"
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                                        {getItineraryTypeLabel(
                                          item.item_type
                                        )}
                                      </span>

                                      {item.origin ===
                                        "suggestion" && (
                                        <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                                          Group suggestion
                                        </span>
                                      )}
                                    </div>

                                    <h4 className="mt-3 text-lg font-semibold text-ink">
                                      {
                                        item.title
                                      }
                                    </h4>

                                    <p className="mt-1 text-xs text-subtle">
                                      {item.origin ===
                                      "suggestion"
                                        ? "Suggested by"
                                        : "Added by"}{" "}
                                      {author?.display_name ??
                                        "Traveller"}

                                      {author?.username
                                        ? ` (@${author.username})`
                                        : ""}
                                    </p>
                                  </div>

                                  {isTripCreator && (
                                    <Link
                                      href={`/trips/${trip.id}/itinerary/${item.id}/edit`}
                                      className="text-sm font-medium text-brand-700 hover:text-brand-800"
                                    >
                                      Edit
                                    </Link>
                                  )}
                                </div>

                                <ItineraryItemDetails
                                  item={item}
                                />
                              </article>
                            );
                          }
                        )
                      )}
                    </div>
                  </section>
                );
              }
            )}
          </div>
        </section>

        {/* Suggestions */}
        {trip.trip_type ===
          "group" && (
          <section className="mt-14 border-t border-line pt-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink">
                  Suggestion backlog
                </h2>

                <p className="mt-1 text-muted">
                  Ideas that haven&apos;t
                  been added to the
                  itinerary yet.
                </p>
              </div>

              <Link
                href={`/trips/${trip.id}/voting`}
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Open group voting →
              </Link>
            </div>

            {suggestions.length ===
            0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
                <p className="font-medium text-ink">
                  Backlog is empty
                </p>

                <p className="mt-2 text-sm text-muted">
                  Add an idea for the
                  group to vote on.
                </p>

                <Link
                  href={`/trips/${trip.id}/itinerary/new?mode=suggested&type=activity`}
                  className="mt-5 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                >
                  Suggest something
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

                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-line bg-surface p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
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
                              Suggested by{" "}
                              {author?.display_name ??
                                "Traveller"}

                              {author?.username
                                ? ` (@${author.username})`
                                : ""}
                            </p>
                          </div>

                          {(isTripCreator ||
                            item.created_by ===
                              userId) && (
                            <Link
                              href={`/trips/${trip.id}/itinerary/${item.id}/edit`}
                              className="text-sm font-medium text-brand-700"
                            >
                              Edit
                            </Link>
                          )}
                        </div>

                        <ItineraryItemDetails
                          item={item}
                        />

                        {/* Vote summary */}
                        <div className="mt-5 border-t border-line pt-4">
                          <div className="flex flex-wrap gap-2 text-sm text-muted">
                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1">
                              👍 {yes}
                            </span>

                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1">
                              👎 {no}
                            </span>

                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1">
                              ? {unsure}
                            </span>

                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1">
                              ↔ {dontMind}
                            </span>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Link
                              href={`/trips/${trip.id}/voting#item-${item.id}`}
                              className="text-sm font-medium text-brand-700"
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
          </section>
        )}

        <p className="mt-10 text-center text-xs text-subtle">
          Location search powered by
          Geoapify and OpenStreetMap
          data.
        </p>
      </div>
    </main>
  );
}