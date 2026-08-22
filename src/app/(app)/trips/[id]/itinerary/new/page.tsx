import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import ItineraryEntryFields from "@/components/itinerary-entry-fields";
import { createItineraryItem } from "../actions";
import {
  getItineraryTypeLabel,
  type ItineraryItemType,
} from "@/lib/itinerary";

type NewItemPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    mode?: string;
    type?: string;
    error?: string;
  }>;
};

export default async function NewItemPage({
  params,
  searchParams,
}: NewItemPageProps) {
  const { id } = await params;
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
  const { data: trip } =
    await supabase
      .from("trips")
      .select(`
        id,
        name,
        trip_type,
        owner_id,
        start_date,
        end_date
      `)
      .eq("id", id)
      .maybeSingle();

  if (!trip) {
    redirect("/dashboard");
  }

  const isTripCreator =
    trip.owner_id === userId;

  // Resolve item type
  const itemType: ItineraryItemType =
    query.type === "transport"
      ? "transport"
      : query.type ===
          "accommodation"
        ? "accommodation"
        : "activity";

  // Personal trips only use direct planning
  const requestedSuggestion =
    query.mode === "suggested";

  const planningStatus:
    | "planned"
    | "suggested" =
    trip.trip_type ===
    "group" &&
    requestedSuggestion
      ? "suggested"
      : "planned";

  // Only creator may directly plan
  if (
    planningStatus === "planned" &&
    !isTripCreator
  ) {
    redirect(
      `/trips/${id}/itinerary/new?mode=suggested&type=${itemType}`
    );
  }

  const typeLabel =
    getItineraryTypeLabel(
      itemType
    );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <BackButton
          fallbackHref={`/trips/${id}/itinerary`}
        />

        {/* Heading */}
        <header className="mt-8">
          <p className="text-sm font-semibold text-brand-700">
            {trip.name}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            {planningStatus ===
            "suggested"
              ? `Suggest ${typeLabel.toLowerCase()}`
              : `Add ${typeLabel.toLowerCase()}`}
          </h1>

          <p className="mt-2 text-muted">
            {planningStatus ===
            "suggested"
              ? "Add an option to the backlog so the group can vote on it."
              : "Add a confirmed item directly to the itinerary."}
          </p>
        </header>

        {/* Error */}
        {query.error && (
          <div className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
            {query.error}
          </div>
        )}

        {/* Mode */}
        {trip.trip_type ===
          "group" &&
          isTripCreator && (
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href={`/trips/${id}/itinerary/new?mode=planned&type=${itemType}`}
                className={
                  planningStatus ===
                  "planned"
                    ? "rounded-xl bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
                    : "rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
                }
              >
                Add to itinerary
              </Link>

              <Link
                href={`/trips/${id}/itinerary/new?mode=suggested&type=${itemType}`}
                className={
                  planningStatus ===
                  "suggested"
                    ? "rounded-xl bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
                    : "rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
                }
              >
                Suggest option
              </Link>
            </div>
          )}

        {/* Item type */}
        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              "activity",
              "transport",
              "accommodation",
            ] as const
          ).map((type) => (
            <Link
              key={type}
              href={`/trips/${id}/itinerary/new?mode=${planningStatus}&type=${type}`}
              className={
                itemType === type
                  ? "rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-brand-contrast"
                  : "rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium capitalize text-ink hover:bg-surface-hover"
              }
            >
              {getItineraryTypeLabel(
                type
              )}
            </Link>
          ))}
        </div>

        {/* Form */}
        <section className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <form
            action={
              createItineraryItem
            }
          >
            <input
              type="hidden"
              name="tripId"
              value={trip.id}
            />

            <input
              type="hidden"
              name="itemType"
              value={itemType}
            />

            <input
              type="hidden"
              name="planningStatus"
              value={
                planningStatus
              }
            />

            <ItineraryEntryFields
              itemType={itemType}
              tripStartDate={
                trip.start_date
              }
              tripEndDate={
                trip.end_date
              }
              planned={
                planningStatus ===
                "planned"
              }
            />

            <div className="mt-8 flex justify-end border-t border-line pt-6">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                {planningStatus ===
                "suggested"
                  ? "Add suggestion"
                  : "Add to itinerary"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}