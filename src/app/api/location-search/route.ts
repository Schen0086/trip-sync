import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GeoapifyResult = {
  place_id?: string;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  lat?: number;
  lon?: number;
};

export async function GET(
  request: Request
) {
  const supabase = await createClient();

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
          "Location search is not configured",
      },
      {
        status: 503,
      }
    );
  }

  const { searchParams } =
    new URL(request.url);

  const query =
    searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({
      results: [],
    });
  }

  const params =
    new URLSearchParams({
      text: query,
      format: "json",
      limit: "6",
      lang: "en",
      apiKey,
    });

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Geoapify request failed:",
        response.status
      );

      return NextResponse.json(
        {
          error:
            "Unable to search locations",
        },
        {
          status: 502,
        }
      );
    }

    const result = (await response.json()) as {
      results?: GeoapifyResult[];
    };

    const locations =
      result.results?.map((place) => ({
        id:
          place.place_id ??
          `${place.lat}-${place.lon}-${place.formatted}`,

        name:
          place.name ??
          place.address_line1 ??
          place.formatted ??
          "Location",

        formatted:
          place.formatted ??
          [
            place.address_line1,
            place.address_line2,
            place.city,
            place.country,
          ]
            .filter(Boolean)
            .join(", "),

        latitude:
          place.lat ?? null,

        longitude:
          place.lon ?? null,
      })) ?? [];

    return NextResponse.json({
      results: locations,
    });
  } catch (error) {
    console.error(
      "Location search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to search locations",
      },
      {
        status: 500,
      }
    );
  }
}