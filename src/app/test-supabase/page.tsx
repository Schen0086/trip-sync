import { createClient } from "@/lib/supabase/server";

export default async function TestSupabasePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_connection")
    .select("*");

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Supabase Error</h1>
        <pre className="mt-4">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Supabase Connection Test</h1>

      <pre className="mt-4">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}