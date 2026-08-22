import Link from "next/link";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold">
          Welcome back
        </h1>

        <p className="mb-6 text-gray-600">
          Log in to continue planning your trips.
        </p>

        {params.error && (
          <p className="mb-4 rounded bg-red-100 p-3 text-red-700">
            {params.error}
          </p>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block font-medium"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block font-medium"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}