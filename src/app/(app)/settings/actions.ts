"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileSettings(
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

  // Read profile
  const displayName =
    (
      formData.get(
        "displayName"
      ) as string
    )?.trim();

  const usernameInput =
    (
      formData.get(
        "username"
      ) as string
    )?.trim();

  const username =
    usernameInput.length > 0
      ? usernameInput.toLowerCase()
      : null;

  // Validate display name
  if (
    !displayName ||
    displayName.length < 2 ||
    displayName.length > 50
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Display name must be between 2 and 50 characters"
      )}`
    );
  }

  // Validate username
  if (
    username &&
    !/^[a-z0-9_]{3,30}$/.test(username)
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Username must be 3–30 characters using only lowercase letters, numbers and underscores"
      )}`
    );
  }

  // Update profile
  const { data: updatedProfile, error } =
    await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

  if (error) {
    console.error(
      "Failed to update profile:",
      error
    );

    if (
      error.code ===
      "23505"
    ) {
      redirect(
        `/settings?error=${encodeURIComponent(
          "That username is already taken"
        )}`
      );
    }

    redirect(
      `/settings?error=${encodeURIComponent(
        "Unable to update profile"
      )}`
    );
  }

  if (!updatedProfile) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Unable to update profile"
      )}`
    );
  }

  // Keep Auth metadata synchronized with
  // the TripSync display name.
  const {
    error: authUpdateError,
  } = await supabase.auth.updateUser({
    data: {
      display_name:
        displayName,
    },
  });

  if (authUpdateError) {
    console.error(
      "Failed to sync display name to Auth:",
      authUpdateError
    );

    redirect(
      `/settings?error=${encodeURIComponent(
        "Profile was updated, but account metadata could not be synchronized"
      )}`
    );
  }

  // Refresh shared layout
  revalidatePath(
    "/",
    "layout"
  );

  revalidatePath(
    "/settings"
  );

  redirect(
    `/settings?success=${encodeURIComponent(
      "Profile updated"
    )}`
  );
}

export async function updateEmail(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  // Read email
  const newEmail =
    (
      formData.get(
        "email"
      ) as string
    )
      ?.trim()
      .toLowerCase();

  const currentEmail =
    typeof data.claims.email === "string"
      ? data.claims.email.toLowerCase()
      : "";

  if (
    !newEmail ||
    !newEmail.includes("@")
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Enter a valid email address"
      )}`
    );
  }

  if (newEmail === currentEmail) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "That is already your current email address"
      )}`
    );
  }

  // Request email change
  const { error } =
    await supabase.auth.updateUser({
      email: newEmail,
    });

  if (error) {
    console.error(
      "Failed to update email:",
      error
    );

    redirect(
      `/settings?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  // Refresh account data
  revalidatePath("/", "layout");
  revalidatePath("/settings");

  redirect(
    `/settings?success=${encodeURIComponent(
      "Email change requested. Check your email for confirmation."
    )}`
  );
}

export async function updatePassword(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : null;

  if (!email) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Unable to determine your account email"
      )}`
    );
  }

  // Read passwords
  const currentPassword =
    formData.get(
      "currentPassword"
    ) as string;

  const newPassword =
    formData.get(
      "newPassword"
    ) as string;

  const confirmPassword =
    formData.get(
      "confirmPassword"
    ) as string;

  // Validate fields
  if (
    !currentPassword ||
    !newPassword ||
    !confirmPassword
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Complete all password fields"
      )}`
    );
  }

  if (newPassword.length < 8) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "New password must be at least 8 characters"
      )}`
    );
  }

  if (
    newPassword !==
    confirmPassword
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "New passwords do not match"
      )}`
    );
  }

  if (
    currentPassword ===
    newPassword
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "New password must be different from your current password"
      )}`
    );
  }

  // Verify current password
  const { error: passwordError } =
    await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

  if (passwordError) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Current password is incorrect"
      )}`
    );
  }

  // Change password
  const { error } =
    await supabase.auth.updateUser({
      password: newPassword,
    });

  if (error) {
    console.error(
      "Failed to update password:",
      error
    );

    redirect(
      `/settings?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  // Refresh account data
  revalidatePath("/", "layout");

  redirect(
    `/settings?success=${encodeURIComponent(
      "Password updated"
    )}`
  );
}