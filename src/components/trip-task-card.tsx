import ConfirmActionButton from "@/components/confirm-action-button";
import PersonName from "@/components/person-name";

import {
  claimTripTask,
  deleteTripTask,
  releaseTripTask,
  toggleTripTask,
  updateTripTask,
} from "@/app/(app)/trips/[id]/tasks/actions";

import {
  formatTaskDueDate,
  getTaskCategoryLabel,
  getTaskDueLabel,
  getTaskDueState,
  getTaskPriorityLabel,
  TASK_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  type TaskPerson,
  type TripTask,
} from "@/lib/tasks";


type TripTaskCardProps = {
  task: TripTask;

  currentUserId: string;

  isTripCreator: boolean;
  isAttending: boolean;

  people:
    TaskPerson[];

  assignablePeople:
    TaskPerson[];
};


function priorityClasses(
  priority:
    TripTask["priority"]
) {
  if (
    priority ===
    "high"
  ) {
    return "border-danger-border bg-danger-surface text-danger-text";
  }


  if (
    priority ===
    "low"
  ) {
    return "border-line bg-surface-soft text-subtle";
  }


  return "border-line bg-surface-soft text-muted";
}


function dueClasses(
  state:
    ReturnType<
      typeof getTaskDueState
    >
) {
  if (
    state ===
    "overdue"
  ) {
    return "border-danger-border bg-danger-surface text-danger-text";
  }


  if (
    state ===
      "today" ||
    state ===
      "soon"
  ) {
    return "border-brand-500 bg-brand-50 text-brand-700";
  }


  return "border-line bg-surface-soft text-muted";
}


export function TripTaskCard({
  task,
  currentUserId,
  isTripCreator,
  isAttending,
  people,
  assignablePeople,
}: TripTaskCardProps) {
  const getPerson = (
    userId:
      | string
      | null
  ) =>
    people.find(
      (person) =>
        person.userId ===
        userId
    );


  const assignedPerson =
    getPerson(
      task.assigned_to
    );


  const creator =
    getPerson(
      task.created_by
    );


  const completedBy =
    getPerson(
      task.completed_by
    );


  const isAssignedToCurrentUser =
    task.assigned_to ===
    currentUserId;


  const canManageDetails =
    isTripCreator ||
    task.created_by ===
      currentUserId;


  const canToggle =
    canManageDetails ||
    isAssignedToCurrentUser;


  const canClaim =
    task.status ===
      "open" &&
    !task.assigned_to &&
    isAttending;


  const canRelease =
    task.status ===
      "open" &&
    isAssignedToCurrentUser;


  const dueState =
    getTaskDueState(
      task
    );


  const assignedStillAttending =
    task.assigned_to
      ? assignablePeople.some(
          (person) =>
            person.userId ===
            task.assigned_to
        )
      : true;


  const outerClasses =
    task.status ===
    "completed"
      ? "border-line bg-surface"
      : dueState ===
          "overdue" &&
        isAssignedToCurrentUser
        ? "border-danger-border bg-danger-surface/30"
        : isAssignedToCurrentUser
          ? "border-brand-500 bg-brand-50"
          : dueState ===
              "overdue"
            ? "border-danger-border bg-surface"
            : "border-line bg-surface";


  return (
    <details
      className={`group/task overflow-hidden rounded-2xl border ${outerClasses}`}
    >
      {/* Compact summary */}
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 transition hover:bg-surface-hover/40 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
              {getTaskCategoryLabel(
                task.category
              )}
            </span>


            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClasses(
                task.priority
              )}`}
            >
              {getTaskPriorityLabel(
                task.priority
              )}
            </span>


            {task.status ===
              "completed" && (
              <span className="rounded-full border border-success-border bg-success-surface px-2.5 py-1 text-xs font-medium text-success-text">
                Completed
              </span>
            )}


            {dueState ===
              "overdue" && (
              <span className="rounded-full border border-danger-border bg-danger-surface px-2.5 py-1 text-xs font-medium text-danger-text">
                Overdue
              </span>
            )}


            {dueState ===
              "today" && (
              <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                Due today
              </span>
            )}


            {dueState ===
              "soon" && (
              <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                Due soon
              </span>
            )}


            {isAssignedToCurrentUser &&
              task.status ===
                "open" && (
                <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  Assigned to you
                </span>
              )}
          </div>


          {/* Title */}
          <h3
            className={`mt-3 text-lg font-semibold ${
              task.status ===
              "completed"
                ? "text-subtle line-through"
                : "text-ink"
            }`}
          >
            {task.title}
          </h3>


          {/* Compact metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            {task.assigned_to ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                Assigned to

                <PersonName
                  userId={
                    task.assigned_to
                  }
                  currentUserId={
                    currentUserId
                  }
                  displayName={
                    assignedPerson
                      ?.displayName ??
                    "Traveller"
                  }
                  avatarUrl={
                    assignedPerson
                      ?.avatarUrl ??
                    null
                  }
                  highlightCurrentUser
                  variant={
                    isAssignedToCurrentUser
                      ? "badge"
                      : "text"
                  }
                />
              </span>
            ) : (
              <span>
                Unassigned
              </span>
            )}


            {task.due_date && (
              <span
                title={formatTaskDueDate(
                  task.due_date
                )}
                className={
                  dueState ===
                  "overdue"
                    ? "font-medium text-danger-text"
                    : dueState ===
                        "today" ||
                      dueState ===
                        "soon"
                      ? "font-medium text-brand-700"
                      : ""
                }
              >
                {getTaskDueLabel(
                  task
                )}
              </span>
            )}
          </div>
        </div>


        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform group-open/task:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>


      {/* Expanded information */}
      <div className="border-t border-line p-5">
        {task.description ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
            {task.description}
          </p>
        ) : (
          <p className="text-sm text-subtle">
            No additional
            details.
          </p>
        )}


        {/* Details */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Created by
            </p>

            <p className="mt-2 text-sm font-medium text-ink">
              {creator
                ?.displayName ??
                "Traveller"}
              {task.created_by ===
              currentUserId
                ? " (You)"
                : ""}
            </p>
          </div>


          <div className="rounded-xl border border-line bg-surface-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Category
            </p>

            <p className="mt-2 text-sm font-medium text-ink">
              {getTaskCategoryLabel(
                task.category
              )}
            </p>
          </div>


          <div className="rounded-xl border border-line bg-surface-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Due
            </p>

            <p
              className={`mt-2 text-sm font-medium ${
                dueState ===
                "overdue"
                  ? "text-danger-text"
                  : dueState ===
                        "today" ||
                      dueState ===
                        "soon"
                    ? "text-brand-700"
                    : "text-ink"
              }`}
            >
              {task.due_date
                ? formatTaskDueDate(
                    task.due_date
                  )
                : "No due date"}
            </p>
          </div>
        </div>


        {/* Completion */}
        {task.status ===
          "completed" && (
          <div className="mt-4 rounded-xl border border-success-border bg-success-surface p-4">
            <p className="text-sm text-success-text">
              Completed
              {completedBy
                ? ` by ${completedBy.displayName}`
                : ""}
              {task.completed_at
                ? ` on ${new Date(
                    task.completed_at
                  ).toLocaleDateString(
                    "en-IE",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}`
                : ""}
              .
            </p>
          </div>
        )}


        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          {canToggle && (
            <form
              action={
                toggleTripTask
              }
            >
              <input
                type="hidden"
                name="tripId"
                value={
                  task.trip_id
                }
              />

              <input
                type="hidden"
                name="taskId"
                value={
                  task.id
                }
              />

              <button
                type="submit"
                className={
                  task.status ===
                  "completed"
                    ? "cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                    : "cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                }
              >
                {task.status ===
                "completed"
                  ? "Reopen"
                  : "Mark complete"}
              </button>
            </form>
          )}


          {canClaim && (
            <form
              action={
                claimTripTask
              }
            >
              <input
                type="hidden"
                name="tripId"
                value={
                  task.trip_id
                }
              />

              <input
                type="hidden"
                name="taskId"
                value={
                  task.id
                }
              />

              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Take this task
              </button>
            </form>
          )}


          {canRelease && (
            <form
              action={
                releaseTripTask
              }
            >
              <input
                type="hidden"
                name="tripId"
                value={
                  task.trip_id
                }
              />

              <input
                type="hidden"
                name="taskId"
                value={
                  task.id
                }
              />

              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
              >
                Release task
              </button>
            </form>
          )}
        </div>


        {/* Full editing */}
        {canManageDetails && (
          <details className="group/edit mt-6 overflow-hidden rounded-xl border border-line bg-surface-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
              Edit responsibility

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4 text-muted transition-transform group-open/edit:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>


            <form
              action={
                updateTripTask
              }
              className="space-y-4 border-t border-line p-4"
            >
              <input
                type="hidden"
                name="tripId"
                value={
                  task.trip_id
                }
              />

              <input
                type="hidden"
                name="taskId"
                value={
                  task.id
                }
              />


              {/* Title */}
              <div>
                <label
                  htmlFor={`task-title-${task.id}`}
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Task
                </label>

                <input
                  id={`task-title-${task.id}`}
                  name="title"
                  type="text"
                  required
                  maxLength={160}
                  defaultValue={
                    task.title
                  }
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>


              {/* Assignment/category/priority/date */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor={`task-assigned-${task.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Assigned to
                  </label>

                  <select
                    id={`task-assigned-${task.id}`}
                    name="assignedTo"
                    defaultValue={
                      task.assigned_to ??
                      ""
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink"
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {task.assigned_to &&
                      !assignedStillAttending && (
                        <option
                          value={
                            task.assigned_to
                          }
                          disabled
                        >
                          {assignedPerson
                            ?.displayName ??
                            "Previous traveller"}{" "}
                          (not attending)
                        </option>
                      )}

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
                          currentUserId
                            ? " (You)"
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div>
                  <label
                    htmlFor={`task-category-${task.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Category
                  </label>

                  <select
                    id={`task-category-${task.id}`}
                    name="category"
                    defaultValue={
                      task.category
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink"
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
                    htmlFor={`task-priority-${task.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Priority
                  </label>

                  <select
                    id={`task-priority-${task.id}`}
                    name="priority"
                    defaultValue={
                      task.priority
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink"
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
                    htmlFor={`task-due-${task.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Due date
                  </label>

                  <input
                    id={`task-due-${task.id}`}
                    name="dueDate"
                    type="date"
                    defaultValue={
                      task.due_date ??
                      ""
                    }
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink"
                  />
                </div>
              </div>


              {/* Description */}
              <div>
                <label
                  htmlFor={`task-description-${task.id}`}
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Details
                </label>

                <textarea
                  id={`task-description-${task.id}`}
                  name="description"
                  rows={4}
                  maxLength={1200}
                  defaultValue={
                    task.description ??
                    ""
                  }
                  className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>


              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Save changes
              </button>
            </form>
          </details>
        )}


        {/* Delete */}
        {canManageDetails && (
          <div className="mt-6 border-t border-line pt-5">
            <form
              action={
                deleteTripTask
              }
            >
              <input
                type="hidden"
                name="tripId"
                value={
                  task.trip_id
                }
              />

              <input
                type="hidden"
                name="taskId"
                value={
                  task.id
                }
              />

              <ConfirmActionButton
                message={`Delete "${task.title}"?`}
                className="cursor-pointer text-sm font-medium text-danger-text hover:opacity-80"
              >
                Delete responsibility
              </ConfirmActionButton>
            </form>
          </div>
        )}
      </div>
    </details>
  );
}