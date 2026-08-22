import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroup } from "@/app/(app)/groups/actions";
import BackButton from "@/components/back-button";

type GroupTripPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewGroupTripPage({
  searchParams,
}: GroupTripPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Load owned groups
  const { data: memberships } =
    await supabase
      .from("group_members")
      .select(`
        group_id,
        groups (
          id,
          name,
          description,
          status
        )
      `)
      .eq("user_id", userId)
      .eq("role", "owner");

  // Keep active groups only
  const activeMemberships =
    memberships?.filter(
      (membership) => {
        const group = Array.isArray(
          membership.groups
        )
          ? membership.groups[0]
          : membership.groups;

        return (
          group &&
          group.status === "active"
        );
      }
    ) ?? [];

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/trips/new" />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            Group trip
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Choose a group
          </h1>

          <p className="mt-2 text-muted">
            Select an active group you own or create a
            new one.
          </p>
        </header>

        {/* Error message */}
        {params.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {params.error}
          </div>
        )}

        {/* Existing groups */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-ink">
            Your groups
          </h2>

          <p className="mt-1 text-sm text-muted">
            Closed groups must be reopened before a new
            trip can be created.
          </p>

          {activeMemberships.length === 0 ? (
            /* Empty state */
            <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
              <p className="text-sm text-muted">
                You don&apos;t have any active groups
                available for a new trip.
              </p>
            </div>
          ) : (
            /* Group choices */
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {activeMemberships.map(
                (membership) => {
                  const group =
                    Array.isArray(
                      membership.groups
                    )
                      ? membership.groups[0]
                      : membership.groups;

                  if (!group) {
                    return null;
                  }

                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-500"
                    >
                      {/* Group details */}
                      <h3 className="text-lg font-semibold text-ink">
                        {group.name}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-muted">
                        {group.description ||
                          "No description yet."}
                      </p>

                      {/* Select group */}
                      <Link
                        href={`/trips/new/group/${group.id}`}
                        className="mt-6 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                      >
                        Select group
                      </Link>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* Create group */}
        <section className="mt-12 border-t border-line pt-10">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold text-ink">
              Create a new group
            </h2>

            <p className="mt-1 text-sm text-muted">
              Create a group now and it will become
              available above.
            </p>

            <form
              action={createGroup}
              className="mt-6 space-y-5"
            >
              <input
                type="hidden"
                name="redirectTo"
                value="/trips/new/group"
              />

              {/* Group name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Group name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="UCD Friends"
                  required
                  maxLength={60}
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
                  placeholder="Friends for trips and holidays."
                  className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              {/* Create group */}
              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Create group
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}