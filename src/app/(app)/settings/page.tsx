import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/back-button";
import PasswordInput from "@/components/password-input";
import ThemeToggle from "@/components/theme-toggle";
import {
  updateEmail,
  updatePassword,
  updateProfileSettings,
} from "./actions";
import ProfileAvatarEditor from "@/components/profile-avatar-editor";

type SettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const query = await searchParams;

  const supabase = await createClient();

  // Check authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "";

  // Load profile
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
    <main className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Back navigation */}
        <BackButton fallbackHref="/dashboard" />

        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Settings
          </h1>

          <p className="mt-2 text-muted">
            Manage your TripSync profile, account and appearance.
          </p>
        </header>

        {/* Error message */}
        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {/* Success message */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Profile settings */}
        <section className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Profile
            </h2>

            <p className="mt-1 text-sm text-muted">
              Choose how other TripSync users see you.
            </p>
          </div>

          <ProfileAvatarEditor
            userId={
              userId
            }
            displayName={
              profile?.display_name ??
              "Traveller"
            }
            initialAvatarUrl={
              profile?.avatar_url ??
              null
            }
          />

          <form
            action={updateProfileSettings}
            className="mt-7 space-y-5"
          >
            {/* Display name */}
            <div>
              <label
                htmlFor="displayName"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Display name
              </label>

              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                minLength={2}
                maxLength={50}
                defaultValue={
                  profile?.display_name ??
                  ""
                }
                autoComplete="name"
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />

              <p className="mt-1.5 text-xs text-subtle">
                This is the name shown around TripSync.
              </p>
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Username
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                  @
                </span>

                <input
                  id="username"
                  name="username"
                  type="text"
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  defaultValue={
                    profile?.username ??
                    ""
                  }
                  placeholder="jerry"
                  autoComplete="username"
                  className="w-full rounded-xl border border-line bg-surface-soft py-2.5 pl-8 pr-3.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-subtle">
                Optional. 3–30 letters, numbers or underscores.
                Usernames are stored in lowercase.
              </p>
            </div>

            {/* Save profile */}
            <div className="flex justify-end border-t border-line pt-5">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Save profile
              </button>
            </div>
          </form>
        </section>

        {/* Email settings */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Email
            </h2>

            <p className="mt-1 text-sm text-muted">
              Change the email address used to sign in.
            </p>
          </div>

          <form
            action={updateEmail}
            className="mt-7 space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={email}
                autoComplete="email"
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />

              <p className="mt-1.5 text-xs leading-5 text-subtle">
                Changing your email may require confirmation before
                the new address becomes active.
              </p>
            </div>

            {/* Change email */}
            <div className="flex justify-end border-t border-line pt-5">
              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-line bg-surface-soft px-5 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Change email
              </button>
            </div>
          </form>
        </section>

        {/* Password settings */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Password
            </h2>

            <p className="mt-1 text-sm text-muted">
              Update the password used to access your account.
            </p>
          </div>

          <form
            action={updatePassword}
            className="mt-7 space-y-5"
          >
            {/* Current password */}
            <div>
              <label
                htmlFor="currentPassword"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Current password
              </label>

              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                required
                autoComplete="current-password"
                placeholder="Enter your current password"
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* New password */}
            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                New password
              </label>

              <PasswordInput
                id="newPassword"
                name="newPassword"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Confirm new password
              </label>

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Enter your new password again"
                className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Change password */}
            <div className="flex justify-end border-t border-line pt-5">
              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-line bg-surface-soft px-5 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Change password
              </button>
            </div>
          </form>
        </section>

        {/* Appearance */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Appearance
              </h2>

              <p className="mt-1 text-sm text-muted">
                Choose how TripSync looks for your account.
              </p>
            </div>

            {/* Theme */}
            <ThemeToggle
              userId={userId}
              initialTheme={themePreference}
            />
          </div>
        </section>
      </div>
    </main>
  );
}