import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import RealtimeRefresh from "@/components/realtime-refresh";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Load profile
  const { data: profile } =
    await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

  const displayName =
    profile?.display_name ??
    "Traveller";

  return (
    <AppShell
      displayName={displayName}
    >
      {/* Refresh current page when shared data changes */}
      <RealtimeRefresh
        userId={userId}
      />

      {children}
    </AppShell>
  );
}