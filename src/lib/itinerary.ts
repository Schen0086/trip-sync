export type ItineraryItemType =
  | "activity"
  | "transport"
  | "accommodation";

export type ItineraryPlanningStatus =
  | "suggested"
  | "planned";

export type SuggestionReaction =
  | "yes"
  | "no"
  | "not_sure"
  | "dont_mind";

export type ProfileSummary = {
  display_name: string;
  username: string | null;
};

export type ItineraryItem = {
  id: string;
  trip_id: string;
  created_by: string;

  item_type: ItineraryItemType;
  planning_status: ItineraryPlanningStatus;
  origin: "direct" | "suggestion";

  title: string;
  description: string | null;
  notes: string | null;

  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;

  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  website_url: string | null;

  transport_mode: string | null;
  provider: string | null;
  reference_number: string | null;

  departure_location: string | null;
  departure_address: string | null;
  departure_latitude: number | null;
  departure_longitude: number | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_details: string | null;

  arrival_location: string | null;
  arrival_address: string | null;
  arrival_latitude: number | null;
  arrival_longitude: number | null;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_details: string | null;

  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  check_in_instructions: string | null;

  booking_reference: string | null;
  booking_url: string | null;

  sort_order: number;
  created_at: string;
  updated_at: string;

  // Loaded separately from itinerary_items
  author?: ProfileSummary | null;
};

export type ItineraryVote = {
  item_id: string;
  user_id: string;
  reaction: SuggestionReaction;
  preferred_date: string | null;
};

// Read creator profile
export function getItemAuthor(
  item: ItineraryItem
) {
  return item.author ?? null;
}

// Read main itinerary date
export function getItineraryItemDate(
  item: ItineraryItem
) {
  if (item.item_type === "transport") {
    return item.departure_date;
  }

  if (
    item.item_type === "accommodation"
  ) {
    return item.check_in_date;
  }

  return item.scheduled_date;
}

// Read main itinerary time
export function getItineraryItemTime(
  item: ItineraryItem
) {
  if (item.item_type === "transport") {
    return item.departure_time;
  }

  if (
    item.item_type === "accommodation"
  ) {
    return item.check_in_time;
  }

  return item.start_time;
}

// Human-readable type
export function getItineraryTypeLabel(
  type: ItineraryItemType
) {
  switch (type) {
    case "activity":
      return "Activity";

    case "transport":
      return "Transport";

    case "accommodation":
      return "Accommodation";
  }
}

// Format database time
export function formatItineraryTime(
  time: string | null
) {
  if (!time) {
    return null;
  }

  return time.slice(0, 5);
}

// Format date
export function formatItineraryDate(
  date: string
) {
  return new Date(
    `${date}T00:00:00Z`
  ).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Format shorter trip day
export function formatTripDay(
  date: string
) {
  return new Date(
    `${date}T00:00:00Z`
  ).toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

// Generate every date in the trip
export function getTripDates(
  startDate: string,
  endDate: string
) {
  const dates: string[] = [];

  const current = new Date(
    `${startDate}T00:00:00Z`
  );

  const end = new Date(
    `${endDate}T00:00:00Z`
  );

  while (current <= end) {
    dates.push(
      current
        .toISOString()
        .slice(0, 10)
    );

    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }

  return dates;
}