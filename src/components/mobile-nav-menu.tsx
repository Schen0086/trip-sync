"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  isNavigationItemActive,
  mainNavigation,
} from "@/lib/navigation";

export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

  const pathname = usePathname();

  // Close after navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close menu when clicking elsewhere
  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
    >
      {/* Menu button */}
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-ink transition hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
      >
        {/* Hamburger icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {/* Navigation dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface p-2 shadow-lg">
          {/* Menu heading */}
          <div className="px-3 pb-2 pt-1">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Navigation
            </p>
          </div>

          {/* Navigation items */}
          <nav className="space-y-1">
            {mainNavigation.map((item) => {
              const active =
                isNavigationItemActive(
                  pathname,
                  item
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.primary
                      ? "flex w-full items-center justify-between rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                      : active
                        ? "flex w-full items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700"
                        : "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                  }
                >
                  <span>{item.label}</span>

                  {/* Active indicator */}
                  {active && !item.primary && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-brand-600"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}