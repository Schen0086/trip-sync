import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import PasswordInput from "@/components/password-input";
import SubmitButton from "@/components/submit-button";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  resetPassword,
} from "@/app/login/actions";


type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};


export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase.auth
      .getClaims();


  if (
    error ||
    !data?.claims
  ) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "Your password reset link is invalid or has expired. Request a new one."
      )}`
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
            Choose a new password
          </h1>

          <p className="mt-2 text-muted">
            Enter a new password for your TripSync account.
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


        {/* Password reset form */}
        <form
          action={
            resetPassword
          }
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              New password
            </label>

            <PasswordInput
              id="password"
              name="password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />

            <p className="mt-1.5 text-xs text-subtle">
              Must be at least 8 characters.
            </p>
          </div>


          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Confirm new password
            </label>

            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Enter your new password again"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>


          <SubmitButton
            pendingLabel="Updating password..."
            className="w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Update password
          </SubmitButton>
        </form>


        <p className="mt-6 text-center text-sm text-muted">
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