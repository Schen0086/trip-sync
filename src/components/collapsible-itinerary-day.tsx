"use client";

import {
  useState,
  type ReactNode,
} from "react";

type CollapsibleItineraryDayProps = {
  dayNumber: number;
  dayLabel: string;
  itemCount: number;
  children: ReactNode;
};

export default function CollapsibleItineraryDay({
  dayNumber,
  dayLabel,
  itemCount,
  children,
}: CollapsibleItineraryDayProps) {
  const [open, setOpen] =
    useState(true);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* Day header */}
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-surface-hover sm:px-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Day {dayNumber}
          </p>

          <h3 className="mt-1 font-semibold text-ink">
            {dayLabel}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted">
            {itemCount}{" "}
            {itemCount === 1
              ? "item"
              : "items"}
          </span>

          {/* Collapse indicator */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`h-5 w-5 text-muted transition-transform ${
              open
                ? "rotate-180"
                : ""
            }`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Day itinerary */}
      {open && (
        <div className="border-t border-line p-4 sm:p-6">
          {children}
        </div>
      )}
    </section>
  );
}