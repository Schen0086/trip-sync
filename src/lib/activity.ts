export type ActivityCategory =
  | "tasks"
  | "itinerary"
  | "voting"
  | "places"
  | "expenses"
  | "packing";


export type ActivityActorProfile = {
  display_name:
    | string
    | null;

  avatar_url:
    | string
    | null;
};


export type TripActivityEvent = {
  id: string;
  trip_id: string;

  actor_user_id:
    | string
    | null;

  actor_profile?:
    | ActivityActorProfile
    | null;

  category:
    ActivityCategory;

  event_type: string;
  entity_type: string;

  entity_id:
    | string
    | null;

  action: string;
  subject: string;

  detail:
    | string
    | null;

  href:
    | string
    | null;

  created_at: string;
};


export type NotificationRecord = {
  id: string;

  user_id: string;

  trip_id:
    | string
    | null;

  actor_user_id:
    | string
    | null;

  actor_profile?:
    | ActivityActorProfile
    | null;

  type: string;

  title: string;
  message: string;

  href:
    | string
    | null;

  read_at:
    | string
    | null;

  created_at: string;
};


/**
 * Supabase can infer an embedded relationship as either
 * a single object or an array depending on relationship
 * metadata. Normalize both shapes for the UI.
 */
export function normalizeActivityActorProfile(
  profile:
    | ActivityActorProfile
    | ActivityActorProfile[]
    | null
    | undefined
): ActivityActorProfile | null {
  if (
    Array.isArray(
      profile
    )
  ) {
    return (
      profile[0] ??
      null
    );
  }

  return (
    profile ??
    null
  );
}


export function getActivityCategoryLabel(
  category: ActivityCategory
) {
  switch (category) {
    case "tasks":
      return "Tasks";

    case "itinerary":
      return "Itinerary";

    case "voting":
      return "Voting";

    case "places":
      return "Places";

    case "expenses":
      return "Expenses";

    case "packing":
      return "Packing";
  }
}


export function formatActivityTimestamp(
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
      timeZone: "UTC",
    }
  );
}


export function formatActivityDay(
  value: string
) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-IE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}