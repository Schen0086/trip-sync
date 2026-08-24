export type TripTaskPriority =
  | "low"
  | "normal"
  | "high";

export type TripTaskStatus =
  | "open"
  | "completed";

export type TripTask = {
  id: string;
  trip_id: string;

  created_by: string;

  assigned_to:
    | string
    | null;

  title: string;

  description:
    | string
    | null;

  due_date:
    | string
    | null;

  priority:
    TripTaskPriority;

  status:
    TripTaskStatus;

  completed_at:
    | string
    | null;

  completed_by:
    | string
    | null;

  created_at: string;
  updated_at: string;
};

export type TaskPerson = {
  userId: string;

  displayName: string;

  username:
    | string
    | null;
};

export type TaskDueState =
  | "overdue"
  | "today"
  | "upcoming"
  | "none";

export const TASK_PRIORITY_OPTIONS: {
  value: TripTaskPriority;
  label: string;
}[] = [
  {
    value: "low",
    label: "Low",
  },
  {
    value: "normal",
    label: "Normal",
  },
  {
    value: "high",
    label: "High",
  },
];

export function isTaskPriority(
  value: string
): value is TripTaskPriority {
  return TASK_PRIORITY_OPTIONS.some(
    (option) =>
      option.value === value
  );
}

export function getTaskPriorityLabel(
  priority:
    TripTaskPriority
) {
  return (
    TASK_PRIORITY_OPTIONS.find(
      (option) =>
        option.value ===
        priority
    )?.label ??
    "Normal"
  );
}

export function formatTaskDueDate(
  date: string
) {
  return new Date(
    `${date}T00:00:00Z`
  ).toLocaleDateString(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

export function getTaskDueState(
  task: Pick<
    TripTask,
    "status" | "due_date"
  >,
  today = new Date()
    .toISOString()
    .slice(0, 10)
): TaskDueState {
  if (
    task.status ===
      "completed" ||
    !task.due_date
  ) {
    return "none";
  }

  if (
    task.due_date <
    today
  ) {
    return "overdue";
  }

  if (
    task.due_date ===
    today
  ) {
    return "today";
  }

  return "upcoming";
}

function getPriorityWeight(
  priority:
    TripTaskPriority
) {
  switch (priority) {
    case "high":
      return 0;

    case "normal":
      return 1;

    case "low":
      return 2;
  }
}

export function sortTripTasks(
  tasks: TripTask[]
) {
  return [
    ...tasks,
  ].sort(
    (a, b) => {
      if (
        a.status !==
        b.status
      ) {
        return a.status ===
          "open"
          ? -1
          : 1;
      }

      if (
        a.status ===
        "open"
      ) {
        if (
          a.due_date &&
          b.due_date
        ) {
          const dateOrder =
            a.due_date.localeCompare(
              b.due_date
            );

          if (
            dateOrder !==
            0
          ) {
            return dateOrder;
          }
        } else if (
          a.due_date
        ) {
          return -1;
        } else if (
          b.due_date
        ) {
          return 1;
        }

        const priorityOrder =
          getPriorityWeight(
            a.priority
          ) -
          getPriorityWeight(
            b.priority
          );

        if (
          priorityOrder !==
          0
        ) {
          return priorityOrder;
        }
      }

      return a.created_at.localeCompare(
        b.created_at
      );
    }
  );
}