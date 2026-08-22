import Link from "next/link";
import BackButton from "@/components/back-button";

export default function NewTripPage() {
  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/dashboard" />

        {/* Page heading */}
        <header className="mt-8">
          <p className="text-sm font-semibold text-brand-700">
            TripSync
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Create a trip
          </h1>

          <p className="mt-2 text-muted">
            Who are you planning this trip for?
          </p>
        </header>

        {/* Trip types */}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* Personal trip */}
          <Link
            href="/trips/new/personal"
            className="group rounded-2xl border border-line bg-surface p-7 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 font-semibold text-brand-700">
              P
            </div>

            <h2 className="mt-6 text-xl font-semibold text-ink">
              Personal trip
            </h2>

            <p className="mt-2 leading-6 text-muted">
              Plan a trip just for yourself without creating or
              managing a group.
            </p>

            <p className="mt-6 text-sm font-medium text-brand-700">
              Continue →
            </p>
          </Link>

          {/* Group trip */}
          <Link
            href="/trips/new/group"
            className="group rounded-2xl border border-line bg-surface p-7 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 font-semibold text-brand-700">
              G
            </div>

            <h2 className="mt-6 text-xl font-semibold text-ink">
              Group trip
            </h2>

            <p className="mt-2 leading-6 text-muted">
              Create a trip for a friend group that you own and
              organise together.
            </p>

            <p className="mt-6 text-sm font-medium text-brand-700">
              Choose a group →
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}