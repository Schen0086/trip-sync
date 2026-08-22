import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Load user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, theme_preference")
    .eq("id", userId)
    .single();

  const displayName =
    profile?.display_name ?? "Traveller";

  const themePreference =
    profile?.theme_preference === "dark"
      ? "dark"
      : "light";

  return (
    <AppShell
      userId={userId}
      displayName={displayName}
      initialTheme={themePreference}
    >
      {children}
    </AppShell>
  );
}