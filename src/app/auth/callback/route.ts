import type {
  EmailOtpType,
} from "@supabase/supabase-js";

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";


function getSafeNextPath(
  next: string | null,
  fallback: string
) {
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//")
  ) {
    return next;
  }

  return fallback;
}


export async function GET(
  request: NextRequest
) {
  const {
    searchParams,
  } = request.nextUrl;

  const tokenHash =
    searchParams.get(
      "token_hash"
    );

  const type =
    searchParams.get(
      "type"
    ) as
      | EmailOtpType
      | null;

  // Keep support for older confirmation
  // links that use the PKCE code flow.
  const code =
    searchParams.get(
      "code"
    );

  const next =
    searchParams.get(
      "next"
    );


  const fallbackDestination =
    type === "recovery"
      ? "/reset-password"
      : "/dashboard";

  const destination =
    getSafeNextPath(
      next,
      fallbackDestination
    );

  const isRecoveryFlow =
    type === "recovery" ||
    destination ===
      "/reset-password";


  const supabase =
    await createClient();


  // Preferred SSR confirmation flow.
  if (
    tokenHash &&
    type
  ) {
    const {
      error,
    } =
      await supabase.auth.verifyOtp({
        token_hash:
          tokenHash,

        type,
      });


    if (!error) {
      return NextResponse.redirect(
        new URL(
          destination,
          request.url
        )
      );
    }


    console.error(
      "Email confirmation failed:",
      error
    );
  }


  // Backwards compatibility for links that
  // use the PKCE authorization-code flow.
  if (code) {
    const {
      error,
    } =
      await supabase.auth.exchangeCodeForSession(
        code
      );


    if (!error) {
      return NextResponse.redirect(
        new URL(
          destination,
          request.url
        )
      );
    }


    console.error(
      "Auth code exchange failed:",
      error
    );
  }


  if (isRecoveryFlow) {
    return NextResponse.redirect(
      new URL(
        `/forgot-password?error=${encodeURIComponent(
          "This password reset link is invalid or has expired. Request a new one."
        )}`,
        request.url
      )
    );
  }


  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(
        "This confirmation link is invalid or has expired. Try signing in or request a new confirmation email."
      )}`,
      request.url
    )
  );
}