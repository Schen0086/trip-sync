import LocationSearchInput from "@/components/location-search-input";
import {
  type ItineraryItem,
  type ItineraryItemType,
} from "@/lib/itinerary";

type ItineraryEntryFieldsProps = {
  itemType: ItineraryItemType;

  tripStartDate: string;
  tripEndDate: string;

  planned: boolean;

  defaults?: Partial<ItineraryItem>;
};

export default function ItineraryEntryFields({
  itemType,
  tripStartDate,
  tripEndDate,
  planned,
  defaults = {},
}: ItineraryEntryFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {itemType === "accommodation"
            ? "Accommodation name"
            : itemType === "transport"
              ? "Transport title"
              : "Activity name"}
        </label>

        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={defaults.title ?? ""}
          placeholder={
            itemType === "accommodation"
              ? "Hotel, Airbnb, apartment..."
              : itemType === "transport"
                ? "Flight to Paris"
                : "Visit the Louvre"
          }
          className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={
            defaults.description ?? ""
          }
          placeholder="Add any useful details..."
          className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Activity */}
      {itemType === "activity" && (
        <>
          <LocationSearchInput
            label="Location"
            inputName="locationName"
            addressName="address"
            latitudeName="latitude"
            longitudeName="longitude"
            defaultValue={
              defaults.location_name
            }
            defaultAddress={
              defaults.address
            }
            defaultLatitude={
              defaults.latitude
            }
            defaultLongitude={
              defaults.longitude
            }
            placeholder="Restaurant, attraction, address..."
          />

          <div className="grid gap-5 sm:grid-cols-3">
            {/* Activity date */}
            <div>
              <label
                htmlFor="scheduledDate"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                {planned
                  ? "Day"
                  : "Suggested day"}
              </label>

              <input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                required={planned}
                min={tripStartDate}
                max={tripEndDate}
                defaultValue={
                  defaults.scheduled_date ??
                  ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Start */}
            <div>
              <label
                htmlFor="startTime"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Start time
              </label>

              <input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={
                  defaults.start_time?.slice(
                    0,
                    5
                  ) ?? ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* End */}
            <div>
              <label
                htmlFor="endTime"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                End time
              </label>

              <input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={
                  defaults.end_time?.slice(
                    0,
                    5
                  ) ?? ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label
              htmlFor="websiteUrl"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Website or booking link
            </label>

            <input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              defaultValue={
                defaults.website_url ?? ""
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </>
      )}

      {/* Transport */}
      {itemType === "transport" && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Transport mode */}
            <div>
              <label
                htmlFor="transportMode"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Transport type
              </label>

              <select
                id="transportMode"
                name="transportMode"
                defaultValue={
                  defaults.transport_mode ??
                  ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                <option value="">
                  Select type
                </option>

                <option value="flight">
                  Flight
                </option>

                <option value="train">
                  Train
                </option>

                <option value="bus">
                  Bus
                </option>

                <option value="ferry">
                  Ferry
                </option>

                <option value="car">
                  Car
                </option>

                <option value="taxi">
                  Taxi / rideshare
                </option>

                <option value="metro">
                  Metro / public transport
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            {/* Provider */}
            <div>
              <label
                htmlFor="provider"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Provider
              </label>

              <input
                id="provider"
                name="provider"
                type="text"
                defaultValue={
                  defaults.provider ?? ""
                }
                placeholder="Ryanair, Eurostar..."
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* Reference number */}
          <div>
            <label
              htmlFor="referenceNumber"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Flight / train / service number
            </label>

            <input
              id="referenceNumber"
              name="referenceNumber"
              type="text"
              defaultValue={
                defaults.reference_number ??
                ""
              }
              placeholder="FR1234, IC204..."
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          {/* Departure */}
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <h3 className="font-semibold text-ink">
              Departure
            </h3>

            <div className="mt-5 space-y-5">
              <LocationSearchInput
                label="Departure location"
                inputName="departureLocation"
                addressName="departureAddress"
                latitudeName="departureLatitude"
                longitudeName="departureLongitude"
                defaultValue={
                  defaults.departure_location
                }
                defaultAddress={
                  defaults.departure_address
                }
                defaultLatitude={
                  defaults.departure_latitude
                }
                defaultLongitude={
                  defaults.departure_longitude
                }
                required={planned}
                placeholder="Airport, station, port..."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Departure date */}
                <div>
                  <label
                    htmlFor="departureDate"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Departure date
                  </label>

                  <input
                    id="departureDate"
                    name="departureDate"
                    type="date"
                    required={planned}
                    min={tripStartDate}
                    max={tripEndDate}
                    defaultValue={
                      defaults.departure_date ??
                      ""
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                {/* Departure time */}
                <div>
                  <label
                    htmlFor="departureTime"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Departure time
                  </label>

                  <input
                    id="departureTime"
                    name="departureTime"
                    type="time"
                    defaultValue={
                      defaults.departure_time?.slice(
                        0,
                        5
                      ) ?? ""
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>

              {/* Departure details */}
              <div>
                <label
                  htmlFor="departureDetails"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Terminal, gate, platform or pickup details
                </label>

                <input
                  id="departureDetails"
                  name="departureDetails"
                  type="text"
                  defaultValue={
                    defaults.departure_details ??
                    ""
                  }
                  placeholder="Terminal 1, Gate 105..."
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>

          {/* Arrival */}
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <h3 className="font-semibold text-ink">
              Arrival
            </h3>

            <div className="mt-5 space-y-5">
              <LocationSearchInput
                label="Arrival location"
                inputName="arrivalLocation"
                addressName="arrivalAddress"
                latitudeName="arrivalLatitude"
                longitudeName="arrivalLongitude"
                defaultValue={
                  defaults.arrival_location
                }
                defaultAddress={
                  defaults.arrival_address
                }
                defaultLatitude={
                  defaults.arrival_latitude
                }
                defaultLongitude={
                  defaults.arrival_longitude
                }
                required={planned}
                placeholder="Airport, station, port..."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Arrival date */}
                <div>
                  <label
                    htmlFor="arrivalDate"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Arrival date
                  </label>

                  <input
                    id="arrivalDate"
                    name="arrivalDate"
                    type="date"
                    required={planned}
                    min={tripStartDate}
                    max={tripEndDate}
                    defaultValue={
                      defaults.arrival_date ??
                      ""
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                {/* Arrival time */}
                <div>
                  <label
                    htmlFor="arrivalTime"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Arrival time
                  </label>

                  <input
                    id="arrivalTime"
                    name="arrivalTime"
                    type="time"
                    defaultValue={
                      defaults.arrival_time?.slice(
                        0,
                        5
                      ) ?? ""
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>

              {/* Arrival details */}
              <div>
                <label
                  htmlFor="arrivalDetails"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Arrival details
                </label>

                <input
                  id="arrivalDetails"
                  name="arrivalDetails"
                  type="text"
                  defaultValue={
                    defaults.arrival_details ??
                    ""
                  }
                  placeholder="Terminal, platform, transfer details..."
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Accommodation */}
      {itemType === "accommodation" && (
        <>
          <LocationSearchInput
            label="Accommodation location"
            inputName="locationName"
            addressName="address"
            latitudeName="latitude"
            longitudeName="longitude"
            defaultValue={
              defaults.location_name
            }
            defaultAddress={
              defaults.address
            }
            defaultLatitude={
              defaults.latitude
            }
            defaultLongitude={
              defaults.longitude
            }
            placeholder="Hotel, apartment or address"
          />

          {/* Booking provider */}
          <div>
            <label
              htmlFor="provider"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Booking provider
            </label>

            <input
              id="provider"
              name="provider"
              type="text"
              defaultValue={
                defaults.provider ?? ""
              }
              placeholder="Airbnb, Booking.com, hotel directly..."
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          {/* Accommodation dates */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Check-in date */}
            <div>
              <label
                htmlFor="checkInDate"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Check-in date
              </label>

              <input
                id="checkInDate"
                name="checkInDate"
                type="date"
                required={planned}
                min={tripStartDate}
                max={tripEndDate}
                defaultValue={
                  defaults.check_in_date ??
                  ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Check-in time */}
            <div>
              <label
                htmlFor="checkInTime"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Check-in time
              </label>

              <input
                id="checkInTime"
                name="checkInTime"
                type="time"
                defaultValue={
                  defaults.check_in_time?.slice(
                    0,
                    5
                  ) ?? ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Check-out date */}
            <div>
              <label
                htmlFor="checkOutDate"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Check-out date
              </label>

              <input
                id="checkOutDate"
                name="checkOutDate"
                type="date"
                required={planned}
                min={tripStartDate}
                max={tripEndDate}
                defaultValue={
                  defaults.check_out_date ??
                  ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Check-out time */}
            <div>
              <label
                htmlFor="checkOutTime"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Check-out time
              </label>

              <input
                id="checkOutTime"
                name="checkOutTime"
                type="time"
                defaultValue={
                  defaults.check_out_time?.slice(
                    0,
                    5
                  ) ?? ""
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label
              htmlFor="checkInInstructions"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Check-in instructions
            </label>

            <textarea
              id="checkInInstructions"
              name="checkInInstructions"
              rows={3}
              defaultValue={
                defaults.check_in_instructions ??
                ""
              }
              placeholder="Key collection, reception hours, door code..."
              className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </>
      )}

      {/* Booking information */}
      {(itemType === "transport" ||
        itemType === "accommodation") && (
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Reference */}
          <div>
            <label
              htmlFor="bookingReference"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Booking reference
            </label>

            <input
              id="bookingReference"
              name="bookingReference"
              type="text"
              defaultValue={
                defaults.booking_reference ??
                ""
              }
              placeholder="Reservation / confirmation number"
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          {/* Booking URL */}
          <div>
            <label
              htmlFor="bookingUrl"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Booking link
            </label>

            <input
              id="bookingUrl"
              name="bookingUrl"
              type="url"
              defaultValue={
                defaults.booking_url ?? ""
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Important notes
        </label>

        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={
            defaults.notes ?? ""
          }
          placeholder="Tickets, luggage rules, cancellation details, meeting point, anything else worth remembering..."
          className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>
    </div>
  );
}