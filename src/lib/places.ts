import type {
  ItineraryItemType,
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
    value: "food_drink",
    label: "Food & drink",
  },
  {
    value: "attraction",
    label: "Attractions",
  },
  {
    value: "nightlife",
    label: "Nightlife",
  },
  {
    value: "activity",
    label: "Activities",
  },
  {
    value: "shopping",
    label: "Shopping",
  },
  {
    value: "accommodation",
    label: "Accommodation",
  },
  {
    value: "other",
    label: "Other",
  },
];

export type SavedPlace = {
  id: string;
  trip_id: string;
  saved_by: string;

  geoapify_place_id: string | null;

  name: string;
  category: PlaceCategory;

  address: string | null;
  latitude: number;
  longitude: number;

  website_url: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;

  author?: ProfileSummary | null;
};

export type MapItineraryItem = {
  id: string;
  source_saved_place_id: string | null;

  item_type: ItineraryItemType;
  planning_status: string;

  title: string;

  scheduled_date: string | null;

  location_name: string | null;
  latitude: number | null;
  longitude: number | null;

  departure_location: string | null;
  departure_latitude: number | null;
  departure_longitude: number | null;
  departure_date: string | null;

  arrival_location: string | null;
  arrival_latitude: number | null;
  arrival_longitude: number | null;
  arrival_date: string | null;

  check_in_date: string | null;
  check_out_date: string | null;
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

  kind: TripMapPointKind;

  subtitle: string | null;

  startDate: string | null;
  endDate: string | null;

  href: string;
};

// Validate application category
export function isPlaceCategory(
  value: string
): value is PlaceCategory {
  return PLACE_CATEGORY_OPTIONS.some(
    (category) =>
      category.value === value
  );
}

// Human-readable category
export function getPlaceCategoryLabel(
  category: PlaceCategory
) {
  return (
    PLACE_CATEGORY_OPTIONS.find(
      (option) =>
        option.value === category
    )?.label ?? "Other"
  );
}

// Read saved-by profile
export function getSavedPlaceAuthor(
  place: SavedPlace
) {
  return place.author ?? null;
}

// Build saved-place and itinerary map points
export function buildTripMapPoints(
  savedPlaces: SavedPlace[],
  itineraryItems: MapItineraryItem[],
  tripId: string
): TripMapPoint[] {
  const points: TripMapPoint[] = [];

  // Places already in the confirmed itinerary
  const plannedSourcePlaceIds =
    new Set(
      itineraryItems
        .filter(
          (item) =>
            item.planning_status ===
              "planned" &&
            item.source_saved_place_id
        )
        .map(
          (item) =>
            item.source_saved_place_id!
        )
    );

  // Saved places not yet represented in itinerary
  savedPlaces.forEach((place) => {
    if (
      plannedSourcePlaceIds.has(
        place.id
      )
    ) {
      return;
    }

    points.push({
      id: `saved-${place.id}`,
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      kind: "saved",
      subtitle:
        getPlaceCategoryLabel(
          place.category
        ),
      startDate: null,
      endDate: null,
      href:
        `/trips/${tripId}/places#place-${place.id}`,
    });
  });

  // Confirmed itinerary locations
  itineraryItems
    .filter(
      (item) =>
        item.planning_status ===
        "planned"
    )
    .forEach((item) => {
      if (
        item.item_type ===
          "activity" &&
        item.latitude !== null &&
        item.longitude !== null
      ) {
        points.push({
          id: `activity-${item.id}`,
          name: item.title,
          latitude: item.latitude,
          longitude: item.longitude,
          kind: "activity",
          subtitle:
            item.location_name,
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
        item.latitude !== null &&
        item.longitude !== null
      ) {
        points.push({
          id: `accommodation-${item.id}`,
          name: item.title,
          latitude: item.latitude,
          longitude: item.longitude,
          kind: "accommodation",
          subtitle:
            item.location_name,
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
            id: `transport-departure-${item.id}`,
            name: `${item.title} — departure`,
            latitude:
              item.departure_latitude,
            longitude:
              item.departure_longitude,
            kind: "transport",
            subtitle:
              item.departure_location,
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
            id: `transport-arrival-${item.id}`,
            name: `${item.title} — arrival`,
            latitude:
              item.arrival_latitude,
            longitude:
              item.arrival_longitude,
            kind: "transport",
            subtitle:
              item.arrival_location,
            startDate:
              item.arrival_date,
            endDate:
              item.arrival_date,
            href:
              `/trips/${tripId}/itinerary`,
          });
        }
      }
    });

  return points;
}