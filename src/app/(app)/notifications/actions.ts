"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";


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


function refreshNotifications() {
  revalidatePath(
    "/notifications"
  );

  revalidatePath(
    "/",
    "layout"
  );
}


export async function markNotificationRead(
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
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const notificationId =
    getText(
      formData,
      "notificationId"
    );

  if (!notificationId) {
    return;
  }

  const {
    error: updateError,
  } = await supabase
    .from("notifications")
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      notificationId
    )
    .eq(
      "user_id",
      userId
    );

  if (updateError) {
    console.error(
      "Failed to mark notification as read:",
      updateError
    );

    return;
  }

  refreshNotifications();
}


export async function markAllNotificationsRead(
  _formData: FormData
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
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const {
    error: updateError,
  } = await supabase
    .from("notifications")
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq(
      "user_id",
      userId
    )
    .is(
      "read_at",
      null
    );

  if (updateError) {
    console.error(
      "Failed to mark all notifications as read:",
      updateError
    );

    return;
  }

  refreshNotifications();
}


export async function openNotification(
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
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const notificationId =
    getText(
      formData,
      "notificationId"
    );

  if (!notificationId) {
    redirect(
      "/notifications"
    );
  }

  const {
    data: notification,
  } = await supabase
    .from("notifications")
    .select(`
      id,
      href,
      read_at
    `)
    .eq(
      "id",
      notificationId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (!notification) {
    redirect(
      "/notifications"
    );
  }

  if (
    !notification.read_at
  ) {
    await supabase
      .from("notifications")
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        notification.id
      )
      .eq(
        "user_id",
        userId
      );
  }

  refreshNotifications();

  const href =
    notification.href &&
    notification.href.startsWith(
      "/"
    ) &&
    !notification.href.startsWith(
      "//"
    )
      ? notification.href
      : "/notifications";

  redirect(href);
}


export async function deleteNotification(
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
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const notificationId =
    getText(
      formData,
      "notificationId"
    );

  if (!notificationId) {
    return;
  }

  const {
    error: deleteError,
  } = await supabase
    .from("notifications")
    .delete()
    .eq(
      "id",
      notificationId
    )
    .eq(
      "user_id",
      userId
    );

  if (deleteError) {
    console.error(
      "Failed to delete notification:",
      deleteError
    );

    return;
  }

  refreshNotifications();
}


export async function deleteReadNotifications(
  _formData: FormData
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
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const {
    data: readRows,
    error: readError,
  } = await supabase
    .from("notifications")
    .select("id")
    .eq(
      "user_id",
      userId
    )
    .not(
      "read_at",
      "is",
      null
    );

  if (readError) {
    console.error(
      "Failed to load read notifications:",
      readError
    );

    return;
  }

  const ids =
    readRows?.map(
      (row) => row.id
    ) ?? [];

  if (
    ids.length ===
    0
  ) {
    return;
  }

  const {
    error: deleteError,
  } = await supabase
    .from("notifications")
    .delete()
    .eq(
      "user_id",
      userId
    )
    .in(
      "id",
      ids
    );

  if (deleteError) {
    console.error(
      "Failed to delete read notifications:",
      deleteError
    );

    return;
  }

  refreshNotifications();
}