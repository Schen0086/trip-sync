"use client";

import { useState } from "react";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export default function PasswordInput({
  className = "",
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] =
    useState(false);

  return (
    <div className="relative">
      {/* Password input */}
      <input
        {...props}
        type={showPassword ? "text" : "password"}
        className={`${className} pr-12`}
      />

      {/* Show password */}
      <button
        type="button"
        onClick={() =>
          setShowPassword((current) => !current)
        }
        aria-label={
          showPassword
            ? "Hide password"
            : "Show password"
        }
        aria-pressed={showPassword}
        className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-md p-1 text-muted transition hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {showPassword ? (
          /* Eye off icon */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.9 4.2A10.7 10.7 0 0112 4c5 0 8.5 4 9.5 6.2a4 4 0 010 3.6 10.8 10.8 0 01-2 2.8" />
            <path d="M6.2 6.2A12 12 0 002.5 10.2a4 4 0 000 3.6C3.5 16 7 20 12 20a10.6 10.6 0 004.1-.8" />
          </svg>
        ) : (
          /* Eye icon */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}