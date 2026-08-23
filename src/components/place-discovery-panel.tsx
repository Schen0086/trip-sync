"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PLACE_CATEGORY_OPTIONS,
  type PlaceCategory,
} from "@/lib/places";
import {
  saveDiscoveredPlace,
} from "@/app/(app)/trips/[id]/places/actions";

type LocationResult = {
  id: string;
  name: string;
  formatted: string;
  latitude: number | null;
  longitude: number | null;
};

type DiscoveryPlace = {
  placeId: string;

  name: string;
  address: string | null;

  latitude: number;
  longitude: number;

  distanceMeters: number | null;

  categories: string[];
};

type SearchCentre = {
  latitude: number;
  longitude: number;
  label: string;
};

type PlaceDiscoveryPanelProps = {
  tripId: string;
  tripDestination: string;
  savedGeoapifyIds: string[];
};

export default function PlaceDiscoveryPanel({
  tripId,
  tripDestination,
  savedGeoapifyIds,
}: PlaceDiscoveryPanelProps) {
  const [areaQuery, setAreaQuery] =
    useState(tripDestination);

  const [
    areaResults,
    setAreaResults,
  ] = useState<LocationResult[]>(
    []
  );

  const [
    centre,
    setCentre,
  ] = useState<SearchCentre | null>(
    null
  );

  const [
    category,
    setCategory,
  ] =
    useState<PlaceCategory>(
      "food_drink"
    );

  const [
    nameQuery,
    setNameQuery,
  ] = useState("");

  const [radius, setRadius] =
    useState("5000");

  const [places, setPlaces] =
    useState<DiscoveryPlace[]>(
      []
    );

  const [loadingArea, setLoadingArea] =
    useState(false);

  const [loadingPlaces, setLoadingPlaces] =
    useState(false);

  const [searchError, setSearchError] =
    useState<string | null>(
      null
    );

  const savedIds =
    useMemo(
      () =>
        new Set(
          savedGeoapifyIds
        ),
      [savedGeoapifyIds]
    );

  // Resolve trip destination automatically
  useEffect(() => {
    if (
      tripDestination.trim()
        .length < 3
    ) {
      return;
    }

    let cancelled = false;

    async function resolveTripDestination() {
      try {
        const response =
          await fetch(
            `/api/location-search?q=${encodeURIComponent(
              tripDestination
            )}`
          );

        if (!response.ok) {
          return;
        }

        const result =
          (await response.json()) as {
            results?: LocationResult[];
          };

        const first =
          result.results?.find(
            (location) =>
              location.latitude !==
                null &&
              location.longitude !==
                null
          );

        if (
          cancelled ||
          !first ||
          first.latitude === null ||
          first.longitude === null
        ) {
          return;
        }

        setCentre({
          latitude:
            first.latitude,
          longitude:
            first.longitude,
          label:
            first.formatted,
        });

        setAreaQuery(
          first.formatted
        );
      } catch {
        // User can select an area manually.
      }
    }

    resolveTripDestination();

    return () => {
      cancelled = true;
    };
  }, [tripDestination]);

  // Search for an area
  useEffect(() => {
    if (
      areaQuery.trim().length <
      3
    ) {
      setAreaResults([]);
      return;
    }

    if (
      centre &&
      areaQuery === centre.label
    ) {
      setAreaResults([]);
      return;
    }

    const controller =
      new AbortController();

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setLoadingArea(true);

            const response =
              await fetch(
                `/api/location-search?q=${encodeURIComponent(
                  areaQuery
                )}`,
                {
                  signal:
                    controller.signal,
                }
              );

            if (!response.ok) {
              setAreaResults([]);
              return;
            }

            const result =
              (await response.json()) as {
                results?: LocationResult[];
              };

            setAreaResults(
              result.results ?? []
            );
          } catch (error) {
            if (
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            setAreaResults([]);
          } finally {
            setLoadingArea(false);
          }
        },
        350
      );

    return () => {
      window.clearTimeout(
        timeout
      );

      controller.abort();
    };
  }, [
    areaQuery,
    centre,
  ]);

  // Select discovery centre
  function selectArea(
    location: LocationResult
  ) {
    if (
      location.latitude ===
        null ||
      location.longitude ===
        null
    ) {
      return;
    }

    setCentre({
      latitude:
        location.latitude,

      longitude:
        location.longitude,

      label:
        location.formatted,
    });

    setAreaQuery(
      location.formatted
    );

    setAreaResults([]);
    setPlaces([]);
  }

  // Search Places API
  async function searchPlaces() {
    if (!centre) {
      setSearchError(
        "Choose a search area first"
      );

      return;
    }

    if (category === "other") {
      setSearchError(
        "Choose a discovery category"
      );

      return;
    }

    setLoadingPlaces(true);
    setSearchError(null);

    try {
      const params =
        new URLSearchParams({
          lat: String(
            centre.latitude
          ),

          lon: String(
            centre.longitude
          ),

          category,

          radius,
        });

      if (nameQuery.trim()) {
        params.set(
          "name",
          nameQuery.trim()
        );
      }

      const response =
        await fetch(
          `/api/place-discovery?${params.toString()}`
        );

      const result =
        (await response.json()) as {
          places?: DiscoveryPlace[];
          error?: string;
        };

      if (!response.ok) {
        setSearchError(
          result.error ??
            "Unable to search places"
        );

        setPlaces([]);
        return;
      }

      setPlaces(
        result.places ?? []
      );
    } catch {
      setSearchError(
        "Unable to search places"
      );

      setPlaces([]);
    } finally {
      setLoadingPlaces(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-semibold text-ink">
          Discover places
        </h2>

        <p className="mt-1 text-sm text-muted">
          Find things near your trip
          destination and save them
          for the group.
        </p>
      </div>

      {/* Search area */}
      <div className="relative mt-6">
        <label
          htmlFor="discovery-area"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Search area
        </label>

        <input
          id="discovery-area"
          type="text"
          value={areaQuery}
          autoComplete="off"
          onChange={(event) => {
            setAreaQuery(
              event.target.value
            );

            setCentre(null);
          }}
          className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />

        {loadingArea && (
          <p className="mt-1.5 text-xs text-subtle">
            Searching locations...
          </p>
        )}

        {areaResults.length >
          0 && (
          <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {areaResults.map(
              (location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() =>
                    selectArea(
                      location
                    )
                  }
                  className="block w-full cursor-pointer border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover"
                >
                  <p className="text-sm font-medium text-ink">
                    {location.name}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {
                      location.formatted
                    }
                  </p>
                </button>
              )
            )}

            <div className="px-4 py-2 text-right text-[11px] text-subtle">
              Powered by Geoapify
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="mt-6">
        <p className="text-sm font-medium text-ink">
          Category
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {PLACE_CATEGORY_OPTIONS
            .filter(
              (option) =>
                option.value !==
                "other"
            )
            .map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setCategory(
                    option.value
                  );

                  setPlaces([]);
                }}
                className={
                  category ===
                  option.value
                    ? "cursor-pointer rounded-xl border border-brand-500 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700"
                    : "cursor-pointer rounded-xl border border-line bg-surface-soft px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
                }
              >
                {option.label}
              </button>
            ))}
        </div>
      </div>

      {/* Search options */}
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <label
            htmlFor="place-name"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Name
            <span className="ml-1 font-normal text-subtle">
              optional
            </span>
          </label>

          <input
            id="place-name"
            type="text"
            value={nameQuery}
            onChange={(event) =>
              setNameQuery(
                event.target.value
              )
            }
            placeholder="Museum, restaurant name..."
            className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </div>

        <div>
          <label
            htmlFor="radius"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Search radius
          </label>

          <select
            id="radius"
            value={radius}
            onChange={(event) =>
              setRadius(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            <option value="2000">
              2 km
            </option>

            <option value="5000">
              5 km
            </option>

            <option value="10000">
              10 km
            </option>

            <option value="20000">
              20 km
            </option>
          </select>
        </div>
      </div>

      {/* Search action */}
      <div className="mt-5">
        <button
          type="button"
          onClick={searchPlaces}
          disabled={
            !centre ||
            loadingPlaces
          }
          className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingPlaces
            ? "Searching..."
            : "Search places"}
        </button>
      </div>

      {/* Search error */}
      {searchError && (
        <div className="mt-5 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
          {searchError}
        </div>
      )}

      {/* Results */}
      {places.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <h3 className="font-semibold text-ink">
            Results
          </h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {places.map(
              (place) => {
                const saved =
                  savedIds.has(
                    place.placeId
                  );

                return (
                  <article
                    key={
                      place.placeId
                    }
                    className="rounded-xl border border-line bg-surface-soft p-5"
                  >
                    <h4 className="font-semibold text-ink">
                      {place.name}
                    </h4>

                    {place.address && (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {
                          place.address
                        }
                      </p>
                    )}

                    {place.distanceMeters !==
                      null && (
                      <p className="mt-2 text-xs text-subtle">
                        {place.distanceMeters <
                        1000
                          ? `${Math.round(
                              place.distanceMeters
                            )} m away`
                          : `${(
                              place.distanceMeters /
                              1000
                            ).toFixed(
                              1
                            )} km away`}
                      </p>
                    )}

                    {saved ? (
                      <p className="mt-4 text-sm font-medium text-brand-700">
                        Saved
                      </p>
                    ) : (
                      <form
                        action={
                          saveDiscoveredPlace
                        }
                        className="mt-4"
                      >
                        <input
                          type="hidden"
                          name="tripId"
                          value={
                            tripId
                          }
                        />

                        <input
                          type="hidden"
                          name="geoapifyPlaceId"
                          value={
                            place.placeId
                          }
                        />

                        <input
                          type="hidden"
                          name="name"
                          value={
                            place.name
                          }
                        />

                        <input
                          type="hidden"
                          name="category"
                          value={
                            category
                          }
                        />

                        <input
                          type="hidden"
                          name="address"
                          value={
                            place.address ??
                            ""
                          }
                        />

                        <input
                          type="hidden"
                          name="latitude"
                          value={
                            place.latitude
                          }
                        />

                        <input
                          type="hidden"
                          name="longitude"
                          value={
                            place.longitude
                          }
                        />

                        <button
                          type="submit"
                          className="cursor-pointer rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
                        >
                          Save place
                        </button>
                      </form>
                    )}
                  </article>
                );
              }
            )}
          </div>
        </div>
      )}

      {!loadingPlaces &&
        places.length === 0 &&
        centre &&
        !searchError && (
          <p className="mt-6 text-sm text-subtle">
            Choose a category and
            search to discover places
            nearby.
          </p>
        )}
    </section>
  );
}