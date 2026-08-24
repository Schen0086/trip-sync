"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

import CollapsibleItineraryDay from "@/components/collapsible-itinerary-day";
import ItineraryItemDetails from "@/components/itinerary-item-details";

import {
  formatItineraryDate,
  formatTripDay,
  getItemAuthor,
  getItineraryItemDate,
  getItineraryItemTime,
  getItineraryTypeLabel,
  type ItineraryItem,
} from "@/lib/itinerary";

import {
  moveItineraryItemToDate,
  saveItineraryDayOrder,
} from "@/app/(app)/trips/[id]/itinerary/plan-actions";

type ItineraryPlanProps = {
  tripId: string;

  tripDates: string[];

  items:
    ItineraryItem[];

  currentUserId: string;

  isTripCreator: boolean;
};

type DayData = {
  date: string;

  dayNumber: number;

  items:
    ItineraryItem[];

  accommodationContinuations:
    ItineraryItem[];

  conflictIds:
    Set<string>;
};

function sortDayItems(
  items: ItineraryItem[]
) {
  const hasCustomOrder =
    items.some(
      (item) =>
        item.sort_order >
        0
    );

  return [
    ...items,
  ].sort(
    (a, b) => {
      if (
        hasCustomOrder
      ) {
        const aOrder =
          a.sort_order > 0
            ? a.sort_order
            : Number.MAX_SAFE_INTEGER;

        const bOrder =
          b.sort_order > 0
            ? b.sort_order
            : Number.MAX_SAFE_INTEGER;

        if (
          aOrder !==
          bOrder
        ) {
          return (
            aOrder -
            bOrder
          );
        }
      }

      const aTime =
        getItineraryItemTime(
          a
        ) ?? "99:99";

      const bTime =
        getItineraryItemTime(
          b
        ) ?? "99:99";

      if (
        aTime !== bTime
      ) {
        return aTime.localeCompare(
          bTime
        );
      }

      return a.created_at.localeCompare(
        b.created_at
      );
    }
  );
}

function timeToMinutes(
  time: string
) {
  const [
    hour,
    minute,
  ] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(
      hour
    ) ||
    !Number.isFinite(
      minute
    )
  ) {
    return null;
  }

  return (
    hour * 60 +
    minute
  );
}

function getTimedInterval(
  item: ItineraryItem,
  date: string
) {
  // Activity conflicts only use
  // explicit start + end times.
  if (
    item.item_type ===
      "activity" &&
    item.scheduled_date ===
      date &&
    item.start_time &&
    item.end_time
  ) {
    const start =
      timeToMinutes(
        item.start_time
      );

    const end =
      timeToMinutes(
        item.end_time
      );

    if (
      start !== null &&
      end !== null &&
      end > start
    ) {
      return {
        start,
        end,
      };
    }
  }

  // For transport, only compare
  // same-day journeys with both times.
  if (
    item.item_type ===
      "transport" &&
    item.departure_date ===
      date &&
    item.arrival_date ===
      date &&
    item.departure_time &&
    item.arrival_time
  ) {
    const start =
      timeToMinutes(
        item.departure_time
      );

    const end =
      timeToMinutes(
        item.arrival_time
      );

    if (
      start !== null &&
      end !== null &&
      end > start
    ) {
      return {
        start,
        end,
      };
    }
  }

  return null;
}

function findConflictIds(
  items: ItineraryItem[],
  date: string
) {
  const conflictIds =
    new Set<string>();

  for (
    let firstIndex = 0;
    firstIndex <
    items.length;
    firstIndex += 1
  ) {
    const first =
      items[
        firstIndex
      ];

    const firstInterval =
      getTimedInterval(
        first,
        date
      );

    if (!firstInterval) {
      continue;
    }

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
      items.length;
      secondIndex += 1
    ) {
      const second =
        items[
          secondIndex
        ];

      const secondInterval =
        getTimedInterval(
          second,
          date
        );

      if (
        !secondInterval
      ) {
        continue;
      }

      const overlaps =
        firstInterval.start <
          secondInterval.end &&
        secondInterval.start <
          firstInterval.end;

      if (overlaps) {
        conflictIds.add(
          first.id
        );

        conflictIds.add(
          second.id
        );
      }
    }
  }

  return conflictIds;
}

function isAccommodationContinuation(
  item: ItineraryItem,
  date: string
) {
  return (
    item.item_type ===
      "accommodation" &&
    Boolean(
      item.check_in_date
    ) &&
    Boolean(
      item.check_out_date
    ) &&
    date >
      (
        item.check_in_date ??
        ""
      ) &&
    date <=
      (
        item.check_out_date ??
        ""
      )
  );
}

function getDayDifference(
  startDate: string,
  date: string
) {
  const start =
    new Date(
      `${startDate}T00:00:00Z`
    );

  const current =
    new Date(
      `${date}T00:00:00Z`
    );

  return Math.round(
    (
      current.getTime() -
      start.getTime()
    ) /
      (
        24 *
        60 *
        60 *
        1000
      )
  );
}

export default function ItineraryPlan({
  tripId,
  tripDates,
  items,
  currentUserId,
  isTripCreator,
}: ItineraryPlanProps) {
  const router =
    useRouter();

  const storageKey =
    `tripsync:itinerary:collapsed:${tripId}`;

  const [
    localItems,
    setLocalItems,
  ] =
    useState<
      ItineraryItem[]
    >(items);

  const [
    collapsedDates,
    setCollapsedDates,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );

  const [
    collapsePreferencesLoaded,
    setCollapsePreferencesLoaded,
  ] =
    useState(false);

  const [
    actionError,
    setActionError,
  ] =
    useState<
      string | null
    >(null);

  const [
    savingOrderDate,
    setSavingOrderDate,
  ] =
    useState<
      string | null
    >(null);

  const [
    movingItemId,
    setMovingItemId,
  ] =
    useState<
      string | null
    >(null);

  const [
    draggedItemId,
    setDraggedItemId,
  ] =
    useState<
      string | null
    >(null);

  // Sync after Server Component refreshes.
  useEffect(() => {
    setLocalItems(
      items
    );
  }, [items]);

  // Restore day collapse state
  // for this specific trip.
  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          storageKey
        );

      if (stored) {
        const parsed =
          JSON.parse(
            stored
          );

        if (
          Array.isArray(
            parsed
          )
        ) {
          const validDates =
            new Set(
              tripDates
            );

          setCollapsedDates(
            new Set(
              parsed.filter(
                (
                  value
                ): value is string =>
                  typeof value ===
                    "string" &&
                  validDates.has(
                    value
                  )
              )
            )
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to restore itinerary collapse state:",
        error
      );
    } finally {
      setCollapsePreferencesLoaded(
        true
      );
    }
  }, [
    storageKey,
    tripDates,
  ]);

  // Persist day collapse state.
  useEffect(() => {
    if (
      !collapsePreferencesLoaded
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(
          [
            ...collapsedDates,
          ]
        )
      );
    } catch (error) {
      console.error(
        "Failed to save itinerary collapse state:",
        error
      );
    }
  }, [
    collapsePreferencesLoaded,
    collapsedDates,
    storageKey,
  ]);

  const dayData:
    DayData[] =
    useMemo(
      () =>
        tripDates.map(
          (
            date,
            index
          ) => {
            const primaryItems =
              sortDayItems(
                localItems.filter(
                  (item) =>
                    getItineraryItemDate(
                      item
                    ) === date
                )
              );

            const accommodationContinuations =
              localItems.filter(
                (item) =>
                  isAccommodationContinuation(
                    item,
                    date
                  )
              );

            return {
              date,

              dayNumber:
                index + 1,

              items:
                primaryItems,

              accommodationContinuations,

              conflictIds:
                findConflictIds(
                  primaryItems,
                  date
                ),
            };
          }
        ),
      [
        localItems,
        tripDates,
      ]
    );

  function toggleDay(
    date: string
  ) {
    setCollapsedDates(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(date)
        ) {
          next.delete(
            date
          );
        } else {
          next.add(
            date
          );
        }

        return next;
      }
    );
  }

  function collapseAll() {
    setCollapsedDates(
      new Set(
        tripDates
      )
    );
  }

  function expandAll() {
    setCollapsedDates(
      new Set()
    );
  }

  async function persistOrder(
    date: string,
    nextItems:
      ItineraryItem[]
  ) {
    setActionError(
      null
    );

    setSavingOrderDate(
      date
    );

    const orderMap =
      new Map(
        nextItems.map(
          (
            item,
            index
          ) => [
            item.id,
            (
              index + 1
            ) * 10,
          ]
        )
      );

    // Optimistic update
    setLocalItems(
      (current) =>
        current.map(
          (item) => {
            const nextOrder =
              orderMap.get(
                item.id
              );

            if (
              nextOrder ===
              undefined
            ) {
              return item;
            }

            return {
              ...item,

              sort_order:
                nextOrder,
            };
          }
        )
    );

    const result =
      await saveItineraryDayOrder(
        {
          tripId,
          date,

          itemIds:
            nextItems.map(
              (item) =>
                item.id
            ),
        }
      );

    if (!result.ok) {
      setActionError(
        result.error
      );

      // Restore server state.
      router.refresh();
    } else {
      router.refresh();
    }

    setSavingOrderDate(
      null
    );
  }

  function moveWithinDay(
    date: string,
    itemId: string,
    direction:
      | "up"
      | "down"
  ) {
    const day =
      dayData.find(
        (entry) =>
          entry.date === date
      );

    if (!day) {
      return;
    }

    const currentIndex =
      day.items.findIndex(
        (item) =>
          item.id ===
          itemId
      );

    if (
      currentIndex === -1
    ) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        day.items.length
    ) {
      return;
    }

    const nextItems = [
      ...day.items,
    ];

    const [
      movedItem,
    ] =
      nextItems.splice(
        currentIndex,
        1
      );

    nextItems.splice(
      targetIndex,
      0,
      movedItem
    );

    void persistOrder(
      date,
      nextItems
    );
  }

  function handleDragStart(
    event:
      DragEvent<HTMLDivElement>,
    itemId: string
  ) {
    setDraggedItemId(
      itemId
    );

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      itemId
    );
  }

  function handleDrop(
    event:
      DragEvent<HTMLElement>,
    date: string,
    targetItemId: string
  ) {
    if (
      !isTripCreator
    ) {
      return;
    }

    event.preventDefault();

    const sourceItemId =
      draggedItemId ??
      event.dataTransfer.getData(
        "text/plain"
      );

    setDraggedItemId(
      null
    );

    if (
      !sourceItemId ||
      sourceItemId ===
        targetItemId
    ) {
      return;
    }

    const day =
      dayData.find(
        (entry) =>
          entry.date === date
      );

    if (!day) {
      return;
    }

    const sourceIndex =
      day.items.findIndex(
        (item) =>
          item.id ===
          sourceItemId
      );

    if (
      sourceIndex === -1
    ) {
      return;
    }

    const nextItems = [
      ...day.items,
    ];

    const [
      movedItem,
    ] =
      nextItems.splice(
        sourceIndex,
        1
      );

    const targetIndex =
      nextItems.findIndex(
        (item) =>
          item.id ===
          targetItemId
      );

    if (
      targetIndex === -1
    ) {
      return;
    }

    nextItems.splice(
      targetIndex,
      0,
      movedItem
    );

    void persistOrder(
      date,
      nextItems
    );
  }

  async function moveToDay(
    itemId: string,
    targetDate: string
  ) {
    setActionError(
      null
    );

    setMovingItemId(
      itemId
    );

    const result =
      await moveItineraryItemToDate(
        {
          tripId,
          itemId,
          targetDate,
        }
      );

    if (!result.ok) {
      setActionError(
        result.error
      );
    } else {
      router.refresh();
    }

    setMovingItemId(
      null
    );
  }

  return (
    <section className="mt-10">
      {/* Trip plan heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Trip plan
          </h2>

          <p className="mt-1 text-muted">
            Confirmed
            activities,
            transport and
            accommodation
            organised by
            day.
          </p>
        </div>

        {/* Collapse controls */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={
              expandAll
            }
            className="cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
          >
            Expand all
          </button>

          <button
            type="button"
            onClick={
              collapseAll
            }
            className="cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
          >
            Collapse all
          </button>
        </div>
      </div>

      {isTripCreator && (
        <p className="mt-3 text-xs leading-5 text-subtle">
          Reorder items
          using the arrows,
          or drag them on
          desktop. You can
          also move a
          confirmed item
          directly to
          another trip day.
        </p>
      )}

      {/* Inline action error */}
      {actionError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
        >
          {actionError}
        </div>
      )}

      {/* Days */}
      <div className="mt-8 space-y-4">
        {dayData.map(
          (day) => {
            const itemCount =
              day.items.length +
              day
                .accommodationContinuations
                .length;

            const orderSaving =
              savingOrderDate ===
              day.date;

            return (
              <CollapsibleItineraryDay
                key={
                  day.date
                }
                dayNumber={
                  day.dayNumber
                }
                dayLabel={formatTripDay(
                  day.date
                )}
                date={
                  day.date
                }
                itemCount={
                  itemCount
                }
                open={
                  !collapsedDates.has(
                    day.date
                  )
                }
                onToggle={() =>
                  toggleDay(
                    day.date
                  )
                }
                hasConflict={
                  day
                    .conflictIds
                    .size >
                  0
                }
              >
                {/* Accommodation continuing from previous day */}
                {day
                  .accommodationContinuations
                  .length >
                  0 && (
                  <div className="mb-4 space-y-2">
                    {day.accommodationContinuations.map(
                      (
                        item
                      ) => {
                        const checkInDate =
                          item.check_in_date;

                        const checkOutDate =
                          item.check_out_date;

                        const isCheckoutDay =
                          checkOutDate ===
                          day.date;

                        const nightNumber =
                          checkInDate
                            ? getDayDifference(
                                checkInDate,
                                day.date
                              ) +
                              1
                            : null;

                        return (
                          <div
                            key={`continuation-${item.id}-${day.date}`}
                            className="flex flex-col gap-3 rounded-xl border border-line bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                                Accommodation
                              </p>

                              <p className="mt-1 font-medium text-ink">
                                {isCheckoutDay
                                  ? "Check out from "
                                  : "Staying at "}

                                {
                                  item.title
                                }
                              </p>

                              {!isCheckoutDay &&
                                nightNumber !==
                                  null && (
                                  <p className="mt-1 text-xs text-muted">
                                    Night{" "}
                                    {
                                      nightNumber
                                    }
                                    {checkOutDate
                                      ? ` · Check-out ${formatItineraryDate(
                                          checkOutDate
                                        )}`
                                      : ""}
                                  </p>
                                )}

                              {isCheckoutDay && (
                                <p className="mt-1 text-xs text-muted">
                                  Final day
                                  of this
                                  stay
                                </p>
                              )}
                            </div>

                            {(isTripCreator ||
                              (
                                item.origin ===
                                  "suggestion" &&
                                item.created_by ===
                                  currentUserId
                              )) && (
                              <Link
                                href={`/trips/${tripId}/itinerary/edit/${item.id}`}
                                className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800"
                              >
                                View
                                stay →
                              </Link>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {day.items.length ===
                  0 &&
                day
                  .accommodationContinuations
                  .length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
                    Nothing
                    planned for
                    this day yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {day.items.map(
                      (
                        item,
                        itemIndex
                      ) => {
                        const author =
                          getItemAuthor(
                            item
                          );

                        const canEditItem =
                          isTripCreator ||
                          (
                            item.origin ===
                              "suggestion" &&
                            item.created_by ===
                              currentUserId
                          );

                        const hasConflict =
                          day.conflictIds.has(
                            item.id
                          );

                        const moving =
                          movingItemId ===
                          item.id;

                        const isFirst =
                          itemIndex ===
                          0;

                        const isLast =
                          itemIndex ===
                          day.items
                            .length -
                            1;

                        return (
                          <article
                            key={
                              item.id
                            }
                            onDragOver={
                              isTripCreator
                                ? (
                                    event
                                  ) => {
                                    event.preventDefault();

                                    event.dataTransfer.dropEffect =
                                      "move";
                                  }
                                : undefined
                            }
                            onDrop={
                              isTripCreator
                                ? (
                                    event
                                  ) =>
                                    handleDrop(
                                      event,
                                      day.date,
                                      item.id
                                    )
                                : undefined
                            }
                            className={`rounded-2xl border p-5 transition sm:p-6 ${
                              hasConflict
                                ? "border-danger-border bg-danger-surface/40"
                                : "border-line bg-surface-soft"
                            } ${
                              draggedItemId ===
                              item.id
                                ? "opacity-60"
                                : ""
                            }`}
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
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
                                      Group
                                      suggestion
                                    </span>
                                  )}

                                  {hasConflict && (
                                    <span className="rounded-full border border-danger-border bg-danger-surface px-2.5 py-1 text-xs font-medium text-danger-text">
                                      Schedule
                                      conflict
                                    </span>
                                  )}
                                </div>

                                {/* Item title */}
                                <h4 className="mt-3 text-lg font-semibold text-ink">
                                  {
                                    item.title
                                  }
                                </h4>

                                {/* Author */}
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

                              {/* Item actions */}
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {isTripCreator && (
                                  <>
                                    {/* Desktop drag handle */}
                                    <div
                                      draggable
                                      onDragStart={(
                                        event
                                      ) =>
                                        handleDragStart(
                                          event,
                                          item.id
                                        )
                                      }
                                      onDragEnd={() =>
                                        setDraggedItemId(
                                          null
                                        )
                                      }
                                      title="Drag to reorder"
                                      aria-label="Drag to reorder"
                                      className="hidden h-9 w-9 cursor-grab items-center justify-center rounded-lg border border-line bg-surface text-muted active:cursor-grabbing sm:flex"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden="true"
                                        className="h-4 w-4"
                                      >
                                        <circle
                                          cx="8"
                                          cy="7"
                                          r="1.4"
                                        />

                                        <circle
                                          cx="16"
                                          cy="7"
                                          r="1.4"
                                        />

                                        <circle
                                          cx="8"
                                          cy="12"
                                          r="1.4"
                                        />

                                        <circle
                                          cx="16"
                                          cy="12"
                                          r="1.4"
                                        />

                                        <circle
                                          cx="8"
                                          cy="17"
                                          r="1.4"
                                        />

                                        <circle
                                          cx="16"
                                          cy="17"
                                          r="1.4"
                                        />
                                      </svg>
                                    </div>

                                    {/* Move up */}
                                    <button
                                      type="button"
                                      disabled={
                                        isFirst ||
                                        orderSaving
                                      }
                                      onClick={() =>
                                        moveWithinDay(
                                          day.date,
                                          item.id,
                                          "up"
                                        )
                                      }
                                      aria-label={`Move ${item.title} up`}
                                      title="Move up"
                                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                        className="h-4 w-4"
                                      >
                                        <path d="m6 15 6-6 6 6" />
                                      </svg>
                                    </button>

                                    {/* Move down */}
                                    <button
                                      type="button"
                                      disabled={
                                        isLast ||
                                        orderSaving
                                      }
                                      onClick={() =>
                                        moveWithinDay(
                                          day.date,
                                          item.id,
                                          "down"
                                        )
                                      }
                                      aria-label={`Move ${item.title} down`}
                                      title="Move down"
                                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                        className="h-4 w-4"
                                      >
                                        <path d="m6 9 6 6 6-6" />
                                      </svg>
                                    </button>

                                    {/* Move to another day */}
                                    <label className="relative">
                                      <span className="sr-only">
                                        Move{" "}
                                        {
                                          item.title
                                        }{" "}
                                        to
                                        another
                                        day
                                      </span>

                                      <select
                                        value={
                                          day.date
                                        }
                                        disabled={
                                          moving
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          void moveToDay(
                                            item.id,
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        className="h-9 cursor-pointer rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-muted outline-none transition hover:bg-surface-hover focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {tripDates.map(
                                          (
                                            date,
                                            index
                                          ) => (
                                            <option
                                              key={
                                                date
                                              }
                                              value={
                                                date
                                              }
                                            >
                                              Day{" "}
                                              {index +
                                                1}
                                              {" — "}
                                              {formatTripDay(
                                                date
                                              )}
                                            </option>
                                          )
                                        )}
                                      </select>
                                    </label>
                                  </>
                                )}

                                {canEditItem && (
                                  <Link
                                    href={`/trips/${tripId}/itinerary/edit/${item.id}`}
                                    className="rounded-lg px-2.5 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 hover:text-brand-800"
                                  >
                                    Edit
                                  </Link>
                                )}
                              </div>
                            </div>

                            {hasConflict && (
                              <div className="mt-4 rounded-xl border border-danger-border bg-danger-surface px-3 py-2.5 text-xs leading-5 text-danger-text">
                                This
                                entry
                                overlaps
                                another
                                explicitly
                                timed item
                                on this
                                day.
                              </div>
                            )}

                            <ItineraryItemDetails
                              item={
                                item
                              }
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
  );
}