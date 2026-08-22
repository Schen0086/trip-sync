"use server";

import { revalidatePath } from "next/cache";
import {
  redirect,
  RedirectType,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TripType = "personal" | "group";

// Replace current history entry
function replaceRedirect(path: string): never {
  redirect(path, RedirectType.replace);
}

export async function createTrip(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    replaceRedirect("/login");
  }

  const userId = data.claims.sub;

  // Read trip type
  const tripType =
    formData.get("tripType") as TripType;

  const groupId =
    (formData.get("groupId") as string) ||
    null;

  // Read trip details
  const name =
    (formData.get("name") as string)?.trim();

  const destination =
    (
      formData.get(
        "destination"
      ) as string
    )?.trim();

  const description =
    (
      formData.get(
        "description"
      ) as string
    )?.trim();

  const startDate =
    formData.get("startDate") as string;

  const endDate =
    formData.get("endDate") as string;

  const budgetValue =
    (
      formData.get(
        "budget"
      ) as string
    )?.trim();

  // Validate type
  if (
    tripType !== "personal" &&
    tripType !== "group"
  ) {
    replaceRedirect("/trips/new");
  }

  // Error destination
  const errorPath =
    tripType === "group" && groupId
      ? `/trips/new/group/${groupId}`
      : "/trips/new/personal";

  // Validate required fields
  if (
    !name ||
    !destination ||
    !startDate ||
    !endDate
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Name, destination and dates are required"
      )}`
    );
  }

  // Validate name
  if (name.length > 80) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Trip name must be 80 characters or fewer"
      )}`
    );
  }

  // Validate destination
  if (destination.length > 120) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Destination must be 120 characters or fewer"
      )}`
    );
  }

  // Validate description
  if (
    description &&
    description.length > 500
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Description must be 500 characters or fewer"
      )}`
    );
  }

  // Validate dates
  if (endDate < startDate) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "End date cannot be before start date"
      )}`
    );
  }

  // Validate budget
  let budget: number | null = null;

  if (budgetValue) {
    budget = Number(budgetValue);

    if (
      Number.isNaN(budget) ||
      budget < 0
    ) {
      replaceRedirect(
        `${errorPath}?error=${encodeURIComponent(
          "Budget must be a valid positive number"
        )}`
      );
    }
  }

  // Validate group trip
  if (tripType === "group") {
    if (!groupId) {
      replaceRedirect(
        `/trips/new/group?error=${encodeURIComponent(
          "Please choose a group"
        )}`
      );
    }

    // Check group ownership
    const { data: membership } =
      await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .single();

    if (membership?.role !== "owner") {
      replaceRedirect(
        `/trips/new/group?error=${encodeURIComponent(
          "You can only create trips for groups you own"
        )}`
      );
    }

    // Check group status
    const { data: group } =
      await supabase
        .from("groups")
        .select("status")
        .eq("id", groupId)
        .single();

    if (
      !group ||
      group.status !== "active"
    ) {
      replaceRedirect(
        `/groups/${groupId}?error=${encodeURIComponent(
          "Reopen this group before creating a new trip"
        )}`
      );
    }
  }

  // Create trip
  const { data: trip, error } =
    await supabase
      .from("trips")
      .insert({
        name,
        destination,
        description:
          description || null,
        start_date: startDate,
        end_date: endDate,
        budget,
        trip_type: tripType,
        owner_id: userId,
        group_id:
          tripType === "group"
            ? groupId
            : null,
        status: "planned",
      })
      .select("id")
      .single();

  if (error || !trip) {
    console.error(
      "Failed to create trip:",
      error
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Unable to create trip"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/dashboard");
  revalidatePath("/groups");

  if (groupId) {
    revalidatePath(
      `/groups/${groupId}`
    );
  }

  // Open created trip
  replaceRedirect(`/trips/${trip.id}`);
}

export async function updateTrip(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    replaceRedirect("/login");
  }

  // Read trip
  const tripId =
    formData.get("tripId") as string;

  const name =
    (formData.get("name") as string)?.trim();

  const destination =
    (
      formData.get(
        "destination"
      ) as string
    )?.trim();

  const description =
    (
      formData.get(
        "description"
      ) as string
    )?.trim();

  const startDate =
    formData.get("startDate") as string;

  const endDate =
    formData.get("endDate") as string;

  const budgetValue =
    (
      formData.get(
        "budget"
      ) as string
    )?.trim();

  const status =
    formData.get("status") as string;

  const errorPath =
    `/trips/${tripId}/edit`;

  // Validate required values
  if (
    !tripId ||
    !name ||
    !destination ||
    !startDate ||
    !endDate
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Name, destination and dates are required"
      )}`
    );
  }

  // Validate status
  if (
    status !== "planned" &&
    status !== "cancelled"
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Invalid trip status"
      )}`
    );
  }

  if (name.length > 80) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Trip name must be 80 characters or fewer"
      )}`
    );
  }

  if (destination.length > 120) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Destination must be 120 characters or fewer"
      )}`
    );
  }

  if (
    description &&
    description.length > 500
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Description must be 500 characters or fewer"
      )}`
    );
  }

  if (endDate < startDate) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "End date cannot be before start date"
      )}`
    );
  }

  // Validate budget
  let budget: number | null = null;

  if (budgetValue) {
    budget = Number(budgetValue);

    if (
      Number.isNaN(budget) ||
      budget < 0
    ) {
      replaceRedirect(
        `${errorPath}?error=${encodeURIComponent(
          "Budget must be a valid positive number"
        )}`
      );
    }
  }

  // Update trip
  const { data: updatedTrip, error } =
    await supabase
      .from("trips")
      .update({
        name,
        destination,
        description:
          description || null,
        start_date: startDate,
        end_date: endDate,
        budget,
        status,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", tripId)
      .select("id, group_id")
      .maybeSingle();

  if (error || !updatedTrip) {
    console.error(
      "Failed to update trip:",
      error
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Unable to update trip"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);

  if (updatedTrip.group_id) {
    revalidatePath(
      `/groups/${updatedTrip.group_id}`
    );
  }

  // Replace edit page in browser history
  replaceRedirect(
    `/trips/${tripId}?success=${encodeURIComponent(
      "Trip updated"
    )}`
  );
}

export async function deleteTrip(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    replaceRedirect("/login");
  }

  const tripId =
    formData.get("tripId") as string;

  if (!tripId) {
    replaceRedirect("/dashboard");
  }

  // Delete trip
  const { data: deletedTrip, error } =
    await supabase
      .from("trips")
      .delete()
      .eq("id", tripId)
      .select("id, group_id")
      .maybeSingle();

  if (error || !deletedTrip) {
    console.error(
      "Failed to delete trip:",
      error
    );

    replaceRedirect(
      `/trips/${tripId}/edit?error=${encodeURIComponent(
        "Unable to delete trip"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/dashboard");
  revalidatePath("/groups");

  if (deletedTrip.group_id) {
    revalidatePath(
      `/groups/${deletedTrip.group_id}`
    );
  }

  // Replace edit page in browser history
  replaceRedirect(
    `/dashboard?success=${encodeURIComponent(
      "Trip deleted"
    )}`
  );
}

export async function addTripParticipant(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    replaceRedirect("/login");
  }

  const currentUserId =
    data.claims.sub;

  const tripId =
    formData.get("tripId") as string;

  const userId =
    formData.get("userId") as string;

  if (!tripId || !userId) {
    replaceRedirect("/dashboard");
  }

  // Check trip creator
  const { data: trip } =
    await supabase
      .from("trips")
      .select("owner_id")
      .eq("id", tripId)
      .maybeSingle();

  if (
    !trip ||
    trip.owner_id !== currentUserId
  ) {
    replaceRedirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        "Only the trip creator can add travellers"
      )}`
    );
  }

  // Add participant
  const { error } = await supabase
    .from("trip_participants")
    .insert({
      trip_id: tripId,
      user_id: userId,
    });

  if (error) {
    console.error(
      "Failed to add participant:",
      error
    );

    const message =
      error.code === "23505"
        ? "That person is already attending"
        : "Unable to add traveller";

    replaceRedirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        message
      )}`
    );
  }

  // Refresh pages
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/dashboard");

  replaceRedirect(
    `/trips/${tripId}?success=${encodeURIComponent(
      "Traveller added"
    )}`
  );
}

export async function removeTripParticipant(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    replaceRedirect("/login");
  }

  const currentUserId =
    data.claims.sub;

  const tripId =
    formData.get("tripId") as string;

  const userId =
    formData.get("userId") as string;

  if (!tripId || !userId) {
    replaceRedirect("/dashboard");
  }

  // Creator cannot remove themselves this way
  if (userId === currentUserId) {
    replaceRedirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        "Use Leave trip if you are no longer attending"
      )}`
    );
  }

  // Check trip creator
  const { data: trip } =
    await supabase
      .from("trips")
      .select("owner_id")
      .eq("id", tripId)
      .maybeSingle();

  if (
    !trip ||
    trip.owner_id !== currentUserId
  ) {
    replaceRedirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        "Only the trip creator can remove travellers"
      )}`
    );
  }

  // Remove participant
  const { data: removed, error } =
    await supabase
      .from("trip_participants")
      .delete()
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

  if (error || !removed) {
    console.error(
      "Failed to remove participant:",
      error
    );

    replaceRedirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        "Unable to remove traveller"
      )}`
    );
  }

  // Refresh pages
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/dashboard");

  replaceRedirect(
    `/trips/${tripId}?success=${encodeURIComponent(
      "Traveller removed"
    )}`
  );
}

export async function leaveTrip(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    replaceRedirect("/login");
  }

  const userId = data.claims.sub;

  const tripId =
    formData.get("tripId") as string;

  if (!tripId) {
    replaceRedirect("/dashboard");
  }

  // Load trip
  const { data: trip } =
    await supabase
      .from("trips")
      .select(
        "id, trip_type, group_id"
      )
      .eq("id", tripId)
      .maybeSingle();

  if (!trip) {
    replaceRedirect("/dashboard");
  }

  // Personal trips cannot be left
  if (trip.trip_type !== "group") {
    replaceRedirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        "Personal trips cannot be left"
      )}`
    );
  }

  // Remove own participation
  const { data: removed, error } =
    await supabase
      .from("trip_participants")
      .delete()
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

  if (error || !removed) {
    console.error(
      "Failed to leave trip:",
      error
    );

    replaceRedirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        "Unable to leave this trip"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);

  if (trip.group_id) {
    revalidatePath(
      `/groups/${trip.group_id}`
    );
  }

  // User remains allowed to view the trip through the group
  replaceRedirect(
    `/trips/${tripId}?success=${encodeURIComponent(
      "You are no longer attending this trip"
    )}`
  );
}