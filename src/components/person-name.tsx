import Avatar from "@/components/avatar";


type PersonNameProps = {
  userId: string;
  currentUserId: string;

  displayName: string;

  avatarUrl?:
    | string
    | null;

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
  avatarUrl = null,
  highlightCurrentUser = false,
  variant = "text",
  className = "",
}: PersonNameProps) {
  const isCurrentUser =
    userId ===
    currentUserId;


  const content = (
    <>
      {avatarUrl && (
        <Avatar
          src={
            avatarUrl
          }
          displayName={
            displayName
          }
          size="xs"
        />
      )}

      <span>
        {
          displayName
        }
      </span>
    </>
  );


  // Normal name
  if (
    !highlightCurrentUser ||
    !isCurrentUser
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
      >
        {
          content
        }
      </span>
    );
  }


  // Stronger assignment-style highlight
  if (
    variant ===
    "badge"
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-brand-500 bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-700 ${className}`}
      >
        {
          content
        }
      </span>
    );
  }


  // Lighter inline highlight
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold text-brand-700 ${className}`}
    >
      {
        content
      }
    </span>
  );
}