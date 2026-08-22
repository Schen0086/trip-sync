import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TripCard from "@/components/trip-card";
import {
  getTripLifecycle,
  type TripLifecycle,
} from "@/lib/trip-utils";

type DashboardPageProps = {
  searchParams: Promise<{
    success?: string;
  }>;
};

type DashboardTrip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  trip_type: string;
  status: string;
  groups:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type TripSectionProps = {
  title: string;
  description: string;
  trips: DashboardTrip[];
  participantCounts: Record<
    string,
    number
  >;
};

function TripSection({
  title,
  description,
  trips,
  participantCounts,
}: TripSectionProps) {
  if (trips.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      {/* Section heading */}
      <div>
        <h3 className="text-xl font-semibold text-ink">
          {title}
        </h3>

        <p className="mt-1 text-sm text-muted">
          {description}
        </p>
      </div>

      {/* Trip cards */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => {
          const group = Array.isArray(
            trip.groups
          )
            ? trip.groups[0]
            : trip.groups;

          return (
            <TripCard
              key={trip.id}
              id={trip.id}
              name={trip.name}
              destination={
                trip.destination
              }
              startDate={
                trip.start_date
              }
              endDate={trip.end_date}
              tripType={trip.trip_type}
              status={trip.status}
              groupName={
                group?.name ?? null
              }
              participantCount={
                participantCounts[
                  trip.id
                ] ?? 0
              }
            />
          );
        })}
      </div>
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const query = await searchParams;

  const supabase = await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Load user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  // Find trips user is attending
  const { data: participations } =
    await supabase
      .from("trip_participants")
      .select("trip_id")
      .eq("user_id", userId);

  const tripIds =
    participations?.map(
      (participation) =>
        participation.trip_id
    ) ?? [];

  let trips: DashboardTrip[] = [];

  // Load attending trips
  if (tripIds.length > 0) {
    const { data: tripData } =
      await supabase
        .from("trips")
        .select(`
          id,
          name,
          destination,
          start_date,
          end_date,
          budget,
          trip_type,
          status,
          groups (
            name
          )
        `)
        .in("id", tripIds)
        .order("start_date", {
          ascending: true,
        });

    trips =
      (tripData ?? []) as DashboardTrip[];
  }

  // Count participants
  const participantCounts: Record<
    string,
    number
  > = {};

  if (tripIds.length > 0) {
    const { data: participantRows } =
      await supabase
        .from("trip_participants")
        .select("trip_id")
        .in("trip_id", tripIds);

    participantRows?.forEach(
      (participant) => {
        participantCounts[
          participant.trip_id
        ] =
          (
            participantCounts[
              participant.trip_id
            ] ?? 0
          ) + 1;
      }
    );
  }

  // Organise trips
  const tripSections: Record<
    TripLifecycle,
    DashboardTrip[]
  > = {
    ongoing: [],
    upcoming: [],
    past: [],
    cancelled: [],
  };

  trips.forEach((trip) => {
    const lifecycle =
      getTripLifecycle(
        trip.status,
        trip.start_date,
        trip.end_date
      );

    tripSections[lifecycle].push(
      trip
    );
  });

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Page heading */}
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Welcome,{" "}
            {profile?.display_name ??
              "Traveller"}
          </h1>

          <p className="mt-2 text-muted">
            Plan and keep track of the
            trips you&apos;re attending.
          </p>
        </header>

        {/* Success message */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Trips */}
        <section className="mt-10">
          <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Your trips
              </h2>

              <p className="mt-1 text-muted">
                Personal trips and group
                trips you&apos;re attending.
              </p>
            </div>

            {/* Trip actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/groups"
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Groups
              </Link>

              <Link
                href="/trips/new"
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Create trip
              </Link>
            </div>
          </div>

          {/* Empty state */}
          {trips.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-8">
              <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-300 bg-brand-50 text-lg font-semibold text-brand-700">
                  T
                </div>

                <h3 className="mt-5 text-lg font-semibold text-ink">
                  No trips yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Create a personal trip
                  or start planning
                  something with your
                  friends.
                </p>

                <Link
                  href="/trips/new"
                  className="mt-6 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                >
                  Create your first trip
                </Link>
              </div>
            </div>
          ) : (
            <>
              <TripSection
                title="In progress"
                description="Trips happening right now."
                trips={
                  tripSections.ongoing
                }
                participantCounts={
                  participantCounts
                }
              />

              <TripSection
                title="Upcoming"
                description="Trips you have coming up."
                trips={
                  tripSections.upcoming
                }
                participantCounts={
                  participantCounts
                }
              />

              <TripSection
                title="Past trips"
                description="Trips you've already completed."
                trips={
                  tripSections.past
                }
                participantCounts={
                  participantCounts
                }
              />

              <TripSection
                title="Cancelled"
                description="Trips that have been cancelled."
                trips={
                  tripSections.cancelled
                }
                participantCounts={
                  participantCounts
                }
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}