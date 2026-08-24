import Link from "next/link";

import {
  formatTripDate,
  getTripLifecycle,
  getTripLifecycleLabel,
} from "@/lib/trip-utils";


type TripCardProps = {
  id: string;
  name: string;
  destination: string;

  startDate: string;
  endDate: string;

  tripType: string;
  status: string;

  groupName?:
    | string
    | null;

  participantCount: number;

  attentionCount?: number;

  assignedTaskCount?: number;

  plannedItemCount?: number;
};


function getDaysUntil(
  date: string
) {
  const todayText =
    new Date()
      .toISOString()
      .slice(0, 10);

  const today =
    new Date(
      `${todayText}T00:00:00Z`
    );

  const target =
    new Date(
      `${date}T00:00:00Z`
    );

  return Math.round(
    (
      target.getTime() -
      today.getTime()
    ) /
      (
        24 *
        60 *
        60 *
        1000
      )
  );
}


export default function TripCard({
  id,
  name,
  destination,
  startDate,
  endDate,
  tripType,
  status,
  groupName,
  participantCount,
  attentionCount = 0,
  assignedTaskCount = 0,
  plannedItemCount = 0,
}: TripCardProps) {
  const lifecycle =
    getTripLifecycle(
      status,
      startDate,
      endDate
    );

  const lifecycleLabel =
    getTripLifecycleLabel(
      lifecycle
    );

  const lifecycleClass =
    lifecycle ===
    "cancelled"
      ? "border border-danger-border bg-danger-surface text-danger-text"
      : lifecycle ===
        "ongoing"
      ? "bg-brand-50 text-brand-700"
      : "border border-line bg-surface-soft text-muted";

  const daysUntil =
    getDaysUntil(
      startDate
    );

  const showIntelligence =
    lifecycle ===
      "upcoming" ||
    lifecycle ===
      "ongoing";

  return (
    <Link
      href={`/trips/${id}`}
      className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
    >
      {/* Trip badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${lifecycleClass}`}
        >
          {
            lifecycleLabel
          }
        </span>

        <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium capitalize text-muted">
          {
            tripType
          }
        </span>

        {showIntelligence &&
          attentionCount >
            0 && (
            <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              {
                attentionCount
              }{" "}
              need you
            </span>
          )}
      </div>

      {/* Trip details */}
      <h3 className="mt-5 text-lg font-semibold text-ink">
        {name}
      </h3>

      <p className="mt-1 text-sm text-muted">
        {destination}
      </p>

      {groupName && (
        <p className="mt-2 text-xs text-subtle">
          {groupName}
        </p>
      )}

      {/* Timing */}
      {lifecycle ===
        "upcoming" &&
        daysUntil >=
          0 && (
          <p className="mt-4 text-sm font-medium text-brand-700">
            {daysUntil ===
            0
              ? "Starts today"
              : daysUntil ===
                1
              ? "1 day away"
              : `${daysUntil} days away`}
          </p>
        )}

      {lifecycle ===
        "ongoing" && (
        <p className="mt-4 text-sm font-medium text-brand-700">
          Happening now
        </p>
      )}

      {/* Trip information */}
      <div className="mt-4 space-y-1.5 text-sm text-muted">
        <p>
          {formatTripDate(
            startDate,
            {
              includeYear:
                false,
            }
          )}{" "}
          –{" "}
          {formatTripDate(
            endDate
          )}
        </p>

        <p>
          {
            participantCount
          }{" "}
          {participantCount ===
          1
            ? "traveller"
            : "travellers"}
        </p>
      </div>

      {/* Planning intelligence */}
      {showIntelligence && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs text-muted">
            {
              plannedItemCount
            }{" "}
            planned
          </span>

          {assignedTaskCount >
            0 && (
            <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              {
                assignedTaskCount
              }{" "}
              {assignedTaskCount ===
              1
                ? "task"
                : "tasks"}{" "}
              for you
            </span>
          )}
        </div>
      )}

      <p className="mt-6 text-sm font-medium text-brand-700">
        View trip →
      </p>
    </Link>
  );
}