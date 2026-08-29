import type {
  ItineraryItemType,
  ItineraryPlanningStatus,
  ProfileSummary,
} from "@/lib/itinerary";

export type PlaceCategory =
  | "food_drink"
  | "attraction"
  | "nightlife"
  | "activity"
  | "shopping"
  | "accommodation"
  | "other";

export const PLACE_CATEGORY_OPTIONS: {
  value: PlaceCategory;
  label: string;
}[] = [
  {
    value:
      "food_drink",
    label:
      "Food & drink",
  },
  {
    value:
      "attraction",
    label:
      "Attractions",
  },
  {
    value:
      "nightlife",
    label:
      "Nightlife",
  },
  {
    value:
      "activity",
    label:
      "Activities",
  },
  {
    value:
      "shopping",
    label:
      "Shopping",
  },
  {
    value:
      "accommodation",
    label:
      "Accommodation",
  },
  {
    value:
      "other",
    label:
      "Other",
  },
];

export type PlacePlanningStatus =
  | "saved"
  | "voting"
  | "planned"
  | "rejected"
  | "archived";

export const PLACE_STATUS_OPTIONS: {
  value: PlacePlanningStatus;
  label: string;
}[] = [
  {
    value: "saved",
    label: "Saved",
  },
  {
    value: "voting",
    label: "Being voted on",
  },
  {
    value: "planned",
    label: "Planned",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "archived",
    label: "Archived",
  },
];

export type MapPointCategory =
  | PlaceCategory
  | "transport";

export const MAP_POINT_CATEGORY_OPTIONS: {
  value: MapPointCategory;
  label: string;
}[] = [
  ...PLACE_CATEGORY_OPTIONS.filter(
    (option) =>
      option.value !==
      "other"
  ),

  {
    value:
      "transport",
    label:
      "Transport",
  },

  {
    value:
      "other",
    label:
      "Other",
  },
];

export type SavedPlace = {
  id: string;
  trip_id: string;
  saved_by: string;

  geoapify_place_id:
    | string
    | null;

  name: string;

  category:
    PlaceCategory;

  address:
    | string
    | null;

  latitude: number;
  longitude: number;

  website_url:
    | string
    | null;

  notes:
    | string
    | null;

  created_at: string;
  updated_at: string;

  author?:
    | ProfileSummary
    | null;
};

export type MapItineraryItem = {
  id: string;

  source_saved_place_id:
    | string
    | null;

  item_type:
    ItineraryItemType;

  planning_status:
    ItineraryPlanningStatus;

  title: string;

  scheduled_date:
    | string
    | null;

  location_name:
    | string
    | null;

  address:
    | string
    | null;

  latitude:
    | number
    | null;

  longitude:
    | number
    | null;

  departure_location:
    | string
    | null;

  departure_address:
    | string
    | null;

  departure_latitude:
    | number
    | null;

  departure_longitude:
    | number
    | null;

  departure_date:
    | string
    | null;

  arrival_location:
    | string
    | null;

  arrival_address:
    | string
    | null;

  arrival_latitude:
    | number
    | null;

  arrival_longitude:
    | number
    | null;

  arrival_date:
    | string
    | null;

  check_in_date:
    | string
    | null;

  check_out_date:
    | string
    | null;
};

export type TripMapPointKind =
  | "saved"
  | "activity"
  | "transport"
  | "accommodation";

export type TripMapPoint = {
  id: string;

  name: string;

  latitude: number;
  longitude: number;

  kind:
    TripMapPointKind;

  category:
    MapPointCategory;

  status:
    PlacePlanningStatus;

  subtitle:
    | string
    | null;

  address:
    | string
    | null;

  startDate:
    | string
    | null;

  endDate:
    | string
    | null;

  href: string;
};

export function isPlaceCategory(
  value: string
): value is PlaceCategory {
  return PLACE_CATEGORY_OPTIONS.some(
    (category) =>
      category.value ===
      value
  );
}

export function getPlaceCategoryLabel(
  category: PlaceCategory
) {
  return (
    PLACE_CATEGORY_OPTIONS.find(
      (option) =>
        option.value ===
        category
    )?.label ??
    "Other"
  );
}

export function getMapPointCategoryLabel(
  category:
    MapPointCategory
) {
  if (
    category ===
    "transport"
  ) {
    return "Transport";
  }

  return getPlaceCategoryLabel(
    category
  );
}

export function getSavedPlaceAuthor(
  place: SavedPlace
) {
  return (
    place.author ??
    null
  );
}

export function getSavedPlaceStatus(
  linkedItem:
    | MapItineraryItem
    | null
    | undefined
): PlacePlanningStatus {
  if (!linkedItem) {
    return "saved";
  }

  switch (
    linkedItem.planning_status
  ) {
    case "planned":
      return "planned";

    case "suggested":
      return "voting";

    case "rejected":
      return "rejected";

    case "archived":
      return "archived";
  }
}

export function getPlaceStatusLabel(
  status:
    PlacePlanningStatus
) {
  return (
    PLACE_STATUS_OPTIONS.find(
      (option) =>
        option.value ===
        status
    )?.label ??
    "Saved"
  );
}

// Build all locations displayed by the map.
export function buildTripMapPoints(
  savedPlaces:
    SavedPlace[],

  itineraryItems:
    MapItineraryItem[],

  tripId: string
): TripMapPoint[] {
  const points:
    TripMapPoint[] = [];

  const savedPlaceById =
    new Map(
      savedPlaces.map(
        (place) => [
          place.id,
          place,
        ]
      )
    );

  const linkedItemByPlace =
    new Map<
      string,
      MapItineraryItem
    >();

  itineraryItems.forEach(
    (item) => {
      if (
        item.source_saved_place_id
      ) {
        linkedItemByPlace.set(
          item.source_saved_place_id,
          item
        );
      }
    }
  );

  // Saved places stay visible on the map
  // while undecided, voting, rejected or
  // archived. Once planned, the itinerary
  // marker replaces the saved marker.
  savedPlaces.forEach(
    (place) => {
      const linkedItem =
        linkedItemByPlace.get(
          place.id
        );

      const status =
        getSavedPlaceStatus(
          linkedItem
        );

      if (
        status ===
        "planned"
      ) {
        return;
      }

      points.push({
        id:
          `saved-${place.id}`,

        name:
          place.name,

        latitude:
          place.latitude,

        longitude:
          place.longitude,

        kind:
          "saved",

        category:
          place.category,

        status,

        subtitle:
          getPlaceCategoryLabel(
            place.category
          ),

        address:
          place.address,

        startDate:
          null,

        endDate:
          null,

        href:
          `/trips/${tripId}/places#place-${place.id}`,
      });
    }
  );

  // Confirmed itinerary locations.
  itineraryItems
    .filter(
      (item) =>
        item.planning_status ===
        "planned"
    )
    .forEach(
      (item) => {
        const sourcePlace =
          item.source_saved_place_id
            ? savedPlaceById.get(
                item.source_saved_place_id
              )
            : undefined;

        if (
          item.item_type ===
            "activity" &&
          item.latitude !==
            null &&
          item.longitude !==
            null
        ) {
          points.push({
            id:
              `activity-${item.id}`,

            name:
              item.title,

            latitude:
              item.latitude,

            longitude:
              item.longitude,

            kind:
              "activity",

            category:
              sourcePlace?.category ??
              "activity",

            status:
              "planned",

            subtitle:
              item.location_name,

            address:
              item.address,

            startDate:
              item.scheduled_date,

            endDate:
              item.scheduled_date,

            href:
              `/trips/${tripId}/itinerary`,
          });
        }

        if (
          item.item_type ===
            "accommodation" &&
          item.latitude !==
            null &&
          item.longitude !==
            null
        ) {
          points.push({
            id:
              `accommodation-${item.id}`,

            name:
              item.title,

            latitude:
              item.latitude,

            longitude:
              item.longitude,

            kind:
              "accommodation",

            category:
              sourcePlace?.category ??
              "accommodation",

            status:
              "planned",

            subtitle:
              item.location_name,

            address:
              item.address,

            startDate:
              item.check_in_date,

            endDate:
              item.check_out_date,

            href:
              `/trips/${tripId}/itinerary`,
          });
        }

        if (
          item.item_type ===
          "transport"
        ) {
          if (
            item.departure_latitude !==
              null &&
            item.departure_longitude !==
              null
          ) {
            points.push({
              id:
                `transport-departure-${item.id}`,

              name:
                `${item.title} — departure`,

              latitude:
                item.departure_latitude,

              longitude:
                item.departure_longitude,

              kind:
                "transport",

              category:
                "transport",

              status:
                "planned",

              subtitle:
                item.departure_location,

              address:
                item.departure_address,

              startDate:
                item.departure_date,

              endDate:
                item.departure_date,

              href:
                `/trips/${tripId}/itinerary`,
            });
          }

          if (
            item.arrival_latitude !==
              null &&
            item.arrival_longitude !==
              null
          ) {
            points.push({
              id:
                `transport-arrival-${item.id}`,

              name:
                `${item.title} — arrival`,

              latitude:
                item.arrival_latitude,

              longitude:
                item.arrival_longitude,

              kind:
                "transport",

              category:
                "transport",

              status:
                "planned",

              subtitle:
                item.arrival_location,

              address:
                item.arrival_address,

              startDate:
                item.arrival_date,

              endDate:
                item.arrival_date,

              href:
                `/trips/${tripId}/itinerary`,
            });
          }
        }
      }
    );

  return points;
}