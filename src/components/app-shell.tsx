"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import MobileNavMenu from "@/components/mobile-nav-menu";
import NotificationMenu from "@/components/notification-menu";
import ProfileMenu from "@/components/profile-menu";

import {
  isNavigationItemActive,
  mainNavigation,
} from "@/lib/navigation";

import type {
  NotificationRecord,
} from "@/lib/activity";


type AppShellProps = {
  children:
    React.ReactNode;

  displayName: string;

  notifications:
    NotificationRecord[];

  unreadNotificationCount:
    number;
};


export default function AppShell({
  children,
  displayName,
  notifications,
  unreadNotificationCount,
}: AppShellProps) {
  const pathname =
    usePathname();


  return (
    <div className="min-h-screen bg-canvas">
      {/* App header */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-2 sm:px-6">
          <div className="flex h-[72px] flex-nowrap items-center gap-2 sm:gap-4">
            {/* Mobile menu */}
            <div className="md:hidden">
              <MobileNavMenu />
            </div>


            {/* Brand */}
            <Link
              href="/dashboard"
              className="shrink-0 text-base font-semibold tracking-tight text-ink sm:text-lg"
            >
              TripSync
            </Link>


            {/* Desktop navigation */}
            <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
              {mainNavigation.map(
                (item) => {
                  const active =
                    isNavigationItemActive(
                      pathname,
                      item
                    );

                  if (
                    item.primary
                  ) {
                    return (
                      <Link
                        key={
                          item.href
                        }
                        href={
                          item.href
                        }
                        className="ml-2 whitespace-nowrap rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                      >
                        {
                          item.label
                        }
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={
                        item.href
                      }
                      href={
                        item.href
                      }
                      className={
                        active
                          ? "whitespace-nowrap rounded-xl bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700"
                          : "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
                      }
                    >
                      {
                        item.label
                      }
                    </Link>
                  );
                }
              )}
            </nav>


            {/* Mobile Dashboard shortcut */}
            <Link
              href="/dashboard"
              className={
                pathname ===
                "/dashboard"
                  ? "shrink-0 whitespace-nowrap rounded-xl bg-brand-50 px-2.5 py-2 text-sm font-medium text-brand-700 max-[360px]:hidden md:hidden"
                  : "shrink-0 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink max-[360px]:hidden md:hidden"
              }
            >
              Dashboard
            </Link>


            {/* Mobile spacer */}
            <div className="min-w-0 flex-1 md:hidden" />


            {/* Notifications */}
            <NotificationMenu
              notifications={
                notifications
              }
              unreadCount={
                unreadNotificationCount
              }
            />


            {/* Profile menu */}
            <ProfileMenu
              displayName={
                displayName
              }
            />
          </div>
        </div>
      </header>


      {children}
    </div>
  );
}