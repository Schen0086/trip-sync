"use client";

import {
  useEffect,
  useState,
} from "react";

type GroupAvatarSize =
  | "sm"
  | "md"
  | "lg"
  | "xl";

type GroupAvatarProps = {
  src?: string | null;
  groupName?: string;
  size?: GroupAvatarSize;
  className?: string;
};

const sizeClasses: Record<
  GroupAvatarSize,
  string
> = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

function getInitials(
  groupName: string
) {
  const parts = groupName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "G";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

export default function GroupAvatar({
  src = null,
  groupName = "Group",
  size = "md",
  className = "",
}: GroupAvatarProps) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showImage =
    Boolean(src) &&
    !imageFailed;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-soft font-semibold text-muted ${sizeClasses[size]} ${className}`}
      aria-label={`${groupName} group picture`}
    >
      {showImage ? (
        // Signed Supabase Storage URLs are dynamic,
        // so a normal img avoids remote-host config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? ""}
          alt=""
          className="h-full w-full object-cover"
          onError={() =>
            setImageFailed(true)
          }
        />
      ) : (
        <span
          aria-hidden="true"
          className="select-none leading-none"
        >
          {getInitials(groupName)}
        </span>
      )}
    </span>
  );
}