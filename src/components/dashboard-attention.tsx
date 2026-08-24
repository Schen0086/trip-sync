import Link from "next/link";


export type DashboardAttentionPriority =
  | "urgent"
  | "attention"
  | "info";


export type DashboardAttentionItem = {
  id: string;

  tripName: string;

  title: string;
  detail: string;

  href: string;

  category:
    | "Tasks"
    | "Packing"
    | "Voting"
    | "Expenses"
    | "Itinerary";

  priority:
    DashboardAttentionPriority;
};


type DashboardAttentionProps = {
  items:
    DashboardAttentionItem[];

  outstandingCount: number;

  assignedTaskCount: number;

  pendingVoteCount: number;

  packingCount: number;
};


function priorityClasses(
  priority:
    DashboardAttentionPriority
) {
  if (
    priority ===
    "urgent"
  ) {
    return "border-danger-border bg-danger-surface";
  }

  if (
    priority ===
    "attention"
  ) {
    return "border-brand-500 bg-brand-50";
  }

  return "border-line bg-surface-soft";
}


export default function DashboardAttention({
  items,
  outstandingCount,
  assignedTaskCount,
  pendingVoteCount,
  packingCount,
}: DashboardAttentionProps) {
  const defaultOpen =
    items.length <= 5;

  return (
    <section className="mt-10">
      <details
        open={
          defaultOpen
        }
        className="group overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">
                Needs your
                attention
              </h2>

              {outstandingCount >
                0 && (
                <span className="rounded-full border border-brand-500 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  {
                    outstandingCount
                  }{" "}
                  outstanding
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-muted">
              Responsibilities and
              planning items that
              currently involve you.
            </p>
          </div>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>

        <div className="border-t border-line p-5 sm:p-6">
          {/* Quick totals */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface-soft p-4">
              <p className="text-xs text-muted">
                Outstanding
              </p>

              <p className="mt-1 text-xl font-semibold text-ink">
                {
                  outstandingCount
                }
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-soft p-4">
              <p className="text-xs text-muted">
                Tasks for you
              </p>

              <p className="mt-1 text-xl font-semibold text-ink">
                {
                  assignedTaskCount
                }
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-soft p-4">
              <p className="text-xs text-muted">
                Votes waiting
              </p>

              <p className="mt-1 text-xl font-semibold text-ink">
                {
                  pendingVoteCount
                }
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-soft p-4">
              <p className="text-xs text-muted">
                Packing items
              </p>

              <p className="mt-1 text-xl font-semibold text-ink">
                {
                  packingCount
                }
              </p>
            </div>
          </div>

          {items.length ===
          0 ? (
            <div className="mt-5 rounded-xl border border-success-border bg-success-surface p-5">
              <p className="font-medium text-success-text">
                You&apos;re all
                caught up
              </p>

              <p className="mt-1 text-sm text-muted">
                There are no
                outstanding planning
                items that currently
                need your attention.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {items.map(
                (item) => (
                  <Link
                    key={
                      item.id
                    }
                    href={
                      item.href
                    }
                    className={`block rounded-xl border p-4 transition hover:bg-surface-hover ${priorityClasses(
                      item.priority
                    )}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                            {
                              item.tripName
                            }
                          </span>

                          <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-muted">
                            {
                              item.category
                            }
                          </span>

                          {item.priority ===
                            "urgent" && (
                            <span className="rounded-full border border-danger-border bg-danger-surface px-2 py-0.5 text-[11px] font-medium text-danger-text">
                              Urgent
                            </span>
                          )}
                        </div>

                        <p className="mt-2 font-medium text-ink">
                          {
                            item.title
                          }
                        </p>

                        <p className="mt-1 text-sm leading-6 text-muted">
                          {
                            item.detail
                          }
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-medium text-brand-700">
                        Open →
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}