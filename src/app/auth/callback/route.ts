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
          "/dashboard",
          request.url
        )
      );
    }

    console.error(
      "Email confirmation failed:",
      error
    );
  }


  // Backwards compatibility for any
  // older links already sitting in inboxes.
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
          "/dashboard",
          request.url
        )
      );
    }

    console.error(
      "Auth code exchange failed:",
      error
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