import Link from "next/link";
import { redirect } from "next/navigation";

import Avatar from "@/components/avatar";
import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import CopyCodeButton from "@/components/copy-code-button";
import GroupAvatar from "@/components/group-avatar";
import GroupAvatarEditor from "@/components/group-avatar-editor";

import { createClient } from "@/lib/supabase/server";

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

import {
  transferGroupOwnership,
} from "./actions";

type GroupPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type GroupTrip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
};

type GroupActivity = {
  id: string;
  trip_id: string;
  actor_user_id: string | null;
  action: string;
  subject: string;
  detail: string | null;
  href: string | null;
  created_at: string;
};

type ActivityProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function formatTripDate(
  value: string,
  includeYear = false
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "en-IE",
    {
      day: "numeric",
      month: "short",

      ...(includeYear
        ? {
            year:
              "numeric" as const,
          }
        : {}),
    }
  );
}

function formatActivityDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getRoleBadgeClass(
  role: string
) {
  if (role === "owner") {
    return "bg-brand-50 text-brand-700";
  }

  if (role === "admin") {
    return "border border-line bg-surface-soft text-ink";
  }

  return "border border-line bg-surface-soft text-muted";
}

function TripCard({
  trip,
}: {
  trip: GroupTrip;
}) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
    >
      <h3 className="font-semibold text-ink">
        {trip.name}
      </h3>

      <p className="mt-1 text-sm text-muted">
        {trip.destination}
      </p>

      <p className="mt-4 text-xs text-subtle">
        {formatTripDate(
          trip.start_date
        )}
        {" – "}
        {formatTripDate(
          trip.end_date,
          true
        )}
      </p>
    </Link>
  );
}

export default async function GroupPage({
  params,
  searchParams,
}: GroupPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  // Check authentication.
  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  // Load group.
  const {
    data: group,
  } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      description,
      created_by,
      created_at,
      status,
      closed_at,
      avatar_path
    `)
    .eq("id", id)
    .maybeSingle();

  // Group was deleted or user lost access.
  if (!group) {
    redirect("/groups");
  }

  // Load current membership.
  const {
    data: currentMembership,
  } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!currentMembership) {
    redirect("/groups");
  }

  const isOwner =
    currentMembership.role ===
    "owner";

  const isAdmin =
    currentMembership.role ===
    "admin";

  const canManageMembers =
    isOwner || isAdmin;

  const isClosed =
    group.status === "closed";

  // Create a short-lived group avatar URL.
  let groupAvatarUrl:
    | string
    | null = null;

  if (group.avatar_path) {
    const {
      data: avatarData,
      error: avatarError,
    } = await supabase.storage
      .from("group-avatars")
      .createSignedUrl(
        group.avatar_path,
        3600
      );

    if (avatarError) {
      console.error(
        "Failed to load group avatar:",
        avatarError
      );
    }

    groupAvatarUrl =
      avatarData?.signedUrl ??
      null;
  }

  // Load invite code for managers.
  let inviteCode:
    | string
    | null = null;

  if (canManageMembers) {
    const {
      data: code,
    } = await supabase.rpc(
      "get_group_invite_code",
      {
        target_group_id: id,
      }
    );

    inviteCode =
      code ?? null;
  }

  // Load group members.
  const {
    data: members,
  } = await supabase
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

  // Load group trips.
  const {
    data: tripData,
  } = await supabase
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

  const trips =
    (tripData ?? []) as GroupTrip[];

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const currentTrips =
    trips.filter(
      (trip) =>
        trip.start_date <=
          today &&
        trip.end_date >=
          today
    );

  const upcomingTrips =
    trips.filter(
      (trip) =>
        trip.start_date >
        today
    );

  const pastTrips =
    trips
      .filter(
        (trip) =>
          trip.end_date <
          today
      )
      .reverse();

  // Load recent activity across every trip in the group.
  const tripIds =
    trips.map(
      (trip) =>
        trip.id
    );

  let recentActivity:
    GroupActivity[] = [];

  let recentActivityCount =
    0;

  if (tripIds.length > 0) {
    const activitySince =
      new Date(
        Date.now() -
          30 *
            24 *
            60 *
            60 *
            1000
      ).toISOString();

    const [
      activityResult,
      activityCountResult,
    ] = await Promise.all([
      supabase
        .from("trip_activity")
        .select(`
          id,
          trip_id,
          actor_user_id,
          action,
          subject,
          detail,
          href,
          created_at
        `)
        .in("trip_id", tripIds)
        .order("created_at", {
          ascending: false,
        })
        .limit(8),

      supabase
        .from("trip_activity")
        .select("id", {
          count: "exact",
          head: true,
        })
        .in("trip_id", tripIds)
        .gte(
          "created_at",
          activitySince
        ),
    ]);

    if (
      activityResult.error
    ) {
      console.error(
        "Failed to load group activity:",
        activityResult.error
      );
    }

    recentActivity =
      (activityResult.data ??
        []) as GroupActivity[];

    recentActivityCount =
      activityCountResult.count ??
      0;
  }

  // Load activity actors, including people who may
  // no longer be current group members.
  const actorIds =
    Array.from(
      new Set(
        recentActivity
          .map(
            (activity) =>
              activity.actor_user_id
          )
          .filter(
            (
              actorId
            ): actorId is string =>
              Boolean(actorId)
          )
      )
    );

  const {
    data: activityProfileData,
  } = actorIds.length
    ? await supabase
        .from("profiles")
        .select(`
          id,
          display_name,
          avatar_url
        `)
        .in("id", actorIds)
    : {
        data:
          [] as ActivityProfile[],
      };

  const activityProfiles =
    new Map<
      string,
      ActivityProfile
    >(
      (
        (activityProfileData ??
          []) as ActivityProfile[]
      ).map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  const tripById =
    new Map(
      trips.map(
        (trip) => [
          trip.id,
          trip,
        ]
      )
    );

  const transferCandidates =
    (members ?? []).filter(
      (member) =>
        member.user_id !==
          userId &&
        member.role !==
          "owner"
    );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <BackButton
          fallbackHref="/groups"
        />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <GroupAvatar
              src={groupAvatarUrl}
              groupName={group.name}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="break-words text-3xl font-semibold tracking-tight text-ink">
                  {group.name}
                </h1>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getRoleBadgeClass(
                    currentMembership.role
                  )}`}
                >
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
            </div>
          </div>

          {isClosed && (
            <p className="mt-4 text-sm text-subtle">
              This group is closed. Existing members can still view its trips, but new members and new trips cannot be added.
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

        {/* Group summary */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Members
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {members?.length ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Current trips
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {currentTrips.length}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Upcoming trips
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {upcomingTrips.length}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Updates · 30 days
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {recentActivityCount}
            </p>
          </div>
        </section>

        {/* Group trips */}
        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Group trips
              </h2>

              <p className="mt-1 text-sm text-muted">
                Current, upcoming and previous trips organised for this group.
              </p>
            </div>

            {isOwner &&
              !isClosed && (
                <Link
                  href={`/trips/new/group/${group.id}`}
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                >
                  Create group trip
                </Link>
              )}
          </div>

          {currentTrips.length >
            0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-600" />

                <h3 className="font-semibold text-ink">
                  Current trips
                </h3>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentTrips.map(
                  (trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                    />
                  )
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-semibold text-ink">
              Upcoming trips
            </h3>

            {upcomingTrips.length ===
            0 ? (
              <div className="mt-3 rounded-2xl border border-line bg-surface p-6">
                <p className="text-sm text-muted">
                  No upcoming trips are scheduled for this group.
                </p>
              </div>
            ) : (
              <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingTrips.map(
                  (trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                    />
                  )
                )}
              </div>
            )}
          </div>

          {pastTrips.length >
            0 && (
            <details className="group/past mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                <div>
                  <h3 className="font-semibold text-ink">
                    Past trips
                  </h3>

                  <p className="mt-1 text-sm text-muted">
                    {pastTrips.length}{" "}
                    {pastTrips.length ===
                    1
                      ? "previous trip"
                      : "previous trips"}
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
                  className="h-5 w-5 text-muted transition-transform group-open/past:rotate-180"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>

              <div className="grid gap-4 border-t border-line p-5 md:grid-cols-2 lg:grid-cols-3">
                {pastTrips.map(
                  (trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                    />
                  )
                )}
              </div>
            </details>
          )}
        </section>

        {/* Recent activity */}
        <section className="mt-12">
          <details className="group/activity overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Group activity
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Recent planning changes across this group&apos;s trips.
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
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open/activity:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>

            <div className="border-t border-line p-5 sm:p-6">
              {recentActivity.length ===
              0 ? (
                <p className="text-sm text-muted">
                  No trip activity has been recorded for this group yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map(
                    (activity) => {
                      const actor =
                        activity.actor_user_id
                          ? activityProfiles.get(
                              activity.actor_user_id
                            )
                          : null;

                      const trip =
                        tripById.get(
                          activity.trip_id
                        );

                      const actorName =
                        actor?.display_name ??
                        "Traveller";

                      const destinationHref =
                        activity.href ??
                        `/trips/${activity.trip_id}`;

                      return (
                        <Link
                          key={activity.id}
                          href={destinationHref}
                          className="flex gap-3 rounded-xl border border-line bg-surface-soft p-4 transition hover:bg-surface-hover"
                        >
                          <Avatar
                            src={
                              actor?.avatar_url ??
                              null
                            }
                            displayName={
                              actorName
                            }
                            size="md"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-6 text-ink">
                              <span className="font-medium">
                                {actorName}
                              </span>{" "}
                              {
                                activity.action
                              }{" "}
                              <span className="font-medium">
                                {
                                  activity.subject
                                }
                              </span>
                            </p>

                            {activity.detail && (
                              <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">
                                {
                                  activity.detail
                                }
                              </p>
                            )}

                            <p className="mt-2 text-xs text-subtle">
                              {trip?.name ??
                                "Group trip"}
                              {" · "}
                              {formatActivityDate(
                                activity.created_at
                              )}
                            </p>
                          </div>
                        </Link>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </details>
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
                    Share this code with a signed-in TripSync user so they can join the group.
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
                    code={
                      inviteCode
                    }
                  />

                  <form
                    action={
                      regenerateGroupCode
                    }
                  >
                    <input
                      type="hidden"
                      name="groupId"
                      value={
                        group.id
                      }
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
                Generating a new code immediately invalidates the previous one.
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
              People currently in this group and the role each person holds.
            </p>
          </div>

          {/* Add member directly */}
          {canManageMembers &&
            !isClosed && (
              <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
                <h3 className="font-semibold text-ink">
                  Add member directly
                </h3>

                <p className="mt-1 text-sm text-muted">
                  Alternatively, enter the email address of an existing TripSync account.
                </p>

                <form
                  action={
                    addGroupMember
                  }
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="hidden"
                    name="groupId"
                    value={
                      group.id
                    }
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
            {members?.map(
              (member) => {
                const memberProfile =
                  Array.isArray(
                    member.profiles
                  )
                    ? member.profiles[0]
                    : member.profiles;

                const memberName =
                  memberProfile?.display_name ??
                  "Traveller";

                const isGroupOwner =
                  member.role ===
                  "owner";

                const isCurrentUser =
                  member.user_id ===
                  userId;

                const ownerCanRemove =
                  isOwner &&
                  !isGroupOwner &&
                  !isCurrentUser;

                const adminCanRemove =
                  isAdmin &&
                  member.role ===
                    "member" &&
                  !isCurrentUser;

                const canRemove =
                  ownerCanRemove ||
                  adminCanRemove;

                return (
                  <div
                    key={
                      member.user_id
                    }
                    className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={
                          memberProfile?.avatar_url ??
                          null
                        }
                        displayName={
                          memberName
                        }
                        size="lg"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-ink">
                            {
                              memberName
                            }

                            {isCurrentUser && (
                              <span className="ml-1 text-muted">
                                (You)
                              </span>
                            )}
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getRoleBadgeClass(
                              member.role
                            )}`}
                          >
                            {
                              member.role
                            }
                          </span>
                        </div>

                        {memberProfile?.username && (
                          <p className="mt-1 text-sm text-subtle">
                            @
                            {
                              memberProfile.username
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Owner controls */}
                    {isOwner &&
                      !isGroupOwner &&
                      !isCurrentUser && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <form
                            action={
                              updateMemberRole
                            }
                            className="flex gap-2"
                          >
                            <input
                              type="hidden"
                              name="groupId"
                              value={
                                group.id
                              }
                            />

                            <input
                              type="hidden"
                              name="userId"
                              value={
                                member.user_id
                              }
                            />

                            <select
                              name="role"
                              defaultValue={
                                member.role
                              }
                              aria-label={`Role for ${memberName}`}
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
                              action={
                                removeGroupMember
                              }
                            >
                              <input
                                type="hidden"
                                name="groupId"
                                value={
                                  group.id
                                }
                              />

                              <input
                                type="hidden"
                                name="userId"
                                value={
                                  member.user_id
                                }
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
                          action={
                            removeGroupMember
                          }
                        >
                          <input
                            type="hidden"
                            name="groupId"
                            value={
                              group.id
                            }
                          />

                          <input
                            type="hidden"
                            name="userId"
                            value={
                              member.user_id
                            }
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
              }
            )}
          </div>
        </section>

        {/* Roles and permissions */}
        <section className="mt-8">
          <details className="group/roles overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="font-semibold text-ink">
                  Roles &amp; permissions
                </h2>

                <p className="mt-1 text-sm text-muted">
                  See what Owners, Admins and Members can manage.
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
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open/roles:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>

            <div className="grid gap-4 border-t border-line p-5 md:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface-soft p-4">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  Owner
                </span>

                <p className="mt-3 text-sm leading-6 text-muted">
                  Full group control: details and picture, member roles, invites, ownership transfer, new group trips, closing and deletion.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface-soft p-4">
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink">
                  Admin
                </span>

                <p className="mt-3 text-sm leading-6 text-muted">
                  Can invite and add members, regenerate the invite code and remove normal Members. Group settings and roles remain Owner-only.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface-soft p-4">
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                  Member
                </span>

                <p className="mt-3 text-sm leading-6 text-muted">
                  Can view the group and its trips, collaborate where trip permissions allow, and leave the group at any time.
                </p>
              </div>
            </div>
          </details>
        </section>

        {/* Group settings */}
        {isOwner && (
          <section className="mt-12 border-t border-line pt-10">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Group settings
              </h2>

              <p className="mt-1 text-sm text-muted">
                Update the group&apos;s appearance, details and ownership.
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <GroupAvatarEditor
                groupId={
                  group.id
                }
                groupName={
                  group.name
                }
                initialAvatarPath={
                  group.avatar_path ??
                  null
                }
                initialAvatarUrl={
                  groupAvatarUrl
                }
              />

              <div className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="font-semibold text-ink">
                  Group details
                </h3>

                <form
                  action={
                    updateGroup
                  }
                  className="mt-6 space-y-5"
                >
                  <input
                    type="hidden"
                    name="groupId"
                    value={
                      group.id
                    }
                  />

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
                      defaultValue={
                        group.name
                      }
                      className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                  </div>

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
                        group.description ??
                        ""
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

              <div className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="font-semibold text-ink">
                  Transfer ownership
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Give another existing member full ownership of this group. You will become an Admin after the transfer.
                </p>

                {transferCandidates.length ===
                0 ? (
                  <p className="mt-4 text-sm text-subtle">
                    Add another member before transferring ownership.
                  </p>
                ) : (
                  <form
                    action={
                      transferGroupOwnership
                    }
                    className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
                  >
                    <input
                      type="hidden"
                      name="groupId"
                      value={
                        group.id
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor="new-owner-user-id"
                        className="mb-1.5 block text-sm font-medium text-ink"
                      >
                        New owner
                      </label>

                      <select
                        id="new-owner-user-id"
                        name="newOwnerUserId"
                        required
                        defaultValue=""
                        className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      >
                        <option
                          value=""
                          disabled
                        >
                          Choose a member
                        </option>

                        {transferCandidates.map(
                          (
                            member
                          ) => {
                            const profile =
                              Array.isArray(
                                member.profiles
                              )
                                ? member.profiles[0]
                                : member.profiles;

                            const name =
                              profile?.display_name ??
                              "Traveller";

                            return (
                              <option
                                key={
                                  member.user_id
                                }
                                value={
                                  member.user_id
                                }
                              >
                                {
                                  name
                                }

                                {member.role ===
                                "admin"
                                  ? " (Admin)"
                                  : ""}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </div>

                    <ConfirmActionButton
                      message="Transfer ownership to the selected member? They will become the Owner and you will become an Admin."
                      className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                    >
                      Transfer ownership
                    </ConfirmActionButton>
                  </form>
                )}
              </div>
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
                You will lose access to this group and its trips.
              </p>

              <form
                action={
                  leaveGroup
                }
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="groupId"
                  value={
                    group.id
                  }
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
                Closing a group is reversible. Deleting a group is permanent.
              </p>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row">
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
                    action={
                      setGroupStatus
                    }
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="groupId"
                      value={
                        group.id
                      }
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

                <div className="flex-1 rounded-xl border border-danger-border p-5">
                  <h3 className="font-medium text-danger-text">
                    Delete group
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Permanently delete this group, memberships and all trips belonging to it.
                  </p>

                  <form
                    action={
                      deleteGroup
                    }
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="groupId"
                      value={
                        group.id
                      }
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