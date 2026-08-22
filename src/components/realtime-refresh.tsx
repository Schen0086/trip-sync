"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RealtimeRefreshProps = {
  userId: string;
};

export default function RealtimeRefresh({
  userId,
}: RealtimeRefreshProps) {
  const router = useRouter();

  const [supabase] = useState(
    () => createClient()
  );

  const refreshTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  useEffect(() => {
    // Avoid refreshing several times when one action
    // changes multiple related database rows.
    function scheduleRefresh() {
      if (refreshTimer.current) {
        clearTimeout(
          refreshTimer.current
        );
      }

      refreshTimer.current =
        setTimeout(() => {
          router.refresh();
        }, 200);
    }

    // Listen for changes on every public table
    // enabled in the supabase_realtime publication.
    const channel = supabase
      .channel(
        `trip-sync-live-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe((status) => {
        if (
          status === "CHANNEL_ERROR"
        ) {
          console.error(
            "TripSync Realtime channel error"
          );
        }
      });

    return () => {
      if (refreshTimer.current) {
        clearTimeout(
          refreshTimer.current
        );
      }

      supabase.removeChannel(
        channel
      );
    };
  }, [
    router,
    supabase,
    userId,
  ]);

  return null;
}