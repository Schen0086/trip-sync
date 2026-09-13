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
  login,
} from "./actions";


type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};


export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
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
        <div>
          <p className="text-sm font-semibold text-brand-700">
            TripSync
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>

          <p className="mt-2 text-muted">
            Log in to continue planning your trips.
          </p>
        </div>


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


        <form
          action={
            login
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


          <div>
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
              >
                Forgot password?
              </Link>
            </div>

            <PasswordInput
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>


          <SubmitButton
            pendingLabel="Logging in..."
            className="w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Log in
          </SubmitButton>
        </form>


        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}

          <Link
            href="/signup"
            className="font-medium text-brand-700 transition hover:text-brand-800"
          >
            Sign up
          </Link>
        </p>


        {/* Privacy */}
        <p className="mt-4 text-center text-xs text-subtle">
          <Link
            href="/privacy"
            className="font-medium text-brand-700 transition hover:text-brand-800"
          >
            Privacy Notice
          </Link>
        </p>
      </div>
    </main>
  );
}