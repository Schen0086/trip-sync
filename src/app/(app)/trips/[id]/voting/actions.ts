"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
  RedirectType,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type SuggestionDecision =
  | "suggested"
  | "rejected"
  | "archived";

function replaceRedirect(
  path: string
): never {
  redirect(
    path,
    RedirectType.replace
  );
}

function getText(
  formData: FormData,
  name: string
) {
  return (
    (
      formData.get(name) as
        | string
        | null
    )?.trim() ?? ""
  );
}

function refreshSuggestionViews(
  tripId: string
) {
  revalidatePath(
    `/trips/${tripId}`
  );

  revalidatePath(
    `/trips/${tripId}/voting`
  );

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  revalidatePath(
    `/trips/${tripId}/places`
  );

  revalidatePath(
    `/trips/${tripId}/map`
  );
}

export async function setSuggestionDecision(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    replaceRedirect(
      "/login"
    );
  }

  const userId =
    data.claims.sub;

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const itemId =
    getText(
      formData,
      "itemId"
    );

  const decision =
    getText(
      formData,
      "decision"
    ) as SuggestionDecision;

  const allowed:
    SuggestionDecision[] = [
    "suggested",
    "rejected",
    "archived",
  ];

  if (
    !tripId ||
    !itemId ||
    !allowed.includes(
      decision
    )
  ) {
    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        "Invalid suggestion decision"
      )}`
    );
  }

  // Only the trip creator can
  // make group decisions.
  const {
    data: trip,
  } = await supabase
    .from("trips")
    .select(
      "id, owner_id, trip_type"
    )
    .eq(
      "id",
      tripId
    )
    .maybeSingle();

  if (
    !trip ||
    trip.trip_type !==
      "group" ||
    trip.owner_id !==
      userId
  ) {
    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        "Only the trip creator can change suggestion decisions"
      )}`
    );
  }

  const {
    data: item,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .select(`
      id,
      origin,
      planning_status
    `)
    .eq(
      "id",
      itemId
    )
    .eq(
      "trip_id",
      tripId
    )
    .maybeSingle();

  if (
    !item ||
    item.origin !==
      "suggestion"
  ) {
    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        "Suggestion not found"
      )}`
    );
  }

  // Accepted suggestions already
  // belong to the itinerary.
  if (
    item.planning_status ===
      "planned"
  ) {
    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        "Accepted suggestions must be managed from the itinerary"
      )}#item-${itemId}`
    );
  }

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .update({
      planning_status:
        decision,
    })
    .eq(
      "id",
      itemId
    )
    .eq(
      "trip_id",
      tripId
    )
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !updated
  ) {
    console.error(
      "Failed to update suggestion decision:",
      updateError
    );

    replaceRedirect(
      `/trips/${tripId}/voting?error=${encodeURIComponent(
        updateError?.message ??
          "Unable to update suggestion"
      )}`
    );
  }

  refreshSuggestionViews(
    tripId
  );

  const message =
    decision ===
    "suggested"
      ? "Suggestion restored to voting"
      : decision ===
        "rejected"
      ? "Suggestion rejected"
      : "Suggestion archived";

  replaceRedirect(
    `/trips/${tripId}/voting?success=${encodeURIComponent(
      message
    )}#item-${itemId}`
  );
}