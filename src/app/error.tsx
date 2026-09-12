"use client";

import {
  useEffect,
} from "react";


type ErrorPageProps = {
  error: Error & {
    digest?:
      string;
  };

  reset: () => void;
};


export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error(
      "Unhandled TripSync page error:",
      error
    );
  }, [
    error,
  ]);


  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-brand-700">
          TripSync
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          TripSync could not load this page. You can try again or return to your dashboard.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={
              reset
            }
            className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            Try again
          </button>

          <a
            href="/dashboard"
            className="rounded-xl border border-line bg-surface-soft px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}