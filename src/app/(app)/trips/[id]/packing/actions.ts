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
  isPackingCategory,
} from "@/lib/packing";

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
  return (
    getText(
      formData,
      name
    ) || null
  );
}

function refreshPacking(
  tripId: string
) {
  revalidatePath(
    `/trips/${tripId}`
  );

  revalidatePath(
    `/trips/${tripId}/packing`
  );
}

export async function addPackingItem(
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

  const userId =
    data.claims.sub;

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const scope =
    getText(
      formData,
      "scope"
    );

  const name =
    getText(
      formData,
      "name"
    );

  const category =
    getText(
      formData,
      "category"
    );

  const quantity =
    Number(
      getText(
        formData,
        "quantity"
      ) || "1"
    );

  const notes =
    optionalText(
      formData,
      "notes"
    );

  const assignedTo =
    optionalText(
      formData,
      "assignedTo"
    );

  const errorPath =
    `/trips/${tripId}/packing`;

  if (
    scope !==
      "personal" &&
    scope !==
      "shared"
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Invalid packing list"
      )}`
    );
  }

  if (
    !name ||
    name.length > 160
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Enter an item name"
      )}`
    );
  }

  if (
    !isPackingCategory(
      category
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid category"
      )}`
    );
  }

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1 ||
    quantity > 99
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Quantity must be between 1 and 99"
      )}`
    );
  }

  if (
    notes &&
    notes.length > 1000
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Notes must be 1000 characters or fewer"
      )}`
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from("packing_items")
    .insert({
      trip_id:
        tripId,

      created_by:
        userId,

      owner_user_id:
        scope ===
        "personal"
          ? userId
          : null,

      scope,

      name,

      category,

      quantity,

      assigned_to:
        scope ===
        "shared"
          ? assignedTo
          : null,

      notes,
    });

  if (insertError) {
    console.error(
      "Failed to add packing item:",
      insertError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        insertError.message
      )}`
    );
  }

  refreshPacking(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Packing item added"
    )}`
  );
}

export async function togglePackingItem(
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

  const itemId =
    getText(
      formData,
      "itemId"
    );

  const {
    data: item,
  } = await supabase
    .from("packing_items")
    .select(
      "id, is_packed"
    )
    .eq(
      "id",
      itemId
    )
    .eq(
      "trip_id",
      tripId
    )
    .maybeSingle();

  if (!item) {
    replaceRedirect(
      `/trips/${tripId}/packing`
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("packing_items")
    .update({
      is_packed:
        !item.is_packed,
    })
    .eq(
      "id",
      item.id
    );

  if (updateError) {
    console.error(
      "Failed to toggle packing item:",
      updateError
    );

    replaceRedirect(
      `/trips/${tripId}/packing?error=${encodeURIComponent(
        "Unable to update packing item"
      )}`
    );
  }

  refreshPacking(
    tripId
  );
}

export async function updatePackingItem(
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

  const itemId =
    getText(
      formData,
      "itemId"
    );

  const name =
    getText(
      formData,
      "name"
    );

  const category =
    getText(
      formData,
      "category"
    );

  const quantity =
    Number(
      getText(
        formData,
        "quantity"
      )
    );

  const notes =
    optionalText(
      formData,
      "notes"
    );

  const assignedTo =
    optionalText(
      formData,
      "assignedTo"
    );

  const errorPath =
    `/trips/${tripId}/packing`;

  const {
    data: existingItem,
  } = await supabase
    .from("packing_items")
    .select(`
      id,
      scope,
      is_system_required
    `)
    .eq(
      "id",
      itemId
    )
    .eq(
      "trip_id",
      tripId
    )
    .maybeSingle();

  if (!existingItem) {
    replaceRedirect(
      errorPath
    );
  }

  if (
    existingItem.is_system_required
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Required items cannot be edited or removed"
      )}`
    );
  }

  if (
    !name ||
    name.length > 160 ||
    !isPackingCategory(
      category
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Enter valid packing item details"
      )}`
    );
  }

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1 ||
    quantity > 99
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Quantity must be between 1 and 99"
      )}`
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("packing_items")
    .update({
      name,
      category,
      quantity,

      notes,

      assigned_to:
        existingItem.scope ===
        "shared"
          ? assignedTo
          : null,
    })
    .eq(
      "id",
      itemId
    )
    .eq(
      "trip_id",
      tripId
    );

  if (updateError) {
    console.error(
      "Failed to update packing item:",
      updateError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        updateError.message
      )}`
    );
  }

  refreshPacking(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Packing item updated"
    )}`
  );
}

export async function deletePackingItem(
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

  const itemId =
    getText(
      formData,
      "itemId"
    );

  const errorPath =
    `/trips/${tripId}/packing`;

  const {
    data: item,
  } = await supabase
    .from("packing_items")
    .select(
      "id, is_system_required"
    )
    .eq(
      "id",
      itemId
    )
    .eq(
      "trip_id",
      tripId
    )
    .maybeSingle();

  if (!item) {
    replaceRedirect(
      errorPath
    );
  }

  if (
    item.is_system_required
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Required items cannot be deleted"
      )}`
    );
  }

  const {
    error: deleteError,
  } = await supabase
    .from("packing_items")
    .delete()
    .eq(
      "id",
      itemId
    )
    .eq(
      "trip_id",
      tripId
    );

  if (deleteError) {
    console.error(
      "Failed to delete packing item:",
      deleteError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        deleteError.message
      )}`
    );
  }

  refreshPacking(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Packing item removed"
    )}`
  );
}