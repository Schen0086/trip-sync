"use server";

import { revalidatePath } from "next/cache";
import {
  redirect,
  RedirectType,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  type ItineraryItemType,
  type SuggestionReaction,
} from "@/lib/itinerary";

// Replace browser history after mutations
function replaceRedirect(
  path: string
): never {
  redirect(
    path,
    RedirectType.replace
  );
}

// Read optional text
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

// Read optional coordinate
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

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

// Build database payload
function buildItemPayload(
  formData: FormData,
  itemType: ItineraryItemType
) {
  return {
    title:
      optionalText(
        formData,
        "title"
      ) ?? "",

    description: optionalText(
      formData,
      "description"
    ),

    notes: optionalText(
      formData,
      "notes"
    ),

    location_name: optionalText(
      formData,
      "locationName"
    ),

    address: optionalText(
      formData,
      "address"
    ),

    latitude: optionalNumber(
      formData,
      "latitude"
    ),

    longitude: optionalNumber(
      formData,
      "longitude"
    ),

    scheduled_date: optionalText(
      formData,
      "scheduledDate"
    ),

    start_time: optionalText(
      formData,
      "startTime"
    ),

    end_time: optionalText(
      formData,
      "endTime"
    ),

    website_url: optionalText(
      formData,
      "websiteUrl"
    ),

    transport_mode:
      itemType === "transport"
        ? optionalText(
            formData,
            "transportMode"
          )
        : null,

    provider:
      itemType === "transport" ||
      itemType ===
        "accommodation"
        ? optionalText(
            formData,
            "provider"
          )
        : null,

    reference_number:
      itemType === "transport"
        ? optionalText(
            formData,
            "referenceNumber"
          )
        : null,

    departure_location:
      itemType === "transport"
        ? optionalText(
            formData,
            "departureLocation"
          )
        : null,

    departure_address:
      itemType === "transport"
        ? optionalText(
            formData,
            "departureAddress"
          )
        : null,

    departure_latitude:
      itemType === "transport"
        ? optionalNumber(
            formData,
            "departureLatitude"
          )
        : null,

    departure_longitude:
      itemType === "transport"
        ? optionalNumber(
            formData,
            "departureLongitude"
          )
        : null,

    departure_date:
      itemType === "transport"
        ? optionalText(
            formData,
            "departureDate"
          )
        : null,

    departure_time:
      itemType === "transport"
        ? optionalText(
            formData,
            "departureTime"
          )
        : null,

    departure_details:
      itemType === "transport"
        ? optionalText(
            formData,
            "departureDetails"
          )
        : null,

    arrival_location:
      itemType === "transport"
        ? optionalText(
            formData,
            "arrivalLocation"
          )
        : null,

    arrival_address:
      itemType === "transport"
        ? optionalText(
            formData,
            "arrivalAddress"
          )
        : null,

    arrival_latitude:
      itemType === "transport"
        ? optionalNumber(
            formData,
            "arrivalLatitude"
          )
        : null,

    arrival_longitude:
      itemType === "transport"
        ? optionalNumber(
            formData,
            "arrivalLongitude"
          )
        : null,

    arrival_date:
      itemType === "transport"
        ? optionalText(
            formData,
            "arrivalDate"
          )
        : null,

    arrival_time:
      itemType === "transport"
        ? optionalText(
            formData,
            "arrivalTime"
          )
        : null,

    arrival_details:
      itemType === "transport"
        ? optionalText(
            formData,
            "arrivalDetails"
          )
        : null,

    check_in_date:
      itemType ===
      "accommodation"
        ? optionalText(
            formData,
            "checkInDate"
          )
        : null,

    check_in_time:
      itemType ===
      "accommodation"
        ? optionalText(
            formData,
            "checkInTime"
          )
        : null,

    check_out_date:
      itemType ===
      "accommodation"
        ? optionalText(
            formData,
            "checkOutDate"
          )
        : null,

    check_out_time:
      itemType ===
      "accommodation"
        ? optionalText(
            formData,
            "checkOutTime"
          )
        : null,

    check_in_instructions:
      itemType ===
      "accommodation"
        ? optionalText(
            formData,
            "checkInInstructions"
          )
        : null,

    booking_reference:
      itemType === "transport" ||
      itemType ===
        "accommodation"
        ? optionalText(
            formData,
            "bookingReference"
          )
        : null,

    booking_url:
      itemType === "transport" ||
      itemType ===
        "accommodation"
        ? optionalText(
            formData,
            "bookingUrl"
          )
        : null,
  };
}

// Validate itinerary data
function validatePayload(
  itemType: ItineraryItemType,
  planningStatus:
    | "planned"
    | "suggested",
  payload: ReturnType<
    typeof buildItemPayload
  >
) {
  if (
    !payload.title ||
    payload.title.length > 120
  ) {
    return "A title between 1 and 120 characters is required";
  }

  if (
    payload.description &&
    payload.description.length >
      1000
  ) {
    return "Description must be 1000 characters or fewer";
  }

  if (
    payload.notes &&
    payload.notes.length > 2000
  ) {
    return "Notes must be 2000 characters or fewer";
  }

  if (
    planningStatus === "planned" &&
    itemType === "activity" &&
    !payload.scheduled_date
  ) {
    return "Choose a day for this activity";
  }

  if (
    planningStatus === "planned" &&
    itemType === "transport" &&
    (
      !payload.departure_location ||
      !payload.arrival_location ||
      !payload.departure_date ||
      !payload.arrival_date
    )
  ) {
    return "Departure, arrival and travel dates are required";
  }

  if (
    payload.departure_date &&
    payload.arrival_date &&
    payload.arrival_date <
      payload.departure_date
  ) {
    return "Arrival date cannot be before departure date";
  }

  if (
    planningStatus === "planned" &&
    itemType ===
      "accommodation" &&
    (
      !payload.check_in_date ||
      !payload.check_out_date
    )
  ) {
    return "Check-in and check-out dates are required";
  }

  if (
    payload.check_in_date &&
    payload.check_out_date &&
    payload.check_out_date <
      payload.check_in_date
  ) {
    return "Check-out cannot be before check-in";
  }

  return null;
}

export async function createItineraryItem(
  formData: FormData
) {
  const supabase =
    await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    replaceRedirect("/login");
  }

  const userId = data.claims.sub;

  const tripId =
    formData.get(
      "tripId"
    ) as string;

  const itemType =
    formData.get(
      "itemType"
    ) as ItineraryItemType;

  const planningStatus =
    formData.get(
      "planningStatus"
    ) as
      | "planned"
      | "suggested";

  const errorPath =
    `/trips/${tripId}/itinerary/new?mode=${planningStatus}&type=${itemType}`;

  if (
    !tripId ||
    ![
      "activity",
      "transport",
      "accommodation",
    ].includes(itemType)
  ) {
    replaceRedirect(
      "/dashboard"
    );
  }

  if (
    planningStatus !== "planned" &&
    planningStatus !==
      "suggested"
  ) {
    replaceRedirect(
      `/trips/${tripId}/itinerary`
    );
  }

  const payload =
    buildItemPayload(
      formData,
      itemType
    );

  const validationError =
    validatePayload(
      itemType,
      planningStatus,
      payload
    );

  if (validationError) {
    replaceRedirect(
      `${errorPath}&error=${encodeURIComponent(
        validationError
      )}`
    );
  }

  // Create entry
  const {
    data: item,
    error: insertError,
  } = await supabase
    .from("itinerary_items")
    .insert({
      trip_id: tripId,
      created_by: userId,

      item_type: itemType,

      planning_status:
        planningStatus,

      origin:
        planningStatus ===
        "suggested"
          ? "suggestion"
          : "direct",

      ...payload,
    })
    .select("id")
    .single();

  if (insertError || !item) {
    console.error(
      "Failed to create itinerary item:",
      insertError
    );

    replaceRedirect(
      `${errorPath}&error=${encodeURIComponent(
        "Unable to add itinerary item"
      )}`
    );
  }

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  revalidatePath(
    `/trips/${tripId}`
  );

  replaceRedirect(
    `/trips/${tripId}/itinerary?success=${encodeURIComponent(
      planningStatus ===
        "suggested"
        ? "Suggestion added"
        : "Itinerary item added"
    )}`
  );
}

export async function updateItineraryItem(
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

  const itemId =
    formData.get(
      "itemId"
    ) as string;

  const itemType =
    formData.get(
      "itemType"
    ) as ItineraryItemType;

  const planningStatus =
    formData.get(
      "planningStatus"
    ) as
      | "planned"
      | "suggested";

  const errorPath =
    `/trips/${tripId}/itinerary/edit/${itemId}`;

  const payload =
    buildItemPayload(
      formData,
      itemType
    );

  const validationError =
    validatePayload(
      itemType,
      planningStatus,
      payload
    );

  if (validationError) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        validationError
      )}`
    );
  }

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("itinerary_items")
    .update(payload)
    .eq("id", itemId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    console.error(
      "Failed to update itinerary item:",
      updateError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Unable to update item"
      )}`
    );
  }

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  // Remove edit page from history
  replaceRedirect(
    `/trips/${tripId}/itinerary?success=${encodeURIComponent(
      "Item updated"
    )}`
  );
}

export async function deleteItineraryItem(
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

  const itemId =
    formData.get(
      "itemId"
    ) as string;

  const {
    data: deleted,
    error: deleteError,
  } = await supabase
    .from("itinerary_items")
    .delete()
    .eq("id", itemId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();

  if (
    deleteError ||
    !deleted
  ) {
    console.error(
      "Failed to delete itinerary item:",
      deleteError
    );

    replaceRedirect(
      `/trips/${tripId}/itinerary/edit/${itemId}?error=${encodeURIComponent(
        "Unable to delete item"
      )}`
    );
  }

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  // Deleted edit URL is replaced
  replaceRedirect(
    `/trips/${tripId}/itinerary?success=${encodeURIComponent(
      "Item deleted"
    )}`
  );
}

export async function setSuggestionVote(
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

  const itemId =
    formData.get(
      "itemId"
    ) as string;

  const reaction =
    formData.get(
      "reaction"
    ) as SuggestionReaction;

  const preferredDate =
    optionalText(
      formData,
      "preferredDate"
    );

  if (
    ![
      "yes",
      "no",
      "not_sure",
      "dont_mind",
    ].includes(reaction)
  ) {
    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        "Invalid reaction"
      )}`
    );
  }

  const { error: voteError } =
    await supabase
      .from("itinerary_votes")
      .upsert(
        {
          item_id: itemId,
          user_id: userId,
          reaction,
          preferred_date:
            preferredDate,
        },
        {
          onConflict:
            "item_id,user_id",
        }
      );

  if (voteError) {
    console.error(
      "Failed to save vote:",
      voteError
    );

    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        voteError.message
      )}`
    );
  }

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  replaceRedirect(
    `/trips/${tripId}/voting?success=${encodeURIComponent(
      "Vote saved"
    )}#item-${itemId}`
  );
}

export async function clearSuggestionVote(
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

  const itemId =
    formData.get(
      "itemId"
    ) as string;

  await supabase
    .from("itinerary_votes")
    .delete()
    .eq("item_id", itemId)
    .eq("user_id", userId);

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  replaceRedirect(
    `/trips/${tripId}/voting#item-${itemId}`
  );
}

export async function scheduleSuggestion(
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

  const itemId =
    formData.get(
      "itemId"
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

  // Load suggestion
  const { data: item } =
    await supabase
      .from("itinerary_items")
      .select(
        "item_type, planning_status"
      )
      .eq("id", itemId)
      .eq("trip_id", tripId)
      .maybeSingle();

  if (
    !item ||
    item.planning_status !==
      "suggested"
  ) {
    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        "Suggestion not found"
      )}`
    );
  }

  const updates: {
    planning_status: "planned";
    scheduled_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
  } = {
    planning_status: "planned",
  };

  if (
    item.item_type ===
    "activity"
  ) {
    if (!scheduledDate) {
      replaceRedirect(
        `/trips/${tripId}/voting?error=${encodeURIComponent(
          "Choose a day before adding this activity to the itinerary"
        )}#item-${itemId}`
      );
    }

    updates.scheduled_date =
      scheduledDate;

    updates.start_time =
      startTime;

    updates.end_time =
      endTime;
  }

  const {
    data: scheduled,
    error: scheduleError,
  } = await supabase
    .from("itinerary_items")
    .update(updates)
    .eq("id", itemId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();

  if (
    scheduleError ||
    !scheduled
  ) {
    console.error(
      "Failed to schedule suggestion:",
      scheduleError
    );

    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        "Complete the required item details before adding it to the itinerary"
      )}#item-${itemId}`
    );
  }

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  replaceRedirect(
    `/trips/${tripId}/itinerary?success=${encodeURIComponent(
      "Suggestion added to itinerary"
    )}`
  );
}