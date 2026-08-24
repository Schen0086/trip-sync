import {
  formatItineraryDate,
  formatItineraryTime,
  type ItineraryItem,
} from "@/lib/itinerary";

type ItineraryItemDetailsProps = {
  item: ItineraryItem;
};

function getNightCount(
  checkInDate:
    | string
    | null,
  checkOutDate:
    | string
    | null
) {
  if (
    !checkInDate ||
    !checkOutDate
  ) {
    return null;
  }

  const start =
    new Date(
      `${checkInDate}T00:00:00Z`
    );

  const end =
    new Date(
      `${checkOutDate}T00:00:00Z`
    );

  const nights =
    Math.round(
      (
        end.getTime() -
        start.getTime()
      ) /
        (
          24 *
          60 *
          60 *
          1000
        )
    );

  return nights >= 0
    ? nights
    : null;
}

export default function ItineraryItemDetails({
  item,
}: ItineraryItemDetailsProps) {
  const startTime =
    formatItineraryTime(
      item.start_time
    );

  const endTime =
    formatItineraryTime(
      item.end_time
    );

  const departureTime =
    formatItineraryTime(
      item.departure_time
    );

  const arrivalTime =
    formatItineraryTime(
      item.arrival_time
    );

  const checkInTime =
    formatItineraryTime(
      item.check_in_time
    );

  const checkOutTime =
    formatItineraryTime(
      item.check_out_time
    );

  const nightCount =
    getNightCount(
      item.check_in_date,
      item.check_out_date
    );

  return (
    <div className="mt-4 space-y-4 text-sm text-muted">
      {/* Description */}
      {item.description && (
        <p className="leading-6">
          {
            item.description
          }
        </p>
      )}

      {/* Activity */}
      {item.item_type ===
        "activity" && (
        <div className="space-y-3">
          {(item.location_name ||
            item.address) && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                Location
              </p>

              {item.location_name && (
                <p className="mt-2 font-medium text-ink">
                  {
                    item.location_name
                  }
                </p>
              )}

              {item.address && (
                <p className="mt-1 leading-5 text-muted">
                  {
                    item.address
                  }
                </p>
              )}
            </div>
          )}

          {(item.scheduled_date ||
            startTime ||
            endTime) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {item.scheduled_date && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                    Date
                  </p>

                  <p className="mt-2 font-medium text-ink">
                    {formatItineraryDate(
                      item.scheduled_date
                    )}
                  </p>
                </div>
              )}

              {(startTime ||
                endTime) && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                    Time
                  </p>

                  <p className="mt-2 font-medium text-ink">
                    {startTime ??
                      "TBC"}

                    {endTime
                      ? ` – ${endTime}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {item.website_url && (
            <a
              href={
                item.website_url
              }
              target="_blank"
              rel="noreferrer"
              className="inline-block font-medium text-brand-700 hover:text-brand-800"
            >
              Open
              website →
            </a>
          )}
        </div>
      )}

      {/* Transport */}
      {item.item_type ===
        "transport" && (
        <div className="space-y-4">
          {(item.transport_mode ||
            item.provider ||
            item.reference_number) && (
            <div className="flex flex-wrap gap-2">
              {item.transport_mode && (
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink">
                  {
                    item.transport_mode
                  }
                </span>
              )}

              {item.provider && (
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted">
                  {
                    item.provider
                  }
                </span>
              )}

              {item.reference_number && (
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted">
                  Ref{" "}
                  {
                    item.reference_number
                  }
                </span>
              )}
            </div>
          )}

          {/* Journey */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
            {/* Departure */}
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Departure
              </p>

              <p className="mt-2 font-semibold text-ink">
                {item.departure_location ??
                  "Departure"}
              </p>

              {item.departure_date && (
                <p className="mt-1 text-sm text-muted">
                  {formatItineraryDate(
                    item.departure_date
                  )}

                  {departureTime
                    ? ` · ${departureTime}`
                    : ""}
                </p>
              )}

              {item.departure_address && (
                <p className="mt-2 text-xs leading-5 text-subtle">
                  {
                    item.departure_address
                  }
                </p>
              )}

              {item.departure_details && (
                <p className="mt-2 text-sm leading-5 text-muted">
                  {
                    item.departure_details
                  }
                </p>
              )}
            </div>

            {/* Direction */}
            <div className="flex items-center justify-center text-subtle">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-5 w-5 rotate-90 sm:rotate-0"
              >
                <path d="M5 12h14" />

                <path d="m15 8 4 4-4 4" />
              </svg>
            </div>

            {/* Arrival */}
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Arrival
              </p>

              <p className="mt-2 font-semibold text-ink">
                {item.arrival_location ??
                  "Arrival"}
              </p>

              {item.arrival_date && (
                <p className="mt-1 text-sm text-muted">
                  {formatItineraryDate(
                    item.arrival_date
                  )}

                  {arrivalTime
                    ? ` · ${arrivalTime}`
                    : ""}
                </p>
              )}

              {item.arrival_address && (
                <p className="mt-2 text-xs leading-5 text-subtle">
                  {
                    item.arrival_address
                  }
                </p>
              )}

              {item.arrival_details && (
                <p className="mt-2 text-sm leading-5 text-muted">
                  {
                    item.arrival_details
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accommodation */}
      {item.item_type ===
        "accommodation" && (
        <div className="space-y-4">
          {/* Accommodation information */}
          {(item.location_name ||
            item.address ||
            item.provider ||
            nightCount !==
              null) && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                    Stay
                  </p>

                  {item.location_name && (
                    <p className="mt-2 font-semibold text-ink">
                      {
                        item.location_name
                      }
                    </p>
                  )}

                  {item.address && (
                    <p className="mt-1 leading-5 text-muted">
                      {
                        item.address
                      }
                    </p>
                  )}

                  {item.provider && (
                    <p className="mt-2 text-xs text-subtle">
                      Booked
                      with{" "}
                      {
                        item.provider
                      }
                    </p>
                  )}
                </div>

                {nightCount !==
                  null && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                    {
                      nightCount
                    }{" "}
                    {nightCount ===
                    1
                      ? "night"
                      : "nights"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Check in/out */}
          <div className="grid gap-3 sm:grid-cols-2">
            {item.check_in_date && (
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Check-in
                </p>

                <p className="mt-2 font-medium text-ink">
                  {formatItineraryDate(
                    item.check_in_date
                  )}
                </p>

                {checkInTime && (
                  <p className="mt-1 text-sm text-muted">
                    {
                      checkInTime
                    }
                  </p>
                )}
              </div>
            )}

            {item.check_out_date && (
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Check-out
                </p>

                <p className="mt-2 font-medium text-ink">
                  {formatItineraryDate(
                    item.check_out_date
                  )}
                </p>

                {checkOutTime && (
                  <p className="mt-1 text-sm text-muted">
                    {
                      checkOutTime
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Check-in instructions */}
          {item.check_in_instructions && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="font-medium text-ink">
                Check-in
                instructions
              </p>

              <p className="mt-2 whitespace-pre-wrap leading-6">
                {
                  item.check_in_instructions
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Booking */}
      {(item.booking_reference ||
        item.booking_url) && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Booking
            </p>

            {item.booking_reference && (
              <p className="mt-1 font-medium text-ink">
                Reference:{" "}
                {
                  item.booking_reference
                }
              </p>
            )}
          </div>

          {item.booking_url && (
            <a
              href={
                item.booking_url
              }
              target="_blank"
              rel="noreferrer"
              className="shrink-0 font-medium text-brand-700 hover:text-brand-800"
            >
              Open
              booking →
            </a>
          )}
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="font-medium text-ink">
            Notes
          </p>

          <p className="mt-2 whitespace-pre-wrap leading-6">
            {item.notes}
          </p>
        </div>
      )}
    </div>
  );
}