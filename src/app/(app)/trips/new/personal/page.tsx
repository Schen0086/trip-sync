import { createTrip } from "@/app/(app)/trips/actions";
import BackButton from "@/components/back-button";

type PersonalTripPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewPersonalTripPage({
  searchParams,
}: PersonalTripPageProps) {
  const params = await searchParams;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/trips/new" />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            Personal trip
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Plan your trip
          </h1>

          <p className="mt-2 text-muted">
            Create a trip that belongs only to you.
          </p>
        </header>

        {/* Error message */}
        {params.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {params.error}
          </div>
        )}

        {/* Trip form */}
        <section className="mt-10">
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Trip details
            </h2>

            <p className="mt-1 text-sm text-muted">
              Add the basic information for your trip.
            </p>

            <form
              action={createTrip}
              className="mt-8 space-y-6"
            >
              <input
                type="hidden"
                name="tripType"
                value="personal"
              />

              {/* Trip name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Trip name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Japan 2027"
                  required
                  maxLength={80}
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              {/* Destination */}
              <div>
                <label
                  htmlFor="destination"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Destination
                </label>

                <input
                  id="destination"
                  name="destination"
                  type="text"
                  placeholder="Tokyo, Japan"
                  required
                  maxLength={120}
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              {/* Dates */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Start date
                  </label>

                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    End date
                  </label>

                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label
                  htmlFor="budget"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Budget
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    €
                  </span>

                  <input
                    id="budget"
                    name="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1500"
                    className="w-full rounded-xl border border-line bg-surface-soft py-2.5 pl-8 pr-3.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                <p className="mt-1.5 text-xs text-subtle">
                  Optional overall trip budget.
                </p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="A week exploring Tokyo and the surrounding areas."
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              {/* Form actions */}
              <div className="flex justify-end border-t border-line pt-6">
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                >
                  Create trip
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}