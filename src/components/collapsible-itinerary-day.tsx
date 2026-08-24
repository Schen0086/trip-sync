"use client";

import type {
  ReactNode,
} from "react";

import {
  ItineraryDayWeather,
} from "@/components/trip-weather";

type CollapsibleItineraryDayProps = {
  dayNumber: number;
  dayLabel: string;
  date: string;
  itemCount: number;

  open: boolean;

  onToggle: () => void;

  hasConflict?: boolean;

  children: ReactNode;
};

export default function CollapsibleItineraryDay({
  dayNumber,
  dayLabel,
  date,
  itemCount,
  open,
  onToggle,
  hasConflict = false,
  children,
}: CollapsibleItineraryDayProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-surface ${
        hasConflict
          ? "border-danger-border"
          : "border-line"
      }`}
    >
      {/* Day header */}
      <button
        type="button"
        onClick={
          onToggle
        }
        aria-expanded={
          open
        }
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-surface-hover sm:px-6"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Day{" "}
              {dayNumber}
            </p>

            {hasConflict && (
              <span className="rounded-full border border-danger-border bg-danger-surface px-2 py-0.5 text-[11px] font-medium text-danger-text">
                Schedule
                conflict
              </span>
            )}
          </div>

          <h3 className="mt-1 font-semibold text-ink">
            {dayLabel}
          </h3>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {/* Daily weather */}
          <ItineraryDayWeather
            date={date}
          />

          {/* Item count */}
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