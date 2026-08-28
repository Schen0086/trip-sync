export type TripTaskPriority =
  | "low"
  | "normal"
  | "high";


export type TripTaskStatus =
  | "open"
  | "completed";


export type TripTaskCategory =
  | "booking"
  | "transport"
  | "documents"
  | "payments"
  | "shopping"
  | "other";


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

  category:
    TripTaskCategory;

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

  avatarUrl:
    | string
    | null;
};


export type TaskDueState =
  | "overdue"
  | "today"
  | "soon"
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


export const TASK_CATEGORY_OPTIONS: {
  value: TripTaskCategory;
  label: string;
}[] = [
  {
    value: "booking",
    label: "Booking",
  },
  {
    value: "transport",
    label: "Transport",
  },
  {
    value: "documents",
    label: "Documents",
  },
  {
    value: "payments",
    label: "Payments",
  },
  {
    value: "shopping",
    label: "Shopping",
  },
  {
    value: "other",
    label: "Other",
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


export function isTaskCategory(
  value: string
): value is TripTaskCategory {
  return TASK_CATEGORY_OPTIONS.some(
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


export function getTaskCategoryLabel(
  category:
    TripTaskCategory
) {
  return (
    TASK_CATEGORY_OPTIONS.find(
      (option) =>
        option.value ===
        category
    )?.label ??
    "Other"
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


function differenceInDays(
  firstDate: string,
  secondDate: string
) {
  const first =
    new Date(
      `${firstDate}T00:00:00Z`
    );

  const second =
    new Date(
      `${secondDate}T00:00:00Z`
    );


  return Math.round(
    (
      first.getTime() -
      second.getTime()
    ) /
      (
        24 *
        60 *
        60 *
        1000
      )
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


  const daysUntil =
    differenceInDays(
      task.due_date,
      today
    );


  if (
    daysUntil <= 3
  ) {
    return "soon";
  }


  return "upcoming";
}


export function getTaskDueLabel(
  task: Pick<
    TripTask,
    "status" | "due_date"
  >,
  today = new Date()
    .toISOString()
    .slice(0, 10)
) {
  if (
    !task.due_date
  ) {
    return "No due date";
  }


  if (
    task.status ===
    "completed"
  ) {
    return `Due ${formatTaskDueDate(
      task.due_date
    )}`;
  }


  const daysUntil =
    differenceInDays(
      task.due_date,
      today
    );


  if (
    daysUntil < 0
  ) {
    const overdueDays =
      Math.abs(
        daysUntil
      );


    return `Overdue by ${overdueDays} ${
      overdueDays === 1
        ? "day"
        : "days"
    }`;
  }


  if (
    daysUntil === 0
  ) {
    return "Due today";
  }


  if (
    daysUntil === 1
  ) {
    return "Due tomorrow";
  }


  if (
    daysUntil <= 3
  ) {
    return `Due in ${daysUntil} days`;
  }


  return `Due ${formatTaskDueDate(
    task.due_date
  )}`;
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
      // Open tasks always appear before completed tasks.
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
        // Earlier deadlines appear first.
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


        // Higher priority wins when deadlines match.
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