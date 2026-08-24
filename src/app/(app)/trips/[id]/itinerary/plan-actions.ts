"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

type PlanActionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

type ReorderInput = {
  tripId: string;
  date: string;
  itemIds: string[];
};

type MoveInput = {
  tripId: string;
  itemId: string;
  targetDate: string;
};

type PlannedItemRow = {
  id: string;

  item_type:
    | "activity"
    | "transport"
    | "accommodation";

  planning_status:
    | "planned"
    | "suggested";

  scheduled_date:
    | string
    | null;

  start_time:
    | string
    | null;

  departure_date:
    | string
    | null;

  departure_time:
    | string
    | null;

  arrival_date:
    | string
    | null;

  arrival_time:
    | string
    | null;

  check_in_date:
    | string
    | null;

  check_in_time:
    | string
    | null;

  check_out_date:
    | string
    | null;

  sort_order: number;
};

function getMainDate(
  item: PlannedItemRow
) {
  if (
    item.item_type ===
    "transport"
  ) {
    return item.departure_date;
  }

  if (
    item.item_type ===
    "accommodation"
  ) {
    return item.check_in_date;
  }

  return item.scheduled_date;
}

function getMainTime(
  item: PlannedItemRow
) {
  if (
    item.item_type ===
    "transport"
  ) {
    return item.departure_time;
  }

  if (
    item.item_type ===
    "accommodation"
  ) {
    return item.check_in_time;
  }

  return item.start_time;
}

function addDays(
  date: string,
  days: number
) {
  const value =
    new Date(
      `${date}T00:00:00Z`
    );

  value.setUTCDate(
    value.getUTCDate() +
      days
  );

  return value
    .toISOString()
    .slice(0, 10);
}

function differenceInDays(
  fromDate: string,
  toDate: string
) {
  const from =
    new Date(
      `${fromDate}T00:00:00Z`
    );

  const to =
    new Date(
      `${toDate}T00:00:00Z`
    );

  return Math.round(
    (
      to.getTime() -
      from.getTime()
    ) /
      (
        24 *
        60 *
        60 *
        1000
      )
  );
}

function isDateInTrip(
  date: string,
  startDate: string,
  endDate: string
) {
  return (
    date >= startDate &&
    date <= endDate
  );
}

function refreshTripPlan(
  tripId: string
) {
  revalidatePath(
    `/trips/${tripId}`
  );

  revalidatePath(
    `/trips/${tripId}/itinerary`
  );

  revalidatePath(
    `/trips/${tripId}/map`
  );
}

export async function saveItineraryDayOrder(
  input: ReorderInput
): Promise<PlanActionResult> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    return {
      ok: false,
      error:
        "You are not signed in.",
    };
  }

  const userId =
    data.claims.sub;

  if (
    !input.tripId ||
    !input.date ||
    input.itemIds.length ===
      0
  ) {
    return {
      ok: false,
      error:
        "Invalid itinerary order.",
    };
  }

  // Verify trip ownership.
  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      owner_id,
      start_date,
      end_date
    `)
    .eq(
      "id",
      input.tripId
    )
    .maybeSingle();

  if (
    tripError ||
    !trip
  ) {
    return {
      ok: false,
      error:
        "Trip could not be loaded.",
    };
  }

  if (
    trip.owner_id !==
    userId
  ) {
    return {
      ok: false,
      error:
        "Only the trip creator can reorder the itinerary.",
    };
  }

  if (
    !isDateInTrip(
      input.date,
      trip.start_date,
      trip.end_date
    )
  ) {
    return {
      ok: false,
      error:
        "That day is outside the trip dates.",
    };
  }

  const {
    data: itemData,
    error: itemError,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .select(`
      id,
      item_type,
      planning_status,
      scheduled_date,
      start_time,
      departure_date,
      departure_time,
      arrival_date,
      arrival_time,
      check_in_date,
      check_in_time,
      check_out_date,
      sort_order
    `)
    .eq(
      "trip_id",
      input.tripId
    )
    .eq(
      "planning_status",
      "planned"
    );

  if (itemError) {
    console.error(
      "Failed to load itinerary for reorder:",
      itemError
    );

    return {
      ok: false,
      error:
        "Unable to reorder the itinerary.",
    };
  }

  const items =
    (itemData ??
      []) as PlannedItemRow[];

  const dayItems =
    items.filter(
      (item) =>
        getMainDate(
          item
        ) === input.date
    );

  const uniqueIds = [
    ...new Set(
      input.itemIds
    ),
  ];

  // Require the full exact list of
  // primary items for that day.
  if (
    uniqueIds.length !==
      input.itemIds.length ||
    uniqueIds.length !==
      dayItems.length
  ) {
    return {
      ok: false,
      error:
        "The itinerary changed while you were reordering it. Refresh and try again.",
    };
  }

  const validIds =
    new Set(
      dayItems.map(
        (item) =>
          item.id
      )
    );

  if (
    uniqueIds.some(
      (itemId) =>
        !validIds.has(
          itemId
        )
    )
  ) {
    return {
      ok: false,
      error:
        "One or more itinerary items are invalid.",
    };
  }

  // Save explicit order in gaps of 10,
  // making future inserts easier.
  for (
    let index = 0;
    index <
    input.itemIds.length;
    index += 1
  ) {
    const itemId =
      input.itemIds[
        index
      ];

    const {
      error: updateError,
    } = await supabase
      .from(
        "itinerary_items"
      )
      .update({
        sort_order:
          (
            index + 1
          ) * 10,
      })
      .eq(
        "id",
        itemId
      )
      .eq(
        "trip_id",
        input.tripId
      )
      .eq(
        "planning_status",
        "planned"
      );

    if (updateError) {
      console.error(
        "Failed to save itinerary order:",
        updateError
      );

      return {
        ok: false,
        error:
          "Unable to save the new itinerary order.",
      };
    }
  }

  refreshTripPlan(
    input.tripId
  );

  return {
    ok: true,
  };
}

export async function moveItineraryItemToDate(
  input: MoveInput
): Promise<PlanActionResult> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    return {
      ok: false,
      error:
        "You are not signed in.",
    };
  }

  const userId =
    data.claims.sub;

  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from("trips")
    .select(`
      id,
      owner_id,
      start_date,
      end_date
    `)
    .eq(
      "id",
      input.tripId
    )
    .maybeSingle();

  if (
    tripError ||
    !trip
  ) {
    return {
      ok: false,
      error:
        "Trip could not be loaded.",
    };
  }

  if (
    trip.owner_id !==
    userId
  ) {
    return {
      ok: false,
      error:
        "Only the trip creator can move confirmed itinerary items.",
    };
  }

  if (
    !isDateInTrip(
      input.targetDate,
      trip.start_date,
      trip.end_date
    )
  ) {
    return {
      ok: false,
      error:
        "That day is outside the trip dates.",
    };
  }

  const {
    data: itemData,
    error: itemError,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .select(`
      id,
      item_type,
      planning_status,
      scheduled_date,
      start_time,
      departure_date,
      departure_time,
      arrival_date,
      arrival_time,
      check_in_date,
      check_in_time,
      check_out_date,
      sort_order
    `)
    .eq(
      "id",
      input.itemId
    )
    .eq(
      "trip_id",
      input.tripId
    )
    .maybeSingle();

  if (
    itemError ||
    !itemData
  ) {
    return {
      ok: false,
      error:
        "Itinerary item could not be loaded.",
    };
  }

  const item =
    itemData as PlannedItemRow;

  if (
    item.planning_status !==
    "planned"
  ) {
    return {
      ok: false,
      error:
        "Only confirmed itinerary items can be moved.",
    };
  }

  const currentDate =
    getMainDate(
      item
    );

  if (!currentDate) {
    return {
      ok: false,
      error:
        "This item does not have a current itinerary day.",
    };
  }

  if (
    currentDate ===
    input.targetDate
  ) {
    return {
      ok: true,
    };
  }

  const dayDifference =
    differenceInDays(
      currentDate,
      input.targetDate
    );

  const updatePayload: {
    sort_order: number;

    scheduled_date?: string;

    departure_date?: string;
    arrival_date?:
      | string
      | null;

    check_in_date?: string;
    check_out_date?:
      | string
      | null;
  } = {
    // Zero means the client will place
    // it after explicitly ordered items.
    sort_order: 0,
  };

  if (
    item.item_type ===
    "activity"
  ) {
    updatePayload.scheduled_date =
      input.targetDate;
  }

  if (
    item.item_type ===
    "transport"
  ) {
    const newArrivalDate =
      item.arrival_date
        ? addDays(
            item.arrival_date,
            dayDifference
          )
        : null;

    if (
      newArrivalDate &&
      !isDateInTrip(
        newArrivalDate,
        trip.start_date,
        trip.end_date
      )
    ) {
      return {
        ok: false,
        error:
          "Moving this journey would place its arrival outside the trip dates.",
      };
    }

    updatePayload.departure_date =
      input.targetDate;

    updatePayload.arrival_date =
      newArrivalDate;
  }

  if (
    item.item_type ===
    "accommodation"
  ) {
    const newCheckOutDate =
      item.check_out_date
        ? addDays(
            item.check_out_date,
            dayDifference
          )
        : null;

    if (
      newCheckOutDate &&
      !isDateInTrip(
        newCheckOutDate,
        trip.start_date,
        trip.end_date
      )
    ) {
      return {
        ok: false,
        error:
          "Moving this stay would place its check-out outside the trip dates.",
      };
    }

    updatePayload.check_in_date =
      input.targetDate;

    updatePayload.check_out_date =
      newCheckOutDate;
  }

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from(
      "itinerary_items"
    )
    .update(
      updatePayload
    )
    .eq(
      "id",
      item.id
    )
    .eq(
      "trip_id",
      input.tripId
    )
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !updated
  ) {
    console.error(
      "Failed to move itinerary item:",
      updateError
    );

    return {
      ok: false,
      error:
        "Unable to move the itinerary item.",
    };
  }

  refreshTripPlan(
    input.tripId
  );

  return {
    ok: true,
  };
}