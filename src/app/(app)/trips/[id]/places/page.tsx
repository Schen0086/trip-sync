import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import PlaceDiscoveryPanel from "@/components/place-discovery-panel";
import SavedPlacesList from "@/components/saved-places-list";
import TripMap from "@/components/trip-map";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  buildTripMapPoints,
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
    redirect(
      "/dashboard"
    );
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
    .eq(
      "trip_id",
      trip.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

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

  if (
    authorIds.length >
    0
  ) {
    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        username
      `)
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

  const savedPlaces:
    SavedPlace[] =
    rawPlaces.map(
      (place) => ({
        ...place,

        author:
          authorMap.get(
            place.saved_by
          ) ?? null,
      })
    );

  // Linked itinerary + map data
  const {
    data: rawItineraryData,
    error: itineraryError,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .select(`
      id,
      source_saved_place_id,
      item_type,
      planning_status,
      title,
      scheduled_date,
      location_name,
      address,
      latitude,
      longitude,
      departure_location,
      departure_address,
      departure_latitude,
      departure_longitude,
      departure_date,
      arrival_location,
      arrival_address,
      arrival_latitude,
      arrival_longitude,
      arrival_date,
      check_in_date,
      check_out_date
    `)
    .eq(
      "trip_id",
      trip.id
    );

  if (itineraryError) {
    console.error(
      "Failed to load map itinerary items:",
      itineraryError
    );
  }

  const itineraryItems =
    (rawItineraryData ??
      []) as MapItineraryItem[];

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
        <BackButton
          fallbackHref={`/trips/${trip.id}`}
        />

        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                {
                  trip.name
                }
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                Places
              </h1>

              <p className="mt-2 text-muted">
                Discover, shortlist
                and plan places
                around{" "}
                {
                  trip.destination
                }.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/trips/${trip.id}/map`}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
              >
                Full map
              </Link>

              <Link
                href={`/trips/${trip.id}/places/new`}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
              >
                Save a
                place
              </Link>
            </div>
          </div>
        </header>

        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

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

        {placesError && (
          <div className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
            Unable to load
            saved places:{" "}
            {
              placesError.message
            }
          </div>
        )}

        {itineraryError && (
          <div className="mt-4 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            Saved places
            loaded, but some
            planning statuses
            could not be loaded.
          </div>
        )}

        {/* Discovery is collapsible because
            it takes substantial vertical space. */}
        <details
          open
          className="group mt-10"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
            <div>
              <p className="font-semibold text-ink">
                Place discovery
              </p>

              <p className="mt-1 text-sm text-muted">
                Search nearby
                restaurants,
                attractions and
                other places.
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

          <div className="mt-4">
            <PlaceDiscoveryPanel
              tripId={
                trip.id
              }
              tripDestination={
                trip.destination
              }
              savedGeoapifyIds={
                savedGeoapifyIds
              }
            />
          </div>
        </details>

        {/* Collapsible map preview */}
        <details
          id="places-map-section"
          open
          className="group mt-10 scroll-mt-40 overflow-hidden rounded-2xl border border-line bg-surface"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Trip map
              </h2>

              <p className="mt-1 text-sm text-muted">
                Saved ideas,
                voting options and
                confirmed plans.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href={`/trips/${trip.id}/map`}
                className="text-sm font-medium text-brand-700"
              >
                Full map →
              </Link>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-5 w-5 text-muted transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </summary>

          <div className="border-t border-line p-4 sm:p-6">
            <TripMap
              apiKey={
                mapKey
              }
              points={
                mapPoints
              }
              tripDates={
                tripDates
              }
            />
          </div>
        </details>

        <div className="mt-12 border-t border-line pt-10">
          <SavedPlacesList
            tripId={
              trip.id
            }
            tripType={
              trip.trip_type
            }
            startDate={
              trip.start_date
            }
            endDate={
              trip.end_date
            }
            currentUserId={
              userId
            }
            isTripCreator={
              isTripCreator
            }
            places={
              savedPlaces
            }
            itineraryItems={
              itineraryItems
            }
          />
        </div>

        <p className="mt-10 text-center text-xs text-subtle">
          Place discovery and
          map data powered by
          Geoapify and
          OpenStreetMap.
        </p>
      </div>
    </main>
  );
}