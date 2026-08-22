import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import {
  addTripParticipant,
  leaveTrip,
  removeTripParticipant,
} from "../actions";
import {
  formatTripDate,
  getTripLifecycle,
  getTripLifecycleLabel,
} from "@/lib/trip-utils";

type TripPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type EligibleMember = {
  userId: string;
  displayName: string;
  username: string | null;
};

export default async function TripPage({
  params,
  searchParams,
}: TripPageProps) {
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
        name,
        status
      )
    `)
    .eq("id", id)
    .maybeSingle();

  // Deleted or unavailable trip
  if (!trip) {
    redirect("/dashboard");
  }

  // Get group
  const group = Array.isArray(
    trip.groups
  )
    ? trip.groups[0]
    : trip.groups;

  // Check trip creator
  const isTripCreator =
    trip.owner_id === userId;

  // Load participants
  const { data: participantRows } =
    await supabase
      .from("trip_participants")
      .select(`
        user_id,
        joined_at,
        profiles (
          display_name,
          username
        )
      `)
      .eq("trip_id", id)
      .order("joined_at", {
        ascending: true,
      });

  const participantIds = new Set(
    participantRows?.map(
      (participant) =>
        participant.user_id
    ) ?? []
  );

  const isCurrentUserAttending =
    participantIds.has(userId);

  // Find group members not attending
  const eligibleMembers: EligibleMember[] =
    [];

  if (
    isTripCreator &&
    trip.trip_type === "group" &&
    trip.group_id
  ) {
    const { data: groupMembers } =
      await supabase
        .from("group_members")
        .select(`
          user_id,
          profiles (
            display_name,
            username
          )
        `)
        .eq(
          "group_id",
          trip.group_id
        );

    groupMembers?.forEach(
      (member) => {
        if (
          participantIds.has(
            member.user_id
          )
        ) {
          return;
        }

        const profile =
          Array.isArray(
            member.profiles
          )
            ? member.profiles[0]
            : member.profiles;

        eligibleMembers.push({
          userId: member.user_id,
          displayName:
            profile?.display_name ??
            "Traveller",
          username:
            profile?.username ?? null,
        });
      }
    );
  }

  // Calculate lifecycle
  const lifecycle =
    getTripLifecycle(
      trip.status,
      trip.start_date,
      trip.end_date
    );

  const lifecycleLabel =
    getTripLifecycleLabel(lifecycle);

  const lifecycleClass =
    lifecycle === "cancelled"
      ? "border border-danger-border bg-danger-surface text-danger-text"
      : lifecycle === "ongoing"
        ? "bg-brand-50 text-brand-700"
        : "border border-line bg-surface-soft text-muted";

  const participantCount =
    participantRows?.length ?? 0;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/dashboard" />

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

        {/* Trip heading */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {/* Trip badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${lifecycleClass}`}
                >
                  {lifecycleLabel}
                </span>

                <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium capitalize text-muted">
                  {trip.trip_type}
                </span>

                {group && (
                  <Link
                    href={`/groups/${group.id}`}
                    className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted transition hover:text-ink"
                  >
                    {group.name}
                  </Link>
                )}
              </div>

              {/* Trip title */}
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">
                {trip.name}
              </h1>

              <p className="mt-2 text-lg text-muted">
                {trip.destination}
              </p>
            </div>

            {/* Trip management */}
            {isTripCreator && (
              <Link
                href={`/trips/${trip.id}/edit`}
                className="shrink-0 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover"
              >
                Edit trip
              </Link>
            )}
          </div>
        </header>

        {/* Trip summary */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Status */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Status
            </p>

            <p className="mt-2 font-medium text-ink">
              {lifecycleLabel}
            </p>
          </div>

          {/* Dates */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Dates
            </p>

            <p className="mt-2 font-medium text-ink">
              {formatTripDate(
                trip.start_date,
                {
                  includeYear: false,
                }
              )}{" "}
              –{" "}
              {formatTripDate(
                trip.end_date
              )}
            </p>
          </div>

          {/* Budget */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              {trip.trip_type ===
              "group"
                ? "Budget per person"
                : "Budget"}
            </p>

            <p className="mt-2 font-medium text-ink">
              {trip.budget !== null
                ? `€${Number(
                    trip.budget
                  ).toLocaleString(
                    "en-IE"
                  )}`
                : "Not set"}
            </p>
          </div>

          {/* Travellers */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Travellers
            </p>

            <p className="mt-2 font-medium text-ink">
              {participantCount}{" "}
              {participantCount === 1
                ? "person"
                : "people"}
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

        {/* Participation status */}
        {trip.trip_type === "group" && (
          <section className="mt-10">
            {isCurrentUserAttending ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-ink">
                    You&apos;re going
                  </h2>

                  <p className="mt-1 text-sm text-muted">
                    This trip currently appears on your
                    Dashboard.
                  </p>
                </div>

                <form action={leaveTrip}>
                  <input
                    type="hidden"
                    name="tripId"
                    value={trip.id}
                  />

                  <ConfirmActionButton
                    message="Mark yourself as not going on this trip? You will remain in the group and can still view the trip."
                    className="cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover"
                  >
                    Not going
                  </ConfirmActionButton>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-6">
                <h2 className="font-semibold text-ink">
                  You&apos;re not attending
                </h2>

                <p className="mt-1 text-sm text-muted">
                  You&apos;re still a member of the group
                  and can view this trip, but it won&apos;t
                  appear on your Dashboard.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Travellers */}
        <section className="mt-10">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Travellers
            </h2>

            <p className="mt-1 text-sm text-muted">
              People currently marked as attending this trip.
            </p>
          </div>

          {/* Add traveller */}
          {isTripCreator &&
            trip.trip_type === "group" &&
            eligibleMembers.length > 0 && (
              <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
                <h3 className="font-semibold text-ink">
                  Add traveller
                </h3>

                <p className="mt-1 text-sm text-muted">
                  Select a member of{" "}
                  {group?.name ?? "this group"} who is
                  attending.
                </p>

                <form
                  action={addTripParticipant}
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="hidden"
                    name="tripId"
                    value={trip.id}
                  />

                  <select
                    name="userId"
                    required
                    defaultValue=""
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select group member
                    </option>

                    {eligibleMembers.map(
                      (member) => (
                        <option
                          key={member.userId}
                          value={member.userId}
                        >
                          {member.displayName}
                          {member.username
                            ? ` (@${member.username})`
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                  >
                    Add traveller
                  </button>
                </form>
              </div>
            )}

          {/* Participant list */}
          <div className="mt-5 space-y-3">
            {participantRows?.map(
              (participant) => {
                const profile =
                  Array.isArray(
                    participant.profiles
                  )
                    ? participant.profiles[0]
                    : participant.profiles;

                const displayName =
                  profile?.display_name ??
                  "Traveller";

                const isCurrentUser =
                  participant.user_id ===
                  userId;

                return (
                  <div
                    key={participant.user_id}
                    className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Traveller */}
                    <div>
                      <p className="font-medium text-ink">
                        {displayName}

                        {isCurrentUser && (
                          <span className="ml-1 text-muted">
                            (You)
                          </span>
                        )}

                        {participant.user_id ===
                          trip.owner_id && (
                          <span className="ml-2 text-xs text-subtle">
                            Trip creator
                          </span>
                        )}
                      </p>

                      {profile?.username && (
                        <p className="mt-1 text-sm text-subtle">
                          @{profile.username}
                        </p>
                      )}
                    </div>

                    {/* Creator can remove other travellers */}
                    {isTripCreator &&
                      !isCurrentUser &&
                      trip.trip_type ===
                        "group" && (
                        <form
                          action={
                            removeTripParticipant
                          }
                        >
                          <input
                            type="hidden"
                            name="tripId"
                            value={trip.id}
                          />

                          <input
                            type="hidden"
                            name="userId"
                            value={
                              participant.user_id
                            }
                          />

                          <ConfirmActionButton
                            message={`Remove ${displayName} from this trip? They will remain a member of the group.`}
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

        {/* Planning tools */}
        <section className="mt-12">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Plan your trip
            </h2>

            <p className="mt-1 text-sm text-muted">
              Everything you need to organise the trip.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">
                Itinerary
              </h3>

              <p className="mt-2 text-sm text-muted">
                Plan each day of your trip.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">
                Expenses
              </h3>

              <p className="mt-2 text-sm text-muted">
                Track spending and shared costs.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">
                Places
              </h3>

              <p className="mt-2 text-sm text-muted">
                Save places you want to visit.
              </p>
            </div>

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
      </div>
    </main>
  );
}