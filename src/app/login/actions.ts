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


function normalizeEmail(
  email: string
) {
  return email
    .trim()
    .toLowerCase();
}


function isValidEmail(
  email: string
) {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}


function getSiteUrl() {
  const configuredUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL
      ?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(
      /\/+$/,
      ""
    );
  }

  if (
    process.env.NODE_ENV ===
    "development"
  ) {
    return "http://localhost:3000";
  }

  throw new Error(
    "NEXT_PUBLIC_SITE_URL is not configured."
  );
}


export async function login(
  formData: FormData
) {
  const supabase =
    await createClient();

  const email =
    normalizeEmail(
      getText(
        formData,
        "email"
      )
    );

  const password =
    getText(
      formData,
      "password"
    );

  if (
    !email ||
    !password
  ) {
    redirect(
      "/login?error=Email and password are required"
    );
  }


  const {
    error,
  } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        error.message
      )}`
    );
  }


  revalidatePath(
    "/",
    "layout"
  );

  redirect(
    "/dashboard"
  );
}


export async function signup(
  formData: FormData
) {
  const supabase =
    await createClient();

  const displayName =
    getText(
      formData,
      "displayName"
    );

  const email =
    normalizeEmail(
      getText(
        formData,
        "email"
      )
    );

  const password =
    getText(
      formData,
      "password"
    );


  if (
    !displayName ||
    !email ||
    !password
  ) {
    redirect(
      "/signup?error=Display name, email and password are required"
    );
  }


  if (
    displayName.length <
      2 ||
    displayName.length >
      50
  ) {
    redirect(
      "/signup?error=Display name must be between 2 and 50 characters"
    );
  }


  if (
    password.length <
    8
  ) {
    redirect(
      "/signup?error=Password must be at least 8 characters"
    );
  }


  const {
    error,
  } =
    await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          display_name:
            displayName,
        },
      },
    });


  if (error) {
    redirect(
      `/signup?error=${encodeURIComponent(
        error.message
      )}`
    );
  }


  // Supabase intentionally does not always reveal whether
  // an email is already registered. Keep the response generic
  // so the signup page cannot be used for email enumeration.
  redirect(
    `/signup?success=${encodeURIComponent(
      "If this email can be registered, a confirmation link has been sent. If you already have an account, log in instead."
    )}`
  );
}


export async function forgotPassword(
  formData: FormData
) {
  const supabase =
    await createClient();

  const email =
    normalizeEmail(
      getText(
        formData,
        "email"
      )
    );


  if (
    !email ||
    !isValidEmail(email)
  ) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "Enter a valid email address."
      )}`
    );
  }


  let siteUrl: string;

  try {
    siteUrl =
      getSiteUrl();
  } catch (error) {
    console.error(
      "Password recovery URL configuration error:",
      error
    );

    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "Password recovery is temporarily unavailable. Please try again later."
      )}`
    );
  }


  const {
    error,
  } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          `${siteUrl}/auth/callback?next=${encodeURIComponent(
            "/reset-password"
          )}`,
      }
    );


  // Do not expose whether the supplied email belongs to an
  // account. Supabase also applies its own Auth rate limits.
  if (error) {
    console.error(
      "Password reset email request failed:",
      error.message
    );
  }


  redirect(
    `/forgot-password?success=${encodeURIComponent(
      "If an account exists for that email address, a password reset link has been sent."
    )}`
  );
}


export async function resetPassword(
  formData: FormData
) {
  const supabase =
    await createClient();

  const password =
    getText(
      formData,
      "password"
    );

  const confirmPassword =
    getText(
      formData,
      "confirmPassword"
    );


  if (
    !password ||
    !confirmPassword
  ) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "Enter and confirm your new password."
      )}`
    );
  }


  if (
    password.length <
    8
  ) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "Password must be at least 8 characters."
      )}`
    );
  }


  if (
    password !==
    confirmPassword
  ) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "The passwords do not match."
      )}`
    );
  }


  // A valid recovery link establishes a temporary authenticated
  // session before the user reaches the reset-password page.
  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth
      .getClaims();


  if (
    claimsError ||
    !claimsData?.claims
  ) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "Your password reset link is invalid or has expired. Request a new one."
      )}`
    );
  }


  const {
    error,
  } =
    await supabase.auth.updateUser({
      password,
    });


  if (error) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        error.message
      )}`
    );
  }


  // End the temporary recovery session so the user signs in
  // normally with the newly chosen password.
  const {
    error: signOutError,
  } =
    await supabase.auth
      .signOut();


  if (signOutError) {
    console.error(
      "Unable to end password recovery session:",
      signOutError.message
    );
  }


  revalidatePath(
    "/",
    "layout"
  );

  redirect(
    `/login?success=${encodeURIComponent(
      "Your password has been updated. You can now log in with your new password."
    )}`
  );
}


export async function logout() {
  const supabase =
    await createClient();

  await supabase.auth.signOut();

  revalidatePath(
    "/",
    "layout"
  );

  redirect(
    "/login"
  );
}