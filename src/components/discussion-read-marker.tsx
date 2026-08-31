"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";


type DiscussionReadMarkerProps = {
  tripId: string;

  itemId: string;

  initialUnreadCount: number;
};


export default function DiscussionReadMarker({
  tripId,
  itemId,
  initialUnreadCount,
}: DiscussionReadMarkerProps) {
  const markerRef =
    useRef<HTMLSpanElement>(
      null
    );

  const markingRef =
    useRef(false);


  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(
      initialUnreadCount
    );


  useEffect(() => {
    setUnreadCount(
      initialUnreadCount
    );
  }, [
    initialUnreadCount,
  ]);


  const markRead =
    useCallback(
      async () => {
        if (
          markingRef.current
        ) {
          return;
        }


        markingRef.current =
          true;


        // Update the badge immediately.
        setUnreadCount(
          0
        );


        const supabase =
          createClient();


        const {
          error,
        } =
          await supabase.rpc(
            "mark_suggestion_discussion_read",
            {
              target_trip_id:
                tripId,

              target_item_id:
                itemId,
            }
          );


        if (
          error
        ) {
          console.error(
            "Failed to mark discussion as read:",
            error
          );


          // Restore the server-provided value
          // if the database update failed.
          setUnreadCount(
            initialUnreadCount
          );
        }


        markingRef.current =
          false;
      },
      [
        tripId,
        itemId,
        initialUnreadCount,
      ]
    );


  useEffect(() => {
    const marker =
      markerRef.current;


    if (!marker) {
      return;
    }


    const matchedDetails =
      marker.closest(
        "details"
      );


    // Lock the element to a definite
    // HTMLDetailsElement before any nested
    // callbacks capture it.
    if (
      !(
        matchedDetails instanceof
        HTMLDetailsElement
      )
    ) {
      return;
    }


    const detailsElement:
      HTMLDetailsElement =
      matchedDetails;


    function openDeepLinkedDiscussion() {
      const params =
        new URLSearchParams(
          window.location.search
        );


      const requestedDiscussion =
        params.get(
          "discussion"
        );


      const hash =
        window.location.hash;


      let targetInsideDiscussion =
        false;


      if (
        hash.startsWith(
          "#comment-"
        )
      ) {
        const target =
          document.getElementById(
            hash.slice(1)
          );


        targetInsideDiscussion =
          Boolean(
            target &&
            detailsElement.contains(
              target
            )
          );
      }


      const shouldOpen =
        requestedDiscussion ===
          itemId ||
        hash ===
          `#discussion-${itemId}` ||
        targetInsideDiscussion;


      if (
        !shouldOpen
      ) {
        return;
      }


      detailsElement.open =
        true;


      void markRead();


      // Browser hash scrolling can run before
      // a collapsed <details> element opens,
      // so scroll again after expansion.
      window.requestAnimationFrame(
        () => {
          if (hash) {
            const target =
              document.getElementById(
                hash.slice(1)
              );


            if (
              target &&
              detailsElement.contains(
                target
              )
            ) {
              target.scrollIntoView({
                behavior:
                  "smooth",

                block:
                  "center",
              });

              return;
            }
          }


          detailsElement.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
        }
      );
    }


    function handleToggle() {
      if (
        detailsElement.open
      ) {
        void markRead();
      }
    }


    detailsElement.addEventListener(
      "toggle",
      handleToggle
    );


    // Open the correct discussion/comment
    // when arriving from a notification link.
    openDeepLinkedDiscussion();


    // If the discussion was already open,
    // immediately mark the current content read.
    if (
      detailsElement.open
    ) {
      void markRead();
    }


    return () => {
      detailsElement.removeEventListener(
        "toggle",
        handleToggle
      );
    };
  }, [
    itemId,
    markRead,
  ]);


  return (
    <span
      ref={
        markerRef
      }
    >
      {unreadCount >
        0 && (
        <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-brand-contrast">
          {
            unreadCount
          }{" "}
          new
        </span>
      )}
    </span>
  );
}