"use client";

import {
  useEffect,
  useState,
} from "react";


type AvatarSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl";


type AvatarProps = {
  src?:
    | string
    | null;

  displayName?: string;

  size?: AvatarSize;

  className?: string;
};


const sizeClasses: Record<
  AvatarSize,
  string
> = {
  xs:
    "h-5 w-5 text-[8px]",

  sm:
    "h-7 w-7 text-[10px]",

  md:
    "h-9 w-9 text-xs",

  lg:
    "h-14 w-14 text-base",

  xl:
    "h-24 w-24 text-2xl",
};


function getInitials(
  displayName: string
) {
  const parts =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "T";
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}


export default function Avatar({
  src = null,
  displayName = "Traveller",
  size = "md",
  className = "",
}: AvatarProps) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);


  useEffect(() => {
    setImageFailed(false);
  }, [
    src,
  ]);


  const showImage =
    Boolean(src) &&
    !imageFailed;


  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-soft font-semibold text-muted ${sizeClasses[size]} ${className}`}
      aria-label={`${displayName}'s profile picture`}
    >
      {showImage ? (
        // Supabase avatar URLs are dynamic,
        // so a normal img avoids remote-host
        // configuration in next.config.ts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={
            src ?? ""
          }
          alt=""
          className="h-full w-full object-cover"
          onError={() =>
            setImageFailed(
              true
            )
          }
        />
      ) : (
        <span
          aria-hidden="true"
          className="select-none leading-none"
        >
          {getInitials(
            displayName
          )}
        </span>
      )}
    </span>
  );
}