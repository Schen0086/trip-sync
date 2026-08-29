"use client";

import {
  useEffect,
} from "react";

type TripMapDeepLinkProps = {
  focusPointId:
    | string
    | null;

  day:
    | string
    | null;
};

function setSelectValue(
  select:
    HTMLSelectElement,
  value: string
) {
  const descriptor =
    Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value"
    );

  if (
    descriptor?.set
  ) {
    descriptor.set.call(
      select,
      value
    );
  } else {
    select.value =
      value;
  }

  select.dispatchEvent(
    new Event(
      "change",
      {
        bubbles: true,
      }
    )
  );
}

function getMapFiltersToggle() {
  const buttons =
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        "button"
      )
    );

  return (
    buttons.find(
      (button) =>
        button.textContent
          ?.trim()
          .startsWith(
            "Map filters"
          )
    ) ?? null
  );
}

export default function TripMapDeepLink({
  focusPointId,
  day,
}: TripMapDeepLinkProps) {
  useEffect(() => {
    if (
      !focusPointId &&
      !day
    ) {
      return;
    }

    let attempts = 0;
    let finished = false;

    let dayApplied =
      !day;

    function runAttempt() {
      attempts += 1;

      // Apply the requested day.
      // On mobile the filter
      // section starts collapsed,
      // so open it if needed.
      if (
        day &&
        !dayApplied
      ) {
        const daySelect =
          document.getElementById(
            "map-day-filter"
          ) as
            | HTMLSelectElement
            | null;

        if (
          daySelect
        ) {
          if (
            daySelect.value !==
            day
          ) {
            setSelectValue(
              daySelect,
              day
            );
          }

          dayApplied =
            true;
        } else {
          const toggle =
            getMapFiltersToggle();

          if (
            toggle &&
            toggle.getAttribute(
              "aria-expanded"
            ) === "false"
          ) {
            toggle.click();
          }
        }
      }

      // The map already exposes
      // this event for focusing a
      // particular marker.
      if (
        focusPointId &&
        dayApplied
      ) {
        window.dispatchEvent(
          new CustomEvent(
            "tripsync:focus-map",
            {
              detail: {
                pointId:
                  focusPointId,
              },
            }
          )
        );
      }

      const popupOpen =
        Boolean(
          document.querySelector(
            ".maplibregl-popup"
          )
        );

      if (
        dayApplied &&
        (
          !focusPointId ||
          popupOpen
        )
      ) {
        finished = true;
      }

      // Stop retrying after
      // roughly ten seconds if
      // the map cannot resolve
      // the requested marker.
      if (
        attempts >= 40
      ) {
        finished = true;
      }
    }

    runAttempt();

    if (finished) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          runAttempt();

          if (
            finished
          ) {
            window.clearInterval(
              interval
            );
          }
        },
        250
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    focusPointId,
    day,
  ]);

  return null;
}