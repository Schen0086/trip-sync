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