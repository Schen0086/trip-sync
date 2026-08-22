import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import CopyCodeButton from "@/components/copy-code-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import {
  addGroupMember,
  deleteGroup,
  leaveGroup,
  regenerateGroupCode,
  removeGroupMember,
  setGroupStatus,
  updateGroup,
  updateMemberRole,
} from "../actions";

type GroupPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function GroupPage({
  params,
  searchParams,
}: GroupPageProps) {
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

  // Load group
  const { data: group } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      description,
      created_by,
      created_at,
      status,
      closed_at
    `)
    .eq("id", id)
    .single();

  if (!group) {
    notFound();
  }

  // Load current membership
  const { data: currentMembership } =
    await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", id)
      .eq("user_id", userId)
      .single();

  if (!currentMembership) {
    notFound();
  }

  const isOwner =
    currentMembership.role === "owner";

  const isAdmin =
    currentMembership.role === "admin";

  const canManageMembers =
    isOwner || isAdmin;

  const isClosed =
    group.status === "closed";

  // Load invite code
  let inviteCode: string | null = null;

  if (canManageMembers) {
    const { data: code } = await supabase.rpc(
      "get_group_invite_code",
      {
        target_group_id: id,
      }
    );

    inviteCode = code ?? null;
  }

  // Load group members
  const { data: members } = await supabase
    .from("group_members")
    .select(`
      user_id,
      role,
      joined_at,
      profiles (
        display_name,
        username,
        avatar_url
      )
    `)
    .eq("group_id", id)
    .order("joined_at", {
      ascending: true,
    });

  // Load group trips
  const { data: trips } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      destination,
      start_date,
      end_date
    `)
    .eq("group_id", id)
    .order("start_date", {
      ascending: true,
    });

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/groups" />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {group.name}
            </h1>

            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium capitalize text-brand-700">
              {currentMembership.role}
            </span>

            {isClosed && (
              <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                Closed
              </span>
            )}
          </div>

          <p className="mt-2 max-w-2xl text-muted">
            {group.description ||
              "No description has been added yet."}
          </p>

          {isClosed && (
            <p className="mt-4 text-sm text-subtle">
              This group is closed. Existing members can
              still view its trips, but new members and
              new trips cannot be added.
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

        {/* Success message */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Group trips */}
        <section className="mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Trips
              </h2>

              <p className="mt-1 text-sm text-muted">
                Trips organised for this group.
              </p>
            </div>

            {isOwner && !isClosed && (
              <Link
                href={`/trips/new/group/${group.id}`}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Create group trip
              </Link>
            )}
          </div>

          {!trips || trips.length === 0 ? (
            /* Empty trips */
            <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
              <p className="text-sm text-muted">
                No trips have been created for this group.
              </p>
            </div>
          ) : (
            /* Trip list */
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => {
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
                    className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-500 hover:bg-surface-hover"
                  >
                    <h3 className="font-semibold text-ink">
                      {trip.name}
                    </h3>

                    <p className="mt-1 text-sm text-muted">
                      {trip.destination}
                    </p>

                    <p className="mt-4 text-xs text-subtle">
                      {startDate} – {endDate}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Invite code */}
        {canManageMembers && (
          <section className="mt-12">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-ink">
                    Group invite code
                  </h2>

                  <p className="mt-1 text-sm text-muted">
                    Share this code with a signed-in
                    TripSync user so they can join the
                    group.
                  </p>
                </div>

                {isClosed && (
                  <span className="rounded-full border border-line bg-surface-soft px-3 py-1.5 text-xs font-medium text-muted">
                    Joining disabled
                  </span>
                )}
              </div>

              {inviteCode && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="rounded-xl border border-line bg-surface-soft px-5 py-3 font-mono text-xl font-semibold tracking-[0.25em] text-ink">
                    {inviteCode}
                  </div>

                  <CopyCodeButton
                    code={inviteCode}
                  />

                  <form
                    action={regenerateGroupCode}
                  >
                    <input
                      type="hidden"
                      name="groupId"
                      value={group.id}
                    />

                    <ConfirmActionButton
                      message="Generate a new code? The current code will stop working."
                      className="cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
                    >
                      Generate new code
                    </ConfirmActionButton>
                  </form>
                </div>
              )}

              <p className="mt-4 text-xs text-subtle">
                Generating a new code immediately
                invalidates the previous one.
              </p>
            </div>
          </section>
        )}

        {/* Members */}
        <section className="mt-12">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Members
            </h2>

            <p className="mt-1 text-sm text-muted">
              People currently in this group.
            </p>
          </div>

          {/* Add member directly */}
          {canManageMembers && !isClosed && (
            <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-semibold text-ink">
                Add member directly
              </h3>

              <p className="mt-1 text-sm text-muted">
                Alternatively, enter the email address of
                an existing TripSync account.
              </p>

              <form
                action={addGroupMember}
                className="mt-5 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="hidden"
                  name="groupId"
                  value={group.id}
                />

                <input
                  type="email"
                  name="email"
                  required
                  placeholder="friend@example.com"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />

                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                >
                  Add member
                </button>
              </form>
            </div>
          )}

          {/* Member list */}
          <div className="mt-5 space-y-3">
            {members?.map((member) => {
              const memberProfile = Array.isArray(
                member.profiles
              )
                ? member.profiles[0]
                : member.profiles;

              const memberName =
                memberProfile?.display_name ??
                "Traveller";

              const isGroupOwner =
                member.role === "owner";

              const isCurrentUser =
                member.user_id === userId;

              const ownerCanRemove =
                isOwner &&
                !isGroupOwner &&
                !isCurrentUser;

              const adminCanRemove =
                isAdmin &&
                member.role === "member" &&
                !isCurrentUser;

              const canRemove =
                ownerCanRemove ||
                adminCanRemove;

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 md:flex-row md:items-center md:justify-between"
                >
                  {/* Member details */}
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-ink">
                        {memberName}

                        {isCurrentUser && (
                          <span className="ml-1 text-muted">
                            (You)
                          </span>
                        )}
                      </p>

                      <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium capitalize text-muted">
                        {member.role}
                      </span>
                    </div>

                    {memberProfile?.username && (
                      <p className="mt-1 text-sm text-subtle">
                        @{memberProfile.username}
                      </p>
                    )}
                  </div>

                  {/* Owner controls */}
                  {isOwner &&
                    !isGroupOwner &&
                    !isCurrentUser && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <form
                          action={updateMemberRole}
                          className="flex gap-2"
                        >
                          <input
                            type="hidden"
                            name="groupId"
                            value={group.id}
                          />

                          <input
                            type="hidden"
                            name="userId"
                            value={member.user_id}
                          />

                          <select
                            name="role"
                            defaultValue={member.role}
                            className="rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
                          >
                            <option value="member">
                              Member
                            </option>

                            <option value="admin">
                              Admin
                            </option>
                          </select>

                          <button
                            type="submit"
                            className="cursor-pointer rounded-xl border border-line bg-surface-soft px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
                          >
                            Save
                          </button>
                        </form>

                        {canRemove && (
                          <form
                            action={removeGroupMember}
                          >
                            <input
                              type="hidden"
                              name="groupId"
                              value={group.id}
                            />

                            <input
                              type="hidden"
                              name="userId"
                              value={member.user_id}
                            />

                            <ConfirmActionButton
                              message={`Remove ${memberName} from this group?`}
                              className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-3.5 py-2 text-sm font-medium text-danger-text transition hover:opacity-80"
                            >
                              Remove
                            </ConfirmActionButton>
                          </form>
                        )}
                      </div>
                    )}

                  {/* Admin controls */}
                  {!isOwner &&
                    isAdmin &&
                    canRemove && (
                      <form
                        action={removeGroupMember}
                      >
                        <input
                          type="hidden"
                          name="groupId"
                          value={group.id}
                        />

                        <input
                          type="hidden"
                          name="userId"
                          value={member.user_id}
                        />

                        <ConfirmActionButton
                          message={`Remove ${memberName} from this group?`}
                          className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-3.5 py-2 text-sm font-medium text-danger-text transition hover:opacity-80"
                        >
                          Remove
                        </ConfirmActionButton>
                      </form>
                    )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Group settings */}
        {isOwner && (
          <section className="mt-12 border-t border-line pt-10">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="text-xl font-semibold text-ink">
                Group settings
              </h2>

              <p className="mt-1 text-sm text-muted">
                Update the group&apos;s basic details.
              </p>

              <form
                action={updateGroup}
                className="mt-6 space-y-5"
              >
                <input
                  type="hidden"
                  name="groupId"
                  value={group.id}
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
                    required
                    maxLength={60}
                    defaultValue={group.name}
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
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
                    defaultValue={
                      group.description ?? ""
                    }
                    className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                >
                  Save changes
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Leave group */}
        {!isOwner && (
          <section className="mt-12 border-t border-line pt-10">
            <div className="rounded-2xl border border-danger-border bg-danger-surface p-6">
              <h2 className="text-lg font-semibold text-danger-text">
                Leave group
              </h2>

              <p className="mt-2 text-sm text-muted">
                You will lose access to this group and
                its trips.
              </p>

              <form
                action={leaveGroup}
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="groupId"
                  value={group.id}
                />

                <ConfirmActionButton
                  message="Are you sure you want to leave this group?"
                  className="cursor-pointer rounded-xl border border-danger-border px-4 py-2.5 text-sm font-medium text-danger-text transition hover:opacity-80"
                >
                  Leave group
                </ConfirmActionButton>
              </form>
            </div>
          </section>
        )}

        {/* Owner danger zone */}
        {isOwner && (
          <section className="mt-12 border-t border-line pt-10">
            <div className="rounded-2xl border border-danger-border bg-danger-surface p-6">
              <h2 className="text-xl font-semibold text-danger-text">
                Danger zone
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-muted">
                Closing a group is reversible. Deleting a
                group is permanent.
              </p>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row">
                {/* Close or reopen */}
                <div className="flex-1 rounded-xl border border-danger-border p-5">
                  <h3 className="font-medium text-ink">
                    {isClosed
                      ? "Reopen group"
                      : "Close group"}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    {isClosed
                      ? "Allow new members and new trips to be added again."
                      : "Disable new members and new trips while keeping existing data available."}
                  </p>

                  <form
                    action={setGroupStatus}
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="groupId"
                      value={group.id}
                    />

                    <input
                      type="hidden"
                      name="status"
                      value={
                        isClosed
                          ? "active"
                          : "closed"
                      }
                    />

                    {isClosed ? (
                      <button
                        type="submit"
                        className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                      >
                        Reopen group
                      </button>
                    ) : (
                      <ConfirmActionButton
                        message="Close this group? Members will still be able to view it, but nobody will be able to join and no new trips can be created until you reopen it."
                        className="cursor-pointer rounded-xl border border-danger-border px-4 py-2.5 text-sm font-medium text-danger-text transition hover:opacity-80"
                      >
                        Close group
                      </ConfirmActionButton>
                    )}
                  </form>
                </div>

                {/* Delete group */}
                <div className="flex-1 rounded-xl border border-danger-border p-5">
                  <h3 className="font-medium text-danger-text">
                    Delete group
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Permanently delete this group,
                    memberships and all trips belonging
                    to it.
                  </p>

                  <form
                    action={deleteGroup}
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="groupId"
                      value={group.id}
                    />

                    <ConfirmActionButton
                      message="Permanently delete this group? This will also delete all trips belonging to the group and cannot be undone."
                      className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-4 py-2.5 text-sm font-medium text-danger-text transition hover:opacity-80"
                    >
                      Delete group
                    </ConfirmActionButton>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}