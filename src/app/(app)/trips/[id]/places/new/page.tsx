import {
  redirect,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import LocationSearchInput from "@/components/location-search-input";
import {
  PLACE_CATEGORY_OPTIONS,
} from "@/lib/places";
import {
  saveManualPlace,
} from "../actions";

type NewPlacePageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewPlacePage({
  params,
  searchParams,
}: NewPlacePageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  // Authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  // Load accessible trip
  const { data: trip } =
    await supabase
      .from("trips")
      .select(
        "id, name, destination"
      )
      .eq("id", id)
      .maybeSingle();

  if (!trip) {
    redirect("/dashboard");
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Back */}
        <BackButton
          fallbackHref={`/trips/${trip.id}/places`}
        />

        {/* Heading */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            {trip.name}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Save a place
          </h1>

          <p className="mt-2 text-muted">
            Search for a place and
            save it to the trip.
          </p>
        </header>

        {/* Error */}
        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {/* Form */}
        <section className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <form
            action={
              saveManualPlace
            }
            className="space-y-6"
          >
            <input
              type="hidden"
              name="tripId"
              value={trip.id}
            />

            <LocationSearchInput
              label="Place"
              inputName="locationName"
              addressName="address"
              latitudeName="latitude"
              longitudeName="longitude"
              required
              placeholder="Search for a restaurant, attraction or address..."
            />

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Category
              </label>

              <select
                id="category"
                name="category"
                defaultValue="other"
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {PLACE_CATEGORY_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="websiteUrl"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Website
                <span className="ml-1 font-normal text-subtle">
                  optional
                </span>
              </label>

              <input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                placeholder="Website address"
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={4}
                maxLength={1500}
                placeholder="Why you saved it, things to remember, price estimate..."
                className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Save */}
            <div className="flex justify-end border-t border-line pt-6">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Save place
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}