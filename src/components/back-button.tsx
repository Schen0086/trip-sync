"use client";

import {
  useRouter,
} from "next/navigation";


type BackButtonProps = {
  fallbackHref?: string;
};


export default function BackButton({
  fallbackHref = "/dashboard",
}: BackButtonProps) {
  const router =
    useRouter();


  function handleBack() {
    const referrer =
      document.referrer;


    // Only use browser history when the
    // previous document belongs to TripSync.
    if (
      referrer &&
      window.history.length >
        1
    ) {
      try {
        const referrerUrl =
          new URL(
            referrer
          );


        if (
          referrerUrl.origin ===
          window.location.origin
        ) {
          router.back();

          return;
        }
      } catch {
        // Fall through to the safe route.
      }
    }


    router.push(
      fallbackHref
    );
  }


  return (
    <button
      type="button"
      onClick={
        handleBack
      }
      className="cursor-pointer rounded-md text-sm font-medium text-muted transition hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-canvas"
    >
      ← Back
    </button>
  );
}