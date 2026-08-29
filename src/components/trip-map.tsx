"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";

import {
  formatTripDay,
} from "@/lib/itinerary";

import {
  buildTransportMapRoutes,
  buildTransportRouteGeoJson,
  buildTransportRouteIndex,
  transportRouteMatchesDay,
} from "@/lib/map-routes";

import {
  getMapPointCategoryLabel,
  getPlaceStatusLabel,
  MAP_POINT_CATEGORY_OPTIONS,
  PLACE_STATUS_OPTIONS,
  type MapPointCategory,
  type PlacePlanningStatus,
  type TripMapPoint,
  type TripMapPointKind,
} from "@/lib/places";

type TripMapProps = {
  apiKey: string;

  points:
    TripMapPoint[];

  tripDates:
    string[];

  large?: boolean;
};

type MapLibreLibrary =
  typeof import(
    "maplibre-gl"
  );

const TRANSPORT_ROUTE_SOURCE_ID =
  "tripsync-transport-routes";

const TRANSPORT_ROUTE_LAYER_ID =
  "tripsync-transport-route-lines";

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

function getTransportRouteColor() {
  return document
    .documentElement
    .dataset.theme ===
    "dark"
    ? "#8fd5c1"
    : "#326b5c";
}

function getMarkerIcon(
  kind:
    TripMapPointKind
) {
  switch (kind) {
    case "saved":
      return `
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21s6-4.4 6-11a6 6 0 1 0-12 0c0 6.6 6 11 6 11Z"/>
          <circle cx="12" cy="10" r="2"/>
        </svg>
      `;

    case "activity":
      return `
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8"/>
          <path d="m9 12 2 2 4-5"/>
        </svg>
      `;

    case "transport":
      return `
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12h16"/>
          <path d="m15 7 5 5-5 5"/>
        </svg>
      `;

    case "accommodation":
      return `
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m3 11 9-7 9 7"/>
          <path d="M5 10v10h14V10"/>
          <path d="M9 20v-6h6v6"/>
        </svg>
      `;
  }
}

function getMarkerAppearance(
  status:
    PlacePlanningStatus
) {
  if (
    status ===
    "planned"
  ) {
    return {
      background:
        "var(--brand-600, #326b5c)",

      color:
        "var(--brand-contrast, #ffffff)",
    };
  }

  if (
    status ===
    "voting"
  ) {
    return {
      background:
        "var(--brand-500, #4b8373)",

      color:
        "var(--brand-contrast, #ffffff)",
    };
  }

  if (
    status ===
    "rejected"
  ) {
    return {
      background:
        "var(--danger-text, #b42318)",

      color:
        "#ffffff",
    };
  }

  if (
    status ===
    "archived"
  ) {
    return {
      background:
        "var(--muted, #6b7280)",

      color:
        "#ffffff",
    };
  }

  return {
    background:
      "var(--surface, #ffffff)",

    color:
      "var(--ink, #17201b)",
  };
}

function MarkerLegendIcon({
  kind,
}: {
  kind:
    TripMapPointKind;
}) {
  if (
    kind ===
    "saved"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4"
      >
        <path d="M12 21s6-4.4 6-11a6 6 0 1 0-12 0c0 6.6 6 11 6 11Z" />

        <circle
          cx="12"
          cy="10"
          r="2"
        />
      </svg>
    );
  }

  if (
    kind ===
    "transport"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4"
      >
        <path d="M4 12h16" />

        <path d="m15 7 5 5-5 5" />
      </svg>
    );
  }

  if (
    kind ===
    "accommodation"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4"
      >
        <path d="m3 11 9-7 9 7" />

        <path d="M5 10v10h14V10" />

        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
      />

      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function TransportRouteLegendIcon() {
  return (
    <svg
      viewBox="0 0 32 12"
      fill="none"
      aria-hidden="true"
      className="h-3 w-8"
    >
      <path
        d="M1 6h30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
    </svg>
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
    useRef<
      MapLibreMarker[]
    >([]);

  const markerByPointIdRef =
    useRef<
      Map<
        string,
        MapLibreMarker
      >
    >(new Map());

  const [
    mapReady,
    setMapReady,
  ] =
    useState(false);

  const [
    mapError,
    setMapError,
  ] =
    useState<
      string | null
    >(null);

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);

  const [
    dayFilter,
    setDayFilter,
  ] =
    useState("all");

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState<
      | "all"
      | MapPointCategory
    >("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      | "all"
      | PlacePlanningStatus
    >("all");

  const transportRoutes =
    useMemo(
      () =>
        buildTransportMapRoutes(
          points
        ),
      [points]
    );

  const transportRouteByPointId =
    useMemo(
      () =>
        buildTransportRouteIndex(
          transportRoutes
        ),
      [
        transportRoutes,
      ]
    );

  // Desktop shows controls.
  // Mobile starts collapsed.
  useEffect(() => {
    if (
      window.matchMedia(
        "(min-width: 768px)"
      ).matches
    ) {
      setFiltersOpen(
        true
      );
    }
  }, []);

  const filteredPoints =
    useMemo(
      () =>
        points.filter(
          (point) => {
            if (
              categoryFilter !==
                "all" &&
              point.category !==
                categoryFilter
            ) {
              return false;
            }

            if (
              statusFilter !==
                "all" &&
              point.status !==
                statusFilter
            ) {
              return false;
            }

            if (
              dayFilter !==
              "all"
            ) {
              // Show both transport
              // endpoints throughout
              // the journey's date
              // range.
              if (
                point.kind ===
                "transport"
              ) {
                const route =
                  transportRouteByPointId.get(
                    point.id
                  );

                if (
                  route
                ) {
                  return transportRouteMatchesDay(
                    route,
                    dayFilter
                  );
                }
              }

              if (
                !point.startDate
              ) {
                return false;
              }

              const endDate =
                point.endDate ??
                point.startDate;

              if (
                dayFilter <
                  point.startDate ||
                dayFilter >
                  endDate
              ) {
                return false;
              }
            }

            return true;
          }
        ),
      [
        points,
        categoryFilter,
        statusFilter,
        dayFilter,
        transportRouteByPointId,
      ]
    );

  const filteredTransportRoutes =
    useMemo(
      () =>
        transportRoutes.filter(
          (route) => {
            if (
              categoryFilter !==
                "all" &&
              categoryFilter !==
                "transport"
            ) {
              return false;
            }

            if (
              statusFilter !==
                "all" &&
              route
                .departure
                .status !==
                statusFilter
            ) {
              return false;
            }

            if (
              dayFilter !==
                "all" &&
              !transportRouteMatchesDay(
                route,
                dayFilter
              )
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        transportRoutes,
        categoryFilter,
        statusFilter,
        dayFilter,
      ]
    );

  // Create map.
  useEffect(() => {
    if (
      !apiKey ||
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    let cancelled =
      false;

    let themeObserver:
      | MutationObserver
      | null = null;

    let resizeObserver:
      | ResizeObserver
      | null = null;

    async function createMap() {
      try {
        setMapError(
          null
        );

        setMapReady(
          false
        );

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

        // Required by MapLibre v6
        // with Next/Turbopack.
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
                : [
                    0,
                    20,
                  ],

            zoom:
              firstPoint
                ? 12
                : 1.5,

            attributionControl: {
              compact:
                true,
            },
          });

        map.addControl(
          new maplibre.NavigationControl({
            showCompass:
              false,
          }),
          "top-right"
        );

        function markReady() {
          setMapReady(
            true
          );

          setMapError(
            null
          );

          window.requestAnimationFrame(
            () => {
              map.resize();
            }
          );
        }

        map.on(
          "load",
          markReady
        );

        map.on(
          "style.load",
          markReady
        );

        map.on(
          "error",
          (event) => {
            console.error(
              "MapLibre error:",
              event.error
            );

            setMapError(
              event.error
                ?.message ??
                "Unable to load map"
            );
          }
        );

        mapRef.current =
          map;

        // Important when the map is
        // inside collapsed sections.
        resizeObserver =
          new ResizeObserver(
            () => {
              window.requestAnimationFrame(
                () => {
                  map.resize();
                }
              );
            }
          );

        resizeObserver.observe(
          containerRef.current
        );

        // Match TripSync theme.
        themeObserver =
          new MutationObserver(
            () => {
              if (
                !mapRef.current
              ) {
                return;
              }

              setMapReady(
                false
              );

              setMapError(
                null
              );

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
            attributes:
              true,

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
          error instanceof
            Error
            ? error.message
            : "Unable to initialise map"
        );
      }
    }

    void createMap();

    return () => {
      cancelled =
        true;

      themeObserver?.disconnect();

      resizeObserver?.disconnect();

      markersRef.current.forEach(
        (marker) =>
          marker.remove()
      );

      markersRef.current =
        [];

      markerByPointIdRef
        .current
        .clear();

      mapRef.current?.remove();

      mapRef.current =
        null;

      libraryRef.current =
        null;
    };
  }, [
    apiKey,
    points,
  ]);

  // Draw transport connection
  // lines. They indicate the
  // connection between endpoints,
  // not an exact navigation path.
  useEffect(() => {
    const map =
      mapRef.current;

    if (
      !map ||
      !mapReady
    ) {
      return;
    }

    const geoJson =
      buildTransportRouteGeoJson(
        filteredTransportRoutes
      );

    const existingSource =
      map.getSource(
        TRANSPORT_ROUTE_SOURCE_ID
      ) as
        | GeoJSONSource
        | undefined;

    if (
      existingSource
    ) {
      void existingSource.setData(
        geoJson
      );
    } else {
      map.addSource(
        TRANSPORT_ROUTE_SOURCE_ID,
        {
          type:
            "geojson",

          data:
            geoJson,
        }
      );
    }

    if (
      !map.getLayer(
        TRANSPORT_ROUTE_LAYER_ID
      )
    ) {
      // Keep route lines beneath
      // the map's labels.
      const firstSymbolLayerId =
        map
          .getStyle()
          .layers?.find(
            (layer) =>
              layer.type ===
              "symbol"
          )?.id;

      map.addLayer(
        {
          id:
            TRANSPORT_ROUTE_LAYER_ID,

          type:
            "line",

          source:
            TRANSPORT_ROUTE_SOURCE_ID,

          layout: {
            "line-cap":
              "round",

            "line-join":
              "round",
          },

          paint: {
            "line-color":
              getTransportRouteColor(),

            "line-width":
              large
                ? 3.5
                : 3,

            "line-opacity":
              0.8,

            "line-dasharray": [
              2,
              1.7,
            ],
          },
        },

        firstSymbolLayerId
      );
    }
  }, [
    filteredTransportRoutes,
    mapReady,
    large,
  ]);

  // Draw markers.
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

    markersRef.current.forEach(
      (marker) =>
        marker.remove()
    );

    markersRef.current =
      [];

    markerByPointIdRef
      .current
      .clear();

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
        const appearance =
          getMarkerAppearance(
            point.status
          );

        const element =
          document.createElement(
            "button"
          );

        element.type =
          "button";

        element.title =
          `${point.name} — ${getPlaceStatusLabel(
            point.status
          )}`;

        element.setAttribute(
          "aria-label",
          element.title
        );

        element.innerHTML =
          getMarkerIcon(
            point.kind
          );

        element.style.width =
          "34px";

        element.style.height =
          "34px";

        element.style.display =
          "flex";

        element.style.alignItems =
          "center";

        element.style.justifyContent =
          "center";

        element.style.borderRadius =
          "9999px";

        element.style.border =
          "2px solid var(--surface, #ffffff)";

        element.style.background =
          appearance.background;

        element.style.color =
          appearance.color;

        element.style.cursor =
          "pointer";

        element.style.boxShadow =
          "0 2px 10px rgba(0, 0, 0, 0.28)";

        const popupContent =
          document.createElement(
            "div"
          );

        popupContent.style.minWidth =
          "210px";

        popupContent.style.color =
          "#17201b";

        const status =
          document.createElement(
            "div"
          );

        status.textContent =
          getPlaceStatusLabel(
            point.status
          );

        status.style.display =
          "inline-block";

        status.style.padding =
          "3px 7px";

        status.style.borderRadius =
          "9999px";

        status.style.background =
          "#eef3f0";

        status.style.fontSize =
          "11px";

        status.style.fontWeight =
          "600";

        popupContent.appendChild(
          status
        );

        const title =
          document.createElement(
            "strong"
          );

        title.textContent =
          point.name;

        title.style.display =
          "block";

        title.style.marginTop =
          "8px";

        title.style.fontSize =
          "14px";

        popupContent.appendChild(
          title
        );

        const category =
          document.createElement(
            "div"
          );

        category.textContent =
          getMapPointCategoryLabel(
            point.category
          );

        category.style.marginTop =
          "4px";

        category.style.fontSize =
          "12px";

        category.style.color =
          "#5f6d66";

        popupContent.appendChild(
          category
        );

        if (
          point.subtitle &&
          point.subtitle !==
            category.textContent
        ) {
          const subtitle =
            document.createElement(
              "div"
            );

          subtitle.textContent =
            point.subtitle;

          subtitle.style.marginTop =
            "5px";

          subtitle.style.fontSize =
            "12px";

          popupContent.appendChild(
            subtitle
          );
        }

        if (
          point.address
        ) {
          const address =
            document.createElement(
              "div"
            );

          address.textContent =
            point.address;

          address.style.marginTop =
            "5px";

          address.style.fontSize =
            "11px";

          address.style.color =
            "#6b746f";

          popupContent.appendChild(
            address
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
          "10px";

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
            offset:
              22,
          }).setDOMContent(
            popupContent
          );

        const marker =
          new maplibre.Marker({
            element,
            anchor:
              "bottom",
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

        markerByPointIdRef
          .current
          .set(
            point.id,
            marker
          );

        bounds.extend([
          point.longitude,
          point.latitude,
        ]);
      }
    );

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

        zoom:
          14,

        duration:
          500,
      });

      return;
    }

    map.fitBounds(
      bounds,
      {
        padding:
          large
            ? 80
            : 55,

        maxZoom:
          14,

        duration:
          500,
      }
    );
  }, [
    filteredPoints,
    mapReady,
    large,
  ]);

  // Place cards and deep links
  // can ask the map to focus
  // a specific marker.
  useEffect(() => {
    function handleFocus(
      rawEvent: Event
    ) {
      const event =
        rawEvent as CustomEvent<{
          pointId?:
            string;
        }>;

      const pointId =
        event.detail
          ?.pointId;

      if (
        !pointId
      ) {
        return;
      }

      const point =
        points.find(
          (candidate) =>
            candidate.id ===
            pointId
        );

      const marker =
        markerByPointIdRef
          .current
          .get(
            pointId
          );

      const map =
        mapRef.current;

      if (
        !point ||
        !marker ||
        !map
      ) {
        return;
      }

      map.resize();

      map.easeTo({
        center: [
          point.longitude,
          point.latitude,
        ],

        zoom:
          15,

        duration:
          650,
      });

      const popup =
        marker.getPopup();

      if (
        popup &&
        !popup.isOpen()
      ) {
        marker.togglePopup();
      }
    }

    window.addEventListener(
      "tripsync:focus-map",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "tripsync:focus-map",
        handleFocus
      );
    };
  }, [
    points,
  ]);

  function resetFilters() {
    setDayFilter(
      "all"
    );

    setCategoryFilter(
      "all"
    );

    setStatusFilter(
      "all"
    );
  }

  function fitVisibleLocations() {
    const map =
      mapRef.current;

    const maplibre =
      libraryRef.current;

    if (
      !map ||
      !maplibre ||
      filteredPoints.length ===
        0
    ) {
      return;
    }

    map.resize();

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

        zoom:
          14,

        duration:
          500,
      });

      return;
    }

    const bounds =
      new maplibre.LngLatBounds();

    filteredPoints.forEach(
      (point) => {
        bounds.extend([
          point.longitude,
          point.latitude,
        ]);
      }
    );

    map.fitBounds(
      bounds,
      {
        padding:
          large
            ? 80
            : 55,

        maxZoom:
          14,

        duration:
          500,
      }
    );
  }

  if (
    !apiKey
  ) {
    return (
      <div className="rounded-2xl border border-danger-border bg-danger-surface p-8 text-center">
        <p className="font-medium text-danger-text">
          Map is not
          configured
        </p>

        <p className="mt-2 text-sm text-muted">
          Add{" "}
          <code>
            NEXT_PUBLIC_GEOAPIFY_MAP_KEY
          </code>{" "}
          to .env.local and
          restart the
          development server.
        </p>
      </div>
    );
  }

  if (
    points.length ===
    0
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-medium text-ink">
          Nothing to show
          on the map yet
        </p>

        <p className="mt-2 text-sm text-muted">
          Save a place or
          add an itinerary
          item with a
          location.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Collapsible filters */}
      <div className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
        <button
          type="button"
          onClick={() =>
            setFiltersOpen(
              (current) =>
                !current
            )
          }
          aria-expanded={
            filtersOpen
          }
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-hover"
        >
          <div>
            <p className="text-sm font-medium text-ink">
              Map filters
            </p>

            <p className="mt-0.5 text-xs text-muted">
              Day, category
              and planning
              status
            </p>
          </div>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`h-5 w-5 text-muted transition-transform ${
              filtersOpen
                ? "rotate-180"
                : ""
            }`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {filtersOpen && (
          <div className="border-t border-line p-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Day */}
              <div>
                <label
                  htmlFor="map-day-filter"
                  className="mb-1.5 block text-xs font-medium text-ink"
                >
                  Day
                </label>

                <select
                  id="map-day-filter"
                  value={
                    dayFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setDayFilter(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
                >
                  <option value="all">
                    All days
                  </option>

                  {tripDates.map(
                    (
                      date,
                      index
                    ) => (
                      <option
                        key={
                          date
                        }
                        value={
                          date
                        }
                      >
                        Day{" "}
                        {index +
                          1}
                        {" — "}
                        {formatTripDay(
                          date
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="map-category-filter"
                  className="mb-1.5 block text-xs font-medium text-ink"
                >
                  Category
                </label>

                <select
                  id="map-category-filter"
                  value={
                    categoryFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setCategoryFilter(
                      event.target
                        .value as
                        | "all"
                        | MapPointCategory
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
                >
                  <option value="all">
                    All
                    categories
                  </option>

                  {MAP_POINT_CATEGORY_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="map-status-filter"
                  className="mb-1.5 block text-xs font-medium text-ink"
                >
                  Status
                </label>

                <select
                  id="map-status-filter"
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value as
                        | "all"
                        | PlacePlanningStatus
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
                >
                  <option value="all">
                    All
                    statuses
                  </option>

                  {PLACE_STATUS_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="mt-4 cursor-pointer text-sm font-medium text-muted hover:text-ink"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Visible map summary */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-subtle">
          {
            filteredPoints.length
          }{" "}
          {filteredPoints.length ===
          1
            ? "location"
            : "locations"}{" "}
          shown

          {filteredTransportRoutes.length >
          0
            ? ` · ${filteredTransportRoutes.length} ${
                filteredTransportRoutes.length ===
                1
                  ? "transport leg"
                  : "transport legs"
              }`
            : ""}
        </p>

        {filteredPoints.length >
          0 && (
          <button
            type="button"
            onClick={
              fitVisibleLocations
            }
            className="cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
          >
            Fit visible
          </button>
        )}
      </div>

      {/* Map */}
      <div className="relative">
        <div
          ref={
            containerRef
          }
          className={
            large
              ? "h-[58vh] min-h-[380px] w-full overflow-hidden rounded-2xl border border-line sm:h-[65vh] sm:min-h-[480px] lg:h-[70vh] lg:min-h-[500px]"
              : "h-[420px] w-full overflow-hidden rounded-2xl border border-line"
          }
        />

        {!mapReady &&
          !mapError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-surface">
              <p className="text-sm text-muted">
                Loading
                map...
              </p>
            </div>
          )}

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-danger-border bg-danger-surface p-8 text-center">
            <div className="max-w-md">
              <p className="font-semibold text-danger-text">
                Unable to
                load map
              </p>

              <p className="mt-2 break-words text-sm leading-6 text-muted">
                {
                  mapError
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Icon legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <MarkerLegendIcon
            kind="saved"
          />
          Saved place
        </span>

        <span className="flex items-center gap-1.5">
          <MarkerLegendIcon
            kind="activity"
          />
          Activity
        </span>

        <span className="flex items-center gap-1.5">
          <MarkerLegendIcon
            kind="transport"
          />
          Transport
        </span>

        <span className="flex items-center gap-1.5">
          <MarkerLegendIcon
            kind="accommodation"
          />
          Accommodation
        </span>

        {transportRoutes.length >
          0 && (
          <span className="flex items-center gap-1.5">
            <TransportRouteLegendIcon />
            Transport
            connection
          </span>
        )}
      </div>

      {transportRoutes.length >
        0 && (
        <p className="mt-3 text-xs leading-5 text-subtle">
          Dashed transport
          lines connect the
          saved departure and
          arrival points. They
          show the trip leg,
          not an exact road,
          rail, ferry, or
          flight path.
        </p>
      )}
    </div>
  );
}