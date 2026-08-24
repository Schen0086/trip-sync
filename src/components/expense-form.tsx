"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  createExpense,
  updateExpense,
} from "@/app/(app)/trips/[id]/expenses/actions";

import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_CURRENCIES,
  type ExpenseFormDefaults,
  type ExpenseParticipant,
} from "@/lib/expenses";

type ExpenseFormProps = {
  tripId: string;

  currentUserId: string;

  participants:
    ExpenseParticipant[];

  defaults?:
    ExpenseFormDefaults;
};

export default function ExpenseForm({
  tripId,
  currentUserId,
  participants,
  defaults,
}: ExpenseFormProps) {
  const editing =
    Boolean(defaults);

  const [
    splitMode,
    setSplitMode,
  ] = useState<
    "equal" | "custom"
  >(
    editing
      ? "custom"
      : "equal"
  );

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<string[]>(
    defaults
      ? defaults.splits.map(
          (split) =>
            split.userId
        )
      : participants.map(
          (participant) =>
            participant.userId
        )
  );

  const [
    amount,
    setAmount,
  ] = useState(
    defaults
      ? String(
          defaults.amount
        )
      : ""
  );

  const defaultSplitMap =
    useMemo(
      () =>
        new Map(
          defaults?.splits.map(
            (split) => [
              split.userId,
              split.amount,
            ]
          ) ?? []
        ),
      [defaults]
    );

  const numericAmount =
    Number(amount);

  const equalPreview =
    selectedIds.length > 0 &&
    Number.isFinite(
      numericAmount
    ) &&
    numericAmount > 0
      ? numericAmount /
        selectedIds.length
      : null;

  function toggleTraveller(
    userId: string
  ) {
    setSelectedIds(
      (current) =>
        current.includes(
          userId
        )
          ? current.filter(
              (id) =>
                id !== userId
            )
          : [
              ...current,
              userId,
            ]
    );
  }

  const payerDefault =
    defaults?.paidBy ??
    (
      participants.some(
        (participant) =>
          participant.userId ===
          currentUserId
      )
        ? currentUserId
        : participants[0]
            ?.userId
    ) ??
    "";

  return (
    <form
      action={
        editing
          ? updateExpense
          : createExpense
      }
      className="space-y-6"
    >
      <input
        type="hidden"
        name="tripId"
        value={tripId}
      />

      {defaults && (
        <input
          type="hidden"
          name="expenseId"
          value={
            defaults.id
          }
        />
      )}

      {/* Expense name */}
      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Expense
        </label>

        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={160}
          defaultValue={
            defaults?.title ??
            ""
          }
          placeholder="e.g. Hotel, dinner, train tickets"
          className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Amount */}
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <label
            htmlFor="amount"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Amount
          </label>

          <input
            id="amount"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(
              event
            ) =>
              setAmount(
                event.target
                  .value
              )
            }
            placeholder="0.00"
            className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </div>

        <div>
          <label
            htmlFor="currency"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Currency
          </label>

          <select
            id="currency"
            name="currency"
            defaultValue={
              defaults?.currency ??
              "EUR"
            }
            className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
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
                  {currency}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Payer */}
      <div>
        <label
          htmlFor="paidBy"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Who paid?
        </label>

        <select
          id="paidBy"
          name="paidBy"
          required
          defaultValue={
            payerDefault
          }
          className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        >
          {participants.map(
            (participant) => (
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
                {participant.username
                  ? ` (@${participant.username})`
                  : ""}
              </option>
            )
          )}
        </select>
      </div>

      {/* Category/date */}
      <div className="grid gap-4 sm:grid-cols-2">
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
              defaults?.category ??
              "other"
            }
            className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            {EXPENSE_CATEGORY_OPTIONS.map(
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

        <div>
          <label
            htmlFor="expenseDate"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Date
            <span className="ml-1 font-normal text-subtle">
              optional
            </span>
          </label>

          <input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={
              defaults?.expenseDate ??
              ""
            }
            className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Split type */}
      <div>
        <p className="text-sm font-medium text-ink">
          Split method
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setSplitMode(
                "equal"
              )
            }
            className={
              splitMode ===
              "equal"
                ? "cursor-pointer rounded-xl border border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
                : "cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
            }
          >
            Split equally
          </button>

          <button
            type="button"
            onClick={() =>
              setSplitMode(
                "custom"
              )
            }
            className={
              splitMode ===
              "custom"
                ? "cursor-pointer rounded-xl border border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
                : "cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
            }
          >
            Custom split
          </button>
        </div>

        <input
          type="hidden"
          name="splitMode"
          value={splitMode}
        />
      </div>

      {/* Travellers */}
      <div>
        <p className="text-sm font-medium text-ink">
          Who shares this expense?
        </p>

        <p className="mt-1 text-xs text-muted">
          Only travellers marked as
          attending can be included.
        </p>

        <div className="mt-3 space-y-2">
          {participants.map(
            (participant) => {
              const selected =
                selectedIds.includes(
                  participant.userId
                );

              return (
                <label
                  key={
                    participant.userId
                  }
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-soft px-4 py-3"
                >
                  <input
                    type="checkbox"
                    name="splitUserIds"
                    value={
                      participant.userId
                    }
                    checked={
                      selected
                    }
                    onChange={() =>
                      toggleTraveller(
                        participant.userId
                      )
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {
                        participant.displayName
                      }

                      {participant.userId ===
                        currentUserId && (
                        <span className="ml-1 font-normal text-muted">
                          (You)
                        </span>
                      )}
                    </p>

                    {participant.username && (
                      <p className="text-xs text-subtle">
                        @
                        {
                          participant.username
                        }
                      </p>
                    )}
                  </div>

                  {selected &&
                    splitMode ===
                      "custom" && (
                      <input
                        type="number"
                        name={`splitAmount:${participant.userId}`}
                        min="0.01"
                        step="0.01"
                        required
                        defaultValue={
                          defaultSplitMap.get(
                            participant.userId
                          ) ?? ""
                        }
                        placeholder="0.00"
                        onClick={(
                          event
                        ) =>
                          event.stopPropagation()
                        }
                        className="w-28 rounded-lg border border-line bg-surface px-3 py-2 text-right text-sm text-ink outline-none focus:border-brand-500"
                      />
                    )}
                </label>
              );
            }
          )}
        </div>

        {splitMode ===
          "equal" &&
          equalPreview !==
            null && (
            <p className="mt-3 text-sm text-muted">
              Approximately{" "}
              {equalPreview.toFixed(
                2
              )}{" "}
              each. Any rounding
              cent is assigned
              automatically.
            </p>
          )}
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Notes
          <span className="ml-1 font-normal text-subtle">
            optional
          </span>
        </label>

        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={1500}
          defaultValue={
            defaults?.notes ??
            ""
          }
          placeholder="Booking details, what this payment covered..."
          className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="flex justify-end border-t border-line pt-6">
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
        >
          {editing
            ? "Save changes"
            : "Add expense"}
        </button>
      </div>
    </form>
  );
}