import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import TripMap from "@/components/trip-map";
import TripMapDeepLink from "@/components/trip-map-deep-link";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  buildTripMapPoints,
  type MapItineraryItem,
  type SavedPlace,
  type TripMapPoint,
} from "@/lib/places";

import {
  getTripDates,
} from "@/lib/itinerary";

type TripMapPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    focus?: string;
    day?: string;
  }>;
};

function getItineraryItemIdFromPoint(
  pointId: string
) {
  const prefixes = [
    "activity-",
    "accommodation-",
    "transport-departure-",
    "transport-arrival-",
  ];

  for (
    const prefix of
    prefixes
  ) {
    if (
      pointId.startsWith(
        prefix
      )
    ) {
      return pointId.slice(
        prefix.length
      );
    }
  }

  return null;
}

function getItineraryDisplayDay(
  item: MapItineraryItem
) {
  if (
    item.item_type ===
    "activity"
  ) {
    return (
      item.scheduled_date ??
      null
    );
  }

  if (
    item.item_type ===
    "transport"
  ) {
    return (
      item.departure_date ??
      item.arrival_date ??
      null
    );
  }

  if (
    item.item_type ===
    "accommodation"
  ) {
    return (
      item.check_in_date ??
      null
    );
  }

  return null;
}

function addItineraryDeepLinks(
  points:
    TripMapPoint[],
  itineraryItems:
    MapItineraryItem[],
  tripId: string
) {
  const itemById =
    new Map(
      itineraryItems.map(
        (item) => [
          item.id,
          item,
        ]
      )
    );

  return points.map(
    (point) => {
      const itemId =
        getItineraryItemIdFromPoint(
          point.id
        );

      if (!itemId) {
        return point;
      }

      const item =
        itemById.get(
          itemId
        );

      if (!item) {
        return point;
      }

      const displayDay =
        getItineraryDisplayDay(
          item
        );

      const params =
        new URLSearchParams();

      if (displayDay) {
        params.set(
          "day",
          displayDay
        );
      }

      params.set(
        "item",
        item.id
      );

      return {
        ...point,

        href:
          `/trips/${tripId}/itinerary?` +
          params.toString(),
      };
    }
  );
}

export default async function TripMapPage({
  params,
  searchParams,
}: TripMapPageProps) {
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

  const {
    data: trip,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      destination,
      start_date,
      end_date
    `)
    .eq("id", id)
    .maybeSingle();

  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data: placeData,
    error: placeError,
  } = await supabase
    .from("saved_places")
    .select("*")
    .eq(
      "trip_id",
      trip.id
    );

  if (placeError) {
    console.error(
      "Failed to load map places:",
      placeError
    );
  }

  const {
    data: itineraryData,
    error:
      itineraryError,
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
      "Failed to load map itinerary:",
      itineraryError
    );
  }

  const savedPlaces =
    (placeData ??
      []) as SavedPlace[];

  const itineraryItems =
    (itineraryData ??
      []) as MapItineraryItem[];

  const basePoints =
    buildTripMapPoints(
      savedPlaces,
      itineraryItems,
      trip.id
    );

  // Replace generic itinerary links
  // with links to the exact item.
  const points =
    addItineraryDeepLinks(
      basePoints,
      itineraryItems,
      trip.id
    );

  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );

  // Only honour valid map deep links.
  const initialFocusPointId =
    query.focus &&
    points.some(
      (point) =>
        point.id ===
        query.focus
    )
      ? query.focus
      : null;

  const initialDay =
    query.day &&
    tripDates.includes(
      query.day
    )
      ? query.day
      : null;

  const mapKey =
    process.env
      .NEXT_PUBLIC_GEOAPIFY_MAP_KEY ??
    "";

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
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
                Trip map
              </h1>

              <p className="mt-2 text-muted">
                {
                  trip.destination
                }
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/trips/${trip.id}/places`}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
              >
                Places
              </Link>

              <Link
                href={`/trips/${trip.id}/itinerary`}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
              >
                Itinerary
              </Link>
            </div>
          </div>
        </header>

        {/* Apply itinerary deep-link filters
            and focus once the map is ready. */}
        <TripMapDeepLink
          focusPointId={
            initialFocusPointId
          }
          day={
            initialDay
          }
        />

        <section className="mt-8">
          <TripMap
            apiKey={
              mapKey
            }
            points={
              points
            }
            tripDates={
              tripDates
            }
            large
          />
        </section>

        <details className="group mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="font-semibold text-ink">
                How map
                filters work
              </h2>

              <p className="mt-1 text-sm text-muted">
                Filter by
                day, category
                or planning
                status.
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
              className="h-5 w-5 text-muted transition-transform group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>

          <div className="border-t border-line p-5">
            <p className="text-sm leading-6 text-muted">
              Day filters show
              confirmed locations
              relevant to that
              date. Opening the
              map from an itinerary
              item automatically
              selects the relevant
              day and focuses its
              marker. Status filters
              let you separate
              saved ideas, places
              currently being voted
              on, confirmed plans,
              rejected ideas and
              archived ideas.
              Category filters can
              isolate restaurants,
              attractions,
              accommodation,
              transport and other
              location types.
            </p>
          </div>
        </details>
      </div>
    </main>
  );
}