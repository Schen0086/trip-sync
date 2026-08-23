import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isPlaceCategory,
  type PlaceCategory,
} from "@/lib/places";

type GeoapifyPlaceFeature = {
  geometry?: {
    coordinates?: [
      number,
      number
    ];
  };

  properties?: {
    place_id?: string;
    name?: string;
    formatted?: string;
    address_line1?: string;

    lat?: number;
    lon?: number;

    distance?: number;

    categories?: string[];
  };
};

const GEOAPIFY_CATEGORIES: Record<
  Exclude<PlaceCategory, "other">,
  string
> = {
  food_drink:
    "catering.restaurant,catering.cafe,catering.fast_food,catering.bar,catering.pub",

  attraction:
    "tourism.attraction,tourism.sights,entertainment.museum,heritage",

  nightlife:
    "catering.bar,catering.pub,catering.taproom,adult.nightclub",

  activity:
    "entertainment,activity,sport,leisure",

  shopping:
    "commercial",

  accommodation:
    "accommodation",
};

export async function GET(
  request: Request
) {
  const supabase =
    await createClient();

  // Require authentication
  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const apiKey =
    process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Place discovery is not configured",
      },
      {
        status: 503,
      }
    );
  }

  const { searchParams } =
    new URL(request.url);

  const latitude = Number(
    searchParams.get("lat")
  );

  const longitude = Number(
    searchParams.get("lon")
  );

  const categoryValue =
    searchParams.get("category") ??
    "";

  const name =
    searchParams
      .get("name")
      ?.trim()
      .slice(0, 80) ?? "";

  const requestedRadius = Number(
    searchParams.get("radius") ??
      "5000"
  );

  // Validate centre
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid search location",
      },
      {
        status: 400,
      }
    );
  }

  // Validate category
  if (
    !isPlaceCategory(
      categoryValue
    ) ||
    categoryValue === "other"
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid discovery category",
      },
      {
        status: 400,
      }
    );
  }

  const category =
    categoryValue as Exclude<
      PlaceCategory,
      "other"
    >;

  // Keep radius reasonable
  const radius = Math.min(
    Math.max(
      Number.isFinite(
        requestedRadius
      )
        ? requestedRadius
        : 5000,
      1000
    ),
    20000
  );

  const params =
    new URLSearchParams({
      categories:
        GEOAPIFY_CATEGORIES[
          category
        ],

      filter:
        `circle:${longitude},${latitude},${radius}`,

      bias:
        `proximity:${longitude},${latitude}`,

      limit: "18",
      lang: "en",
      apiKey,
    });

  if (name) {
    params.set("name", name);
  }

  const baseUrl =
    "https://" +
    "api.geoapify.com";

  try {
    const response = await fetch(
      `${baseUrl}/v2/places?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Geoapify Places request failed:",
        response.status
      );

      return NextResponse.json(
        {
          error:
            "Unable to discover places",
        },
        {
          status: 502,
        }
      );
    }

    const result =
      (await response.json()) as {
        features?: GeoapifyPlaceFeature[];
      };

    const places =
      result.features
        ?.map((feature) => {
          const properties =
            feature.properties ?? {};

          const coordinates =
            feature.geometry
              ?.coordinates;

          const latitudeValue =
            properties.lat ??
            coordinates?.[1];

          const longitudeValue =
            properties.lon ??
            coordinates?.[0];

          if (
            latitudeValue ===
              undefined ||
            longitudeValue ===
              undefined
          ) {
            return null;
          }

          const placeName =
            properties.name ??
            properties.address_line1 ??
            properties.formatted ??
            "Place";

          return {
            placeId:
              properties.place_id ??
              `${longitudeValue}-${latitudeValue}-${placeName}`,

            name: placeName,

            address:
              properties.formatted ??
              properties.address_line1 ??
              null,

            latitude:
              latitudeValue,

            longitude:
              longitudeValue,

            distanceMeters:
              properties.distance ??
              null,

            categories:
              properties.categories ??
              [],
          };
        })
        .filter(
          (
            place
          ): place is NonNullable<
            typeof place
          > => place !== null
        ) ?? [];

    return NextResponse.json({
      places,
    });
  } catch (error) {
    console.error(
      "Place discovery error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to discover places",
      },
      {
        status: 500,
      }
    );
  }
}