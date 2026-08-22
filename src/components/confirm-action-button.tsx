"use client";

type ConfirmActionButtonProps = {
  children: React.ReactNode;
  message: string;
  className?: string;
};

export default function ConfirmActionButton({
  children,
  message,
  className = "",
}: ConfirmActionButtonProps) {
  // Confirm dangerous action
  function handleClick(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}