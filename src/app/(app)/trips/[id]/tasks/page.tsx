import Link from "next/link";

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
  isTaskCategory,
  isTaskPriority,
  sortTripTasks,
  TASK_CATEGORY_OPTIONS,
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

    assignee?: string;
    status?: string;
    priority?: string;
    category?: string;
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
      className="group/section overflow-hidden rounded-2xl border border-line bg-surface"
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
          className="h-5 w-5 shrink-0 text-muted transition-transform group-open/section:rotate-180"
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
  const {
    id,
  } =
    await params;


  const query =
    await searchParams;


  const supabase =
    await createClient();


  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();


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


  // -------------------------------------------------------
  // TRIP
  // -------------------------------------------------------

  const {
    data:
      trip,
    error:
      tripError,
  } = await supabase
    .from(
      "trips"
    )
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


  if (
    tripError
  ) {
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


  // -------------------------------------------------------
  // PARTICIPANTS
  // -------------------------------------------------------

  const {
    data:
      participantRows,
    error:
      participantError,
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
        ascending:
          true,
      }
    );


  if (
    participantError
  ) {
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


  // -------------------------------------------------------
  // TASKS
  // -------------------------------------------------------

  const {
    data:
      taskData,
    error:
      taskError,
  } = await supabase
    .from(
      "trip_tasks"
    )
    .select("*")
    .eq(
      "trip_id",
      tripId
    );


  if (
    taskError
  ) {
    console.error(
      "Failed to load trip tasks:",
      taskError
    );
  }


  const tasks =
    sortTripTasks(
      (
        taskData ??
        []
      ).map(
        (task) => ({
          ...task,

          // Graceful fallback while developing around
          // an older database before migration push.
          category:
            isTaskCategory(
              task.category ??
                ""
            )
              ? task.category
              : "other",
        })
      ) as TripTask[]
    );


  // -------------------------------------------------------
  // PEOPLE
  // -------------------------------------------------------

  // Include anyone referenced in historical task
  // completion/assignment data as well as attendees.
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

        avatar_url:
          | string
          | null;
      }
    >();


  if (
    profileIds.size >
    0
  ) {
    const {
      data:
        profiles,
    } = await supabase
      .from(
        "profiles"
      )
      .select(`
        id,
        display_name,
        username,
        avatar_url
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

          avatarUrl:
            profile
              ?.avatar_url ??
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

          avatarUrl:
            profile
              ?.avatar_url ??
            null,
        };
      }
    );


  // -------------------------------------------------------
  // OVERALL TASK SUMMARY
  // -------------------------------------------------------

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


  const overdueForUser =
    assignedToUser.filter(
      (task) =>
        getTaskDueState(
          task
        ) ===
        "overdue"
    );


  const dueSoonForUser =
    assignedToUser.filter(
      (task) => {
        const state =
          getTaskDueState(
            task
          );


        return (
          state ===
            "today" ||
          state ===
            "soon"
        );
      }
    );


  const attentionForUser =
    overdueForUser.length +
    dueSoonForUser.length;


  const completionPercent =
    tasks.length ===
      0
      ? 0
      : Math.round(
          (
            completedTasks.length /
            tasks.length
          ) *
            100
        );


  // -------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------

  const selectedStatus =
    query.status ===
      "open" ||
    query.status ===
      "completed"
      ? query.status
      : "all";


  const selectedPriority =
    query.priority &&
    isTaskPriority(
      query.priority
    )
      ? query.priority
      : "all";


  const selectedCategory =
    query.category &&
    isTaskCategory(
      query.category
    )
      ? query.category
      : "all";


  const validAssigneeIds =
    new Set(
      people.map(
        (person) =>
          person.userId
      )
    );


  const selectedAssignee =
    query.assignee ===
      "mine" ||
    query.assignee ===
      "unassigned" ||
    (
      query.assignee &&
      validAssigneeIds.has(
        query.assignee
      )
    )
      ? query.assignee
      : "all";


  const activeFilterCount =
    [
      selectedStatus !==
        "all",

      selectedPriority !==
        "all",

      selectedCategory !==
        "all",

      selectedAssignee !==
        "all",
    ].filter(
      Boolean
    ).length;


  const filteredTasks =
    tasks.filter(
      (task) => {
        if (
          selectedStatus !==
            "all" &&
          task.status !==
            selectedStatus
        ) {
          return false;
        }


        if (
          selectedPriority !==
            "all" &&
          task.priority !==
            selectedPriority
        ) {
          return false;
        }


        if (
          selectedCategory !==
            "all" &&
          task.category !==
            selectedCategory
        ) {
          return false;
        }


        if (
          selectedAssignee ===
          "mine"
        ) {
          return (
            task.assigned_to ===
            userId
          );
        }


        if (
          selectedAssignee ===
          "unassigned"
        ) {
          return (
            task.assigned_to ===
            null
          );
        }


        if (
          selectedAssignee !==
            "all" &&
          task.assigned_to !==
            selectedAssignee
        ) {
          return false;
        }


        return true;
      }
    );


  const filteredOpenTasks =
    filteredTasks.filter(
      (task) =>
        task.status ===
        "open"
    );


  const filteredCompletedTasks =
    filteredTasks.filter(
      (task) =>
        task.status ===
        "completed"
    );


  const filteredAssignedToUser =
    filteredOpenTasks.filter(
      (task) =>
        task.assigned_to ===
        userId
    );


  const filteredUnassignedTasks =
    filteredOpenTasks.filter(
      (task) =>
        !task.assigned_to
    );


  const filteredOtherTasks =
    filteredOpenTasks.filter(
      (task) =>
        task.assigned_to &&
        task.assigned_to !==
          userId
    );


  const hasFilters =
    activeFilterCount >
    0;


  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <BackButton
          fallbackHref={`/trips/${tripId}`}
        />


        {/* Header */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            {trip.name}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Tasks &
            responsibilities
          </h1>

          <p className="mt-2 max-w-2xl text-muted">
            Keep track of
            bookings, transport,
            documents, payments,
            shopping and anything
            else that needs to be
            organised.
          </p>
        </header>


        {/* Messages */}
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
          {/* Completion progress */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Overall progress
            </p>

            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-2xl font-semibold text-ink">
                {
                  completionPercent
                }%
              </p>

              <p className="text-xs text-subtle">
                {
                  completedTasks.length
                }
                /
                {
                  tasks.length
                }{" "}
                complete
              </p>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{
                  width:
                    `${completionPercent}%`,
                }}
              />
            </div>
          </div>


          {/* Assigned */}
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

            <p className="mt-2 text-xs text-subtle">
              Open
              responsibilities
            </p>
          </div>


          {/* Attention */}
          <div
            className={
              overdueForUser.length >
              0
                ? "rounded-2xl border border-danger-border bg-danger-surface p-5"
                : attentionForUser >
                    0
                  ? "rounded-2xl border border-brand-500 bg-brand-50 p-5"
                  : "rounded-2xl border border-line bg-surface p-5"
            }
          >
            <p className="text-sm text-muted">
              Needs attention
            </p>

            <p
              className={`mt-2 text-2xl font-semibold ${
                overdueForUser.length >
                0
                  ? "text-danger-text"
                  : "text-ink"
              }`}
            >
              {
                attentionForUser
              }
            </p>

            <p className="mt-2 text-xs text-subtle">
              {overdueForUser.length >
              0
                ? `${overdueForUser.length} overdue`
                : dueSoonForUser.length >
                    0
                  ? `${dueSoonForUser.length} due soon`
                  : "Nothing urgent"}
            </p>
          </div>


          {/* Unassigned */}
          <div
            className={
              unassignedTasks.length >
              0
                ? "rounded-2xl border border-line-strong bg-surface p-5"
                : "rounded-2xl border border-line bg-surface p-5"
            }
          >
            <p className="text-sm text-muted">
              Unassigned
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                unassignedTasks.length
              }
            </p>

            <p className="mt-2 text-xs text-subtle">
              Available to claim
            </p>
          </div>
        </section>


        {/* Quick filters */}
        {tasks.length >
          0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={`/trips/${tripId}/tasks?assignee=mine&status=open`}
              className={
                selectedAssignee ===
                  "mine" &&
                selectedStatus ===
                  "open"
                  ? "rounded-full border border-brand-500 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700"
                  : "rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
              }
            >
              My open tasks
            </Link>


            <Link
              href={`/trips/${tripId}/tasks?status=open&assignee=unassigned`}
              className={
                selectedAssignee ===
                  "unassigned" &&
                selectedStatus ===
                  "open"
                  ? "rounded-full border border-brand-500 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700"
                  : "rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
              }
            >
              Unassigned
            </Link>


            {hasFilters && (
              <Link
                href={`/trips/${tripId}/tasks`}
                className="px-2 py-2 text-sm font-medium text-muted transition hover:text-ink"
              >
                Clear filters
              </Link>
            )}
          </div>
        )}


        {/* Advanced filters */}
        {tasks.length >
          0 && (
          <details
            open={
              hasFilters
            }
            className="group/filters mt-4 overflow-hidden rounded-2xl border border-line bg-surface"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-ink">
                    Filter
                    responsibilities
                  </h2>

                  {activeFilterCount >
                    0 && (
                    <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-brand-contrast">
                      {
                        activeFilterCount
                      }
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-muted">
                  Showing{" "}
                  {
                    filteredTasks.length
                  }{" "}
                  of{" "}
                  {
                    tasks.length
                  }{" "}
                  responsibilities.
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
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open/filters:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>


            <form
              method="get"
              className="border-t border-line p-5 sm:p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Assignee */}
                <div>
                  <label
                    htmlFor="filter-assignee"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Assignee
                  </label>

                  <select
                    id="filter-assignee"
                    name="assignee"
                    defaultValue={
                      selectedAssignee
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  >
                    <option value="all">
                      Everyone
                    </option>

                    <option value="mine">
                      Me
                    </option>

                    <option value="unassigned">
                      Unassigned
                    </option>

                    {people
                      .filter(
                        (person) =>
                          person.userId !==
                          userId
                      )
                      .map(
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
                          </option>
                        )
                      )}
                  </select>
                </div>


                {/* Status */}
                <div>
                  <label
                    htmlFor="filter-status"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Status
                  </label>

                  <select
                    id="filter-status"
                    name="status"
                    defaultValue={
                      selectedStatus
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  >
                    <option value="all">
                      All statuses
                    </option>

                    <option value="open">
                      Open
                    </option>

                    <option value="completed">
                      Completed
                    </option>
                  </select>
                </div>


                {/* Category */}
                <div>
                  <label
                    htmlFor="filter-category"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Category
                  </label>

                  <select
                    id="filter-category"
                    name="category"
                    defaultValue={
                      selectedCategory
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  >
                    <option value="all">
                      All categories
                    </option>

                    {TASK_CATEGORY_OPTIONS.map(
                      (option) => (
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


                {/* Priority */}
                <div>
                  <label
                    htmlFor="filter-priority"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Priority
                  </label>

                  <select
                    id="filter-priority"
                    name="priority"
                    defaultValue={
                      selectedPriority
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  >
                    <option value="all">
                      All priorities
                    </option>

                    {TASK_PRIORITY_OPTIONS.map(
                      (option) => (
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
              </div>


              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                >
                  Apply filters
                </button>

                {hasFilters && (
                  <Link
                    href={`/trips/${tripId}/tasks`}
                    className="rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                  >
                    Reset
                  </Link>
                )}
              </div>
            </form>
          </details>
        )}


        {/* Create responsibility */}
        {canCreateTask && (
          <details className="group/create mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
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
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open/create:rotate-180"
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


              {/* Title */}
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
                  maxLength={160}
                  placeholder="e.g. Book airport transfer"
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>


              {/* Task properties */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    htmlFor="task-category"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Category
                  </label>

                  <select
                    id="task-category"
                    name="category"
                    defaultValue="other"
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  >
                    {TASK_CATEGORY_OPTIONS.map(
                      (option) => (
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
                      (option) => (
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


              {/* Description */}
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
                  rows={4}
                  maxLength={1200}
                  placeholder="Add anything the person responsible needs to know..."
                  className="w-full resize-y rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>


              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Add responsibility
              </button>
            </form>
          </details>
        )}


        {!canCreateTask && (
          <div className="mt-8 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
            You can view the
            trip&apos;s
            responsibilities,
            but only travellers
            attending the trip or
            the trip creator can
            create them.
          </div>
        )}


        {/* Responsibility list */}
        {tasks.length ===
        0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
            <h2 className="font-semibold text-ink">
              Nothing to do yet
            </h2>

            <p className="mt-2 text-sm text-muted">
              Add responsibilities
              for bookings,
              transport,
              documents,
              payments, shopping
              or anything else
              that needs to be
              organised.
            </p>
          </div>
        ) : filteredTasks.length ===
          0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
            <h2 className="font-semibold text-ink">
              No matching
              responsibilities
            </h2>

            <p className="mt-2 text-sm text-muted">
              Nothing matches
              the filters you
              currently have
              selected.
            </p>

            <Link
              href={`/trips/${tripId}/tasks`}
              className="mt-5 inline-flex rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Responsibilities
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Showing{" "}
                  {
                    filteredTasks.length
                  }{" "}
                  of{" "}
                  {
                    tasks.length
                  }{" "}
                  total.
                </p>
              </div>

              {hasFilters && (
                <span className="rounded-full border border-line bg-surface-soft px-3 py-1.5 text-xs font-medium text-muted">
                  {
                    activeFilterCount
                  }{" "}
                  active{" "}
                  {activeFilterCount ===
                  1
                    ? "filter"
                    : "filters"}
                </span>
              )}
            </div>


            <TaskSection
              title="Your responsibilities"
              description="Open tasks currently assigned to you."
              tasks={
                filteredAssignedToUser
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
                filteredUnassignedTasks
              }
              defaultOpen={
                hasFilters ||
                filteredAssignedToUser.length ===
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
                filteredOtherTasks
              }
              defaultOpen={
                hasFilters
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
                filteredCompletedTasks
              }
              defaultOpen={
                selectedStatus ===
                "completed"
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