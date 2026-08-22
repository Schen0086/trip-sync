"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TripType = "personal" | "group";

export async function createTrip(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Read form data
  const tripType =
    formData.get("tripType") as TripType;

  const groupId =
    (formData.get("groupId") as string) ||
    null;

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
    redirect("/trips/new");
  }

  // Set error destination
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
    redirect(
      `${errorPath}?error=${encodeURIComponent(
        "Name, destination and dates are required"
      )}`
    );
  }

  // Validate name
  if (name.length > 80) {
    redirect(
      `${errorPath}?error=${encodeURIComponent(
        "Trip name must be 80 characters or fewer"
      )}`
    );
  }

  // Validate dates
  if (
    new Date(endDate) <
    new Date(startDate)
  ) {
    redirect(
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
      redirect(
        `${errorPath}?error=${encodeURIComponent(
          "Budget must be a valid positive number"
        )}`
      );
    }
  }

  // Validate group trip
  if (tripType === "group") {
    if (!groupId) {
      redirect(
        `/trips/new/group?error=${encodeURIComponent(
          "Please choose a group"
        )}`
      );
    }

    // Check ownership
    const { data: membership } =
      await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .single();

    if (membership?.role !== "owner") {
      redirect(
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

    if (!group || group.status !== "active") {
      redirect(
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
      })
      .select("id")
      .single();

  if (error || !trip) {
    console.error(
      "Failed to create trip:",
      error
    );

    redirect(
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

  // Open trip
  redirect(`/trips/${trip.id}`);
}