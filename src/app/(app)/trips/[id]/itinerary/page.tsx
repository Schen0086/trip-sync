import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import CollapsibleItineraryDay from "@/components/collapsible-itinerary-day";
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

  const supabase = await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

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
    redirect("/dashboard");
  }

  const isTripCreator =
    trip.owner_id === userId;

  // Load itinerary items
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

  // Load itinerary authors
  const authorIds = [
    ...new Set(
      rawItems.map(
        (item) => item.created_by
      )
    ),
  ];

  const authorMap =
    new Map<string, ProfileSummary>();

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

  // Add author details to each item
  const items: ItineraryItem[] =
    rawItems.map(
      (item) => ({
        ...item,

        author:
          authorMap.get(
            item.created_by
          ) ?? null,
      })
    );

  // Separate planned items and suggestions
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

  // Load backlog vote summaries
  let votes: ItineraryVote[] = [];

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

  // Generate every day of the trip
  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );

  // Sort confirmed itinerary items
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

        {/* Page heading */}
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

            {/* Itinerary actions */}
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

        {/* Itinerary database error */}
        {itemError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            Unable to load itinerary items:{" "}
            {itemError.message}
          </div>
        )}

        {/* Author loading warning */}
        {profileLoadError && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Itinerary items loaded, but
            some author names could not
            be loaded.
          </div>
        )}

        {/* Voting loading warning */}
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

          {/* Collapsible days */}
          <div className="mt-8 space-y-4">
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
                  <CollapsibleItineraryDay
                    key={date}
                    dayNumber={
                      index + 1
                    }
                    dayLabel={formatTripDay(
                      date
                    )}
                    itemCount={
                      dayItems.length
                    }
                  >
                    {dayItems.length ===
                    0 ? (
                      <div className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
                        Nothing planned
                        for this day yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dayItems.map(
                          (item) => {
                            const author =
                              getItemAuthor(
                                item
                              );

                            // Creator or original suggester can edit
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
                                key={item.id}
                                className="rounded-2xl border border-line bg-surface-soft p-5 sm:p-6"
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    {/* Item badges */}
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                                        {getItineraryTypeLabel(
                                          item.item_type
                                        )}
                                      </span>

                                      {item.origin ===
                                        "suggestion" && (
                                        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted">
                                          Group suggestion
                                        </span>
                                      )}
                                    </div>

                                    {/* Item title */}
                                    <h4 className="mt-3 text-lg font-semibold text-ink">
                                      {item.title}
                                    </h4>

                                    {/* Item creator */}
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

                                  {/* Edit */}
                                  {canEditItem && (
                                    <Link
                                      href={`/trips/${trip.id}/itinerary/edit/${item.id}`}
                                      className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
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
                        )}
                      </div>
                    )}
                  </CollapsibleItineraryDay>
                );
              }
            )}
          </div>
        </section>

        {/* Suggestion backlog */}
        {trip.trip_type === "group" && (
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

            {/* Empty backlog */}
            {suggestions.length === 0 ? (
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
              /* Suggestion cards */
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

                    // Creator or original suggester can edit
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
                              {item.title}
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

                          {/* Edit suggestion */}
                          {canEditItem && (
                            <Link
                              href={`/trips/${trip.id}/itinerary/edit/${item.id}`}
                              className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
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
          </section>
        )}

        {/* Location attribution */}
        <p className="mt-10 text-center text-xs text-subtle">
          Location search powered by
          Geoapify and OpenStreetMap
          data.
        </p>
      </div>
    </main>
  );
}