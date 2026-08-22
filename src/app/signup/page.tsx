import Link from "next/link";
import { signup } from "@/app/login/actions";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold">
          Create an account
        </h1>

        <p className="mb-6 text-gray-600">
          Start planning trips with your friends.
        </p>

        {params.error && (
          <p className="mb-4 rounded bg-red-100 p-3 text-red-700">
            {params.error}
          </p>
        )}

        {params.success && (
          <p className="mb-4 rounded bg-green-100 p-3 text-green-700">
            {params.success}
          </p>
        )}

        <form action={signup} className="space-y-4">
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
              minLength={8}
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white"
          >
            Sign up
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}