import Link from "next/link";
import {
  redirect,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import PlaceDiscoveryPanel from "@/components/place-discovery-panel";
import TripMap from "@/components/trip-map";
import {
  addSavedPlaceToItinerary,
  suggestSavedPlace,
} from "./actions";
import {
  buildTripMapPoints,
  getPlaceCategoryLabel,
  getSavedPlaceAuthor,
  type MapItineraryItem,
  type SavedPlace,
} from "@/lib/places";
import {
  getTripDates,
  type ProfileSummary,
} from "@/lib/itinerary";

type PlacesPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function PlacesPage({
  params,
  searchParams,
}: PlacesPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  // Authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
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
      destination,
      trip_type,
      owner_id,
      start_date,
      end_date
    `)
    .eq("id", id)
    .maybeSingle();

  if (tripError) {
    console.error(
      "Failed to load places trip:",
      tripError
    );
  }

  if (!trip) {
    redirect("/dashboard");
  }

  const isTripCreator =
    trip.owner_id ===
    userId;

  // Saved places
  const {
    data: rawPlaceData,
    error: placesError,
  } = await supabase
    .from("saved_places")
    .select("*")
    .eq("trip_id", trip.id)
    .order("created_at", {
      ascending: false,
    });

  if (placesError) {
    console.error(
      "Failed to load saved places:",
      placesError
    );
  }

  const rawPlaces =
    (rawPlaceData ??
      []) as SavedPlace[];

  // Saved-by profiles
  const authorIds = [
    ...new Set(
      rawPlaces.map(
        (place) =>
          place.saved_by
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
    } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username"
      )
      .in(
        "id",
        authorIds
      );

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

  const savedPlaces =
    rawPlaces.map(
      (place) => ({
        ...place,

        author:
          authorMap.get(
            place.saved_by
          ) ?? null,
      })
    );

  // Itinerary items linked to saved places
  // plus confirmed items needed by the map.
  const {
    data: rawItineraryData,
    error: itineraryError,
  } = await supabase
    .from("itinerary_items")
    .select(`
      id,
      source_saved_place_id,
      item_type,
      planning_status,
      title,
      scheduled_date,
      location_name,
      latitude,
      longitude,
      departure_location,
      departure_latitude,
      departure_longitude,
      departure_date,
      arrival_location,
      arrival_latitude,
      arrival_longitude,
      arrival_date,
      check_in_date,
      check_out_date
    `)
    .eq("trip_id", trip.id);

  if (itineraryError) {
    console.error(
      "Failed to load map itinerary items:",
      itineraryError
    );
  }

  const itineraryItems =
    (rawItineraryData ??
      []) as MapItineraryItem[];

  // Link saved places to itinerary/backlog item
  const linkedItemByPlace =
    new Map<
      string,
      MapItineraryItem
    >();

  itineraryItems.forEach(
    (item) => {
      if (
        item.source_saved_place_id
      ) {
        linkedItemByPlace.set(
          item.source_saved_place_id,
          item
        );
      }
    }
  );

  // Map data
  const mapPoints =
    buildTripMapPoints(
      savedPlaces,
      itineraryItems,
      trip.id
    );

  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );

  const mapKey =
    process.env
      .NEXT_PUBLIC_GEOAPIFY_MAP_KEY ??
    "";

  const savedGeoapifyIds =
    savedPlaces
      .map(
        (place) =>
          place.geoapify_place_id
      )
      .filter(
        (
          value
        ): value is string =>
          Boolean(value)
      );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Back */}
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
                Places
              </h1>

              <p className="mt-2 text-muted">
                Discover and save
                places around{" "}
                {trip.destination}.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/trips/${trip.id}/map`}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
              >
                Open map
              </Link>

              <Link
                href={`/trips/${trip.id}/places/new`}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
              >
                Save a place
              </Link>
            </div>
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

        {/* Loading errors */}
        {placesError && (
          <div className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
            Unable to load saved
            places:{" "}
            {placesError.message}
          </div>
        )}

        {/* Discovery */}
        <div className="mt-10">
          <PlaceDiscoveryPanel
            tripId={trip.id}
            tripDestination={
              trip.destination
            }
            savedGeoapifyIds={
              savedGeoapifyIds
            }
          />
        </div>

        {/* Map preview */}
        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Trip map
              </h2>

              <p className="mt-1 text-muted">
                Saved ideas and
                confirmed itinerary
                locations.
              </p>
            </div>

            <Link
              href={`/trips/${trip.id}/map`}
              className="text-sm font-medium text-brand-700"
            >
              Full map →
            </Link>
          </div>

          <div className="mt-5">
            <TripMap
              apiKey={mapKey}
              points={mapPoints}
              tripDates={
                tripDates
              }
            />
          </div>
        </section>

        {/* Saved places */}
        <section className="mt-12 border-t border-line pt-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Saved places
            </h2>

            <p className="mt-1 text-muted">
              The group&apos;s shared
              shortlist.
            </p>
          </div>

          {savedPlaces.length ===
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
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {savedPlaces.map(
                (place) => {
                  const author =
                    getSavedPlaceAuthor(
                      place
                    );

                  const linkedItem =
                    linkedItemByPlace.get(
                      place.id
                    );

                  const canEdit =
                    isTripCreator ||
                    place.saved_by ===
                      userId;

                  return (
                    <article
                      key={place.id}
                      id={`place-${place.id}`}
                      className="scroll-mt-28 rounded-2xl border border-line bg-surface p-6"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                            {getPlaceCategoryLabel(
                              place.category
                            )}
                          </span>

                          <h3 className="mt-4 text-xl font-semibold text-ink">
                            {place.name}
                          </h3>

                          <p className="mt-1 text-xs text-subtle">
                            Saved by{" "}
                            {author?.display_name ??
                              "Traveller"}

                            {author?.username
                              ? ` (@${author.username})`
                              : ""}
                          </p>
                        </div>

                        {canEdit && (
                          <Link
                            href={`/trips/${trip.id}/places/edit/${place.id}`}
                            className="text-sm font-medium text-brand-700"
                          >
                            Edit
                          </Link>
                        )}
                      </div>

                      {/* Details */}
                      {place.address && (
                        <p className="mt-4 text-sm leading-6 text-muted">
                          {place.address}
                        </p>
                      )}

                      {place.notes && (
                        <div className="mt-4 rounded-xl border border-line bg-surface-soft p-4">
                          <p className="text-sm whitespace-pre-wrap leading-6 text-muted">
                            {place.notes}
                          </p>
                        </div>
                      )}

                      {place.website_url && (
                        <a
                          href={
                            place.website_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-block text-sm font-medium text-brand-700"
                        >
                          Open website →
                        </a>
                      )}

                      {/* Already connected */}
                      {linkedItem ? (
                        <div className="mt-6 border-t border-line pt-4">
                          {linkedItem.planning_status ===
                          "planned" ? (
                            <Link
                              href={`/trips/${trip.id}/itinerary`}
                              className="text-sm font-medium text-brand-700"
                            >
                              Already in itinerary →
                            </Link>
                          ) : (
                            <Link
                              href={`/trips/${trip.id}/voting#item-${linkedItem.id}`}
                              className="text-sm font-medium text-brand-700"
                            >
                              In voting backlog →
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="mt-6 border-t border-line pt-5">
                          <div className="flex flex-col gap-3">
                            {/* Suggest to group */}
                            {trip.trip_type ===
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
                                    trip.id
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
                                  Suggest to group
                                </button>
                              </form>
                            )}

                            {/* Direct scheduling */}
                            {isTripCreator && (
                              <details className="rounded-xl border border-line bg-surface-soft">
                                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
                                  Add directly to itinerary
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
                                      trip.id
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
                                        trip.start_date
                                      }
                                      max={
                                        trip.end_date
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
                                        Start time
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
                                        End time
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
                                    Add to itinerary
                                  </button>
                                </form>
                              </details>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        <p className="mt-10 text-center text-xs text-subtle">
          Place discovery and map
          data powered by Geoapify
          and OpenStreetMap.
        </p>
      </div>
    </main>
  );
}