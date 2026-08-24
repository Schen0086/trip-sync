import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import ExpenseForm from "@/components/expense-form";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  ExpenseParticipant,
} from "@/lib/expenses";

type NewExpensePageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewExpensePage({
  params,
  searchParams,
}: NewExpensePageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const {
    data: trip,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      owner_id
    `)
    .eq("id", id)
    .maybeSingle();

  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data: participantRows,
  } = await supabase
    .from("trip_participants")
    .select(
      "user_id, joined_at"
    )
    .eq(
      "trip_id",
      trip.id
    )
    .order(
      "joined_at",
      {
        ascending: true,
      }
    );

  const participantIds =
    participantRows?.map(
      (row) =>
        row.user_id
    ) ?? [];

  const canAddExpense =
    trip.owner_id ===
      userId ||
    participantIds.includes(
      userId
    );

  if (!canAddExpense) {
    redirect(
      `/trips/${trip.id}/expenses`
    );
  }

  let participants:
    ExpenseParticipant[] = [];

  if (
    participantIds.length >
    0
  ) {
    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username"
      )
      .in(
        "id",
        participantIds
      );

    const profileMap =
      new Map(
        profiles?.map(
          (profile) => [
            profile.id,
            profile,
          ]
        ) ?? []
      );

    participants =
      participantIds.map(
        (participantId) => {
          const profile =
            profileMap.get(
              participantId
            );

          return {
            userId:
              participantId,

            displayName:
              profile?.display_name ??
              "Traveller",

            username:
              profile?.username ??
              null,
          };
        }
      );
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <BackButton
          fallbackHref={`/trips/${trip.id}/expenses`}
        />

        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            {trip.name}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Add expense
          </h1>

          <p className="mt-2 text-muted">
            Record a payment and
            choose how it should be
            split between travellers.
          </p>
        </header>

        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <ExpenseForm
            tripId={trip.id}
            currentUserId={
              userId
            }
            participants={
              participants
            }
          />
        </section>
      </div>
    </main>
  );
}