import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTrip } from "@/app/(app)/trips/actions";
import BackButton from "@/components/back-button";

type GroupTripDetailsPageProps = {
  params: Promise<{
    groupId: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function GroupTripDetailsPage({
  params,
  searchParams,
}: GroupTripDetailsPageProps) {
  const { groupId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Check group ownership
  const { data: membership } =
    await supabase
      .from("group_members")
      .select(`
        role,
        groups (
          id,
          name,
          description,
          status
        )
      `)
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

  const group = Array.isArray(
    membership?.groups
  )
    ? membership.groups[0]
    : membership?.groups;

  if (
    !membership ||
    membership.role !== "owner" ||
    !group
  ) {
    redirect("/trips/new/group");
  }

  // Prevent closed group trips
  if (group.status !== "active") {
    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Reopen this group before creating a new trip"
      )}`
    );
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/trips/new/group" />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            Group trip
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Plan a trip for {group.name}
          </h1>

          <p className="mt-2 text-muted">
            Everyone in this group will be able to see
            the trip.
          </p>
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

        {/* Trip form */}
        <section className="mt-10">
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Trip details
            </h2>

            <p className="mt-1 text-sm text-muted">
              Add the basic information for this group
              trip.
            </p>

            {/* Selected group */}
            <div className="mt-6 rounded-xl border border-line bg-surface-soft p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                Group
              </p>

              <p className="mt-1 font-medium text-ink">
                {group.name}
              </p>
            </div>

            <form
              action={createTrip}
              className="mt-8 space-y-6"
            >
              <input
                type="hidden"
                name="tripType"
                value="group"
              />

              <input
                type="hidden"
                name="groupId"
                value={groupId}
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
                  placeholder="Ski Trip 2027"
                  required
                  maxLength={80}
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
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
                  placeholder="Mayrhofen, Austria"
                  required
                  maxLength={120}
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
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
                  Budget per person
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
                    placeholder="1500"
                    className="w-full rounded-xl border border-line bg-surface-soft py-2.5 pl-8 pr-3.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                <p className="mt-1.5 text-xs text-subtle">
                  Optional estimated budget per traveller.
                </p>
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
                  placeholder="A week of skiing, nightlife and activities."
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              {/* Form actions */}
              <div className="flex justify-end border-t border-line pt-6">
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                >
                  Create group trip
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}