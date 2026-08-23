import Link from "next/link";
import {
  redirect,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import TripMap from "@/components/trip-map";
import {
  buildTripMapPoints,
  type MapItineraryItem,
  type SavedPlace,
} from "@/lib/places";
import {
  getTripDates,
} from "@/lib/itinerary";

type TripMapPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TripMapPage({
  params,
}: TripMapPageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  // Authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  // Trip
  const { data: trip } =
    await supabase
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
    redirect("/dashboard");
  }

  // Saved places
  const {
    data: placeData,
    error: placeError,
  } = await supabase
    .from("saved_places")
    .select("*")
    .eq("trip_id", trip.id);

  if (placeError) {
    console.error(
      "Failed to load map places:",
      placeError
    );
  }

  // Itinerary locations
  const {
    data: itineraryData,
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

  const points =
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

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
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
                Trip map
              </h1>

              <p className="mt-2 text-muted">
                {trip.destination}
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

        {/* Map */}
        <section className="mt-8">
          <TripMap
            apiKey={mapKey}
            points={points}
            tripDates={
              tripDates
            }
            large
          />
        </section>

        {/* Help */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">
            Map filters
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            Use All to see the
            complete trip, Saved to
            see undecided places, or a
            specific day to see the
            confirmed locations
            relevant to that day.
          </p>
        </section>
      </div>
    </main>
  );
}