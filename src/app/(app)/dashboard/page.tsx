import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getClaims();

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

  // Load accessible trips
  const { data: trips } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      destination,
      start_date,
      end_date,
      budget,
      trip_type,
      groups (
        name
      )
    `)
    .order("start_date", {
      ascending: true,
    });

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Page heading */}
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Welcome, {profile?.display_name ?? "Traveller"}
          </h1>

          <p className="mt-2 text-muted">
            Plan and keep track of your upcoming trips.
          </p>
        </header>

        {/* Trips section */}
        <section className="mt-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Your trips
              </h2>

              <p className="mt-1 text-muted">
                Personal trips and trips you&apos;re planning
                with your friends.
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

          {/* Trip list */}
          {!trips || trips.length === 0 ? (
            /* Empty state */
            <div className="mt-6 rounded-2xl border border-line bg-surface p-8">
              <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-300 bg-brand-50 text-lg font-semibold text-brand-700">
                  T
                </div>

                <h3 className="mt-5 text-lg font-semibold text-ink">
                  No trips yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Create a personal trip or start planning something
                  with your friends.
                </p>

                <Link
                  href="/trips/new"
                  className="mt-6 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                >
                  Create your first trip
                </Link>
              </div>
            </div>
          ) : (
            /* Trips */
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => {
                // Get group
                const group = Array.isArray(trip.groups)
                  ? trip.groups[0]
                  : trip.groups;

                // Format start date
                const startDate = new Date(
                  `${trip.start_date}T00:00:00`
                ).toLocaleDateString("en-IE", {
                  day: "numeric",
                  month: "short",
                });

                // Format end date
                const endDate = new Date(
                  `${trip.end_date}T00:00:00`
                ).toLocaleDateString("en-IE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
                  >
                    {/* Trip type */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium capitalize text-brand-700">
                        {trip.trip_type}
                      </span>

                      {group && (
                        <span className="truncate text-xs text-subtle">
                          {group.name}
                        </span>
                      )}
                    </div>

                    {/* Trip details */}
                    <h3 className="mt-5 text-lg font-semibold text-ink">
                      {trip.name}
                    </h3>

                    <p className="mt-1 text-sm text-muted">
                      {trip.destination}
                    </p>

                    <p className="mt-5 text-sm text-muted">
                      {startDate} – {endDate}
                    </p>

                    {/* Trip action */}
                    <p className="mt-6 text-sm font-medium text-brand-700">
                      View trip →
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}