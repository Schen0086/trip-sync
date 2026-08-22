import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import {
  deleteTrip,
  updateTrip,
} from "../../actions";

type EditTripPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditTripPage({
  params,
  searchParams,
}: EditTripPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

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
      owner_id,
      status,
      groups (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  // Deleted or unavailable trip
    if (!trip) {
      redirect("/dashboard");
    }

  // Check management permission
  let canManage =
    trip.trip_type === "personal" &&
    trip.owner_id === userId;

  if (
    trip.trip_type === "group" &&
    trip.group_id
  ) {
    const { data: membership } =
      await supabase
        .from("group_members")
        .select("role")
        .eq(
          "group_id",
          trip.group_id
        )
        .eq("user_id", userId)
        .maybeSingle();

    canManage =
      membership?.role === "owner";
  }

  // Return non-owners to trip
  if (!canManage) {
    redirect(`/trips/${trip.id}`);
  }

  const group = Array.isArray(
    trip.groups
  )
    ? trip.groups[0]
    : trip.groups;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Back navigation */}
        <BackButton
          fallbackHref={`/trips/${trip.id}`}
        />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            {trip.trip_type === "group"
              ? "Group trip"
              : "Personal trip"}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Edit trip
          </h1>

          <p className="mt-2 text-muted">
            Update the details for{" "}
            {trip.name}.
          </p>

          {group && (
            <p className="mt-2 text-sm text-subtle">
              Group: {group.name}
            </p>
          )}
        </header>

        {/* Error message */}
        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {/* Edit form */}
        <section className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <form
            action={updateTrip}
            className="space-y-6"
          >
            <input
              type="hidden"
              name="tripId"
              value={trip.id}
            />

            {/* Trip name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Trip name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={80}
                defaultValue={trip.name}
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Destination */}
            <div>
              <label
                htmlFor="destination"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Destination
              </label>

              <input
                id="destination"
                name="destination"
                type="text"
                required
                maxLength={120}
                defaultValue={
                  trip.destination
                }
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Dates */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Start date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={
                    trip.start_date
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  End date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={
                    trip.end_date
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Budget */}
            <div>
              <label
                htmlFor="budget"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                {trip.trip_type ===
                "group"
                  ? "Budget per person"
                  : "Budget"}
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                  €
                </span>

                <input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    trip.budget ?? ""
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft py-2.5 pl-8 pr-3.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>
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
                rows={4}
                maxLength={500}
                defaultValue={
                  trip.description ?? ""
                }
                className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Trip status
              </label>

              <select
                id="status"
                name="status"
                defaultValue={trip.status}
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                <option value="planned">
                  Planned
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>

              <p className="mt-1.5 text-xs text-subtle">
                Upcoming, in-progress and
                past states are determined
                automatically from the
                trip dates.
              </p>
            </div>

            {/* Save */}
            <div className="flex justify-end border-t border-line pt-6">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Save changes
              </button>
            </div>
          </form>
        </section>

        {/* Danger zone */}
        <section className="mt-10 border-t border-line pt-10">
          <div className="rounded-2xl border border-danger-border bg-danger-surface p-6">
            <h2 className="text-xl font-semibold text-danger-text">
              Delete trip
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Permanently delete this
              trip and all data belonging
              to it. This cannot be
              undone.
            </p>

            <form
              action={deleteTrip}
              className="mt-5"
            >
              <input
                type="hidden"
                name="tripId"
                value={trip.id}
              />

              <ConfirmActionButton
                message={`Permanently delete "${trip.name}"? This cannot be undone.`}
                className="cursor-pointer rounded-xl border border-danger-border px-4 py-2.5 text-sm font-medium text-danger-text transition hover:opacity-80"
              >
                Delete trip
              </ConfirmActionButton>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}