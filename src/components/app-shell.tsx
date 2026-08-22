"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileMenu from "@/components/profile-menu";

type Theme = "light" | "dark";

type AppShellProps = {
  children: React.ReactNode;
  userId: string;
  displayName: string;
  initialTheme: Theme;
};

export default function AppShell({
  children,
  displayName,
}: AppShellProps) {
  const pathname = usePathname();

  // Check active page
  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  // Navigation style
  function navClass(href: string) {
    return isActive(href)
      ? "whitespace-nowrap rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
      : "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink";
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* App header */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          {/* Single navbar row */}
          <div className="flex h-[72px] flex-nowrap items-center gap-2 sm:gap-5">
            {/* Brand */}
            <Link
              href="/dashboard"
              className="shrink-0 text-base font-semibold tracking-tight text-ink sm:text-lg"
            >
              TripSync
            </Link>

            {/* Navigation */}
            <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap sm:gap-1">
              <Link
                href="/dashboard"
                className={navClass(
                  "/dashboard"
                )}
              >
                Dashboard
              </Link>

              <Link
                href="/groups"
                className={navClass(
                  "/groups"
                )}
              >
                Groups
              </Link>

              <Link
                href="/trips/new"
                className="whitespace-nowrap rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Create trip
              </Link>
            </nav>

            {/* Profile menu */}
            <ProfileMenu
              displayName={displayName}
            />
          </div>
        </div>
      </header>

      {/* Page content */}
      {children}
    </div>
  );
}