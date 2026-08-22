import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import { joinGroupByCode } from "./actions";

type GroupsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type GroupData = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  status: string;
  role: string;
};

export default async function GroupsPage({
  searchParams,
}: GroupsPageProps) {
  const query = await searchParams;

  const supabase = await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Load memberships
  const { data: memberships } = await supabase
    .from("group_members")
    .select(`
      role,
      joined_at,
      groups (
        id,
        name,
        description,
        created_at,
        status
      )
    `)
    .eq("user_id", userId)
    .order("joined_at", {
      ascending: false,
    });

  // Separate groups
  const ownedGroups: GroupData[] = [];
  const joinedGroups: GroupData[] = [];

  memberships?.forEach((membership) => {
    const group = Array.isArray(
      membership.groups
    )
      ? membership.groups[0]
      : membership.groups;

    if (!group) {
      return;
    }

    const groupData: GroupData = {
      id: group.id,
      name: group.name,
      description: group.description,
      created_at: group.created_at,
      status: group.status,
      role: membership.role,
    };

    if (membership.role === "owner") {
      ownedGroups.push(groupData);
    } else {
      joinedGroups.push(groupData);
    }
  });

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/dashboard" />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Groups
          </h1>

          <p className="mt-2 max-w-2xl text-muted">
            Manage the groups you organise and see the
            groups you&apos;re travelling with.
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

        {/* Success message */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Join group */}
        <section className="mt-10">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold text-ink">
              Join a group
            </h2>

            <p className="mt-1 text-sm text-muted">
              Enter a group code shared with you by a
              group owner or admin.
            </p>

            <form
              action={joinGroupByCode}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                name="code"
                required
                minLength={8}
                maxLength={8}
                placeholder="A1B2C3D4"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 font-mono uppercase tracking-widest text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />

              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Join group
              </button>
            </form>
          </div>
        </section>

        {/* Owned groups */}
        <section className="mt-12">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Groups you own
            </h2>

            <p className="mt-1 text-sm text-muted">
              Groups you created and manage.
            </p>
          </div>

          {ownedGroups.length === 0 ? (
            /* Empty state */
            <div className="mt-5 rounded-2xl border border-line bg-surface p-8">
              <p className="text-sm text-muted">
                You don&apos;t own any groups yet. Create
                one while creating a group trip.
              </p>
            </div>
          ) : (
            /* Owned groups */
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ownedGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
                >
                  {/* Group badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                      Owner
                    </span>

                    {group.status === "closed" && (
                      <span className="inline-flex rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Group details */}
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    {group.name}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                    {group.description ||
                      "No description yet."}
                  </p>

                  {/* Group action */}
                  <p className="mt-6 text-sm font-medium text-brand-700">
                    Manage group →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Joined groups */}
        <section className="mt-12">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Groups you&apos;re in
            </h2>

            <p className="mt-1 text-sm text-muted">
              Groups managed by someone else.
            </p>
          </div>

          {joinedGroups.length === 0 ? (
            /* Empty state */
            <div className="mt-5 rounded-2xl border border-line bg-surface p-8">
              <p className="text-sm text-muted">
                You haven&apos;t joined any other groups
                yet.
              </p>
            </div>
          ) : (
            /* Joined groups */
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {joinedGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
                >
                  {/* Group badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium capitalize text-muted">
                      {group.role}
                    </span>

                    {group.status === "closed" && (
                      <span className="inline-flex rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Group details */}
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    {group.name}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                    {group.description ||
                      "No description yet."}
                  </p>

                  {/* Group action */}
                  <p className="mt-6 text-sm font-medium text-brand-700">
                    View group →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}