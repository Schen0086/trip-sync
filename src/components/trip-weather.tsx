"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  formatWeatherDate,
  getWeatherDescription,
  getWeatherIconKind,
  type TripWeatherResponse,
} from "@/lib/weather";

type WeatherRequestState = {
  weather:
    | TripWeatherResponse
    | null;

  loading: boolean;

  error:
    | string
    | null;
};

type WeatherComponentProps = {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
};

type TripWeatherProviderProps =
  WeatherComponentProps & {
    children: ReactNode;
  };

const TripWeatherContext =
  createContext<
    WeatherRequestState | null
  >(null);

// Fetch weather from TripSync API
function useWeatherRequest({
  tripId,
  destination,
  startDate,
  endDate,
}: WeatherComponentProps) {
  const [
    weather,
    setWeather,
  ] =
    useState<TripWeatherResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadWeather() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/weather?tripId=${encodeURIComponent(
              tripId
            )}`,
            {
              cache: "no-store",

              signal:
                controller.signal,
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Unable to load weather"
          );
        }

        setWeather(
          result as TripWeatherResponse
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

        console.error(
          "Failed to load trip weather:",
          error
        );

        setWeather(null);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load weather"
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      controller.abort();
    };
  }, [
    tripId,

    // These cause a new request if
    // the trip itself is edited.
    destination,
    startDate,
    endDate,
  ]);

  return {
    weather,
    loading,
    error,
  };
}

// Shared provider for itinerary days
export function TripWeatherProvider({
  tripId,
  destination,
  startDate,
  endDate,
  children,
}: TripWeatherProviderProps) {
  const state =
    useWeatherRequest({
      tripId,
      destination,
      startDate,
      endDate,
    });

  return (
    <TripWeatherContext.Provider
      value={state}
    >
      {children}
    </TripWeatherContext.Provider>
  );
}

// Weather icon
function WeatherIcon({
  code,
  className = "h-6 w-6",
}: {
  code: number;
  className?: string;
}) {
  const kind =
    getWeatherIconKind(
      code
    );

  if (kind === "clear") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        className={className}
      >
        <circle
          cx="12"
          cy="12"
          r="4"
        />

        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
      </svg>
    );
  }

  if (kind === "cloudy") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        <path d="M6.5 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 5.4 11.5 3.5 3.5 0 0 0 6.5 18Z" />
      </svg>
    );
  }

  if (kind === "fog") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        className={className}
      >
        <path d="M5 8h14M3 12h18M5 16h14" />
      </svg>
    );
  }

  if (kind === "snow") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
        className={className}
      >
        <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M9 4l3 3 3-3M9 20l3-3 3 3" />
      </svg>
    );
  }

  if (kind === "storm") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        <path d="M6.5 14h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 5.4 7.5 3.5 3.5 0 0 0 6.5 14Z" />

        <path d="m13 14-3 5h3l-2 3" />
      </svg>
    );
  }

  // Rain
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.5 14h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 5.4 7.5 3.5 3.5 0 0 0 6.5 14Z" />

      <path d="m8 17-1 3M12 17l-1 3M16 17l-1 3" />
    </svg>
  );
}

// Full weather section for Trip Details
export function TripWeatherPanel({
  tripId,
  destination,
  startDate,
  endDate,
}: WeatherComponentProps) {
  const {
    weather,
    loading,
    error,
  } =
    useWeatherRequest({
      tripId,
      destination,
      startDate,
      endDate,
    });

  // Loading
  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold text-ink">
          Weather forecast
        </h2>

        <p className="mt-3 text-sm text-muted">
          Loading forecast...
        </p>
      </section>
    );
  }

  // API error
  if (error) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold text-ink">
          Weather forecast
        </h2>

        <p className="mt-3 text-sm text-muted">
          Weather could not be
          loaded right now.
        </p>
      </section>
    );
  }

  if (!weather) {
    return null;
  }

  // Future / past / unavailable
  if (
    weather.status !==
    "available"
  ) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Weather forecast
            </h2>

            <p className="mt-1 text-sm text-muted">
              {weather.locationName}
            </p>
          </div>

          <WeatherAttribution />
        </div>

        <div className="mt-5 rounded-xl border border-line bg-surface-soft p-5">
          <p className="text-sm text-muted">
            {weather.message ??
              "Weather is not currently available."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Weather forecast
          </h2>

          <p className="mt-1 text-sm text-muted">
            Forecast for{" "}
            {weather.locationName}
          </p>
        </div>

        <WeatherAttribution />
      </div>

      {/* Forecast cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {weather.days.map(
          (day) => (
            <article
              key={day.date}
              className="rounded-xl border border-line bg-surface-soft p-4"
            >
              <p className="text-sm font-medium text-ink">
                {formatWeatherDate(
                  day.date
                )}
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="text-brand-700">
                  <WeatherIcon
                    code={
                      day.weatherCode
                    }
                    className="h-8 w-8"
                  />
                </div>

                <div>
                  <p className="font-semibold text-ink">
                    {day.temperatureMax !==
                    null
                      ? `${Math.round(
                          day.temperatureMax
                        )}°`
                      : "—"}

                    <span className="ml-1 font-normal text-muted">
                      /{" "}
                      {day.temperatureMin !==
                      null
                        ? `${Math.round(
                            day.temperatureMin
                          )}°`
                        : "—"}
                    </span>
                  </p>

                  <p className="mt-0.5 text-xs text-muted">
                    {getWeatherDescription(
                      day.weatherCode
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-subtle">
                    Rain
                  </p>

                  <p className="mt-1 text-sm font-medium text-ink">
                    {day.precipitationProbability !==
                    null
                      ? `${Math.round(
                          day.precipitationProbability
                        )}%`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-subtle">
                    Wind
                  </p>

                  <p className="mt-1 text-sm font-medium text-ink">
                    {day.windSpeedMax !==
                    null
                      ? `${Math.round(
                          day.windSpeedMax
                        )} km/h`
                      : "—"}
                  </p>
                </div>
              </div>
            </article>
          )
        )}
      </div>

      {weather.isPartial && (
        <p className="mt-4 text-xs text-subtle">
          {weather.message}
        </p>
      )}
    </section>
  );
}

// Status shown above itinerary
export function ItineraryWeatherNotice() {
  const state =
    useContext(
      TripWeatherContext
    );

  if (!state) {
    return null;
  }

  const {
    weather,
    loading,
    error,
  } = state;

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
        Loading weather
        forecast...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-muted">
        Weather forecast
        could not be loaded.
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  if (
    weather.status ===
      "available" &&
    !weather.isPartial
  ) {
    return null;
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface-soft px-4 py-3">
      <p className="text-sm text-muted">
        {weather.message}
      </p>

      <div className="mt-2">
        <WeatherAttribution />
      </div>
    </div>
  );
}

// Compact weather shown on itinerary day
export function ItineraryDayWeather({
  date,
}: {
  date: string;
}) {
  const state =
    useContext(
      TripWeatherContext
    );

  if (
    !state ||
    state.loading ||
    state.error ||
    state.weather?.status !==
      "available"
  ) {
    return null;
  }

  const day =
    state.weather.days.find(
      (weatherDay) =>
        weatherDay.date === date
    );

  if (!day) {
    return null;
  }

  return (
    <span
      title={getWeatherDescription(
        day.weatherCode
      )}
      className="flex items-center gap-1.5 rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted"
    >
      <span className="text-brand-700">
        <WeatherIcon
          code={
            day.weatherCode
          }
          className="h-4 w-4"
        />
      </span>

      <span className="font-medium text-ink">
        {day.temperatureMax !==
        null
          ? `${Math.round(
              day.temperatureMax
            )}°`
          : "—"}

        {" / "}

        {day.temperatureMin !==
        null
          ? `${Math.round(
              day.temperatureMin
            )}°`
          : "—"}
      </span>

      {day.precipitationProbability !==
        null && (
        <span className="text-subtle">
          {Math.round(
            day.precipitationProbability
          )}
          %
        </span>
      )}
    </span>
  );
}

// Required Open-Meteo credit
function WeatherAttribution() {
  return (
    <a
      href="https://open-meteo.com/"
      target="_blank"
      rel="noreferrer"
      className="text-xs text-subtle transition hover:text-ink"
    >
      Weather data by Open-Meteo.com
    </a>
  );
}