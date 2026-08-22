import Link from "next/link";
import { signup } from "@/app/login/actions";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-sm">
        {/* Page heading */}
        <div>
          <p className="text-sm font-semibold text-brand-700">
            TripSync
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Create an account
          </h1>

          <p className="mt-2 text-muted">
            Start planning trips with your friends.
          </p>
        </div>

        {/* Error message */}
        {params.error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {params.error}
          </div>
        )}

        {/* Success message */}
        {params.success && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {params.success}
          </div>
        )}

        {/* Signup form */}
        <form action={signup} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="displayName"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Display name
            </label>

            <input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="Jerry"
              required
              minLength={2}
              maxLength={50}
              autoComplete="name"
              className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>

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
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
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

          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            Sign up
          </button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-700 transition hover:text-brand-800"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}