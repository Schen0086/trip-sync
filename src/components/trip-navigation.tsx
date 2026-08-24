"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";


type TripNavigationProps = {
  tripId: string;
  tripName: string;
  tripType: string;
};


type TripNavigationItem = {
  key: string;
  label: string;
  href: string;
};


export default function TripNavigation({
  tripId,
  tripName,
  tripType,
}: TripNavigationProps) {
  const pathname =
    usePathname();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const basePath =
    `/trips/${tripId}`;

  const items:
    TripNavigationItem[] = [
    {
      key: "overview",
      label: "Overview",
      href: basePath,
    },

    {
      key: "itinerary",
      label: "Itinerary",
      href:
        `${basePath}/itinerary`,
    },

    {
      key: "places",
      label: "Places",
      href:
        `${basePath}/places`,
    },

    {
      key: "map",
      label: "Map",
      href:
        `${basePath}/map`,
    },

    ...(tripType ===
    "group"
      ? [
          {
            key: "voting",
            label: "Voting",
            href:
              `${basePath}/voting`,
          },
        ]
      : []),

    {
      key: "tasks",
      label: "Tasks",
      href:
        `${basePath}/tasks`,
    },

    {
      key: "expenses",
      label: "Expenses",
      href:
        `${basePath}/expenses`,
    },

    {
      key: "packing",
      label: "Packing",
      href:
        `${basePath}/packing`,
    },
  ];


  function getActiveKey() {
    if (
      pathname.startsWith(
        `${basePath}/itinerary`
      )
    ) {
      return "itinerary";
    }

    if (
      pathname.startsWith(
        `${basePath}/places`
      )
    ) {
      return "places";
    }

    if (
      pathname.startsWith(
        `${basePath}/map`
      )
    ) {
      return "map";
    }

    if (
      pathname.startsWith(
        `${basePath}/voting`
      )
    ) {
      return "voting";
    }

    if (
      pathname.startsWith(
        `${basePath}/tasks`
      )
    ) {
      return "tasks";
    }

    if (
      pathname.startsWith(
        `${basePath}/expenses`
      )
    ) {
      return "expenses";
    }

    if (
      pathname.startsWith(
        `${basePath}/packing`
      )
    ) {
      return "packing";
    }

    return "overview";
  }


  const activeKey =
    getActiveKey();

  const activeItem =
    items.find(
      (item) =>
        item.key ===
        activeKey
    ) ?? items[0];


  // Close mobile menu after navigation
  useEffect(() => {
    setMobileOpen(
      false
    );
  }, [
    pathname,
  ]);


  return (
    <nav aria-label="Trip navigation">
      {/* Desktop navigation */}
      <div className="hidden items-center gap-3 md:flex">
        <div className="min-w-0 shrink pr-3">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-subtle">
            Trip
          </p>

          <p className="max-w-40 truncate text-sm font-semibold text-ink lg:max-w-56">
            {tripName}
          </p>
        </div>

        <div className="h-8 w-px shrink-0 bg-line" />

        <div className="flex min-w-0 flex-1 items-center gap-1">
          {items.map(
            (item) => {
              const active =
                item.key ===
                activeKey;

              return (
                <Link
                  key={
                    item.key
                  }
                  href={
                    item.href
                  }
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  className={
                    active
                      ? "whitespace-nowrap rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
                      : "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
                  }
                >
                  {
                    item.label
                  }
                </Link>
              );
            }
          )}
        </div>
      </div>

      {/* Mobile collapsible navigation */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (current) =>
                !current
            )
          }
          aria-expanded={
            mobileOpen
          }
          className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 text-left transition hover:bg-surface-hover"
        >
          <div className="min-w-0">
            <p className="truncate text-xs text-subtle">
              {tripName}
            </p>

            <p className="mt-0.5 font-medium text-ink">
              {
                activeItem.label
              }
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-medium text-muted">
              Sections
            </span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`h-5 w-5 text-muted transition-transform ${
                mobileOpen
                  ? "rotate-180"
                  : ""
              }`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </button>

        {mobileOpen && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-2 shadow-lg">
            {items.map(
              (item) => {
                const active =
                  item.key ===
                  activeKey;

                return (
                  <Link
                    key={
                      item.key
                    }
                    href={
                      item.href
                    }
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                    className={
                      active
                        ? "rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700"
                        : "rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
                    }
                  >
                    {
                      item.label
                    }
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </nav>
  );
}