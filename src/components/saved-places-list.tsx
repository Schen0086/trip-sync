"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addSavedPlaceToItinerary,
  suggestSavedPlace,
} from "@/app/(app)/trips/[id]/places/actions";

import {
  getPlaceCategoryLabel,
  getPlaceStatusLabel,
  getSavedPlaceAuthor,
  getSavedPlaceStatus,
  PLACE_CATEGORY_OPTIONS,
  PLACE_STATUS_OPTIONS,
  type MapItineraryItem,
  type PlaceCategory,
  type PlacePlanningStatus,
  type SavedPlace,
} from "@/lib/places";

type SavedPlacesListProps = {
  tripId: string;

  tripType:
    | string
    | null;

  startDate: string;
  endDate: string;

  currentUserId: string;
  isTripCreator: boolean;

  places:
    SavedPlace[];

  itineraryItems:
    MapItineraryItem[];
};

function statusClasses(
  status:
    PlacePlanningStatus
) {
  if (
    status === "planned" ||
    status === "voting"
  ) {
    return "border-brand-500 bg-brand-50 text-brand-700";
  }

  if (
    status === "rejected"
  ) {
    return "border-danger-border bg-danger-surface text-danger-text";
  }

  return "border-line bg-surface-soft text-muted";
}

export default function SavedPlacesList({
  tripId,
  tripType,
  startDate,
  endDate,
  currentUserId,
  isTripCreator,
  places,
  itineraryItems,
}: SavedPlacesListProps) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState<
      "all" | PlaceCategory
    >("all");

  const [
    status,
    setStatus,
  ] =
    useState<
      "all" |
      PlacePlanningStatus
    >("all");

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);

  // Desktop has room for filters.
  // Mobile starts compact.
  useEffect(() => {
    if (
      window.matchMedia(
        "(min-width: 768px)"
      ).matches
    ) {
      setFiltersOpen(
        true
      );
    }
  }, []);

  // Open a place card when
  // arriving through an anchor.
  useEffect(() => {
    const hash =
      window.location.hash;

    if (!hash) {
      return;
    }

    const id =
      decodeURIComponent(
        hash.slice(1)
      );

    const element =
      document.getElementById(
        id
      );

    if (
      element instanceof
      HTMLDetailsElement
    ) {
      element.open =
        true;

      window.setTimeout(
        () => {
          element.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
        },
        100
      );
    }
  }, []);

  const linkedItemByPlace =
    useMemo(() => {
      const map =
        new Map<
          string,
          MapItineraryItem
        >();

      itineraryItems.forEach(
        (item) => {
          if (
            item.source_saved_place_id
          ) {
            map.set(
              item.source_saved_place_id,
              item
            );
          }
        }
      );

      return map;
    }, [
      itineraryItems,
    ]);

  const filteredPlaces =
    useMemo(
      () =>
        places.filter(
          (place) => {
            const linkedItem =
              linkedItemByPlace.get(
                place.id
              );

            const placeStatus =
              getSavedPlaceStatus(
                linkedItem
              );

            const searchText =
              `${place.name} ${place.address ?? ""} ${place.notes ?? ""}`
                .toLowerCase();

            if (
              search.trim() &&
              !searchText.includes(
                search
                  .trim()
                  .toLowerCase()
              )
            ) {
              return false;
            }

            if (
              category !==
                "all" &&
              place.category !==
                category
            ) {
              return false;
            }

            if (
              status !==
                "all" &&
              placeStatus !==
                status
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        places,
        search,
        category,
        status,
        linkedItemByPlace,
      ]
    );

  function resetFilters() {
    setSearch("");
    setCategory(
      "all"
    );
    setStatus(
      "all"
    );
  }

  function showOnMap(
    place:
      SavedPlace,
    linkedItem:
      | MapItineraryItem
      | undefined
  ) {
    const mapSection =
      document.getElementById(
        "places-map-section"
      );

    if (
      mapSection instanceof
      HTMLDetailsElement
    ) {
      mapSection.open =
        true;
    }

    const pointId =
      linkedItem?.planning_status ===
        "planned"
        ? linkedItem.item_type ===
          "accommodation"
          ? `accommodation-${linkedItem.id}`
          : `activity-${linkedItem.id}`
        : `saved-${place.id}`;

    window.setTimeout(
      () => {
        window.dispatchEvent(
          new CustomEvent(
            "tripsync:focus-map",
            {
              detail: {
                pointId,
              },
            }
          )
        );

        document
          .getElementById(
            "places-map-section"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
      },
      150
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Saved places
          </h2>

          <p className="mt-1 text-muted">
            Search and organise
            the group&apos;s shared
            shortlist.
          </p>
        </div>

        <p className="text-sm text-muted">
          {
            filteredPlaces.length
          }{" "}
          of{" "}
          {places.length}{" "}
          shown
        </p>
      </div>

      {/* Collapsible filters */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
        <button
          type="button"
          onClick={() =>
            setFiltersOpen(
              (current) =>
                !current
            )
          }
          aria-expanded={
            filtersOpen
          }
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface-hover"
        >
          <div>
            <p className="font-medium text-ink">
              Filter saved
              places
            </p>

            <p className="mt-0.5 text-xs text-muted">
              Name, category
              and planning
              status
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
            className={`h-5 w-5 shrink-0 text-muted transition-transform ${
              filtersOpen
                ? "rotate-180"
                : ""
            }`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {filtersOpen && (
          <div className="border-t border-line p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="saved-place-search"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Search
                </label>

                <input
                  id="saved-place-search"
                  type="search"
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search saved places..."
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <div>
                <label
                  htmlFor="saved-place-category"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Category
                </label>

                <select
                  id="saved-place-category"
                  value={
                    category
                  }
                  onChange={(
                    event
                  ) =>
                    setCategory(
                      event.target
                        .value as
                        | "all"
                        | PlaceCategory
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                >
                  <option value="all">
                    All
                    categories
                  </option>

                  {PLACE_CATEGORY_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="saved-place-status"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Status
                </label>

                <select
                  id="saved-place-status"
                  value={
                    status
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value as
                        | "all"
                        | PlacePlanningStatus
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                >
                  <option value="all">
                    All
                    statuses
                  </option>

                  {PLACE_STATUS_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="mt-4 cursor-pointer text-sm font-medium text-muted hover:text-ink"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {places.length ===
      0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center">
          <h3 className="font-semibold text-ink">
            No saved places yet
          </h3>

          <p className="mt-2 text-sm text-muted">
            Discover somewhere
            above or save a place
            manually.
          </p>
        </div>
      ) : filteredPlaces.length ===
        0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center">
          <h3 className="font-semibold text-ink">
            No matching places
          </h3>

          <p className="mt-2 text-sm text-muted">
            Try changing your
            search or filters.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredPlaces.map(
            (place) => {
              const author =
                getSavedPlaceAuthor(
                  place
                );

              const linkedItem =
                linkedItemByPlace.get(
                  place.id
                );

              const placeStatus =
                getSavedPlaceStatus(
                  linkedItem
                );

              const canEdit =
                isTripCreator ||
                place.saved_by ===
                  currentUserId;

              return (
                <details
                  key={
                    place.id
                  }
                  id={`place-${place.id}`}
                  className="group scroll-mt-40 overflow-hidden rounded-2xl border border-line bg-surface"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                          {getPlaceCategoryLabel(
                            place.category
                          )}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                            placeStatus
                          )}`}
                        >
                          {getPlaceStatusLabel(
                            placeStatus
                          )}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-ink">
                        {
                          place.name
                        }
                      </h3>

                      <p className="mt-1 text-xs text-subtle">
                        Saved by{" "}
                        {author?.display_name ??
                          "Traveller"}
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
                      className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>

                  <div className="border-t border-line p-5">
                    {place.address && (
                      <p className="text-sm leading-6 text-muted">
                        {
                          place.address
                        }
                      </p>
                    )}

                    {place.notes && (
                      <div className="mt-4 rounded-xl border border-line bg-surface-soft p-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
                          {
                            place.notes
                          }
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          showOnMap(
                            place,
                            linkedItem
                          )
                        }
                        className="cursor-pointer text-sm font-medium text-brand-700"
                      >
                        Show
                        on map
                      </button>

                      {place.website_url && (
                        <a
                          href={
                            place.website_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-brand-700"
                        >
                          Open
                          website →
                        </a>
                      )}

                      {canEdit && (
                        <Link
                          href={`/trips/${tripId}/places/edit/${place.id}`}
                          className="text-sm font-medium text-brand-700"
                        >
                          Edit
                        </Link>
                      )}
                    </div>

                    {linkedItem ? (
                      <div className="mt-6 border-t border-line pt-5">
                        {placeStatus ===
                        "planned" ? (
                          <Link
                            href={`/trips/${tripId}/itinerary`}
                            className="text-sm font-medium text-brand-700"
                          >
                            View in
                            itinerary →
                          </Link>
                        ) : (
                          <Link
                            href={`/trips/${tripId}/voting#item-${linkedItem.id}`}
                            className="text-sm font-medium text-brand-700"
                          >
                            {placeStatus ===
                            "voting"
                              ? "Open voting →"
                              : "Open decision history →"}
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="mt-6 border-t border-line pt-5">
                        <div className="flex flex-col gap-3">
                          {tripType ===
                            "group" && (
                            <form
                              action={
                                suggestSavedPlace
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
                                name="placeId"
                                value={
                                  place.id
                                }
                              />

                              <button
                                type="submit"
                                className="cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                              >
                                Suggest
                                to group
                              </button>
                            </form>
                          )}

                          {isTripCreator && (
                            <details className="rounded-xl border border-line bg-surface-soft">
                              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
                                Add
                                directly
                                to
                                itinerary
                              </summary>

                              <form
                                action={
                                  addSavedPlaceToItinerary
                                }
                                className="space-y-4 border-t border-line p-4"
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
                                  name="placeId"
                                  value={
                                    place.id
                                  }
                                />

                                <div>
                                  <label
                                    htmlFor={`date-${place.id}`}
                                    className="mb-1.5 block text-xs font-medium text-ink"
                                  >
                                    Day
                                  </label>

                                  <input
                                    id={`date-${place.id}`}
                                    name="scheduledDate"
                                    type="date"
                                    required
                                    min={
                                      startDate
                                    }
                                    max={
                                      endDate
                                    }
                                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
                                  />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label
                                      htmlFor={`start-${place.id}`}
                                      className="mb-1.5 block text-xs font-medium text-ink"
                                    >
                                      Start
                                      time
                                    </label>

                                    <input
                                      id={`start-${place.id}`}
                                      name="startTime"
                                      type="time"
                                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
                                    />
                                  </div>

                                  <div>
                                    <label
                                      htmlFor={`end-${place.id}`}
                                      className="mb-1.5 block text-xs font-medium text-ink"
                                    >
                                      End
                                      time
                                    </label>

                                    <input
                                      id={`end-${place.id}`}
                                      name="endTime"
                                      type="time"
                                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
                                    />
                                  </div>
                                </div>

                                <button
                                  type="submit"
                                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                                >
                                  Add to
                                  itinerary
                                </button>
                              </form>
                            </details>
                          )}
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
  );
}