import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import SubmitButton from "@/components/submit-button";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  forgotPassword,
} from "@/app/login/actions";


type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};


export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();


  const {
    data,
  } =
    await supabase.auth
      .getClaims();


  if (
    data?.claims
  ) {
    redirect(
      "/dashboard"
    );
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-sm">
        {/* Page heading */}
        <div>
          <p className="text-sm font-semibold text-brand-700">
            TripSync
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Forgot your password?
          </h1>

          <p className="mt-2 text-muted">
            Enter your email address and we&apos;ll send you a link to choose a new password.
          </p>
        </div>


        {/* Error message */}
        {params.error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {
              params.error
            }
          </div>
        )}


        {/* Success message */}
        {params.success && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {
              params.success
            }
          </div>
        )}


        {/* Recovery form */}
        <form
          action={
            forgotPassword
          }
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <SubmitButton
            pendingLabel="Sending reset link..."
            className="w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send reset link
          </SubmitButton>
        </form>


        {/* Login link */}
        <p className="mt-6 text-center text-sm text-muted">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-700 transition hover:text-brand-800"
          >
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}