import {
  redirect,
} from "next/navigation";

import Avatar from "@/components/avatar";
import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";

import {
  deleteNotification,
  deleteReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  openNotification,
} from "./actions";

import {
  formatActivityTimestamp,
  normalizeActivityActorProfile,
  type NotificationRecord,
} from "@/lib/activity";

import {
  createClient,
} from "@/lib/supabase/server";


type NotificationCardProps = {
  notification:
    NotificationRecord;
};


function getNotificationActor(
  notification:
    NotificationRecord
) {
  if (
    !notification.actor_user_id
  ) {
    return {
      displayName:
        "TripSync",

      avatarUrl:
        null,
    };
  }


  return {
    displayName:
      notification
        .actor_profile
        ?.display_name ??
      "Traveller",

    avatarUrl:
      notification
        .actor_profile
        ?.avatar_url ??
      null,
  };
}


function NotificationCard({
  notification,
}: NotificationCardProps) {
  const unread =
    !notification.read_at;


  const actor =
    getNotificationActor(
      notification
    );


  return (
    <article
      className={
        unread
          ? "rounded-2xl border border-brand-500 bg-brand-50 p-5"
          : "rounded-2xl border border-line bg-surface p-5"
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Notification content */}
        <div className="flex min-w-0 items-start gap-4">
          {/* Actor avatar */}
          <div className="relative shrink-0">
            <Avatar
              src={
                actor.avatarUrl
              }
              displayName={
                actor.displayName
              }
              size="lg"
            />

            {unread && (
              <span
                className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-brand-600"
                aria-label="Unread"
              />
            )}
          </div>


          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {unread && (
                <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-brand-contrast">
                  Unread
                </span>
              )}

              <time
                dateTime={
                  notification.created_at
                }
                className="text-xs text-subtle"
              >
                {formatActivityTimestamp(
                  notification.created_at
                )}
              </time>
            </div>


            <h3 className="mt-3 font-semibold text-ink">
              {
                notification.title
              }
            </h3>


            <p className="mt-1 text-sm leading-6 text-muted">
              {
                notification.message
              }
            </p>
          </div>
        </div>


        {/* Actions */}
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <form
            action={
              openNotification
            }
          >
            <input
              type="hidden"
              name="notificationId"
              value={
                notification.id
              }
            />

            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast"
            >
              Open
            </button>
          </form>


          {unread && (
            <form
              action={
                markNotificationRead
              }
            >
              <input
                type="hidden"
                name="notificationId"
                value={
                  notification.id
                }
              />

              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
              >
                Mark read
              </button>
            </form>
          )}


          {/* Read and unread notifications can
              both be deleted individually. */}
          <form
            action={
              deleteNotification
            }
          >
            <input
              type="hidden"
              name="notificationId"
              value={
                notification.id
              }
            />

            <ConfirmActionButton
              message="Delete this notification?"
              className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-3.5 py-2 text-sm font-medium text-danger-text"
            >
              Delete
            </ConfirmActionButton>
          </form>
        </div>
      </div>
    </article>
  );
}


export default async function NotificationsPage() {
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


  // Load notifications together with the
  // current profile of the user who caused them.
  const {
    data:
      notificationData,
    error:
      notificationError,
  } = await supabase
    .from("notifications")
    .select(`
      id,
      user_id,
      trip_id,
      actor_user_id,
      actor_profile:profiles!notifications_actor_user_id_fkey (
        display_name,
        avatar_url
      ),
      type,
      title,
      message,
      href,
      read_at,
      created_at
    `)
    .eq(
      "user_id",
      userId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(200);


  if (
    notificationError
  ) {
    console.error(
      "Failed to load notifications:",
      notificationError
    );
  }


  const notifications:
    NotificationRecord[] =
      (
        notificationData ??
        []
      ).map(
        (notification) => ({
          ...notification,

          actor_profile:
            normalizeActivityActorProfile(
              notification.actor_profile
            ),
        })
      );


  const unread =
    notifications.filter(
      (notification) =>
        !notification.read_at
    );


  const read =
    notifications.filter(
      (notification) =>
        Boolean(
          notification.read_at
        )
    );


  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <BackButton
          fallbackHref="/dashboard"
        />


        {/* Heading */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">
                Notifications
              </h1>

              <p className="mt-2 max-w-2xl text-muted">
                Updates from your
                trips that involve
                you directly.
              </p>
            </div>


            <div className="flex flex-wrap gap-3">
              {unread.length >
                0 && (
                <form
                  action={
                    markAllNotificationsRead
                  }
                >
                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
                  >
                    Mark all read
                  </button>
                </form>
              )}


              {read.length >
                0 && (
                <form
                  action={
                    deleteReadNotifications
                  }
                >
                  <ConfirmActionButton
                    message="Delete all read notifications?"
                    className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-4 py-2.5 text-sm font-medium text-danger-text"
                  >
                    Delete all read
                  </ConfirmActionButton>
                </form>
              )}
            </div>
          </div>
        </header>


        {/* Summary */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Total
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                notifications.length
              }
            </p>
          </div>


          <div
            className={
              unread.length >
              0
                ? "rounded-2xl border border-brand-500 bg-brand-50 p-5"
                : "rounded-2xl border border-line bg-surface p-5"
            }
          >
            <p className="text-sm text-muted">
              Unread
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                unread.length
              }
            </p>
          </div>


          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Read
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {
                read.length
              }
            </p>
          </div>
        </section>


        {/* Load error */}
        {notificationError && (
          <div className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
            Unable to load
            notifications.
          </div>
        )}


        {/* Notification history */}
        {notifications.length ===
        0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-12 text-center">
            <h2 className="font-semibold text-ink">
              No notifications
            </h2>

            <p className="mt-2 text-sm text-muted">
              Updates involving
              you will appear here
              as you plan trips
              with other people.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {/* Unread remains expanded */}
            {unread.length >
              0 && (
              <details
                open
                className="group/unread overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">
                      Unread
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      {
                        unread.length
                      }{" "}
                      new{" "}
                      {unread.length ===
                      1
                        ? "notification"
                        : "notifications"}
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
                    className="h-5 w-5 text-muted transition-transform group-open/unread:rotate-180"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>


                <div className="space-y-3 border-t border-line p-4 sm:p-5">
                  {unread.map(
                    (
                      notification
                    ) => (
                      <NotificationCard
                        key={
                          notification.id
                        }
                        notification={
                          notification
                        }
                      />
                    )
                  )}
                </div>
              </details>
            )}


            {/* Read history starts collapsed */}
            {read.length >
              0 && (
              <details className="group/read overflow-hidden rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">
                      Read
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      {
                        read.length
                      }{" "}
                      previous{" "}
                      {read.length ===
                      1
                        ? "notification"
                        : "notifications"}
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
                    className="h-5 w-5 text-muted transition-transform group-open/read:rotate-180"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>


                <div className="space-y-3 border-t border-line p-4 sm:p-5">
                  {read.map(
                    (
                      notification
                    ) => (
                      <NotificationCard
                        key={
                          notification.id
                        }
                        notification={
                          notification
                        }
                      />
                    )
                  )}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </main>
  );
}