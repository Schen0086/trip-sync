import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import ThemeToggle from "@/components/theme-toggle";

export default async function DashboardPage() {
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
    .select(
      "display_name, username, avatar_url, theme_preference"
    )
    .eq("id", userId)
    .single();

  const themePreference =
    profile?.theme_preference === "dark"
      ? "dark"
      : "light";

  return (
    <main className="min-h-screen bg-canvas px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">
              TripSync
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
              Welcome,{" "}
              {profile?.display_name ?? "Traveller"}
            </h1>

            <p className="mt-1 text-sm text-muted">
              {data.claims.email}
            </p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle
              userId={userId}
              initialTheme={themePreference}
            />

            <form action={logout}>
              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        {/* Trips section */}
        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Your trips
              </h2>

              <p className="mt-1 text-muted">
                Plan, organise and keep track of your
                upcoming adventures.
              </p>
            </div>

            {/* Create trip button */}
            <button
              type="button"
              className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
            >
              Create trip
            </button>
          </div>

          {/* Empty state */}
          <div className="mt-6 rounded-2xl border border-line bg-surface p-8 shadow-sm">
            <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-300 bg-brand-50 text-lg font-semibold text-brand-700">
                T
              </div>

              <h3 className="mt-5 text-lg font-semibold text-ink">
                No trips yet
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted">
                Create your first trip and start planning
                it with your friends.
              </p>

              <button
                type="button"
                className="mt-6 cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Create your first trip
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}