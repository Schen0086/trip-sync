export type ExpenseCategory =
  | "accommodation"
  | "transport"
  | "food_drink"
  | "activities"
  | "shopping"
  | "groceries"
  | "fees"
  | "other";

export const EXPENSE_CATEGORY_OPTIONS: {
  value: ExpenseCategory;
  label: string;
}[] = [
  {
    value: "accommodation",
    label: "Accommodation",
  },
  {
    value: "transport",
    label: "Transport",
  },
  {
    value: "food_drink",
    label: "Food & drink",
  },
  {
    value: "activities",
    label: "Activities",
  },
  {
    value: "shopping",
    label: "Shopping",
  },
  {
    value: "groceries",
    label: "Groceries",
  },
  {
    value: "fees",
    label: "Fees",
  },
  {
    value: "other",
    label: "Other",
  },
];

export const EXPENSE_CURRENCIES = [
  "EUR",
  "GBP",
  "USD",
  "JPY",
  "CHF",
  "PLN",
  "CZK",
  "HUF",
  "SEK",
  "NOK",
  "DKK",
  "CAD",
  "AUD",
  "NZD",
  "CNY",
  "HKD",
  "SGD",
  "KRW",
  "THB",
  "TRY",
] as const;

export type ExpenseCurrency =
  (typeof EXPENSE_CURRENCIES)[number];

export type ExpenseParticipant = {
  userId: string;
  displayName: string;

  username:
    | string
    | null;

  avatarUrl:
    | string
    | null;
};

export type Expense = {
  id: string;
  trip_id: string;
  created_by: string;
  paid_by: string;

  title: string;

  amount: number | string;
  currency: string;

  category: ExpenseCategory;

  expense_date: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

export type ExpenseSplit = {
  expense_id: string;
  user_id: string;
  amount: number | string;
};

export type ExpenseSettlement = {
  id: string;
  trip_id: string;

  from_user_id: string;
  to_user_id: string;

  amount: number | string;
  currency: string;

  note: string | null;

  created_by: string;

  created_at: string;
};

export type ExpenseFormDefaults = {
  id: string;

  title: string;

  paidBy: string;

  amount: number;

  currency: string;

  category: ExpenseCategory;

  expenseDate: string;

  notes: string;

  splits: {
    userId: string;
    amount: number;
  }[];
};

export type ExpenseDebt = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export type ExpenseCurrencySummary = {
  currency: string;

  totalSpent: number;

  balances: Record<
    string,
    number
  >;

  debts: ExpenseDebt[];
};

export function isExpenseCategory(
  value: string
): value is ExpenseCategory {
  return EXPENSE_CATEGORY_OPTIONS.some(
    (option) =>
      option.value === value
  );
}

export function isExpenseCurrency(
  value: string
) {
  return (
    EXPENSE_CURRENCIES as readonly string[]
  ).includes(value);
}

export function getExpenseCategoryLabel(
  category: ExpenseCategory
) {
  return (
    EXPENSE_CATEGORY_OPTIONS.find(
      (option) =>
        option.value === category
    )?.label ?? "Other"
  );
}

export function formatMoney(
  amount: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-IE",
      {
        style: "currency",
        currency,
      }
    ).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(
      2
    )}`;
  }
}

export function formatExpenseDate(
  value: string
) {
  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function toCents(
  value: number | string
) {
  return Math.round(
    Number(value) * 100
  );
}

export function calculateExpenseSummary(
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: ExpenseSettlement[]
): ExpenseCurrencySummary[] {
  const currencyNames =
    new Set<string>();

  expenses.forEach(
    (expense) =>
      currencyNames.add(
        expense.currency
      )
  );

  settlements.forEach(
    (settlement) =>
      currencyNames.add(
        settlement.currency
      )
  );

  const splitsByExpense =
    new Map<
      string,
      ExpenseSplit[]
    >();

  splits.forEach((split) => {
    const current =
      splitsByExpense.get(
        split.expense_id
      ) ?? [];

    current.push(split);

    splitsByExpense.set(
      split.expense_id,
      current
    );
  });

  return [
    ...currencyNames,
  ]
    .sort()
    .map((currency) => {
      const balances =
        new Map<string, number>();

      let totalSpentCents = 0;

      function changeBalance(
        userId: string,
        amountCents: number
      ) {
        balances.set(
          userId,
          (balances.get(userId) ??
            0) +
            amountCents
        );
      }

      expenses
        .filter(
          (expense) =>
            expense.currency ===
            currency
        )
        .forEach((expense) => {
          const expenseCents =
            toCents(
              expense.amount
            );

          totalSpentCents +=
            expenseCents;

          // Payer is owed the full expense.
          changeBalance(
            expense.paid_by,
            expenseCents
          );

          // Everybody then owes their share.
          (
            splitsByExpense.get(
              expense.id
            ) ?? []
          ).forEach((split) => {
            changeBalance(
              split.user_id,
              -toCents(
                split.amount
              )
            );
          });
        });

      // Repayment from A to B reduces
      // A's debt and reduces what B is owed.
      settlements
        .filter(
          (settlement) =>
            settlement.currency ===
            currency
        )
        .forEach(
          (settlement) => {
            const cents =
              toCents(
                settlement.amount
              );

            changeBalance(
              settlement.from_user_id,
              cents
            );

            changeBalance(
              settlement.to_user_id,
              -cents
            );
          }
        );

      const debtors = [
        ...balances.entries(),
      ]
        .filter(
          ([, balance]) =>
            balance < 0
        )
        .map(
          ([
            userId,
            balance,
          ]) => ({
            userId,
            amount:
              -balance,
          })
        );

      const creditors = [
        ...balances.entries(),
      ]
        .filter(
          ([, balance]) =>
            balance > 0
        )
        .map(
          ([
            userId,
            balance,
          ]) => ({
            userId,
            amount:
              balance,
          })
        );

      const debts: ExpenseDebt[] =
        [];

      let debtorIndex = 0;
      let creditorIndex = 0;

      while (
        debtorIndex <
          debtors.length &&
        creditorIndex <
          creditors.length
      ) {
        const debtor =
          debtors[
            debtorIndex
          ];

        const creditor =
          creditors[
            creditorIndex
          ];

        const payment =
          Math.min(
            debtor.amount,
            creditor.amount
          );

        if (payment > 0) {
          debts.push({
            fromUserId:
              debtor.userId,

            toUserId:
              creditor.userId,

            amount:
              payment / 100,
          });
        }

        debtor.amount -=
          payment;

        creditor.amount -=
          payment;

        if (
          debtor.amount === 0
        ) {
          debtorIndex += 1;
        }

        if (
          creditor.amount ===
          0
        ) {
          creditorIndex += 1;
        }
      }

      return {
        currency,

        totalSpent:
          totalSpentCents /
          100,

        balances:
          Object.fromEntries(
            [
              ...balances.entries(),
            ].map(
              ([
                userId,
                cents,
              ]) => [
                userId,
                cents / 100,
              ]
            )
          ),

        debts,
      };
    });
}