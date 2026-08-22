"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref?: string;
};

export default function BackButton({
  fallbackHref = "/dashboard",
}: BackButtonProps) {
  const router = useRouter();

  // Return to previous page
  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="cursor-pointer text-sm font-medium text-muted transition hover:text-ink"
    >
      ← Back
    </button>
  );
}