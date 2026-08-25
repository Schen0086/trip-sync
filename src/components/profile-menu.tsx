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

import {
  logout,
} from "@/app/login/actions";

import Avatar from "@/components/avatar";


type ProfileMenuProps = {
  displayName: string;

  avatarUrl:
    | string
    | null;
};


export default function ProfileMenu({
  displayName,
  avatarUrl,
}: ProfileMenuProps) {
  const [
    open,
    setOpen,
  ] = useState(false);


  const menuRef =
    useRef<HTMLDivElement>(
      null
    );


  const pathname =
    usePathname();


  // Close when page changes
  useEffect(() => {
    setOpen(false);
  }, [
    pathname,
  ]);


  // Close when clicking elsewhere
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
      if (
        event.key ===
        "Escape"
      ) {
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
      ref={
        menuRef
      }
      className="relative shrink-0"
    >
      {/* Profile button */}
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        aria-label="Open profile menu"
        aria-expanded={
          open
        }
        className="flex min-w-14 cursor-pointer flex-col items-center justify-center rounded-xl px-2 py-1.5 text-ink transition hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
      >
        <Avatar
          src={
            avatarUrl
          }
          displayName={
            displayName
          }
          size="md"
        />

        {/* Display name */}
        <span className="mt-1 max-w-20 truncate text-[11px] font-medium leading-none text-muted">
          {
            displayName
          }
        </span>
      </button>


      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {/* Current profile */}
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar
              src={
                avatarUrl
              }
              displayName={
                displayName
              }
              size="md"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {
                  displayName
                }
              </p>

              <p className="text-xs text-subtle">
                Your profile
              </p>
            </div>
          </div>


          <div className="my-1 border-t border-line" />


          {/* Settings */}
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="3"
              />

              <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21h-4v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 00.3-1.9A1.7 1.7 0 003 14H3v-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 001.9.3A1.7 1.7 0 0010 3V3h4v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1h.1v4H21a1.7 1.7 0 00-1.6 1z" />
            </svg>

            Settings
          </Link>


          <div className="my-1 border-t border-line" />


          {/* Log out */}
          <form
            action={
              logout
            }
          >
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-surface-hover"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-muted"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M15 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />
              </svg>

              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}