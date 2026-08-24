export type TripWeatherStatus =
  | "available"
  | "future"
  | "past"
  | "unavailable";

export type WeatherDay = {
  date: string;

  weatherCode: number;

  temperatureMax: number | null;
  temperatureMin: number | null;

  precipitationProbability: number | null;

  windSpeedMax: number | null;
};

export type TripWeatherResponse = {
  status: TripWeatherStatus;

  locationName: string;

  latitude: number;
  longitude: number;

  timezone: string | null;

  tripStartDate: string;
  tripEndDate: string;

  forecastStartDate: string | null;
  forecastEndDate: string | null;

  days: WeatherDay[];

  isPartial: boolean;

  message: string | null;
};

// Convert WMO weather code to readable text
export function getWeatherDescription(
  code: number
) {
  switch (code) {
    case 0:
      return "Clear sky";

    case 1:
      return "Mainly clear";

    case 2:
      return "Partly cloudy";

    case 3:
      return "Overcast";

    case 45:
    case 48:
      return "Fog";

    case 51:
      return "Light drizzle";

    case 53:
      return "Drizzle";

    case 55:
      return "Heavy drizzle";

    case 56:
    case 57:
      return "Freezing drizzle";

    case 61:
      return "Light rain";

    case 63:
      return "Rain";

    case 65:
      return "Heavy rain";

    case 66:
    case 67:
      return "Freezing rain";

    case 71:
      return "Light snow";

    case 73:
      return "Snow";

    case 75:
      return "Heavy snow";

    case 77:
      return "Snow grains";

    case 80:
      return "Light showers";

    case 81:
      return "Rain showers";

    case 82:
      return "Heavy showers";

    case 85:
      return "Snow showers";

    case 86:
      return "Heavy snow showers";

    case 95:
      return "Thunderstorm";

    case 96:
    case 99:
      return "Thunderstorm with hail";

    default:
      return "Weather";
  }
}

export type WeatherIconKind =
  | "clear"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

// Group weather codes for icons
export function getWeatherIconKind(
  code: number
): WeatherIconKind {
  if (code === 0 || code === 1) {
    return "clear";
  }

  if (
    code === 2 ||
    code === 3
  ) {
    return "cloudy";
  }

  if (
    code === 45 ||
    code === 48
  ) {
    return "fog";
  }

  if (
    [
      71,
      73,
      75,
      77,
      85,
      86,
    ].includes(code)
  ) {
    return "snow";
  }

  if (
    [
      95,
      96,
      99,
    ].includes(code)
  ) {
    return "storm";
  }

  return "rain";
}

// Format forecast date safely
export function formatWeatherDate(
  date: string
) {
  return new Date(
    `${date}T12:00:00`
  ).toLocaleDateString(
    "en-IE",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
    }
  );
}