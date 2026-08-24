"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
  RedirectType,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  isExpenseCategory,
  isExpenseCurrency,
} from "@/lib/expenses";

function replaceRedirect(
  path: string
): never {
  redirect(
    path,
    RedirectType.replace
  );
}

function getText(
  formData: FormData,
  name: string
) {
  return (
    (
      formData.get(name) as
        | string
        | null
    )?.trim() ?? ""
  );
}

function optionalText(
  formData: FormData,
  name: string
) {
  const value =
    getText(
      formData,
      name
    );

  return value || null;
}

function revalidateExpenses(
  tripId: string
) {
  revalidatePath(
    `/trips/${tripId}`
  );

  revalidatePath(
    `/trips/${tripId}/expenses`
  );
}

type ParsedExpense = {
  title: string;
  paidBy: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: string | null;
  notes: string | null;

  splits: {
    user_id: string;
    amount: number;
  }[];
};

function parseExpense(
  formData: FormData
):
  | {
      value: ParsedExpense;
      error: null;
    }
  | {
      value: null;
      error: string;
    } {
  const title =
    getText(
      formData,
      "title"
    );

  const paidBy =
    getText(
      formData,
      "paidBy"
    );

  const amount =
    Number(
      getText(
        formData,
        "amount"
      )
    );

  const currency =
    getText(
      formData,
      "currency"
    ).toUpperCase();

  const category =
    getText(
      formData,
      "category"
    );

  const expenseDate =
    optionalText(
      formData,
      "expenseDate"
    );

  const notes =
    optionalText(
      formData,
      "notes"
    );

  const splitMode =
    getText(
      formData,
      "splitMode"
    );

  const selectedUserIds = [
    ...new Set(
      formData
        .getAll(
          "splitUserIds"
        )
        .map(String)
        .filter(Boolean)
    ),
  ];

  if (
    !title ||
    title.length > 160
  ) {
    return {
      value: null,
      error:
        "Enter an expense name",
    };
  }

  if (!paidBy) {
    return {
      value: null,
      error:
        "Choose who paid",
    };
  }

  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    return {
      value: null,
      error:
        "Enter a valid expense amount",
    };
  }

  if (
    !isExpenseCurrency(
      currency
    )
  ) {
    return {
      value: null,
      error:
        "Choose a supported currency",
    };
  }

  if (
    !isExpenseCategory(
      category
    )
  ) {
    return {
      value: null,
      error:
        "Choose an expense category",
    };
  }

  if (
    notes &&
    notes.length > 1500
  ) {
    return {
      value: null,
      error:
        "Notes must be 1500 characters or fewer",
    };
  }

  if (
    selectedUserIds.length ===
    0
  ) {
    return {
      value: null,
      error:
        "Choose at least one traveller to split the expense with",
    };
  }

  const totalCents =
    Math.round(
      amount * 100
    );

  let splits: {
    user_id: string;
    amount: number;
  }[] = [];

  if (
    splitMode === "equal"
  ) {
    if (
      totalCents <
      selectedUserIds.length
    ) {
      return {
        value: null,
        error:
          "The amount is too small to split between those travellers",
      };
    }

    const baseCents =
      Math.floor(
        totalCents /
          selectedUserIds.length
      );

    const remainder =
      totalCents %
      selectedUserIds.length;

    splits =
      selectedUserIds.map(
        (
          userId,
          index
        ) => ({
          user_id:
            userId,

          amount:
            (
              baseCents +
              (index <
              remainder
                ? 1
                : 0)
            ) / 100,
        })
      );
  } else if (
    splitMode === "custom"
  ) {
    const customSplits:
      typeof splits = [];

    let customTotalCents =
      0;

    for (
      const userId
      of selectedUserIds
    ) {
      const splitAmount =
        Number(
          getText(
            formData,
            `splitAmount:${userId}`
          )
        );

      if (
        !Number.isFinite(
          splitAmount
        ) ||
        splitAmount <= 0
      ) {
        return {
          value: null,
          error:
            "Enter a valid custom amount for every selected traveller",
        };
      }

      const splitCents =
        Math.round(
          splitAmount *
            100
        );

      customTotalCents +=
        splitCents;

      customSplits.push({
        user_id: userId,
        amount:
          splitCents /
          100,
      });
    }

    if (
      customTotalCents !==
      totalCents
    ) {
      return {
        value: null,
        error:
          "Custom splits must add up exactly to the expense total",
      };
    }

    splits =
      customSplits;
  } else {
    return {
      value: null,
      error:
        "Choose a split method",
    };
  }

  return {
    value: {
      title,
      paidBy,
      amount:
        totalCents / 100,
      currency,
      category,
      expenseDate,
      notes,
      splits,
    },

    error: null,
  };
}

export async function createExpense(
  formData: FormData
) {
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
    replaceRedirect(
      "/login"
    );
  }

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const errorPath =
    `/trips/${tripId}/expenses/new`;

  const parsed =
    parseExpense(
      formData
    );

  // Stop here if validation failed
  if (
    parsed.value === null
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        parsed.error
      )}`
    );
  }

  // TypeScript now knows value is ParsedExpense
  const value =
    parsed.value;

  const {
    error: rpcError,
  } = await supabase.rpc(
    "create_trip_expense",
    {
      p_trip_id:
        tripId,

      p_paid_by:
        value.paidBy,

      p_title:
        value.title,

      p_amount:
        value.amount,

      p_currency:
        value.currency,

      p_category:
        value.category,

      p_expense_date:
        value.expenseDate,

      p_notes:
        value.notes,

      p_splits:
        value.splits,
    }
  );

  if (rpcError) {
    console.error(
      "Failed to create expense:",
      rpcError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        rpcError.message
      )}`
    );
  }

  revalidateExpenses(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/expenses?success=${encodeURIComponent(
      "Expense added"
    )}`
  );
}

export async function updateExpense(
  formData: FormData
) {
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
    replaceRedirect(
      "/login"
    );
  }

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const expenseId =
    getText(
      formData,
      "expenseId"
    );

  const errorPath =
    `/trips/${tripId}/expenses/edit/${expenseId}`;

  const parsed =
    parseExpense(
      formData
    );

  // Stop here if validation failed
  if (
    parsed.value === null
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        parsed.error
      )}`
    );
  }

  // TypeScript now knows value is ParsedExpense
  const value =
    parsed.value;

  const {
    error: rpcError,
  } = await supabase.rpc(
    "update_trip_expense",
    {
      p_trip_id:
        tripId,

      p_expense_id:
        expenseId,

      p_paid_by:
        value.paidBy,

      p_title:
        value.title,

      p_amount:
        value.amount,

      p_currency:
        value.currency,

      p_category:
        value.category,

      p_expense_date:
        value.expenseDate,

      p_notes:
        value.notes,

      p_splits:
        value.splits,
    }
  );

  if (rpcError) {
    console.error(
      "Failed to update expense:",
      rpcError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        rpcError.message
      )}`
    );
  }

  revalidateExpenses(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/expenses?success=${encodeURIComponent(
      "Expense updated"
    )}`
  );
}

export async function deleteExpense(
  formData: FormData
) {
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
    replaceRedirect(
      "/login"
    );
  }

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const expenseId =
    getText(
      formData,
      "expenseId"
    );

  const {
    error: rpcError,
  } = await supabase.rpc(
    "delete_trip_expense",
    {
      p_trip_id:
        tripId,

      p_expense_id:
        expenseId,
    }
  );

  if (rpcError) {
    console.error(
      "Failed to delete expense:",
      rpcError
    );

    replaceRedirect(
      `/trips/${tripId}/expenses/edit/${expenseId}?error=${encodeURIComponent(
        rpcError.message
      )}`
    );
  }

  revalidateExpenses(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/expenses?success=${encodeURIComponent(
      "Expense deleted"
    )}`
  );
}

export async function createSettlement(
  formData: FormData
) {
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
    replaceRedirect(
      "/login"
    );
  }

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const fromUserId =
    getText(
      formData,
      "fromUserId"
    );

  const toUserId =
    getText(
      formData,
      "toUserId"
    );

  const amount =
    Number(
      getText(
        formData,
        "amount"
      )
    );

  const currency =
    getText(
      formData,
      "currency"
    ).toUpperCase();

  const note =
    optionalText(
      formData,
      "note"
    );

  const errorPath =
    `/trips/${tripId}/expenses`;

  if (
    !fromUserId ||
    !toUserId
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose who paid whom"
      )}`
    );
  }

  if (
    fromUserId ===
    toUserId
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "The repayment travellers must be different"
      )}`
    );
  }

  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Enter a valid repayment amount"
      )}`
    );
  }

  if (
    !isExpenseCurrency(
      currency
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a supported currency"
      )}`
    );
  }

  if (
    note &&
    note.length > 500
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Repayment note must be 500 characters or fewer"
      )}`
    );
  }

  const {
    error: rpcError,
  } = await supabase.rpc(
    "create_trip_settlement",
    {
      p_trip_id:
        tripId,

      p_from_user_id:
        fromUserId,

      p_to_user_id:
        toUserId,

      p_amount:
        Math.round(
          amount * 100
        ) / 100,

      p_currency:
        currency,

      p_note:
        note,
    }
  );

  if (rpcError) {
    console.error(
      "Failed to create repayment:",
      rpcError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        rpcError.message
      )}`
    );
  }

  revalidateExpenses(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Repayment recorded"
    )}`
  );
}

export async function deleteSettlement(
  formData: FormData
) {
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
    replaceRedirect(
      "/login"
    );
  }

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const settlementId =
    getText(
      formData,
      "settlementId"
    );

  const {
    error: rpcError,
  } = await supabase.rpc(
    "delete_trip_settlement",
    {
      p_trip_id:
        tripId,

      p_settlement_id:
        settlementId,
    }
  );

  if (rpcError) {
    console.error(
      "Failed to delete repayment:",
      rpcError
    );

    replaceRedirect(
      `/trips/${tripId}/expenses?error=${encodeURIComponent(
        rpcError.message
      )}`
    );
  }

  revalidateExpenses(
    tripId
  );

  replaceRedirect(
    `/trips/${tripId}/expenses?success=${encodeURIComponent(
      "Repayment removed"
    )}`
  );
}