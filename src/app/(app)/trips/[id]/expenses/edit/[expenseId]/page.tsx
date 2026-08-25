import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import ExpenseForm from "@/components/expense-form";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  type Expense,
  type ExpenseFormDefaults,
  type ExpenseParticipant,
  type ExpenseSplit,
} from "@/lib/expenses";

import {
  deleteExpense,
} from "../../actions";

type EditExpensePageProps = {
  params: Promise<{
    id: string;
    expenseId: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditExpensePage({
  params,
  searchParams,
}: EditExpensePageProps) {
  const {
    id,
    expenseId,
  } = await params;

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
    .select(
      "id, name, owner_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data: expenseData,
  } = await supabase
    .from("expenses")
    .select("*")
    .eq(
      "id",
      expenseId
    )
    .eq(
      "trip_id",
      trip.id
    )
    .maybeSingle();

  if (!expenseData) {
    redirect(
      `/trips/${trip.id}/expenses`
    );
  }

  const expense =
    expenseData as Expense;

  const canEdit =
    trip.owner_id ===
      userId ||
    expense.created_by ===
      userId;

  if (!canEdit) {
    redirect(
      `/trips/${trip.id}/expenses`
    );
  }

  const {
    data: splitData,
  } = await supabase
    .from("expense_splits")
    .select("*")
    .eq(
      "expense_id",
      expense.id
    );

  const splits =
    (splitData ??
      []) as ExpenseSplit[];

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
        "id, display_name, username, avatar_url"
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

            avatarUrl:
              profile?.avatar_url ??
              null,
          };
        }
      );
  }

  const defaults:
    ExpenseFormDefaults = {
    id:
      expense.id,

    title:
      expense.title,

    paidBy:
      expense.paid_by,

    amount:
      Number(
        expense.amount
      ),

    currency:
      expense.currency,

    category:
      expense.category,

    expenseDate:
      expense.expense_date ??
      "",

    notes:
      expense.notes ??
      "",

    splits:
      splits.map(
        (split) => ({
          userId:
            split.user_id,

          amount:
            Number(
              split.amount
            ),
        })
      ),
  };

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
            Edit expense
          </h1>
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
            defaults={
              defaults
            }
          />
        </section>

        <section className="mt-8 rounded-2xl border border-danger-border bg-danger-surface p-6">
          <h2 className="text-lg font-semibold text-danger-text">
            Delete expense
          </h2>

          <p className="mt-2 text-sm text-muted">
            This also removes all
            splits associated with
            this expense.
          </p>

          <form
            action={
              deleteExpense
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
              name="expenseId"
              value={
                expense.id
              }
            />

            <ConfirmActionButton
              message={`Delete "${expense.title}"?`}
              className="cursor-pointer rounded-xl border border-danger-border px-4 py-2.5 text-sm font-medium text-danger-text"
            >
              Delete expense
            </ConfirmActionButton>
          </form>
        </section>
      </div>
    </main>
  );
}