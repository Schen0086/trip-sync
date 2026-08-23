"use server";

import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
  RedirectType,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isPlaceCategory,
} from "@/lib/places";

// Replace mutation pages in browser history
function replaceRedirect(
  path: string
): never {
  redirect(
    path,
    RedirectType.replace
  );
}

// Read text
function optionalText(
  formData: FormData,
  name: string
) {
  const value =
    (
      formData.get(name) as string
    )?.trim() ?? "";

  return value || null;
}

// Read number
function optionalNumber(
  formData: FormData,
  name: string
) {
  const value =
    (
      formData.get(name) as string
    )?.trim() ?? "";

  if (!value) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

// Validate coordinates
function validCoordinates(
  latitude: number | null,
  longitude: number | null
) {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

// Validate optional website
function isValidWebsite(
  website: string | null
) {
  if (!website) {
    return true;
  }

  try {
    const url = new URL(
      website
    );

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

// Refresh every place-related view
function revalidateTripPlaces(
  tripId: string
) {
  revalidatePath(
    `/trips/${tripId}/places`
  );

  revalidatePath(
    `/trips/${tripId}/map`
  );

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  revalidatePath(
    `/trips/${tripId}`
  );
}

export async function saveDiscoveredPlace(
  formData: FormData
) {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    replaceRedirect("/login");
  }

  const userId =
    data.claims.sub;

  const tripId =
    formData.get(
      "tripId"
    ) as string;

  const geoapifyPlaceId =
    optionalText(
      formData,
      "geoapifyPlaceId"
    );

  const name =
    optionalText(
      formData,
      "name"
    );

  const category =
    optionalText(
      formData,
      "category"
    );

  const address =
    optionalText(
      formData,
      "address"
    );

  const latitude =
    optionalNumber(
      formData,
      "latitude"
    );

  const longitude =
    optionalNumber(
      formData,
      "longitude"
    );

  const errorPath =
    `/trips/${tripId}/places`;

  if (
    !tripId ||
    !name ||
    name.length > 160
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Invalid place"
      )}`
    );
  }

  if (
    !category ||
    !isPlaceCategory(category)
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Invalid place category"
      )}`
    );
  }

  if (
    !validCoordinates(
      latitude,
      longitude
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "This place does not have valid coordinates"
      )}`
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from("saved_places")
    .insert({
      trip_id: tripId,
      saved_by: userId,

      geoapify_place_id:
        geoapifyPlaceId,

      name,
      category,
      address,

      latitude,
      longitude,
    });

  if (insertError) {
    console.error(
      "Failed to save place:",
      insertError
    );

    const message =
      insertError.code ===
      "23505"
        ? "This place is already saved"
        : "Unable to save place";

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        message
      )}`
    );
  }

  revalidateTripPlaces(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Place saved"
    )}`
  );
}

export async function saveManualPlace(
  formData: FormData
) {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    replaceRedirect("/login");
  }

  const userId =
    data.claims.sub;

  const tripId =
    formData.get(
      "tripId"
    ) as string;

  const name =
    optionalText(
      formData,
      "locationName"
    );

  const category =
    optionalText(
      formData,
      "category"
    );

  const address =
    optionalText(
      formData,
      "address"
    );

  const latitude =
    optionalNumber(
      formData,
      "latitude"
    );

  const longitude =
    optionalNumber(
      formData,
      "longitude"
    );

  const website =
    optionalText(
      formData,
      "websiteUrl"
    );

  const notes =
    optionalText(
      formData,
      "notes"
    );

  const errorPath =
    `/trips/${tripId}/places/new`;

  if (
    !name ||
    name.length > 160
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a place"
      )}`
    );
  }

  if (
    !category ||
    !isPlaceCategory(category)
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid category"
      )}`
    );
  }

  if (
    !validCoordinates(
      latitude,
      longitude
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Select a location from the search results so TripSync can save its map coordinates"
      )}`
    );
  }

  if (
    !isValidWebsite(website)
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Enter a valid website"
      )}`
    );
  }

  if (
    notes &&
    notes.length > 1500
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Notes must be 1500 characters or fewer"
      )}`
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from("saved_places")
    .insert({
      trip_id: tripId,
      saved_by: userId,

      name,
      category,
      address,

      latitude,
      longitude,

      website_url:
        website,
      notes,
    });

  if (insertError) {
    console.error(
      "Failed to save manual place:",
      insertError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Unable to save place"
      )}`
    );
  }

  revalidateTripPlaces(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/places?success=${encodeURIComponent(
      "Place saved"
    )}`
  );
}

export async function updateSavedPlace(
  formData: FormData
) {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    replaceRedirect("/login");
  }

  const tripId =
    formData.get(
      "tripId"
    ) as string;

  const placeId =
    formData.get(
      "placeId"
    ) as string;

  const name =
    optionalText(
      formData,
      "locationName"
    );

  const category =
    optionalText(
      formData,
      "category"
    );

  const address =
    optionalText(
      formData,
      "address"
    );

  const latitude =
    optionalNumber(
      formData,
      "latitude"
    );

  const longitude =
    optionalNumber(
      formData,
      "longitude"
    );

  const website =
    optionalText(
      formData,
      "websiteUrl"
    );

  const notes =
    optionalText(
      formData,
      "notes"
    );

  const errorPath =
    `/trips/${tripId}/places/edit/${placeId}`;

  if (
    !name ||
    name.length > 160
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid place"
      )}`
    );
  }

  if (
    !category ||
    !isPlaceCategory(category)
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid category"
      )}`
    );
  }

  if (
    !validCoordinates(
      latitude,
      longitude
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Select a location from the search results"
      )}`
    );
  }

  if (
    !isValidWebsite(website)
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Enter a valid website"
      )}`
    );
  }

  if (
    notes &&
    notes.length > 1500
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Notes must be 1500 characters or fewer"
      )}`
    );
  }

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("saved_places")
    .update({
      name,
      category,
      address,
      latitude,
      longitude,
      website_url:
        website,
      notes,
    })
    .eq("id", placeId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !updated
  ) {
    console.error(
      "Failed to update place:",
      updateError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Unable to update place"
      )}`
    );
  }

  revalidateTripPlaces(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/places?success=${encodeURIComponent(
      "Place updated"
    )}`
  );
}

export async function deleteSavedPlace(
  formData: FormData
) {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    replaceRedirect("/login");
  }

  const tripId =
    formData.get(
      "tripId"
    ) as string;

  const placeId =
    formData.get(
      "placeId"
    ) as string;

  const {
    data: deleted,
    error: deleteError,
  } = await supabase
    .from("saved_places")
    .delete()
    .eq("id", placeId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();

  if (
    deleteError ||
    !deleted
  ) {
    console.error(
      "Failed to delete place:",
      deleteError
    );

    replaceRedirect(
      `/trips/${tripId}/places/edit/${placeId}?error=${encodeURIComponent(
        "Unable to delete place"
      )}`
    );
  }

  revalidateTripPlaces(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/places?success=${encodeURIComponent(
      "Place removed"
    )}`
  );
}

export async function addSavedPlaceToItinerary(
  formData: FormData
) {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    replaceRedirect("/login");
  }

  const userId =
    data.claims.sub;

  const tripId =
    formData.get(
      "tripId"
    ) as string;

  const placeId =
    formData.get(
      "placeId"
    ) as string;

  const scheduledDate =
    optionalText(
      formData,
      "scheduledDate"
    );

  const startTime =
    optionalText(
      formData,
      "startTime"
    );

  const endTime =
    optionalText(
      formData,
      "endTime"
    );

  const errorPath =
    `/trips/${tripId}/places`;

  // Load trip
  const { data: trip } =
    await supabase
      .from("trips")
      .select(
        "id, owner_id, start_date, end_date"
      )
      .eq("id", tripId)
      .maybeSingle();

  if (
    !trip ||
    trip.owner_id !== userId
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Only the trip creator can add saved places directly to the itinerary"
      )}`
    );
  }

  if (
    !scheduledDate ||
    scheduledDate <
      trip.start_date ||
    scheduledDate >
      trip.end_date
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a day within the trip dates"
      )}`
    );
  }

  // Load place
  const { data: place } =
    await supabase
      .from("saved_places")
      .select("*")
      .eq("id", placeId)
      .eq("trip_id", tripId)
      .maybeSingle();

  if (!place) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Place not found"
      )}`
    );
  }

  // Avoid duplicates
  const {
    data: existingItem,
  } = await supabase
    .from("itinerary_items")
    .select(
      "id, planning_status"
    )
    .eq(
      "source_saved_place_id",
      placeId
    )
    .maybeSingle();

  if (existingItem) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "This place is already in the itinerary or voting backlog"
      )}`
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from("itinerary_items")
    .insert({
      trip_id: tripId,
      created_by: userId,

      item_type: "activity",
      planning_status:
        "planned",
      origin: "direct",

      title: place.name,

      description:
        place.notes,

      location_name:
        place.name,

      address:
        place.address,

      latitude:
        place.latitude,

      longitude:
        place.longitude,

      scheduled_date:
        scheduledDate,

      start_time:
        startTime,

      end_time:
        endTime,

      website_url:
        place.website_url,

      source_saved_place_id:
        place.id,
    });

  if (insertError) {
    console.error(
      "Failed to add saved place to itinerary:",
      insertError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        insertError.code ===
          "23505"
          ? "This place is already being planned"
          : "Unable to add place to itinerary"
      )}`
    );
  }

  revalidateTripPlaces(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/itinerary?success=${encodeURIComponent(
      "Place added to itinerary"
    )}`
  );
}

export async function suggestSavedPlace(
  formData: FormData
) {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    replaceRedirect("/login");
  }

  const userId =
    data.claims.sub;

  const tripId =
    formData.get(
      "tripId"
    ) as string;

  const placeId =
    formData.get(
      "placeId"
    ) as string;

  const errorPath =
    `/trips/${tripId}/places`;

  // Load group trip
  const { data: trip } =
    await supabase
      .from("trips")
      .select(
        "id, trip_type"
      )
      .eq("id", tripId)
      .maybeSingle();

  if (
    !trip ||
    trip.trip_type !== "group"
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Only group trips have suggestion voting"
      )}`
    );
  }

  // Load saved place
  const { data: place } =
    await supabase
      .from("saved_places")
      .select("*")
      .eq("id", placeId)
      .eq("trip_id", tripId)
      .maybeSingle();

  if (!place) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Place not found"
      )}`
    );
  }

  // Avoid duplicates
  const {
    data: existingItem,
  } = await supabase
    .from("itinerary_items")
    .select("id")
    .eq(
      "source_saved_place_id",
      placeId
    )
    .maybeSingle();

  if (existingItem) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "This place is already in the itinerary or voting backlog"
      )}`
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from("itinerary_items")
    .insert({
      trip_id: tripId,
      created_by: userId,

      item_type: "activity",

      planning_status:
        "suggested",

      origin: "suggestion",

      title: place.name,

      description:
        place.notes,

      location_name:
        place.name,

      address:
        place.address,

      latitude:
        place.latitude,

      longitude:
        place.longitude,

      website_url:
        place.website_url,

      source_saved_place_id:
        place.id,
    });

  if (insertError) {
    console.error(
      "Failed to suggest saved place:",
      insertError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        insertError.code ===
          "23505"
          ? "This place is already being planned"
          : "Unable to suggest place"
      )}`
    );
  }

  revalidateTripPlaces(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/voting?success=${encodeURIComponent(
      "Place added to voting backlog"
    )}`
  );
}