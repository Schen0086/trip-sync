import type {
  TripMapPoint,
} from "@/lib/places";

export type TransportMapRoute = {
  id: string;
  itemId: string;
  departure: TripMapPoint;
  arrival: TripMapPoint;
  startDate: string | null;
  endDate: string | null;
};

type TransportEndpoint =
  | "departure"
  | "arrival";

type ParsedTransportPoint = {
  itemId: string;
  endpoint: TransportEndpoint;
};

function parseTransportPointId(
  pointId: string
): ParsedTransportPoint | null {
  const departurePrefix =
    "transport-departure-";

  const arrivalPrefix =
    "transport-arrival-";

  if (
    pointId.startsWith(
      departurePrefix
    )
  ) {
    return {
      itemId: pointId.slice(
        departurePrefix.length
      ),

      endpoint:
        "departure",
    };
  }

  if (
    pointId.startsWith(
      arrivalPrefix
    )
  ) {
    return {
      itemId: pointId.slice(
        arrivalPrefix.length
      ),

      endpoint:
        "arrival",
    };
  }

  return null;
}

function normaliseRouteDates(
  departureDate: string | null,
  arrivalDate: string | null
) {
  if (
    !departureDate &&
    !arrivalDate
  ) {
    return {
      startDate: null,
      endDate: null,
    };
  }

  if (!departureDate) {
    return {
      startDate:
        arrivalDate,

      endDate:
        arrivalDate,
    };
  }

  if (!arrivalDate) {
    return {
      startDate:
        departureDate,

      endDate:
        departureDate,
    };
  }

  return departureDate <=
    arrivalDate
    ? {
        startDate:
          departureDate,

        endDate:
          arrivalDate,
      }
    : {
        startDate:
          arrivalDate,

        endDate:
          departureDate,
      };
}

export function buildTransportMapRoutes(
  points: TripMapPoint[]
) {
  const grouped =
    new Map<
      string,
      {
        departure?:
          TripMapPoint;

        arrival?:
          TripMapPoint;
      }
    >();

  points.forEach(
    (point) => {
      if (
        point.kind !==
        "transport"
      ) {
        return;
      }

      const parsed =
        parseTransportPointId(
          point.id
        );

      if (!parsed) {
        return;
      }

      const current =
        grouped.get(
          parsed.itemId
        ) ?? {};

      current[
        parsed.endpoint
      ] = point;

      grouped.set(
        parsed.itemId,
        current
      );
    }
  );

  const routes:
    TransportMapRoute[] =
    [];

  grouped.forEach(
    (
      endpoints,
      itemId
    ) => {
      if (
        !endpoints.departure ||
        !endpoints.arrival
      ) {
        return;
      }

      const dates =
        normaliseRouteDates(
          endpoints
            .departure
            .startDate,

          endpoints
            .arrival
            .startDate
        );

      routes.push({
        id:
          `transport-route-${itemId}`,

        itemId,

        departure:
          endpoints.departure,

        arrival:
          endpoints.arrival,

        startDate:
          dates.startDate,

        endDate:
          dates.endDate,
      });
    }
  );

  return routes;
}

export function buildTransportRouteIndex(
  routes:
    TransportMapRoute[]
) {
  const index =
    new Map<
      string,
      TransportMapRoute
    >();

  routes.forEach(
    (route) => {
      index.set(
        route.departure.id,
        route
      );

      index.set(
        route.arrival.id,
        route
      );
    }
  );

  return index;
}

export function transportRouteMatchesDay(
  route:
    TransportMapRoute,

  day: string
) {
  if (
    !route.startDate
  ) {
    return false;
  }

  const endDate =
    route.endDate ??
    route.startDate;

  return (
    day >=
      route.startDate &&
    day <=
      endDate
  );
}

export function buildTransportRouteGeoJson(
  routes:
    TransportMapRoute[]
) {
  return {
    type:
      "FeatureCollection" as const,

    features:
      routes.map(
        (route) => ({
          type:
            "Feature" as const,

          properties: {
            id:
              route.id,

            itemId:
              route.itemId,
          },

          geometry: {
            type:
              "LineString" as const,

            coordinates: [
              [
                route
                  .departure
                  .longitude,

                route
                  .departure
                  .latitude,
              ],

              [
                route
                  .arrival
                  .longitude,

                route
                  .arrival
                  .latitude,
              ],
            ],
          },
        })
      ),
  };
}