"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import Avatar from "@/components/avatar";

import ConfirmActionButton from "@/components/confirm-action-button";

import {
  deleteNotification,
  deleteReadNotifications,
  markAllNotificationsRead,
  openNotification,
} from "@/app/(app)/notifications/actions";

import {
  formatActivityTimestamp,
  type NotificationRecord,
} from "@/lib/activity";


type NotificationMenuProps = {
  notifications:
    NotificationRecord[];

  unreadCount: number;
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


export default function NotificationMenu({
  notifications,
  unreadCount,
}: NotificationMenuProps) {
  const [
    open,
    setOpen,
  ] =
    useState(false);


  const menuRef =
    useRef<HTMLDivElement>(
      null
    );


  const pathname =
    usePathname();


  // Close the dropdown when navigation occurs.
  useEffect(() => {
    setOpen(
      false
    );
  }, [
    pathname,
  ]);


  // Close when clicking outside or pressing Escape.
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
        setOpen(
          false
        );
      }
    }


    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(
          false
        );
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


  const displayCount =
    unreadCount > 99
      ? "99+"
      : String(
          unreadCount
        );


  return (
    <div
      ref={
        menuRef
      }
      className="relative shrink-0"
    >
      {/* Notification bell */}
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={
          open
        }
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-ink transition hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

          <path d="M10 21h4" />
        </svg>


        {unreadCount >
          0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-brand-contrast">
            {
              displayCount
            }
          </span>
        )}
      </button>


      {/* Dropdown.
          On phones this is positioned relative to the
          viewport rather than the bell, guaranteeing that
          it stays inside the screen. */}
      {open && (
        <div className="fixed inset-x-2 top-[76px] z-50 flex max-h-[calc(100dvh-84px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:max-h-none md:w-[22rem]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="min-w-0">
              <h2 className="font-semibold text-ink">
                Notifications
              </h2>

              <p className="mt-0.5 text-xs text-muted">
                {unreadCount >
                0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>


            {unreadCount >
              0 && (
              <form
                action={
                  markAllNotificationsRead
                }
                className="shrink-0"
              >
                <button
                  type="submit"
                  className="cursor-pointer whitespace-nowrap text-xs font-medium text-brand-700"
                >
                  Mark all read
                </button>
              </form>
            )}
          </div>


          {/* Notifications */}
          {notifications.length ===
          0 ? (
            <div className="px-5 py-8 text-center sm:py-10">
              <p className="font-medium text-ink">
                No notifications
              </p>

              <p className="mt-1 text-sm text-muted">
                Updates involving you will appear here.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto md:max-h-[420px]">
              {notifications.map(
                (
                  notification
                ) => {
                  const unread =
                    !notification
                      .read_at;

                  const actor =
                    getNotificationActor(
                      notification
                    );

                  return (
                    <div
                      key={
                        notification.id
                      }
                      className={
                        unread
                          ? "flex items-start gap-1.5 border-b border-line bg-brand-50 p-2.5 last:border-b-0 sm:gap-2 sm:p-3"
                          : "flex items-start gap-1.5 border-b border-line p-2.5 last:border-b-0 sm:gap-2 sm:p-3"
                      }
                    >
                      {/* Open notification */}
                      <form
                        action={
                          openNotification
                        }
                        className="min-w-0 flex-1"
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
                          className="w-full cursor-pointer rounded-lg p-1 text-left transition hover:bg-surface-hover"
                        >
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            {/* Actor avatar */}
                            <div className="relative shrink-0">
                              <Avatar
                                src={
                                  actor.avatarUrl
                                }
                                displayName={
                                  actor.displayName
                                }
                                size="sm"
                              />

                              {unread && (
                                <span
                                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand-600"
                                  aria-label="Unread"
                                />
                              )}
                            </div>


                            {/* Notification content */}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-[13px] font-semibold leading-5 text-ink sm:text-sm">
                                {
                                  notification.title
                                }
                              </p>

                              <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted sm:mt-1 sm:text-sm sm:leading-5">
                                {
                                  notification.message
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-subtle sm:mt-1.5 sm:text-[11px]">
                                {formatActivityTimestamp(
                                  notification.created_at
                                )}
                              </p>
                            </div>
                          </div>
                        </button>
                      </form>


                      {/* Individual delete */}
                      <form
                        action={
                          deleteNotification
                        }
                        className="shrink-0"
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
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-subtle transition hover:bg-surface-hover hover:text-danger-text"
                        >
                          <span className="sr-only">
                            Delete notification
                          </span>

                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="h-4 w-4"
                          >
                            <path d="M3 6h18" />

                            <path d="M8 6V4h8v2" />

                            <path d="M19 6l-1 14H6L5 6" />

                            <path d="M10 11v5" />

                            <path d="M14 11v5" />
                          </svg>
                        </ConfirmActionButton>
                      </form>
                    </div>
                  );
                }
              )}
            </div>
          )}


          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface-soft px-3 py-2.5 sm:px-4 sm:py-3">
            <Link
              href="/notifications"
              className="text-sm font-medium text-brand-700"
            >
              View all
            </Link>


            <form
              action={
                deleteReadNotifications
              }
            >
              <ConfirmActionButton
                message="Delete all read notifications?"
                className="cursor-pointer text-xs font-medium text-muted transition hover:text-danger-text"
              >
                Delete read
              </ConfirmActionButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}