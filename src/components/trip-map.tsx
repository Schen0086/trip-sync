"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";

import {
  formatTripDay,
} from "@/lib/itinerary";

import type {
  TripMapPoint,
  TripMapPointKind,
} from "@/lib/places";

type TripMapProps = {
  apiKey: string;
  points: TripMapPoint[];
  tripDates: string[];
  large?: boolean;
};

type MapLibreLibrary =
  typeof import("maplibre-gl");

// Marker label
function getMarkerLabel(
  kind: TripMapPointKind
) {
  switch (kind) {
    case "saved":
      return "P";

    case "activity":
      return "A";

    case "transport":
      return "T";

    case "accommodation":
      return "H";
  }
}

// Marker colour
function getMarkerBackground(
  kind: TripMapPointKind
) {
  if (kind === "saved") {
    return "var(--brand-500)";
  }

  return "var(--brand-600)";
}

// Geoapify MapLibre style
function getMapStyle(
  apiKey: string
) {
  const theme =
    document.documentElement
      .dataset.theme;

  const style =
    theme === "dark"
      ? "dark-matter"
      : "osm-bright";

  return (
    "https://maps.geoapify.com" +
    `/v1/styles/${style}/style.json` +
    `?apiKey=${encodeURIComponent(
      apiKey
    )}`
  );
}

export default function TripMap({
  apiKey,
  points,
  tripDates,
  large = false,
}: TripMapProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<MapLibreMap | null>(
      null
    );

  const libraryRef =
    useRef<MapLibreLibrary | null>(
      null
    );

  const markersRef =
    useRef<MapLibreMarker[]>([]);

  const [mapReady, setMapReady] =
    useState(false);

  const [mapError, setMapError] =
    useState<string | null>(
      null
    );

  const [filter, setFilter] =
    useState("all");

  // Filter visible map points
  const filteredPoints =
    useMemo(() => {
      if (filter === "all") {
        return points;
      }

      if (filter === "saved") {
        return points.filter(
          (point) =>
            point.kind ===
            "saved"
        );
      }

      return points.filter(
        (point) => {
          if (
            point.kind ===
              "saved" ||
            !point.startDate
          ) {
            return false;
          }

          const endDate =
            point.endDate ??
            point.startDate;

          return (
            filter >=
              point.startDate &&
            filter <= endDate
          );
        }
      );
    }, [
      filter,
      points,
    ]);

  // Create MapLibre map
  useEffect(() => {
    if (
      !apiKey ||
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    let cancelled = false;

    let themeObserver:
      | MutationObserver
      | null = null;

    async function createMap() {
      try {
        setMapError(null);
        setMapReady(false);

        const maplibre =
          await import(
            "maplibre-gl"
          );

        if (
          cancelled ||
          !containerRef.current
        ) {
          return;
        }

        /*
         * MapLibre v6 uses a separate ESM worker.
         * Next/Turbopack may otherwise resolve the worker
         * to a Next.js chunk URL that returns HTML.
         */
        maplibre.setWorkerUrl(
          "/maplibre/maplibre-gl-worker.mjs"
        );

        libraryRef.current =
          maplibre;

        const firstPoint =
          points[0];

        const map =
          new maplibre.Map({
            container:
              containerRef.current,

            style:
              getMapStyle(
                apiKey
              ),

            center:
              firstPoint
                ? [
                    firstPoint.longitude,
                    firstPoint.latitude,
                  ]
                : [0, 20],

            zoom:
              firstPoint
                ? 12
                : 1.5,

            attributionControl: {
              compact: true,
            },
          });

        map.addControl(
          new maplibre.NavigationControl({
            showCompass: false,
          }),
          "top-right"
        );

        // Map fully loaded
        map.on(
          "load",
          () => {
            setMapReady(true);
            setMapError(null);

            // Make sure MapLibre reads the final size
            window.requestAnimationFrame(
              () => {
                map.resize();
              }
            );
          }
        );

        // Surface real map errors
        map.on(
          "error",
          (event) => {
            console.error(
              "MapLibre error:",
              event.error
            );

            const message =
              event.error?.message ??
              "Unable to load map";

            setMapError(
              message
            );
          }
        );

        mapRef.current =
          map;

        // Change map style with TripSync theme
        themeObserver =
          new MutationObserver(
            () => {
              if (
                !mapRef.current
              ) {
                return;
              }

              setMapReady(false);
              setMapError(null);

              mapRef.current.setStyle(
                getMapStyle(
                  apiKey
                )
              );
            }
          );

        themeObserver.observe(
          document.documentElement,
          {
            attributes: true,
            attributeFilter: [
              "data-theme",
            ],
          }
        );
      } catch (error) {
        console.error(
          "Failed to initialise map:",
          error
        );

        setMapError(
          error instanceof Error
            ? error.message
            : "Unable to initialise map"
        );
      }
    }

    createMap();

    return () => {
      cancelled = true;

      themeObserver?.disconnect();

      markersRef.current.forEach(
        (marker) =>
          marker.remove()
      );

      markersRef.current = [];

      mapRef.current?.remove();
      mapRef.current = null;

      libraryRef.current =
        null;
    };
  }, [
    apiKey,
    points,
  ]);

  // Draw markers
  useEffect(() => {
    const map =
      mapRef.current;

    const maplibre =
      libraryRef.current;

    if (
      !map ||
      !maplibre ||
      !mapReady
    ) {
      return;
    }

    // Remove old markers
    markersRef.current.forEach(
      (marker) =>
        marker.remove()
    );

    markersRef.current = [];

    if (
      filteredPoints.length ===
      0
    ) {
      return;
    }

    const bounds =
      new maplibre.LngLatBounds();

    filteredPoints.forEach(
      (point) => {
        // Marker element
        const element =
          document.createElement(
            "button"
          );

        element.type =
          "button";

        element.title =
          point.name;

        element.textContent =
          getMarkerLabel(
            point.kind
          );

        element.style.width =
          "30px";

        element.style.height =
          "30px";

        element.style.borderRadius =
          "9999px";

        element.style.border =
          "2px solid var(--surface)";

        element.style.background =
          getMarkerBackground(
            point.kind
          );

        element.style.color =
          "var(--brand-contrast)";

        element.style.fontSize =
          "12px";

        element.style.fontWeight =
          "700";

        element.style.cursor =
          "pointer";

        element.style.boxShadow =
          "0 2px 8px rgba(0, 0, 0, 0.25)";

        // Popup content
        const popupContent =
          document.createElement(
            "div"
          );

        popupContent.style.minWidth =
          "180px";

        popupContent.style.color =
          "#17201b";

        const title =
          document.createElement(
            "strong"
          );

        title.textContent =
          point.name;

        popupContent.appendChild(
          title
        );

        if (point.subtitle) {
          const subtitle =
            document.createElement(
              "div"
            );

          subtitle.textContent =
            point.subtitle;

          subtitle.style.marginTop =
            "4px";

          subtitle.style.fontSize =
            "12px";

          popupContent.appendChild(
            subtitle
          );
        }

        const link =
          document.createElement(
            "a"
          );

        link.href =
          point.href;

        link.textContent =
          "View details";

        link.style.display =
          "inline-block";

        link.style.marginTop =
          "8px";

        link.style.fontSize =
          "12px";

        link.style.fontWeight =
          "600";

        link.style.color =
          "#215b4c";

        popupContent.appendChild(
          link
        );

        const popup =
          new maplibre.Popup({
            offset: 22,
          }).setDOMContent(
            popupContent
          );

        const marker =
          new maplibre.Marker({
            element,
            anchor: "bottom",
          })
            .setLngLat([
              point.longitude,
              point.latitude,
            ])
            .setPopup(
              popup
            )
            .addTo(
              map
            );

        markersRef.current.push(
          marker
        );

        bounds.extend([
          point.longitude,
          point.latitude,
        ]);
      }
    );

    // One marker
    if (
      filteredPoints.length ===
      1
    ) {
      const point =
        filteredPoints[0];

      map.easeTo({
        center: [
          point.longitude,
          point.latitude,
        ],

        zoom: 14,
        duration: 500,
      });

      return;
    }

    // Multiple markers
    map.fitBounds(
      bounds,
      {
        padding: 60,
        maxZoom: 14,
        duration: 500,
      }
    );
  }, [
    filteredPoints,
    mapReady,
  ]);

  // Missing map API key
  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-danger-border bg-danger-surface p-8 text-center">
        <p className="font-medium text-danger-text">
          Map is not configured
        </p>

        <p className="mt-2 text-sm text-muted">
          Add{" "}
          <code>
            NEXT_PUBLIC_GEOAPIFY_MAP_KEY
          </code>{" "}
          to .env.local and restart
          the development server.
        </p>
      </div>
    );
  }

  // Nothing to map
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-medium text-ink">
          Nothing to show on the map
          yet
        </p>

        <p className="mt-2 text-sm text-muted">
          Save a place or add an
          itinerary item with a
          location.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Map filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setFilter("all")
          }
          className={
            filter === "all"
              ? "cursor-pointer rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast"
              : "cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
          }
        >
          All
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter("saved")
          }
          className={
            filter === "saved"
              ? "cursor-pointer rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast"
              : "cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
          }
        >
          Saved
        </button>

        {tripDates.map(
          (date, index) => (
            <button
              key={date}
              type="button"
              onClick={() =>
                setFilter(
                  date
                )
              }
              title={formatTripDay(
                date
              )}
              className={
                filter === date
                  ? "cursor-pointer rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast"
                  : "cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
              }
            >
              Day {index + 1}
            </button>
          )
        )}
      </div>

      {/* Visible location count */}
      <p className="mb-3 text-xs text-subtle">
        {filteredPoints.length}{" "}
        {filteredPoints.length === 1
          ? "location"
          : "locations"}{" "}
        shown
      </p>

      {/* Map */}
      <div className="relative">
        <div
          ref={containerRef}
          className={
            large
              ? "h-[70vh] min-h-[500px] w-full overflow-hidden rounded-2xl border border-line"
              : "h-[420px] w-full overflow-hidden rounded-2xl border border-line"
          }
        />

        {/* Loading */}
        {!mapReady &&
          !mapError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-surface">
              <p className="text-sm text-muted">
                Loading map...
              </p>
            </div>
          )}

        {/* Error */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-danger-border bg-danger-surface p-8 text-center">
            <div className="max-w-md">
              <p className="font-semibold text-danger-text">
                Unable to load map
              </p>

              <p className="mt-2 break-words text-sm leading-6 text-muted">
                {mapError}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span>
          P = Saved place
        </span>

        <span>
          A = Activity
        </span>

        <span>
          T = Transport
        </span>

        <span>
          H = Accommodation
        </span>
      </div>
    </div>
  );
}