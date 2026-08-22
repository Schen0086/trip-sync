export type TripStatus =
  | "planned"
  | "cancelled";

export type TripLifecycle =
  | "upcoming"
  | "ongoing"
  | "past"
  | "cancelled";

// Work out current trip state
export function getTripLifecycle(
  status: string,
  startDate: string,
  endDate: string
): TripLifecycle {
  if (status === "cancelled") {
    return "cancelled";
  }

  const today =
    new Date().toISOString().slice(0, 10);

  if (today < startDate) {
    return "upcoming";
  }

  if (today > endDate) {
    return "past";
  }

  return "ongoing";
}

// Get readable trip status
export function getTripLifecycleLabel(
  lifecycle: TripLifecycle
) {
  switch (lifecycle) {
    case "upcoming":
      return "Upcoming";

    case "ongoing":
      return "In progress";

    case "past":
      return "Past";

    case "cancelled":
      return "Cancelled";
  }
}

// Format trip dates
export function formatTripDate(
  date: string,
  options?: {
    longMonth?: boolean;
    includeYear?: boolean;
  }
) {
  const longMonth =
    options?.longMonth ?? false;

  const includeYear =
    options?.includeYear ?? true;

  return new Date(
    `${date}T00:00:00Z`
  ).toLocaleDateString("en-IE", {
    day: "numeric",
    month: longMonth
      ? "long"
      : "short",
    year: includeYear
      ? "numeric"
      : undefined,
    timeZone: "UTC",
  });
}