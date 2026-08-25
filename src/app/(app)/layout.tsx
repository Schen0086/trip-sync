import {
  redirect,
} from "next/navigation";

import AppShell from "@/components/app-shell";
import RealtimeRefresh from "@/components/realtime-refresh";

import type {
  NotificationRecord,
} from "@/lib/activity";

import {
  createClient,
} from "@/lib/supabase/server";


export default async function AuthenticatedLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
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


  // Current profile
  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      display_name,
      avatar_url
    `)
    .eq(
      "id",
      userId
    )
    .single();


  const displayName =
    profile?.display_name ??
    "Traveller";
  
  const avatarUrl =
    profile?.avatar_url ??
    null;


  // Recent notification preview
  const {
    data:
      notificationData,
    error:
      notificationError,
  } = await supabase
    .from("notifications")
    .select(`
      id,
      user_id,
      trip_id,
      actor_user_id,
      type,
      title,
      message,
      href,
      read_at,
      created_at
    `)
    .eq(
      "user_id",
      userId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(6);


  if (
    notificationError
  ) {
    console.error(
      "Failed to load notification preview:",
      notificationError
    );
  }


  // Exact unread count
  const {
    count:
      unreadNotificationCount,
    error:
      unreadCountError,
  } = await supabase
    .from("notifications")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "user_id",
      userId
    )
    .is(
      "read_at",
      null
    );


  if (
    unreadCountError
  ) {
    console.error(
      "Failed to load unread notification count:",
      unreadCountError
    );
  }


  const notifications =
    (notificationData ??
      []) as NotificationRecord[];


  return (
    <AppShell
      displayName={
        displayName
      }
      avatarUrl={
        avatarUrl
      }
      notifications={
        notifications
      }
      unreadNotificationCount={
        unreadNotificationCount ??
        0
      }
    >
      {/* Shared Realtime updates */}
      <RealtimeRefresh
        userId={
          userId
        }
      />

      {children}
    </AppShell>
  );
}