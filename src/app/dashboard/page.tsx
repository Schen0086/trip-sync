import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              TripSync
            </h1>

            <p className="mt-1 text-gray-600">
              Logged in as {data.claims.email}
            </p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-white"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="mt-12 rounded-xl border p-8">
          <h2 className="text-2xl font-semibold">
            Your trips
          </h2>

          <p className="mt-2 text-gray-600">
            You don't have any trips yet.
          </p>
        </div>
      </div>
    </main>
  );
}