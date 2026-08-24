import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  calculateExpenseSummary,
  EXPENSE_CURRENCIES,
  formatExpenseDate,
  formatMoney,
  getExpenseCategoryLabel,
  type Expense,
  type ExpenseParticipant,
  type ExpenseSettlement,
  type ExpenseSplit,
} from "@/lib/expenses";

import {
  createSettlement,
  deleteSettlement,
} from "./actions";

import PersonName from "@/components/person-name";

type ExpensesPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ExpensesPage({
  params,
  searchParams,
}: ExpensesPageProps) {
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
      destination,
      owner_id,
      trip_type
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

  const isTripCreator =
    trip.owner_id ===
    userId;

  const isAttending =
    participantIds.includes(
      userId
    );

  const canAddExpense =
    isTripCreator ||
    isAttending;

  const {
    data: expenseData,
    error: expensesError,
  } = await supabase
    .from("expenses")
    .select("*")
    .eq(
      "trip_id",
      trip.id
    )
    .order(
      "expense_date",
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (expensesError) {
    console.error(
      "Failed to load expenses:",
      expensesError
    );
  }

  const expenses =
    (expenseData ??
      []) as Expense[];

  const expenseIds =
    expenses.map(
      (expense) =>
        expense.id
    );

  let splits:
    ExpenseSplit[] = [];

  if (
    expenseIds.length > 0
  ) {
    const {
      data: splitData,
    } = await supabase
      .from("expense_splits")
      .select("*")
      .in(
        "expense_id",
        expenseIds
      );

    splits =
      (splitData ??
        []) as ExpenseSplit[];
  }

  const {
    data: settlementData,
    error: settlementsError,
  } = await supabase
    .from(
      "expense_settlements"
    )
    .select("*")
    .eq(
      "trip_id",
      trip.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (settlementsError) {
    console.error(
      "Failed to load repayments:",
      settlementsError
    );
  }

  const settlements =
    (settlementData ??
      []) as ExpenseSettlement[];

  const allProfileIds =
    new Set<string>(
      participantIds
    );

  expenses.forEach(
    (expense) => {
      allProfileIds.add(
        expense.created_by
      );

      allProfileIds.add(
        expense.paid_by
      );
    }
  );

  splits.forEach(
    (split) =>
      allProfileIds.add(
        split.user_id
      )
  );

  settlements.forEach(
    (settlement) => {
      allProfileIds.add(
        settlement.from_user_id
      );

      allProfileIds.add(
        settlement.to_user_id
      );

      allProfileIds.add(
        settlement.created_by
      );
    }
  );

  const profileMap =
    new Map<
      string,
      {
        display_name:
          | string
          | null;

        username:
          | string
          | null;
      }
    >();

  if (
    allProfileIds.size >
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
        [
          ...allProfileIds,
        ]
      );

    profiles?.forEach(
      (profile) => {
        profileMap.set(
          profile.id,
          profile
        );
      }
    );
  }

  const participants:
    ExpenseParticipant[] =
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

  function getName(
    profileId: string
  ) {
    return (
      profileMap.get(
        profileId
      )?.display_name ??
      "Traveller"
    );
  }

  const splitsByExpense =
    new Map<
      string,
      ExpenseSplit[]
    >();

  splits.forEach(
    (split) => {
      const current =
        splitsByExpense.get(
          split.expense_id
        ) ?? [];

      current.push(
        split
      );

      splitsByExpense.set(
        split.expense_id,
        current
      );
    }
  );

  const summary =
    calculateExpenseSummary(
      expenses,
      splits,
      settlements
    );

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <BackButton
          fallbackHref={`/trips/${trip.id}`}
        />

        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                {trip.name}
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                Expenses
              </h1>

              <p className="mt-2 text-muted">
                Track spending,
                shared costs and who
                owes whom.
              </p>
            </div>

            {canAddExpense && (
              <Link
                href={`/trips/${trip.id}/expenses/new`}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
              >
                Add expense
              </Link>
            )}
          </div>
        </header>

        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Totals */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-ink">
            Trip spending
          </h2>

          {summary.length ===
          0 ? (
            <p className="mt-3 text-sm text-muted">
              No spending has been
              recorded yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summary.map(
                (currency) => (
                  <div
                    key={
                      currency.currency
                    }
                    className="rounded-2xl border border-line bg-surface p-5"
                  >
                    <p className="text-sm text-muted">
                      Total spent{" "}
                      {
                        currency.currency
                      }
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {formatMoney(
                        currency.totalSpent,
                        currency.currency
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Balances */}
        <section className="mt-10 rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold text-ink">
            Who owes whom
          </h2>

          <p className="mt-1 text-sm text-muted">
            Different currencies are
            kept separate rather than
            using live exchange rates.
          </p>

          {summary.length ===
          0 ? (
            <p className="mt-5 text-sm text-muted">
              Add expenses to
              calculate balances.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {summary.map(
                (currency) => (
                  <div
                    key={
                      currency.currency
                    }
                    className="rounded-xl border border-line bg-surface-soft p-5"
                  >
                    <h3 className="font-semibold text-ink">
                      {
                        currency.currency
                      }
                    </h3>

                    {currency.debts
                      .length ===
                    0 ? (
                      <p className="mt-2 text-sm text-muted">
                        Everyone is
                        settled up.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {currency.debts.map(
                          (
                            debt,
                            index
                          ) => {
                            const involvesCurrentUser =
                            debt.fromUserId ===
                              userId ||
                            debt.toUserId ===
                              userId;

                            return (
                              <div
                                key={`${debt.fromUserId}-${debt.toUserId}-${index}`}
                                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 ${
                                  involvesCurrentUser
                                    ? "border-brand-500 bg-brand-50"
                                    : "border-line bg-surface"
                                }`}
                              >
                                <p className="text-sm text-ink">
                                  <PersonName
                                    userId={
                                      debt.fromUserId
                                    }
                                    currentUserId={
                                      userId
                                    }
                                    displayName={getName(
                                      debt.fromUserId
                                    )}
                                    highlightCurrentUser
                                  />

                                  {" owes "}

                                  <PersonName
                                    userId={
                                      debt.toUserId
                                    }
                                    currentUserId={
                                      userId
                                    }
                                    displayName={getName(
                                      debt.toUserId
                                    )}
                                    highlightCurrentUser
                                  />
                                </p>

                                <p
                                className={`font-semibold ${
                                  involvesCurrentUser
                                    ? "text-brand-700"
                                    : "text-ink"
                                  }`}
                                >
                                  {formatMoney(
                                    debt.amount,
                                    currency.currency
                                  )}
                                </p>
                            </div>
                            );
                        }
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Expense history */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-ink">
            Expenses
          </h2>

          {expenses.length ===
          0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-line p-10 text-center">
              <h3 className="font-semibold text-ink">
                No expenses yet
              </h3>

              <p className="mt-2 text-sm text-muted">
                Record your first
                trip payment to start
                calculating balances.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {expenses.map(
                (expense) => {
                  const expenseSplits =
                    splitsByExpense.get(
                      expense.id
                    ) ?? [];

                  const canEdit =
                    isTripCreator ||
                    expense.created_by ===
                      userId;

                  return (
                    <article
                      key={
                        expense.id
                      }
                      className="rounded-2xl border border-line bg-surface p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
                              {getExpenseCategoryLabel(
                                expense.category
                              )}
                            </span>

                            {expense.expense_date && (
                              <span className="text-xs text-subtle">
                                {formatExpenseDate(
                                  expense.expense_date
                                )}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 text-lg font-semibold text-ink">
                            {
                              expense.title
                            }
                          </h3>

                          <p className="mt-1 text-sm text-muted">
                            Paid by{" "}

                            <PersonName
                              userId={
                                expense.paid_by
                              }
                              currentUserId={
                                userId
                              }
                              displayName={getName(
                                expense.paid_by
                              )}
                              highlightCurrentUser
                            />
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-xl font-semibold text-ink">
                            {formatMoney(
                              Number(
                                expense.amount
                              ),
                              expense.currency
                            )}
                          </p>

                          {canEdit && (
                            <Link
                              href={`/trips/${trip.id}/expenses/edit/${expense.id}`}
                              className="mt-2 inline-block text-sm font-medium text-brand-700"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-line pt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                          Split
                          between
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {expenseSplits.map(
                            (
                              split
                            ) => (
                              <span
                                key={
                                  split.user_id
                                }
                                className={`rounded-full border px-2.5 py-1 text-xs ${
                                  split.user_id === userId
                                    ? "border-brand-500 bg-brand-50 text-brand-700"
                                    : "border-line bg-surface-soft text-muted"
                                }`}
                              >
                                <PersonName
                                  userId={
                                    split.user_id
                                  }
                                  currentUserId={
                                    userId
                                }
                                  displayName={getName(
                                    split.user_id
                                  )}
                                  highlightCurrentUser
                                />

                                {" · "}

                                {formatMoney(
                                  Number(
                                    split.amount
                                  ),
                                  expense.currency
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {expense.notes && (
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">
                          {
                            expense.notes
                          }
                        </p>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* Record repayment */}
        {canAddExpense &&
          participants.length >=
            2 && (
          <section className="mt-10 rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold text-ink">
              Record a repayment
            </h2>

            <p className="mt-1 text-sm text-muted">
              Use this when one
              traveller pays another
              back.
            </p>

            <form
              action={
                createSettlement
              }
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
              <input
                type="hidden"
                name="tripId"
                value={
                  trip.id
                }
              />

              <div>
                <label
                  htmlFor="fromUserId"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Paid by
                </label>

                <select
                  id="fromUserId"
                  name="fromUserId"
                  defaultValue={
                    isAttending
                      ? userId
                      : participants[0]
                          ?.userId
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                >
                  {participants.map(
                    (
                      participant
                    ) => (
                      <option
                        key={
                          participant.userId
                        }
                        value={
                          participant.userId
                        }
                      >
                        {
                          participant.displayName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="toUserId"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Paid to
                </label>

                <select
                  id="toUserId"
                  name="toUserId"
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                >
                  {participants.map(
                    (
                      participant
                    ) => (
                      <option
                        key={
                          participant.userId
                        }
                        value={
                          participant.userId
                        }
                      >
                        {
                          participant.displayName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="settlementAmount"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Amount
                </label>

                <input
                  id="settlementAmount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="settlementCurrency"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Currency
                </label>

                <select
                  id="settlementCurrency"
                  name="currency"
                  defaultValue="EUR"
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                >
                  {EXPENSE_CURRENCIES.map(
                    (currency) => (
                      <option
                        key={
                          currency
                        }
                        value={
                          currency
                        }
                      >
                        {
                          currency
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="settlementNote"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Note
                  <span className="ml-1 font-normal text-subtle">
                    optional
                  </span>
                </label>

                <input
                  id="settlementNote"
                  name="note"
                  type="text"
                  maxLength={500}
                  placeholder="e.g. Paid back for hotel"
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                >
                  Record repayment
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Repayment history */}
        {settlements.length >
          0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-ink">
              Repayment history
            </h2>

            <div className="mt-5 space-y-3">
              {settlements.map(
                (
                  settlement
                ) => {
                  const canDelete =
                    isTripCreator ||
                    settlement.created_by ===
                      userId;
                  
                  const involvesCurrentUser =
                    settlement.from_user_id ===
                      userId ||
                    settlement.to_user_id ===
                      userId;

                  return (
                    <div
                      key={
                        settlement.id
                      }
                      className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
                        involvesCurrentUser
                          ? "border-brand-500 bg-brand-50"
                          : "border-line bg-surface"
                      }`}
                    >
                      <div>
                        <p className="text-sm text-ink">
                          <PersonName
                            userId={
                              settlement.from_user_id
                            }
                            currentUserId={
                              userId
                            }
                            displayName={getName(
                              settlement.from_user_id
                            )}
                            highlightCurrentUser
                          />

                          {" paid "}

                          <PersonName
                            userId={
                              settlement.to_user_id
                            }
                            currentUserId={
                              userId
                            }
                            displayName={getName(
                              settlement.to_user_id
                            )}
                            highlightCurrentUser
                          />
                        </p>

                        {settlement.note && (
                          <p className="mt-1 text-sm text-muted">
                            {
                              settlement.note
                            }
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-ink">
                          {formatMoney(
                            Number(
                              settlement.amount
                            ),
                            settlement.currency
                          )}
                        </p>

                        {canDelete && (
                          <form
                            action={
                              deleteSettlement
                            }
                          >
                            <input
                              type="hidden"
                              name="tripId"
                              value={
                                trip.id
                              }
                            />

                            <input
                              type="hidden"
                              name="settlementId"
                              value={
                                settlement.id
                              }
                            />

                            <ConfirmActionButton
                              message="Remove this repayment record?"
                              className="cursor-pointer text-sm font-medium text-danger-text"
                            >
                              Remove
                            </ConfirmActionButton>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}