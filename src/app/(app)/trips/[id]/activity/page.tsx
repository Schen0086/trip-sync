import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";

import {
  formatActivityDay,
  formatActivityTimestamp,
  getActivityCategoryLabel,
  type TripActivityEvent,
} from "@/lib/activity";

import {
  createClient,
} from "@/lib/supabase/server";

import Avatar from "@/components/avatar";

type ActivityPageProps = {
  params: Promise<{
    id: string;
  }>;
};


type ActivityGroup = {
  date: string;

  events:
    TripActivityEvent[];
};


export default async function ActivityPage({
  params,
}: ActivityPageProps) {
  const {
    id,
  } = await params;

  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    redirect("/login");
  }

  const userId =
    data.claims.sub;


  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();


  if (tripError) {
    console.error(
      "Failed to load activity trip:",
      tripError
    );
  }


  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  const tripId =
    trip.id;


  const {
    data: activityData,
    error: activityError,
  } = await supabase
    .from("trip_activity")
    .select(`
      id,
      trip_id,
      actor_user_id,
      category,
      event_type,
      entity_type,
      entity_id,
      action,
      subject,
      detail,
      href,
      created_at
    `)
    .eq(
      "trip_id",
      tripId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(100);


  if (activityError) {
    console.error(
      "Failed to load trip activity:",
      activityError
    );
  }


  const events =
    (activityData ??
      []) as TripActivityEvent[];


  // Load current names for activity actors.
  const actorIds = [
    ...new Set(
      events
        .map(
          (event) =>
            event.actor_user_id
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    ),
  ];


  const actorProfiles =
    new Map<
      string,
      {
        displayName: string;

        avatarUrl:
          | string
          | null;
      }
    >();


  if (
    actorIds.length >
    0
  ) {
    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        avatar_url
      `)
      .in(
        "id",
        actorIds
      );


    profiles?.forEach(
      (profile) => {
        actorProfiles.set(
          profile.id,
          {
            displayName:
              profile.display_name ??
              "Traveller",

            avatarUrl:
              profile.avatar_url ??
              null,
          }
        );
      }
    );
  }


  // Group events by calendar date.
  const groupMap =
    new Map<
      string,
      TripActivityEvent[]
    >();


  events.forEach(
    (event) => {
      const date =
        event.created_at.slice(
          0,
          10
        );

      const current =
        groupMap.get(
          date
        ) ?? [];

      current.push(
        event
      );

      groupMap.set(
        date,
        current
      );
    }
  );


  const groups:
    ActivityGroup[] = [
    ...groupMap.entries(),
  ].map(
    ([
      date,
      groupedEvents,
    ]) => ({
      date,
      events:
        groupedEvents,
    })
  );


  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <BackButton
          fallbackHref={`/trips/${tripId}`}
        />


        <header className="mt-8 border-b border-line pb-8">
          <div>
            <p className="text-sm font-semibold text-brand-700">
              {
                trip.name
              }
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
              Activity
            </h1>

            <p className="mt-2 max-w-2xl text-muted">
              Recent planning
              changes and
              collaborative
              activity across this
              trip.
            </p>
          </div>
        </header>


        {activityError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            Unable to load
            trip activity.
          </div>
        )}


        {events.length ===
        0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-12 text-center">
            <h2 className="font-semibold text-ink">
              No activity yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              New itinerary,
              voting, places,
              expenses, packing
              and task activity
              will appear here.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-8 text-sm text-muted">
              Showing the latest{" "}
              {
                events.length
              }{" "}
              {events.length ===
              1
                ? "event"
                : "events"}.
            </p>


            <div className="mt-5 space-y-4">
              {groups.map(
                (
                  group,
                  groupIndex
                ) => (
                  <details
                    key={
                      group.date
                    }
                    open={
                      groupIndex ===
                      0
                    }
                    className="group/day overflow-hidden rounded-2xl border border-line bg-surface"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                      <div>
                        <h2 className="font-semibold text-ink">
                          {formatActivityDay(
                            `${group.date}T00:00:00Z`
                          )}
                        </h2>

                        <p className="mt-1 text-sm text-muted">
                          {
                            group.events.length
                          }{" "}
                          {group.events.length ===
                          1
                            ? "event"
                            : "events"}
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
                        className="h-5 w-5 text-muted transition-transform group-open/day:rotate-180"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </summary>


                    <div className="divide-y divide-line border-t border-line">
                      {group.events.map(
                        (
                          event
                        ) => {
                          const actorProfile =
                            event.actor_user_id
                              ? actorProfiles.get(
                                  event.actor_user_id
                                )
                              : null;


                          const actorName =
                            event.actor_user_id
                              ? actorProfile
                                  ?.displayName ??
                                "Traveller"
                              : "TripSync";

                          const displayedActor =
                            event.actor_user_id ===
                            userId
                              ? `${actorName} (You)`
                              : actorName;


                          return (
                            <article
                              key={
                                event.id
                              }
                              className="p-5"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                                      {getActivityCategoryLabel(
                                        event.category
                                      )}
                                    </span>

                                    <time
                                      dateTime={
                                        event.created_at
                                      }
                                      className="text-xs text-subtle"
                                    >
                                      {formatActivityTimestamp(
                                        event.created_at
                                      )}
                                    </time>
                                  </div>


                                  <div className="mt-3 flex items-start gap-2">
                                    {event.actor_user_id && (
                                      <Avatar
                                        src={
                                          actorProfile
                                            ?.avatarUrl ??
                                          null
                                        }
                                        displayName={
                                          actorName
                                        }
                                        size="sm"
                                      />
                                    )}

                                    <p className="min-w-0 text-sm leading-6 text-ink">
                                      <span className="font-semibold">
                                        {
                                          displayedActor
                                        }
                                      </span>{" "}
                                      {
                                        event.action
                                      }{" "}
                                      <span className="font-semibold">
                                        {
                                          event.subject
                                        }
                                      </span>
                                      .
                                    </p>
                                  </div>


                                  {event.detail && (
                                    <p className="mt-1 text-sm text-muted">
                                      {
                                        event.detail
                                      }
                                    </p>
                                  )}
                                </div>


                                {event.href && (
                                  <a
                                    href={
                                      event.href
                                    }
                                    className="shrink-0 text-sm font-medium text-brand-700"
                                  >
                                    Open →
                                  </a>
                                )}
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  </details>
                )
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}