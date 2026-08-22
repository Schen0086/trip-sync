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
  groupName?: string | null;
  participantCount: number;
};

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
}: TripCardProps) {
  const lifecycle = getTripLifecycle(
    status,
    startDate,
    endDate
  );

  const lifecycleLabel =
    getTripLifecycleLabel(lifecycle);

  // Set status style
  const lifecycleClass =
    lifecycle === "cancelled"
      ? "border border-danger-border bg-danger-surface text-danger-text"
      : lifecycle === "ongoing"
        ? "bg-brand-50 text-brand-700"
        : "border border-line bg-surface-soft text-muted";

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
          {lifecycleLabel}
        </span>

        <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium capitalize text-muted">
          {tripType}
        </span>
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

      {/* Trip information */}
      <div className="mt-5 space-y-1.5 text-sm text-muted">
        <p>
          {formatTripDate(startDate, {
            includeYear: false,
          })}{" "}
          – {formatTripDate(endDate)}
        </p>

        <p>
          {participantCount}{" "}
          {participantCount === 1
            ? "traveller"
            : "travellers"}
        </p>
      </div>

      {/* Trip action */}
      <p className="mt-6 text-sm font-medium text-brand-700">
        View trip →
      </p>
    </Link>
  );
}