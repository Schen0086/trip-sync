"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import ThemeToggle from "@/components/theme-toggle";

type Theme = "light" | "dark";

type AppShellProps = {
  children: React.ReactNode;
  userId: string;
  displayName: string;
  initialTheme: Theme;
};

export default function AppShell({
  children,
  userId,
  displayName,
  initialTheme,
}: AppShellProps) {
  const pathname = usePathname();

  // Check active page
  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  // Set navigation style
  function navClass(href: string) {
    return isActive(href)
      ? "whitespace-nowrap rounded-xl bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700"
      : "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink";
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* App header */}
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-8">
              {/* Brand */}
              <Link
                href="/dashboard"
                className="text-lg font-semibold tracking-tight text-ink"
              >
                TripSync
              </Link>

              {/* Desktop navigation */}
              <nav className="hidden items-center gap-1 md:flex">
                <Link
                  href="/dashboard"
                  className={navClass("/dashboard")}
                >
                  Dashboard
                </Link>

                <Link
                  href="/groups"
                  className={navClass("/groups")}
                >
                  Groups
                </Link>

                <Link
                  href="/trips/new"
                  className="ml-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                >
                  Create trip
                </Link>
              </nav>
            </div>

            {/* Account actions */}
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted lg:block">
                {displayName}
              </span>

              <ThemeToggle
                userId={userId}
                initialTheme={initialTheme}
              />

              <form action={logout}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>

          {/* Mobile navigation */}
          <nav className="flex gap-1 overflow-x-auto border-t border-line py-3 md:hidden">
            <Link
              href="/dashboard"
              className={navClass("/dashboard")}
            >
              Dashboard
            </Link>

            <Link
              href="/groups"
              className={navClass("/groups")}
            >
              Groups
            </Link>

            <Link
              href="/trips/new"
              className="whitespace-nowrap rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast"
            >
              Create trip
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      {children}
    </div>
  );
}