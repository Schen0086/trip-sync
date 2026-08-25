"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  formatProfileChangeAvailableAt,
  getProfileChangeCooldownState,
} from "@/lib/profile-change-cooldown";


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


function redirectForCooldown(
  fieldLabel: string,
  lastChangedAt:
    | string
    | null
) {
  const cooldown =
    getProfileChangeCooldownState(
      lastChangedAt
    );


  if (
    !cooldown.isLocked ||
    !cooldown.availableAt
  ) {
    return;
  }


  redirect(
    `/settings?error=${encodeURIComponent(
      `${fieldLabel} can only be changed once every 7 days. You can change it again on ${formatProfileChangeAvailableAt(
        cooldown.availableAt
      )}.`
    )}`
  );
}


export async function updateProfileSettings(
  formData: FormData
) {
  const supabase =
    await createClient();


  // Check authentication
  const {
    data,
    error:
      authError,
  } =
    await supabase.auth.getClaims();


  if (
    authError ||
    !data?.claims
  ) {
    redirect("/login");
  }


  const userId =
    data.claims.sub;


  // Load the current profile so only fields
  // that actually changed consume a cooldown.
  const {
    data:
      currentProfile,
    error:
      profileLoadError,
  } = await supabase
    .from("profiles")
    .select(`
      display_name,
      username,
      display_name_changed_at,
      username_changed_at
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();


  if (
    profileLoadError ||
    !currentProfile
  ) {
    console.error(
      "Failed to load profile:",
      profileLoadError
    );

    redirect(
      `/settings?error=${encodeURIComponent(
        "Unable to load your profile"
      )}`
    );
  }


  // Read profile fields
  const displayName =
    getText(
      formData,
      "displayName"
    );


  const usernameInput =
    getText(
      formData,
      "username"
    );


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
    !/^[a-z0-9_]{3,30}$/.test(
      username
    )
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Username must be 3–30 characters using only lowercase letters, numbers and underscores"
      )}`
    );
  }


  const currentDisplayName =
    currentProfile
      .display_name
      ?.trim() ??
    "";


  const currentUsername =
    currentProfile
      .username
      ?.trim()
      .toLowerCase() ??
    null;


  const displayNameChanged =
    displayName !==
    currentDisplayName;


  const usernameChanged =
    username !==
    currentUsername;


  if (
    !displayNameChanged &&
    !usernameChanged
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "No profile changes to save"
      )}`
    );
  }


  // Enforce friendly server-side cooldown checks.
  // The database trigger provides a second layer.
  if (
    displayNameChanged
  ) {
    redirectForCooldown(
      "Display name",
      currentProfile
        .display_name_changed_at
    );
  }


  if (
    usernameChanged
  ) {
    redirectForCooldown(
      "Username",
      currentProfile
        .username_changed_at
    );
  }


  // Update profile.
  // The database trigger automatically timestamps
  // whichever identity fields actually changed.
  const {
    data:
      updatedProfile,
    error,
  } = await supabase
    .from("profiles")
    .update({
      display_name:
        displayName,

      username,

      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      userId
    )
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


    if (
      error.message.includes(
        "DISPLAY_NAME_CHANGE_COOLDOWN"
      )
    ) {
      redirect(
        `/settings?error=${encodeURIComponent(
          "Your display name was changed too recently. Refresh Settings to see when it can be changed again."
        )}`
      );
    }


    if (
      error.message.includes(
        "USERNAME_CHANGE_COOLDOWN"
      )
    ) {
      redirect(
        `/settings?error=${encodeURIComponent(
          "Your username was changed too recently. Refresh Settings to see when it can be changed again."
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


  // Keep Supabase Auth metadata synchronized
  // when the display name itself changed.
  if (
    displayNameChanged
  ) {
    const {
      error:
        authUpdateError,
    } =
      await supabase.auth.updateUser(
        {
          data: {
            display_name:
              displayName,
          },
        }
      );


    if (
      authUpdateError
    ) {
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
  const supabase =
    await createClient();


  // Check authentication
  const {
    data,
    error:
      authError,
  } =
    await supabase.auth.getClaims();


  if (
    authError ||
    !data?.claims
  ) {
    redirect("/login");
  }


  const userId =
    data.claims.sub;


  // Read email
  const newEmail =
    getText(
      formData,
      "email"
    ).toLowerCase();


  const currentEmail =
    typeof
      data.claims.email ===
    "string"
      ? data.claims.email
          .trim()
          .toLowerCase()
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


  if (
    newEmail ===
    currentEmail
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "That is already your current email address"
      )}`
    );
  }


  // Check the user's email-change cooldown.
  const {
    data:
      profile,
    error:
      profileError,
  } = await supabase
    .from("profiles")
    .select(
      "email_change_requested_at"
    )
    .eq(
      "id",
      userId
    )
    .maybeSingle();


  if (
    profileError ||
    !profile
  ) {
    console.error(
      "Failed to load email cooldown:",
      profileError
    );

    redirect(
      `/settings?error=${encodeURIComponent(
        "Unable to check your email change status"
      )}`
    );
  }


  redirectForCooldown(
    "Email",
    profile
      .email_change_requested_at
  );


  // Request email change through Supabase Auth.
  const {
    error,
  } =
    await supabase.auth.updateUser(
      {
        email:
          newEmail,
      }
    );


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


  // Auth accepted the request, so begin
  // the seven-day email cooldown.
  const {
    error:
      cooldownError,
  } =
    await supabase.rpc(
      "mark_email_change_requested"
    );


  if (cooldownError) {
    console.error(
      "Email change was accepted but cooldown tracking failed:",
      cooldownError
    );

    redirect(
      `/settings?error=${encodeURIComponent(
        "Your email change was requested, but its cooldown could not be recorded. Refresh Settings before trying again."
      )}`
    );
  }


  // Refresh account data
  revalidatePath(
    "/",
    "layout"
  );

  revalidatePath(
    "/settings"
  );


  redirect(
    `/settings?success=${encodeURIComponent(
      "Email change requested. Check your email for confirmation. You can request another email change in 7 days."
    )}`
  );
}


export async function updatePassword(
  formData: FormData
) {
  const supabase =
    await createClient();


  // Check authentication
  const {
    data,
    error:
      authError,
  } =
    await supabase.auth.getClaims();


  if (
    authError ||
    !data?.claims
  ) {
    redirect("/login");
  }


  const email =
    typeof
      data.claims.email ===
    "string"
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


  if (
    newPassword.length <
    8
  ) {
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
  const {
    error:
      passwordError,
  } =
    await supabase.auth.signInWithPassword(
      {
        email,
        password:
          currentPassword,
      }
    );


  if (
    passwordError
  ) {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Current password is incorrect"
      )}`
    );
  }


  // Change password
  const {
    error,
  } =
    await supabase.auth.updateUser(
      {
        password:
          newPassword,
      }
    );


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
  revalidatePath(
    "/",
    "layout"
  );


  redirect(
    `/settings?success=${encodeURIComponent(
      "Password updated"
    )}`
  );
}