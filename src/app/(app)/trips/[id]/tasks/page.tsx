import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import {
  TripTaskCard,
} from "@/components/trip-task-card";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  addTripTask,
} from "./actions";

import {
  getTaskDueState,
  sortTripTasks,
  TASK_PRIORITY_OPTIONS,
  type TaskPerson,
  type TripTask,
} from "@/lib/tasks";


type TasksPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};


type TaskSectionProps = {
  title: string;
  description: string;

  tasks:
    TripTask[];

  defaultOpen?: boolean;

  currentUserId: string;

  isTripCreator: boolean;
  isAttending: boolean;

  people:
    TaskPerson[];

  assignablePeople:
    TaskPerson[];
};


function TaskSection({
  title,
  description,
  tasks,
  defaultOpen = false,
  currentUserId,
  isTripCreator,
  isAttending,
  people,
  assignablePeople,
}: TaskSectionProps) {
  if (
    tasks.length ===
    0
  ) {
    return null;
  }

  return (
    <details
      open={
        defaultOpen
      }
      className="group overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-ink">
              {title}
            </h2>

            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
              {tasks.length}
            </span>
          </div>

          <p className="mt-1 text-sm text-muted">
            {description}
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
          className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="space-y-3 border-t border-line p-4 sm:p-6">
        {tasks.map(
          (task) => (
            <TripTaskCard
              key={
                task.id
              }
              task={
                task
              }
              currentUserId={
                currentUserId
              }
              isTripCreator={
                isTripCreator
              }
              isAttending={
                isAttending
              }
              people={
                people
              }
              assignablePeople={
                assignablePeople
              }
            />
          )
        )}
      </div>
    </details>
  );
}


export default async function TasksPage({
  params,
  searchParams,
}: TasksPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

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

  // Trip
  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      destination,
      trip_type,
      owner_id
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (tripError) {
    console.error(
      "Failed to load tasks trip:",
      tripError
    );
  }

  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  const tripId =
    trip.id;

  const isTripCreator =
    trip.owner_id ===
    userId;

  // Actual travellers
  const {
    data: participantRows,
    error: participantError,
  } = await supabase
    .from(
      "trip_participants"
    )
    .select(`
      user_id,
      joined_at
    `)
    .eq(
      "trip_id",
      tripId
    )
    .order(
      "joined_at",
      {
        ascending: true,
      }
    );

  if (participantError) {
    console.error(
      "Failed to load task participants:",
      participantError
    );
  }

  const participantIds =
    participantRows?.map(
      (row) =>
        row.user_id
    ) ?? [];

  const isAttending =
    participantIds.includes(
      userId
    );

  const canCreateTask =
    isTripCreator ||
    isAttending;

  // Tasks
  const {
    data: taskData,
    error: taskError,
  } = await supabase
    .from("trip_tasks")
    .select("*")
    .eq(
      "trip_id",
      tripId
    );

  if (taskError) {
    console.error(
      "Failed to load trip tasks:",
      taskError
    );
  }

  const tasks =
    sortTripTasks(
      (taskData ??
        []) as TripTask[]
    );

  // Include anyone referenced in
  // historical completion data too.
  const profileIds =
    new Set<string>(
      participantIds
    );

  tasks.forEach(
    (task) => {
      profileIds.add(
        task.created_by
      );

      if (
        task.assigned_to
      ) {
        profileIds.add(
          task.assigned_to
        );
      }

      if (
        task.completed_by
      ) {
        profileIds.add(
          task.completed_by
        );
      }
    }
  );

  const profileMap =
    new Map<
      string,
      {
        display_name:
          | string
          | null;

        username:
          | string
          | null;
      }
    >();

  if (
    profileIds.size >
    0
  ) {
    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        username
      `)
      .in(
        "id",
        [
          ...profileIds,
        ]
      );

    profiles?.forEach(
      (profile) => {
        profileMap.set(
          profile.id,
          profile
        );
      }
    );
  }

  const people:
    TaskPerson[] = [
    ...profileIds,
  ].map(
    (profileId) => {
      const profile =
        profileMap.get(
          profileId
        );

      return {
        userId:
          profileId,

        displayName:
          profile
            ?.display_name ??
          "Traveller",

        username:
          profile
            ?.username ??
          null,
      };
    }
  );

  const assignablePeople:
    TaskPerson[] =
    participantIds.map(
      (participantId) => {
        const profile =
          profileMap.get(
            participantId
          );

        return {
          userId:
            participantId,

          displayName:
            profile
              ?.display_name ??
            "Traveller",

          username:
            profile
              ?.username ??
            null,
        };
      }
    );

  const openTasks =
    tasks.filter(
      (task) =>
        task.status ===
        "open"
    );

  const completedTasks =
    tasks.filter(
      (task) =>
        task.status ===
        "completed"
    );

  const assignedToUser =
    openTasks.filter(
      (task) =>
        task.assigned_to ===
        userId
    );

  const unassignedTasks =
    openTasks.filter(
      (task) =>
        !task.assigned_to
    );

  const otherTasks =
    openTasks.filter(
      (task) =>
        task.assigned_to &&
        task.assigned_to !==
          userId
    );

  const overdueForUser =
    assignedToUser.filter(
      (task) =>
        getTaskDueState(
          task
        ) ===
        "overdue"
    ).length;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <BackButton
          fallbackHref={`/trips/${tripId}`}
        />

        {/* Header */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                {trip.name}
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                Tasks &
                responsibilities
              </h1>

              <p className="mt-2 max-w-2xl text-muted">
                Keep track of
                bookings, purchases
                and other jobs the
                group needs to get
                done.
              </p>
            </div>
          </div>
        </header>

        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {taskError && (
          <div className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
            Unable to load
            responsibilities:{" "}
            {
              taskError.message
            }
          </div>
        )}

        {/* Summary */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className={
              assignedToUser.length >
              0
                ? "rounded-2xl border border-brand-500 bg-brand-50 p-5"
                : "rounded-2xl border border-line bg-surface p-5"
            }
          >
            <p className="text-sm text-muted">
              Assigned to you
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                assignedToUser.length
              }
            </p>
          </div>

          <div
            className={
              overdueForUser >
              0
                ? "rounded-2xl border border-danger-border bg-danger-surface p-5"
                : "rounded-2xl border border-line bg-surface p-5"
            }
          >
            <p className="text-sm text-muted">
              Overdue
            </p>

            <p
              className={`mt-2 text-2xl font-semibold ${
                overdueForUser >
                0
                  ? "text-danger-text"
                  : "text-ink"
              }`}
            >
              {
                overdueForUser
              }
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Open
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                openTasks.length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Completed
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                completedTasks.length
              }
            </p>
          </div>
        </section>

        {/* Create task */}
        {canCreateTask && (
          <details className="group mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
              <div>
                <h2 className="font-semibold text-ink">
                  Add
                  responsibility
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Assign a job to
                  yourself, another
                  traveller or leave
                  it open for
                  somebody to take.
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
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>

            <form
              action={
                addTripTask
              }
              className="space-y-5 border-t border-line p-5 sm:p-6"
            >
              <input
                type="hidden"
                name="tripId"
                value={
                  tripId
                }
              />

              <div>
                <label
                  htmlFor="task-title"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Task
                </label>

                <input
                  id="task-title"
                  name="title"
                  type="text"
                  required
                  maxLength={
                    160
                  }
                  placeholder="e.g. Book airport transfer"
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="task-assigned-to"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Assigned to
                  </label>

                  <select
                    id="task-assigned-to"
                    name="assignedTo"
                    defaultValue={
                      trip.trip_type ===
                      "personal"
                        ? userId
                        : ""
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {assignablePeople.map(
                      (person) => (
                        <option
                          key={
                            person.userId
                          }
                          value={
                            person.userId
                          }
                        >
                          {
                            person.displayName
                          }
                          {person.userId ===
                          userId
                            ? " (You)"
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Priority
                  </label>

                  <select
                    id="task-priority"
                    name="priority"
                    defaultValue="normal"
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  >
                    {TASK_PRIORITY_OPTIONS.map(
                      (
                        option
                      ) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-due-date"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Due date
                  </label>

                  <input
                    id="task-due-date"
                    name="dueDate"
                    type="date"
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Details
                </label>

                <textarea
                  id="task-description"
                  name="description"
                  rows={
                    4
                  }
                  maxLength={
                    1200
                  }
                  placeholder="Add anything the person responsible needs to know..."
                  className="w-full resize-y rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Add
                responsibility
              </button>
            </form>
          </details>
        )}

        {!canCreateTask && (
          <div className="mt-8 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            You can view the
            trip&apos;s responsibilities,
            but only travellers
            attending the trip or
            the trip creator can
            create them.
          </div>
        )}

        {/* Task sections */}
        {tasks.length ===
        0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
            <h2 className="font-semibold text-ink">
              Nothing to do yet
            </h2>

            <p className="mt-2 text-sm text-muted">
              Add responsibilities
              for bookings,
              transport, purchases
              or anything else that
              needs to be organised.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-5">
            <TaskSection
              title="Your responsibilities"
              description="Open tasks currently assigned to you."
              tasks={
                assignedToUser
              }
              defaultOpen
              currentUserId={
                userId
              }
              isTripCreator={
                isTripCreator
              }
              isAttending={
                isAttending
              }
              people={
                people
              }
              assignablePeople={
                assignablePeople
              }
            />

            <TaskSection
              title="Unassigned"
              description="Open jobs that somebody can take responsibility for."
              tasks={
                unassignedTasks
              }
              defaultOpen={
                assignedToUser.length ===
                0
              }
              currentUserId={
                userId
              }
              isTripCreator={
                isTripCreator
              }
              isAttending={
                isAttending
              }
              people={
                people
              }
              assignablePeople={
                assignablePeople
              }
            />

            <TaskSection
              title="Other responsibilities"
              description="Tasks currently assigned to other travellers."
              tasks={
                otherTasks
              }
              currentUserId={
                userId
              }
              isTripCreator={
                isTripCreator
              }
              isAttending={
                isAttending
              }
              people={
                people
              }
              assignablePeople={
                assignablePeople
              }
            />

            <TaskSection
              title="Completed"
              description="Responsibilities the group has already finished."
              tasks={
                completedTasks
              }
              currentUserId={
                userId
              }
              isTripCreator={
                isTripCreator
              }
              isAttending={
                isAttending
              }
              people={
                people
              }
              assignablePeople={
                assignablePeople
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}