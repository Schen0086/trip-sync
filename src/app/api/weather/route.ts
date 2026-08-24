import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  TripWeatherResponse,
  WeatherDay,
} from "@/lib/weather";

type GeoapifyResult = {
  formatted?: string;

  name?: string;
  city?: string;
  country?: string;

  lat?: number;
  lon?: number;
};

type GeoapifyResponse = {
  results?: GeoapifyResult[];
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;

  timezone?: string;

  daily?: {
    time?: string[];

    weather_code?: Array<
      number | null
    >;

    temperature_2m_max?: Array<
      number | null
    >;

    temperature_2m_min?: Array<
      number | null
    >;

    precipitation_probability_max?: Array<
      number | null
    >;

    wind_speed_10m_max?: Array<
      number | null
    >;
  };

  error?: boolean;
  reason?: string;
};

// Count inclusive trip days
function countTripDays(
  startDate: string,
  endDate: string
) {
  const start =
    new Date(
      `${startDate}T00:00:00Z`
    );

  const end =
    new Date(
      `${endDate}T00:00:00Z`
    );

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return (
    Math.floor(
      (end.getTime() -
        start.getTime()) /
        millisecondsPerDay
    ) + 1
  );
}

export async function GET(
  request: Request
) {
  const supabase =
    await createClient();

  // Require authentication
  const {
    data,
    error: authError,
  } =
    await supabase.auth.getClaims();

  if (
    authError ||
    !data?.claims
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { searchParams } =
    new URL(request.url);

  const tripId =
    searchParams.get(
      "tripId"
    );

  if (!tripId) {
    return NextResponse.json(
      {
        error:
          "Trip ID is required",
      },
      {
        status: 400,
      }
    );
  }

  // Load trip through RLS
  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      destination,
      start_date,
      end_date
    `)
    .eq("id", tripId)
    .maybeSingle();

  if (
    tripError ||
    !trip
  ) {
    return NextResponse.json(
      {
        error:
          "Trip not found",
      },
      {
        status: 404,
      }
    );
  }

  const geoapifyApiKey =
    process.env
      .GEOAPIFY_API_KEY;

  if (!geoapifyApiKey) {
    return NextResponse.json(
      {
        error:
          "Location lookup is not configured",
      },
      {
        status: 503,
      }
    );
  }

  try {
    // Geocode the trip destination
    const geocodeParams =
      new URLSearchParams({
        text:
          trip.destination,

        format: "json",
        limit: "1",
        lang: "en",

        apiKey:
          geoapifyApiKey,
      });

    const geocodeResponse =
      await fetch(
        `https://api.geoapify.com/v1/geocode/search?${geocodeParams.toString()}`,
        {
          next: {
            // Trip destinations rarely
            // change, so cache for 30 days.
            revalidate:
              60 *
              60 *
              24 *
              30,
          },
        }
      );

    if (
      !geocodeResponse.ok
    ) {
      console.error(
        "Weather destination geocoding failed:",
        geocodeResponse.status
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the trip destination",
        },
        {
          status: 502,
        }
      );
    }

    const geocodeResult =
      (await geocodeResponse.json()) as GeoapifyResponse;

    const location =
      geocodeResult
        .results?.[0];

    if (
      !location ||
      typeof location.lat !==
        "number" ||
      typeof location.lon !==
        "number"
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to find the trip destination",
        },
        {
          status: 404,
        }
      );
    }

    const latitude =
      location.lat;

    const longitude =
      location.lon;

    const locationName =
      location.formatted ??
      [
        location.city ??
          location.name,
        location.country,
      ]
        .filter(Boolean)
        .join(", ") ??
      trip.destination;

    // Request up to 16 days
    // from Open-Meteo.
    const weatherParams =
      new URLSearchParams({
        latitude:
          String(latitude),

        longitude:
          String(longitude),

        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_probability_max",
          "wind_speed_10m_max",
        ].join(","),

        timezone: "auto",

        forecast_days:
          "16",
      });

    const weatherResponse =
      await fetch(
        `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`,
        {
          next: {
            // Forecasts change regularly.
            // Cache upstream response
            // for 30 minutes.
            revalidate:
              60 * 30,
          },
        }
      );

    if (
      !weatherResponse.ok
    ) {
      console.error(
        "Open-Meteo request failed:",
        weatherResponse.status
      );

      return NextResponse.json(
        {
          error:
            "Unable to load weather forecast",
        },
        {
          status: 502,
        }
      );
    }

    const weather =
      (await weatherResponse.json()) as OpenMeteoResponse;

    if (
      weather.error ||
      !weather.daily?.time ||
      weather.daily.time
        .length === 0
    ) {
      console.error(
        "Open-Meteo returned an error:",
        weather.reason
      );

      return NextResponse.json(
        {
          error:
            weather.reason ??
            "Unable to load weather forecast",
        },
        {
          status: 502,
        }
      );
    }

    const dates =
      weather.daily.time;

    const firstForecastDate =
      dates[0];

    const lastForecastDate =
      dates[
        dates.length - 1
      ];

    // Convert API arrays into
    // individual daily records.
    const allDays: WeatherDay[] =
      dates.map(
        (date, index) => ({
          date,

          weatherCode:
            weather.daily
              ?.weather_code?.[
                index
              ] ?? 0,

          temperatureMax:
            weather.daily
              ?.temperature_2m_max?.[
                index
              ] ?? null,

          temperatureMin:
            weather.daily
              ?.temperature_2m_min?.[
                index
              ] ?? null,

          precipitationProbability:
            weather.daily
              ?.precipitation_probability_max?.[
                index
              ] ?? null,

          windSpeedMax:
            weather.daily
              ?.wind_speed_10m_max?.[
                index
              ] ?? null,
        })
      );

    // Only retain forecast dates
    // belonging to the trip.
    const tripWeatherDays =
      allDays.filter(
        (day) =>
          day.date >=
            trip.start_date &&
          day.date <=
            trip.end_date
      );

    const totalTripDays =
      countTripDays(
        trip.start_date,
        trip.end_date
      );

    let status:
      TripWeatherResponse["status"];

    let message:
      | string
      | null = null;

    // At least some trip dates
    // are forecastable.
    if (
      tripWeatherDays.length >
      0
    ) {
      status =
        "available";

      if (
        tripWeatherDays.length <
        totalTripDays
      ) {
        message =
          "Only the trip dates currently within the forecast range are shown.";
      }
    }

    // Entire trip is beyond
    // forecast horizon.
    else if (
      trip.start_date >
      lastForecastDate
    ) {
      status = "future";

      message =
        "The forecast will appear when this trip enters the 16-day forecast window.";
    }

    // Trip has already ended.
    else if (
      trip.end_date <
      firstForecastDate
    ) {
      status = "past";

      message =
        "This trip is outside the current forecast window.";
    }

    // Unexpected date gap.
    else {
      status =
        "unavailable";

      message =
        "Weather data is not currently available for these trip dates.";
    }

    const response:
      TripWeatherResponse = {
      status,

      locationName,

      latitude,
      longitude,

      timezone:
        weather.timezone ??
        null,

      tripStartDate:
        trip.start_date,

      tripEndDate:
        trip.end_date,

      forecastStartDate:
        firstForecastDate,

      forecastEndDate:
        lastForecastDate,

      days:
        tripWeatherDays,

      isPartial:
        tripWeatherDays.length >
          0 &&
        tripWeatherDays.length <
          totalTripDays,

      message,
    };

    return NextResponse.json(
      response
    );
  } catch (error) {
    console.error(
      "Weather route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load weather forecast",
      },
      {
        status: 500,
      }
    );
  }
}