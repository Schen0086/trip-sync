type PersonNameProps = {
  userId: string;
  currentUserId: string;
  displayName: string;

  highlightCurrentUser?: boolean;

  variant?:
    | "text"
    | "badge";

  className?: string;
};

export default function PersonName({
  userId,
  currentUserId,
  displayName,
  highlightCurrentUser = false,
  variant = "text",
  className = "",
}: PersonNameProps) {
  const isCurrentUser =
    userId === currentUserId;

  // Normal name
  if (
    !highlightCurrentUser ||
    !isCurrentUser
  ) {
    return (
      <span className={className}>
        {displayName}
      </span>
    );
  }

  // Stronger assignment-style highlight
  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-brand-500 bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-700 ${className}`}
      >
        {displayName}
      </span>
    );
  }

  // Lighter inline highlight
  return (
    <span
      className={`font-semibold text-brand-700 ${className}`}
    >
      {displayName}
    </span>
  );
}