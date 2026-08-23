import {
  redirect,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import LocationSearchInput from "@/components/location-search-input";
import {
  PLACE_CATEGORY_OPTIONS,
  type SavedPlace,
} from "@/lib/places";
import {
  deleteSavedPlace,
  updateSavedPlace,
} from "../../actions";

type EditPlacePageProps = {
  params: Promise<{
    id: string;
    placeId: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditPlacePage({
  params,
  searchParams,
}: EditPlacePageProps) {
  const {
    id,
    placeId,
  } = await params;

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

  const userId =
    data.claims.sub;

  // Trip
  const { data: trip } =
    await supabase
      .from("trips")
      .select(
        "id, name, owner_id"
      )
      .eq("id", id)
      .maybeSingle();

  if (!trip) {
    redirect("/dashboard");
  }

  // Saved place
  const {
    data: placeData,
    error: placeError,
  } = await supabase
    .from("saved_places")
    .select("*")
    .eq("id", placeId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (placeError) {
    console.error(
      "Failed to load saved place:",
      placeError
    );
  }

  // Deleted place
  if (!placeData) {
    redirect(
      `/trips/${trip.id}/places`
    );
  }

  const place =
    placeData as SavedPlace;

  const canEdit =
    trip.owner_id ===
      userId ||
    place.saved_by ===
      userId;

  if (!canEdit) {
    redirect(
      `/trips/${trip.id}/places`
    );
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
            Edit saved place
          </h1>

          <p className="mt-2 text-muted">
            Update {place.name}.
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
              updateSavedPlace
            }
            className="space-y-6"
          >
            <input
              type="hidden"
              name="tripId"
              value={trip.id}
            />

            <input
              type="hidden"
              name="placeId"
              value={place.id}
            />

            <LocationSearchInput
              label="Place"
              inputName="locationName"
              addressName="address"
              latitudeName="latitude"
              longitudeName="longitude"
              required
              defaultValue={
                place.name
              }
              defaultAddress={
                place.address
              }
              defaultLatitude={
                place.latitude
              }
              defaultLongitude={
                place.longitude
              }
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
                defaultValue={
                  place.category
                }
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
              </label>

              <input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                defaultValue={
                  place.website_url ??
                  ""
                }
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
                defaultValue={
                  place.notes ?? ""
                }
                className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Save */}
            <div className="flex justify-end border-t border-line pt-6">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast"
              >
                Save changes
              </button>
            </div>
          </form>
        </section>

        {/* Delete */}
        <section className="mt-8 rounded-2xl border border-danger-border bg-danger-surface p-6">
          <h2 className="text-lg font-semibold text-danger-text">
            Remove saved place
          </h2>

          <p className="mt-2 text-sm text-muted">
            Removing the saved place
            will not delete a confirmed
            itinerary item that was
            previously created from it.
          </p>

          <form
            action={
              deleteSavedPlace
            }
            className="mt-5"
          >
            <input
              type="hidden"
              name="tripId"
              value={trip.id}
            />

            <input
              type="hidden"
              name="placeId"
              value={place.id}
            />

            <ConfirmActionButton
              message={`Remove "${place.name}" from saved places?`}
              className="cursor-pointer rounded-xl border border-danger-border px-4 py-2.5 text-sm font-medium text-danger-text"
            >
              Remove place
            </ConfirmActionButton>
          </form>
        </section>
      </div>
    </main>
  );
}