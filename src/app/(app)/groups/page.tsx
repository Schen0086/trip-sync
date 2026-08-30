import Link from "next/link";
import { redirect } from "next/navigation";

import BackButton from "@/components/back-button";
import GroupAvatar from "@/components/group-avatar";

import { createClient } from "@/lib/supabase/server";

import {
  createGroup,
  joinGroupByCode,
} from "./actions";


type GroupsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;

    q?: string;
    role?: string;
    status?: string;
  }>;
};


type GroupData = {
  id: string;

  name: string;

  description:
    | string
    | null;

  created_at: string;

  status: string;

  avatar_path:
    | string
    | null;

  role: string;
};


type GroupCardProps = {
  group:
    GroupData;

  avatarUrl:
    | string
    | null;

  owned: boolean;
};


function getRoleBadgeClass(
  role: string
) {
  if (
    role === "owner"
  ) {
    return "bg-brand-50 text-brand-700";
  }

  if (
    role === "admin"
  ) {
    return "border border-line bg-surface-soft text-ink";
  }

  return "border border-line bg-surface-soft text-muted";
}


function GroupCard({
  group,
  avatarUrl,
  owned,
}: GroupCardProps) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
    >
      <div className="flex items-start gap-4">
        <GroupAvatar
          src={
            avatarUrl
          }
          groupName={
            group.name
          }
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getRoleBadgeClass(
                group.role
              )}`}
            >
              {
                group.role
              }
            </span>

            {group.status ===
              "closed" && (
              <span className="inline-flex rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                Closed
              </span>
            )}
          </div>

          <h3 className="mt-3 break-words text-lg font-semibold text-ink">
            {
              group.name
            }
          </h3>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">
        {group.description ||
          "No description yet."}
      </p>

      <p className="mt-6 text-sm font-medium text-brand-700">
        {owned
          ? "Manage group →"
          : "View group →"}
      </p>
    </Link>
  );
}


export default async function GroupsPage({
  searchParams,
}: GroupsPageProps) {
  const query =
    await searchParams;

  const supabase =
    await createClient();


  // Authentication.
  const {
    data,
    error,
  } =
    await supabase.auth
      .getClaims();

  if (
    error ||
    !data?.claims
  ) {
    redirect(
      "/login"
    );
  }


  const userId =
    data.claims.sub;


  // Load memberships.
  const {
    data:
      memberships,
  } =
    await supabase
      .from(
        "group_members"
      )
      .select(`
        role,
        joined_at,
        groups (
          id,
          name,
          description,
          created_at,
          status,
          avatar_path
        )
      `)
      .eq(
        "user_id",
        userId
      )
      .order(
        "joined_at",
        {
          ascending:
            false,
        }
      );


  // Separate owned and joined groups.
  const ownedGroups:
    GroupData[] = [];

  const joinedGroups:
    GroupData[] = [];


  memberships?.forEach(
    (
      membership
    ) => {
      const group =
        Array.isArray(
          membership.groups
        )
          ? membership
              .groups[0]
          : membership.groups;

      if (!group) {
        return;
      }


      const groupData:
        GroupData = {
        id:
          group.id,

        name:
          group.name,

        description:
          group.description,

        created_at:
          group.created_at,

        status:
          group.status,

        avatar_path:
          group.avatar_path ??
          null,

        role:
          membership.role,
      };


      if (
        membership.role ===
        "owner"
      ) {
        ownedGroups.push(
          groupData
        );
      } else {
        joinedGroups.push(
          groupData
        );
      }
    }
  );


  // -------------------------------------------------------
  // GROUP SEARCH AND FILTERS
  // -------------------------------------------------------

  const searchText =
    query.q
      ?.trim() ??
    "";


  const roleFilter =
    query.role ===
      "owner" ||
    query.role ===
      "admin" ||
    query.role ===
      "member"
      ? query.role
      : "all";


  const statusFilter =
    query.status ===
      "active" ||
    query.status ===
      "closed"
      ? query.status
      : "all";


  const normalizedSearch =
    searchText
      .toLocaleLowerCase();


  function matchesFilters(
    group: GroupData
  ) {
    const matchesSearch =
      normalizedSearch.length ===
        0 ||
      group.name
        .toLocaleLowerCase()
        .includes(
          normalizedSearch
        ) ||
      (
        group.description ??
        ""
      )
        .toLocaleLowerCase()
        .includes(
          normalizedSearch
        );


    const matchesRole =
      roleFilter ===
        "all" ||
      group.role ===
        roleFilter;


    const matchesStatus =
      statusFilter ===
        "all" ||
      group.status ===
        statusFilter;


    return (
      matchesSearch &&
      matchesRole &&
      matchesStatus
    );
  }


  const filteredOwnedGroups =
    ownedGroups.filter(
      matchesFilters
    );


  const filteredJoinedGroups =
    joinedGroups.filter(
      matchesFilters
    );


  const totalGroupCount =
    ownedGroups.length +
    joinedGroups.length;


  const visibleGroupCount =
    filteredOwnedGroups.length +
    filteredJoinedGroups.length;


  const hasGroupFilters =
    Boolean(
      searchText
    ) ||
    roleFilter !==
      "all" ||
    statusFilter !==
      "all";


  const showOwnedSection =
    roleFilter ===
      "all" ||
    roleFilter ===
      "owner";


  const showJoinedSection =
    roleFilter ===
      "all" ||
    roleFilter ===
      "admin" ||
    roleFilter ===
      "member";


  // Create signed URLs only for groups that
  // are currently visible in the results.
  const visibleGroups = [
    ...filteredOwnedGroups,
    ...filteredJoinedGroups,
  ];


  const avatarUrlByGroupId =
    new Map<
      string,
      string
    >();


  await Promise.all(
    visibleGroups.map(
      async (
        group
      ) => {
        if (
          !group.avatar_path
        ) {
          return;
        }


        const {
          data:
            avatarData,

          error:
            avatarError,
        } =
          await supabase.storage
            .from(
              "group-avatars"
            )
            .createSignedUrl(
              group.avatar_path,
              3600
            );


        if (
          avatarError
        ) {
          console.error(
            `Failed to load avatar for group ${group.id}:`,
            avatarError
          );

          return;
        }


        if (
          avatarData?.signedUrl
        ) {
          avatarUrlByGroupId.set(
            group.id,
            avatarData.signedUrl
          );
        }
      }
    )
  );


  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <BackButton
          fallbackHref="/dashboard"
        />


        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Groups
          </h1>

          <p className="mt-2 max-w-2xl text-muted">
            Create and manage the groups you organise, join groups with an invite code, and see the groups you&apos;re travelling with.
          </p>
        </header>


        {/* Error message */}
        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {
              query.error
            }
          </div>
        )}


        {/* Success message */}
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


        {/* Search and filters */}
        {totalGroupCount >
          0 && (
          <section
            id="groups"
            className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6"
          >
            <div>
              <h2 className="font-semibold text-ink">
                Find a group
              </h2>

              <p className="mt-1 text-sm text-muted">
                Search by name or description and narrow the results by role or status.
              </p>
            </div>


            <form
              method="get"
              action="/groups"
              className="mt-5"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                <div>
                  <label
                    htmlFor="group-search"
                    className="sr-only"
                  >
                    Search groups
                  </label>

                  <div className="relative">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                      />

                      <path d="m20 20-3.5-3.5" />
                    </svg>

                    <input
                      id="group-search"
                      type="search"
                      name="q"
                      defaultValue={
                        searchText
                      }
                      placeholder="Search groups..."
                      className="w-full rounded-xl border border-line bg-surface-soft py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                  </div>
                </div>


                <div>
                  <label
                    htmlFor="group-role-filter"
                    className="sr-only"
                  >
                    Role
                  </label>

                  <select
                    id="group-role-filter"
                    name="role"
                    defaultValue={
                      roleFilter
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  >
                    <option value="all">
                      All roles
                    </option>

                    <option value="owner">
                      Owner
                    </option>

                    <option value="admin">
                      Admin
                    </option>

                    <option value="member">
                      Member
                    </option>
                  </select>
                </div>


                <div>
                  <label
                    htmlFor="group-status-filter"
                    className="sr-only"
                  >
                    Status
                  </label>

                  <select
                    id="group-status-filter"
                    name="status"
                    defaultValue={
                      statusFilter
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  >
                    <option value="all">
                      All statuses
                    </option>

                    <option value="active">
                      Active
                    </option>

                    <option value="closed">
                      Closed
                    </option>
                  </select>
                </div>
              </div>


              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p
                  aria-live="polite"
                  className="text-sm text-muted"
                >
                  Showing{" "}
                  <span className="font-medium text-ink">
                    {
                      visibleGroupCount
                    }
                  </span>{" "}
                  of{" "}
                  {
                    totalGroupCount
                  }{" "}
                  {totalGroupCount ===
                  1
                    ? "group"
                    : "groups"}
                </p>


                <div className="flex flex-wrap gap-2">
                  {hasGroupFilters && (
                    <Link
                      href="/groups#groups"
                      className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
                    >
                      Clear
                    </Link>
                  )}

                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}


        {/* Create or join */}
        <section className="mt-10 grid items-start gap-4 lg:grid-cols-2">
          {/* Create group */}
          <details className="group/create overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Create a group
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Start a group for friends you regularly travel with.
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
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open/create:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>


            <form
              action={
                createGroup
              }
              className="space-y-5 border-t border-line p-6"
            >
              <input
                type="hidden"
                name="redirectTo"
                value="/groups"
              />


              <div>
                <label
                  htmlFor="new-group-name"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Group name
                </label>

                <input
                  id="new-group-name"
                  name="name"
                  type="text"
                  required
                  maxLength={
                    60
                  }
                  placeholder="UCD Friends"
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>


              <div>
                <label
                  htmlFor="new-group-description"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Description
                </label>

                <textarea
                  id="new-group-description"
                  name="description"
                  rows={
                    3
                  }
                  placeholder="Friends for trips and holidays."
                  className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>


              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Create group
              </button>
            </form>
          </details>


          {/* Join group */}
          <details className="group/join overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Join a group
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Enter a group code shared with you by an owner or admin.
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
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open/join:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>


            <form
              action={
                joinGroupByCode
              }
              className="border-t border-line p-6"
            >
              <label
                htmlFor="group-code"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Group code
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="group-code"
                  type="text"
                  name="code"
                  required
                  minLength={
                    8
                  }
                  maxLength={
                    8
                  }
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
              </div>
            </form>
          </details>
        </section>


        {visibleGroupCount ===
          0 &&
        hasGroupFilters ? (
          <section className="mt-12 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <h2 className="font-semibold text-ink">
              No groups found
            </h2>

            <p className="mt-2 text-sm text-muted">
              Try changing your search or filters.
            </p>

            <Link
              href="/groups#groups"
              className="mt-5 inline-flex rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
            >
              Clear filters
            </Link>
          </section>
        ) : (
          <>
            {/* Owned groups */}
            {showOwnedSection && (
              <section className="mt-12">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">
                      Groups you own
                    </h2>

                    {filteredOwnedGroups.length >
                      0 && (
                      <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                        {
                          filteredOwnedGroups.length
                        }
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted">
                    Groups where you currently hold the Owner role.
                  </p>
                </div>


                {filteredOwnedGroups.length ===
                0 ? (
                  <div className="mt-5 rounded-2xl border border-line bg-surface p-8">
                    <p className="text-sm text-muted">
                      {hasGroupFilters
                        ? "No owned groups match these filters."
                        : "You don't own any groups yet. Create one above to get started."}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOwnedGroups.map(
                      (
                        group
                      ) => (
                        <GroupCard
                          key={
                            group.id
                          }
                          group={
                            group
                          }
                          avatarUrl={
                            avatarUrlByGroupId.get(
                              group.id
                            ) ??
                            null
                          }
                          owned
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            )}


            {/* Joined groups */}
            {showJoinedSection && (
              <section className="mt-12">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">
                      Groups you&apos;re in
                    </h2>

                    {filteredJoinedGroups.length >
                      0 && (
                      <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                        {
                          filteredJoinedGroups.length
                        }
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted">
                    Groups where you&apos;re an Admin or Member rather than the Owner.
                  </p>
                </div>


                {filteredJoinedGroups.length ===
                0 ? (
                  <div className="mt-5 rounded-2xl border border-line bg-surface p-8">
                    <p className="text-sm text-muted">
                      {hasGroupFilters
                        ? "No joined groups match these filters."
                        : "You haven't joined any other groups yet."}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredJoinedGroups.map(
                      (
                        group
                      ) => (
                        <GroupCard
                          key={
                            group.id
                          }
                          group={
                            group
                          }
                          avatarUrl={
                            avatarUrlByGroupId.get(
                              group.id
                            ) ??
                            null
                          }
                          owned={
                            false
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}