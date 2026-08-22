import {
  formatItineraryDate,
  formatItineraryTime,
  type ItineraryItem,
} from "@/lib/itinerary";

type ItineraryItemDetailsProps = {
  item: ItineraryItem;
};

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

  return (
    <div className="mt-4 space-y-3 text-sm text-muted">
      {item.description && (
        <p className="leading-6">
          {item.description}
        </p>
      )}

      {/* Activity */}
      {item.item_type ===
        "activity" && (
        <>
          {item.location_name && (
            <p>
              <span className="font-medium text-ink">
                Location:
              </span>{" "}
              {item.location_name}
            </p>
          )}

          {item.address && (
            <p>{item.address}</p>
          )}

          {item.scheduled_date && (
            <p>
              <span className="font-medium text-ink">
                Day:
              </span>{" "}
              {formatItineraryDate(
                item.scheduled_date
              )}
            </p>
          )}

          {(startTime ||
            endTime) && (
            <p>
              <span className="font-medium text-ink">
                Time:
              </span>{" "}
              {startTime ?? "TBC"}

              {endTime
                ? ` – ${endTime}`
                : ""}
            </p>
          )}

          {item.website_url && (
            <a
              href={item.website_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block font-medium text-brand-700 hover:text-brand-800"
            >
              Open website →
            </a>
          )}
        </>
      )}

      {/* Transport */}
      {item.item_type ===
        "transport" && (
        <>
          {(item.transport_mode ||
            item.provider ||
            item.reference_number) && (
            <p>
              {[
                item.transport_mode,
                item.provider,
                item.reference_number,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {item.departure_location && (
            <div>
              <p className="font-medium text-ink">
                Departure
              </p>

              <p className="mt-1">
                {
                  item.departure_location
                }
              </p>

              {item.departure_date && (
                <p>
                  {formatItineraryDate(
                    item.departure_date
                  )}
                  {departureTime
                    ? ` at ${departureTime}`
                    : ""}
                </p>
              )}

              {item.departure_details && (
                <p>
                  {
                    item.departure_details
                  }
                </p>
              )}
            </div>
          )}

          {item.arrival_location && (
            <div>
              <p className="font-medium text-ink">
                Arrival
              </p>

              <p className="mt-1">
                {item.arrival_location}
              </p>

              {item.arrival_date && (
                <p>
                  {formatItineraryDate(
                    item.arrival_date
                  )}
                  {arrivalTime
                    ? ` at ${arrivalTime}`
                    : ""}
                </p>
              )}

              {item.arrival_details && (
                <p>
                  {item.arrival_details}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Accommodation */}
      {item.item_type ===
        "accommodation" && (
        <>
          {item.location_name && (
            <p>
              <span className="font-medium text-ink">
                Location:
              </span>{" "}
              {item.location_name}
            </p>
          )}

          {item.address && (
            <p>{item.address}</p>
          )}

          {item.provider && (
            <p>
              <span className="font-medium text-ink">
                Provider:
              </span>{" "}
              {item.provider}
            </p>
          )}

          {item.check_in_date && (
            <p>
              <span className="font-medium text-ink">
                Check-in:
              </span>{" "}
              {formatItineraryDate(
                item.check_in_date
              )}
              {checkInTime
                ? ` at ${checkInTime}`
                : ""}
            </p>
          )}

          {item.check_out_date && (
            <p>
              <span className="font-medium text-ink">
                Check-out:
              </span>{" "}
              {formatItineraryDate(
                item.check_out_date
              )}
              {checkOutTime
                ? ` at ${checkOutTime}`
                : ""}
            </p>
          )}

          {item.check_in_instructions && (
            <div>
              <p className="font-medium text-ink">
                Check-in instructions
              </p>

              <p className="mt-1 leading-6">
                {
                  item.check_in_instructions
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Booking */}
      {item.booking_reference && (
        <p>
          <span className="font-medium text-ink">
            Booking reference:
          </span>{" "}
          {item.booking_reference}
        </p>
      )}

      {item.booking_url && (
        <a
          href={item.booking_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block font-medium text-brand-700 hover:text-brand-800"
        >
          Open booking →
        </a>
      )}

      {/* Notes */}
      {item.notes && (
        <div className="rounded-xl border border-line bg-surface-soft p-3">
          <p className="font-medium text-ink">
            Notes
          </p>

          <p className="mt-1 whitespace-pre-wrap leading-6">
            {item.notes}
          </p>
        </div>
      )}
    </div>
  );
}