import Link from "next/link";


export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-brand-700">
          TripSync
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Page not found
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          This page may have been moved, deleted, or the link may no longer be valid.
        </p>

        <Link
          href="/"
          className="mt-7 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
        >
          Return to TripSync
        </Link>
      </div>
    </main>
  );
}