import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";

type TripPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TripPage({
  params,
}: TripPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // Load trip
  const { data: trip } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      destination,
      description,
      start_date,
      end_date,
      budget,
      trip_type,
      group_id,
      groups (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  if (!trip) {
    notFound();
  }

  // Get group
  const group = Array.isArray(trip.groups)
    ? trip.groups[0]
    : trip.groups;

  // Format start date
  const startDate = new Date(
    `${trip.start_date}T00:00:00`
  ).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Format end date
  const endDate = new Date(
    `${trip.end_date}T00:00:00`
  ).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/dashboard" />

        {/* Trip heading */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium capitalize text-brand-700">
              {trip.trip_type}
            </span>

            {group && (
              <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                {group.name}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">
            {trip.name}
          </h1>

          <p className="mt-2 text-lg text-muted">
            {trip.destination}
          </p>
        </header>

        {/* Trip details */}
        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">
              Start date
            </p>

            <p className="mt-2 font-medium text-ink">
              {startDate}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">
              End date
            </p>

            <p className="mt-2 font-medium text-ink">
              {endDate}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">
              Budget
            </p>

            <p className="mt-2 font-medium text-ink">
              {trip.budget !== null
                ? `€${Number(trip.budget).toLocaleString("en-IE")}`
                : "Not set"}
            </p>
          </div>
        </section>

        {/* Description */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold text-ink">
            About this trip
          </h2>

          <p className="mt-3 leading-7 text-muted">
            {trip.description ||
              "No description has been added yet."}
          </p>
        </section>

        {/* Planning sections */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-ink">
            Plan your trip
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Itinerary */}
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">
                Itinerary
              </h3>

              <p className="mt-2 text-sm text-muted">
                Plan each day of your trip.
              </p>
            </div>

            {/* Expenses */}
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">
                Expenses
              </h3>

              <p className="mt-2 text-sm text-muted">
                Track spending and shared costs.
              </p>
            </div>

            {/* Places */}
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">
                Places
              </h3>

              <p className="mt-2 text-sm text-muted">
                Save places you want to visit.
              </p>
            </div>

            {/* Packing */}
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">
                Packing
              </h3>

              <p className="mt-2 text-sm text-muted">
                Keep track of what to bring.
              </p>
            </div>
          </div>
        </section>

        {/* Dashboard link */}
        <div className="mt-10">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}