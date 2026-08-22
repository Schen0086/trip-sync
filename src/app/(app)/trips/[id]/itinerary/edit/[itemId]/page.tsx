import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import ItineraryEntryFields from "@/components/itinerary-entry-fields";
import {
  deleteItineraryItem,
  updateItineraryItem,
} from "../../actions";
import {
  getItineraryTypeLabel,
  type ItineraryItem,
} from "@/lib/itinerary";

type EditItemPageProps = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditItemPage({
  params,
  searchParams,
}: EditItemPageProps) {
  const {
    id,
    itemId,
  } = await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  // Load trip
  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      owner_id,
      start_date,
      end_date
    `)
    .eq("id", id)
    .maybeSingle();

  if (tripError) {
    console.error(
      "Failed to load trip:",
      tripError
    );
  }

  // Deleted or inaccessible trip
  if (!trip) {
    redirect("/dashboard");
  }

  // Load itinerary item
  const {
    data: itemData,
    error: itemError,
  } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("id", itemId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (itemError) {
    console.error(
      "Failed to load itinerary item:",
      itemError
    );
  }

  // Deleted or inaccessible item
  if (!itemData) {
    redirect(
      `/trips/${trip.id}/itinerary`
    );
  }

  const item =
    itemData as ItineraryItem;

  const isTripCreator =
    trip.owner_id === userId;

  const isSuggestionAuthor =
    item.origin ===
      "suggestion" &&
    item.created_by === userId;

  // Only creator or original suggester may edit
  const canEdit =
    isTripCreator ||
    isSuggestionAuthor;

  if (!canEdit) {
    redirect(
      `/trips/${trip.id}/itinerary`
    );
  }

  /*
   * The creator can delete anything.
   *
   * The suggester may delete their own idea while it
   * is still in the backlog, but once the creator
   * confirms it into the itinerary only the creator
   * can delete it.
   */
  const canDelete =
    isTripCreator ||
    (
      isSuggestionAuthor &&
      item.planning_status ===
        "suggested"
    );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <BackButton
          fallbackHref={`/trips/${trip.id}/itinerary`}
        />

        {/* Heading */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            {trip.name}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Edit{" "}
            {getItineraryTypeLabel(
              item.item_type
            ).toLowerCase()}
          </h1>

          <p className="mt-2 text-muted">
            Update the details for{" "}
            {item.title}.
          </p>

          {isSuggestionAuthor &&
            !isTripCreator && (
              <p className="mt-2 text-sm text-subtle">
                You can edit this item
                because you originally
                suggested it.
              </p>
            )}
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

        {/* Edit form */}
        <section className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <form
            action={
              updateItineraryItem
            }
          >
            <input
              type="hidden"
              name="tripId"
              value={trip.id}
            />

            <input
              type="hidden"
              name="itemId"
              value={item.id}
            />

            <input
              type="hidden"
              name="itemType"
              value={
                item.item_type
              }
            />

            <input
              type="hidden"
              name="planningStatus"
              value={
                item.planning_status
              }
            />

            <ItineraryEntryFields
              itemType={
                item.item_type
              }
              tripStartDate={
                trip.start_date
              }
              tripEndDate={
                trip.end_date
              }
              planned={
                item.planning_status ===
                "planned"
              }
              defaults={item}
            />

            <div className="mt-8 flex justify-end border-t border-line pt-6">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Save changes
              </button>
            </div>
          </form>
        </section>

        {/* Delete */}
        {canDelete && (
          <section className="mt-8 rounded-2xl border border-danger-border bg-danger-surface p-6">
            <h2 className="text-lg font-semibold text-danger-text">
              Delete item
            </h2>

            <p className="mt-2 text-sm text-muted">
              This permanently removes
              this item and any votes
              attached to it.
            </p>

            <form
              action={
                deleteItineraryItem
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
                name="itemId"
                value={item.id}
              />

              <ConfirmActionButton
                message={`Delete "${item.title}"? This cannot be undone.`}
                className="cursor-pointer rounded-xl border border-danger-border px-4 py-2.5 text-sm font-medium text-danger-text transition hover:opacity-80"
              >
                Delete item
              </ConfirmActionButton>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}