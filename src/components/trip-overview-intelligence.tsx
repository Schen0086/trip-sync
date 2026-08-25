import Link from "next/link";

import Avatar from "@/components/avatar";

import {
  calculateExpenseSummary,
  formatMoney,
  type Expense,
  type ExpenseSettlement,
  type ExpenseSplit,
} from "@/lib/expenses";

import {
  formatActivityTimestamp,
  getActivityCategoryLabel,
  normalizeActivityActorProfile,
  type TripActivityEvent,
} from "@/lib/activity";

import type {
  TripLifecycle,
} from "@/lib/trip-utils";

import {
  createClient,
} from "@/lib/supabase/server";


type TripOverviewIntelligenceProps = {
  tripId: string;
  userId: string;

  tripStartDate: string;
  tripEndDate: string;

  tripType: string;

  lifecycle:
    TripLifecycle;

  isTripCreator: boolean;

  isCurrentUserAttending:
    boolean;
};


type OverviewTaskRow = {
  id: string;
  title: string;

  assigned_to:
    | string
    | null;

  due_date:
    | string
    | null;

  priority: string;
  status: string;
};


type OverviewPackingRow = {
  id: string;
  name: string;

  scope: string;

  owner_user_id:
    | string
    | null;

  assigned_to:
    | string
    | null;

  is_packed: boolean;

  is_system_required:
    boolean;
};


type OverviewItineraryRow = {
  id: string;
  title: string;

  item_type: string;

  planning_status: string;
  origin: string;

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

  check_in_date:
    | string
    | null;

  check_in_time:
    | string
    | null;
};


type AttentionPriority =
  | "urgent"
  | "attention"
  | "info";


type AttentionItem = {
  id: string;
  category: string;

  title: string;
  detail: string;

  href: string;

  count: number;

  priority:
    AttentionPriority;
};


type UpcomingItem = {
  id: string;

  type:
    | "Itinerary"
    | "Task";

  title: string;
  detail: string;

  date: string;

  time:
    | string
    | null;

  href: string;
};


function daysBetween(
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


function getTimingLabel(
  lifecycle:
    TripLifecycle,
  today: string,
  startDate: string,
  endDate: string
) {
  if (
    lifecycle ===
    "cancelled"
  ) {
    return "Trip cancelled";
  }


  if (
    lifecycle ===
    "past"
  ) {
    return "Trip completed";
  }


  if (
    lifecycle ===
    "ongoing"
  ) {
    const daysRemaining =
      daysBetween(
        today,
        endDate
      );


    if (
      daysRemaining <= 0
    ) {
      return "Final day";
    }


    return `${daysRemaining} ${
      daysRemaining === 1
        ? "day"
        : "days"
    } remaining`;
  }


  const daysUntil =
    daysBetween(
      today,
      startDate
    );


  if (
    daysUntil === 1
  ) {
    return "Tomorrow";
  }


  return `${daysUntil} days away`;
}


function getItineraryDate(
  item:
    OverviewItineraryRow
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


function getItineraryTime(
  item:
    OverviewItineraryRow
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


function getItineraryTypeLabel(
  itemType: string
) {
  switch (
    itemType
  ) {
    case "transport":
      return "Transport";

    case "accommodation":
      return "Accommodation";

    default:
      return "Activity";
  }
}


function formatOverviewDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00Z`
  ).toLocaleDateString(
    "en-IE",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }
  );
}


function formatOverviewTime(
  value:
    | string
    | null
) {
  if (!value) {
    return null;
  }


  return value.slice(
    0,
    5
  );
}


function getProgress(
  completed: number,
  total: number
) {
  if (
    total === 0
  ) {
    return 0;
  }


  return Math.round(
    (
      completed /
      total
    ) *
      100
  );
}


function attentionClasses(
  priority:
    AttentionPriority
) {
  if (
    priority ===
    "urgent"
  ) {
    return "border-danger-border bg-danger-surface";
  }


  if (
    priority ===
    "attention"
  ) {
    return "border-brand-500 bg-brand-50";
  }


  return "border-line bg-surface-soft";
}


function ProgressCard({
  title,
  value,
  detail,
  href,
  progress,
}: {
  title: string;
  value: string;
  detail: string;
  href: string;

  progress?:
    number;
}) {
  return (
    <Link
      href={
        href
      }
      className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-500 hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
    >
      <p className="text-sm text-muted">
        {
          title
        }
      </p>


      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {
          value
        }
      </p>


      {progress !==
        undefined && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-soft">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{
              width:
                `${Math.min(
                  100,
                  Math.max(
                    0,
                    progress
                  )
                )}%`,
            }}
          />
        </div>
      )}


      <p className="mt-3 text-sm leading-5 text-muted">
        {
          detail
        }
      </p>
    </Link>
  );
}


export default async function TripOverviewIntelligence({
  tripId,
  userId,
  tripStartDate,
  tripEndDate,
  tripType,
  lifecycle,
  isTripCreator,
  isCurrentUserAttending,
}: TripOverviewIntelligenceProps) {
  const supabase =
    await createClient();


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  // -------------------------------------------------------
  // LOAD TRIP INTELLIGENCE DATA
  // -------------------------------------------------------

  const [
    taskResult,
    packingResult,
    itineraryResult,
    placesResult,
    expenseResult,
    settlementResult,
    activityResult,
  ] = await Promise.all([
    supabase
      .from(
        "trip_tasks"
      )
      .select(`
        id,
        title,
        assigned_to,
        due_date,
        priority,
        status
      `)
      .eq(
        "trip_id",
        tripId
      ),

    supabase
      .from(
        "packing_items"
      )
      .select(`
        id,
        name,
        scope,
        owner_user_id,
        assigned_to,
        is_packed,
        is_system_required
      `)
      .eq(
        "trip_id",
        tripId
      ),

    supabase
      .from(
        "itinerary_items"
      )
      .select(`
        id,
        title,
        item_type,
        planning_status,
        origin,
        scheduled_date,
        start_time,
        departure_date,
        departure_time,
        check_in_date,
        check_in_time
      `)
      .eq(
        "trip_id",
        tripId
      ),

    supabase
      .from(
        "saved_places"
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        }
      )
      .eq(
        "trip_id",
        tripId
      ),

    supabase
      .from(
        "expenses"
      )
      .select("*")
      .eq(
        "trip_id",
        tripId
      ),

    supabase
      .from(
        "expense_settlements"
      )
      .select("*")
      .eq(
        "trip_id",
        tripId
      ),

    // Recent activity resolves the actor's
    // current profile and avatar directly.
    supabase
      .from(
        "trip_activity"
      )
      .select(`
        id,
        trip_id,
        actor_user_id,
        actor_profile:profiles!trip_activity_actor_user_id_fkey (
          display_name,
          avatar_url
        ),
        category,
        event_type,
        entity_type,
        entity_id,
        action,
        subject,
        detail,
        href,
        created_at
      `)
      .eq(
        "trip_id",
        tripId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(5),
  ]);


  if (
    taskResult.error
  ) {
    console.error(
      "Failed to load overview tasks:",
      taskResult.error
    );
  }


  if (
    packingResult.error
  ) {
    console.error(
      "Failed to load overview packing:",
      packingResult.error
    );
  }


  if (
    itineraryResult.error
  ) {
    console.error(
      "Failed to load overview itinerary:",
      itineraryResult.error
    );
  }


  if (
    placesResult.error
  ) {
    console.error(
      "Failed to load overview places:",
      placesResult.error
    );
  }


  if (
    expenseResult.error
  ) {
    console.error(
      "Failed to load overview expenses:",
      expenseResult.error
    );
  }


  if (
    settlementResult.error
  ) {
    console.error(
      "Failed to load overview settlements:",
      settlementResult.error
    );
  }


  if (
    activityResult.error
  ) {
    console.error(
      "Failed to load overview activity:",
      activityResult.error
    );
  }


  const tasks =
    (
      taskResult.data ??
      []
    ) as OverviewTaskRow[];


  const packing =
    (
      packingResult.data ??
      []
    ) as OverviewPackingRow[];


  const itinerary =
    (
      itineraryResult.data ??
      []
    ) as OverviewItineraryRow[];


  const expenses =
    (
      expenseResult.data ??
      []
    ) as Expense[];


  const settlements =
    (
      settlementResult.data ??
      []
    ) as ExpenseSettlement[];


  const recentActivity:
    TripActivityEvent[] =
      (
        activityResult.data ??
        []
      ).map(
        (event) => ({
          ...event,

          actor_profile:
            normalizeActivityActorProfile(
              event.actor_profile
            ),
        })
      );


  // -------------------------------------------------------
  // EXPENSE SPLITS
  // -------------------------------------------------------

  const expenseIds =
    expenses.map(
      (expense) =>
        expense.id
    );


  let splits:
    ExpenseSplit[] = [];


  if (
    expenseIds.length >
    0
  ) {
    const {
      data:
        splitData,
      error:
        splitError,
    } = await supabase
      .from(
        "expense_splits"
      )
      .select("*")
      .in(
        "expense_id",
        expenseIds
      );


    if (
      splitError
    ) {
      console.error(
        "Failed to load overview expense splits:",
        splitError
      );
    }


    splits =
      (
        splitData ??
        []
      ) as ExpenseSplit[];
  }


  const expenseSummary =
    calculateExpenseSummary(
      expenses,
      splits,
      settlements
    );


  // -------------------------------------------------------
  // ITINERARY + VOTING
  // -------------------------------------------------------

  const plannedItems =
    itinerary.filter(
      (item) =>
        item.planning_status ===
        "planned"
    );


  const activeSuggestions =
    itinerary.filter(
      (item) =>
        item.origin ===
          "suggestion" &&
        item.planning_status ===
          "suggested"
    );


  const userVotedIds =
    new Set<string>();


  if (
    tripType ===
      "group" &&
    isCurrentUserAttending &&
    activeSuggestions.length >
      0
  ) {
    const {
      data:
        voteRows,
      error:
        voteError,
    } = await supabase
      .from(
        "itinerary_votes"
      )
      .select(
        "item_id"
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "item_id",
        activeSuggestions.map(
          (item) =>
            item.id
        )
      );


    if (
      voteError
    ) {
      console.error(
        "Failed to load overview votes:",
        voteError
      );
    }


    voteRows?.forEach(
      (vote) => {
        userVotedIds.add(
          vote.item_id
        );
      }
    );
  }


  const pendingVotes =
    tripType ===
      "group" &&
    isCurrentUserAttending
      ? activeSuggestions.filter(
          (item) =>
            !userVotedIds.has(
              item.id
            )
        )
      : [];


  // -------------------------------------------------------
  // TASK PROGRESS
  // -------------------------------------------------------

  const completedTasks =
    tasks.filter(
      (task) =>
        task.status ===
        "completed"
    );


  const openTasks =
    tasks.filter(
      (task) =>
        task.status ===
        "open"
    );


  const assignedTasks =
    openTasks.filter(
      (task) =>
        task.assigned_to ===
        userId
    );


  const overdueTasks =
    assignedTasks.filter(
      (task) =>
        Boolean(
          task.due_date &&
          task.due_date <
            today
        )
    );


  // -------------------------------------------------------
  // PACKING PROGRESS
  // -------------------------------------------------------

  // Shared packing is visible across the trip.
  // Required/personal packing is only counted
  // for the current user.
  const relevantPacking =
    packing.filter(
      (item) =>
        item.scope ===
          "shared" ||
        item.owner_user_id ===
          userId
    );


  const packedItems =
    relevantPacking.filter(
      (item) =>
        item.is_packed
    );


  const assignedPacking =
    packing.filter(
      (item) =>
        item.scope ===
          "shared" &&
        item.assigned_to ===
          userId &&
        !item.is_packed
    );


  const requiredPacking =
    packing.filter(
      (item) =>
        item.scope ===
          "required" &&
        item.owner_user_id ===
          userId &&
        item.is_system_required &&
        !item.is_packed
    );


  // -------------------------------------------------------
  // TRIP TIMING
  // -------------------------------------------------------

  const daysUntil =
    daysBetween(
      today,
      tripStartDate
    );


  const isActiveTrip =
    lifecycle ===
      "upcoming" ||
    lifecycle ===
      "ongoing";


  const shouldShowRequiredPacking =
    lifecycle ===
      "ongoing" ||
    (
      lifecycle ===
        "upcoming" &&
      daysUntil >= 0 &&
      daysUntil <= 30
    );


  // -------------------------------------------------------
  // NEEDS YOUR ATTENTION
  // -------------------------------------------------------

  const attentionItems:
    AttentionItem[] = [];


  if (
    isActiveTrip &&
    assignedTasks.length >
      0
  ) {
    attentionItems.push({
      id:
        "tasks",

      category:
        "Tasks",

      title:
        overdueTasks.length >
        0
          ? `${overdueTasks.length} overdue ${
              overdueTasks.length ===
              1
                ? "task"
                : "tasks"
            }`
          : `${assignedTasks.length} ${
              assignedTasks.length ===
              1
                ? "responsibility"
                : "responsibilities"
            } assigned to you`,

      detail:
        overdueTasks.length >
        0
          ? `${assignedTasks.length} open ${
              assignedTasks.length ===
              1
                ? "task is"
                : "tasks are"
            } currently assigned to you.`
          : "Open the task list to see what you are responsible for.",

      href:
        `/trips/${tripId}/tasks`,

      count:
        assignedTasks.length,

      priority:
        overdueTasks.length >
        0
          ? "urgent"
          : "attention",
    });
  }


  if (
    isActiveTrip &&
    assignedPacking.length >
      0
  ) {
    attentionItems.push({
      id:
        "shared-packing",

      category:
        "Packing",

      title:
        `${assignedPacking.length} shared ${
          assignedPacking.length ===
          1
            ? "item is"
            : "items are"
        } your responsibility`,

      detail:
        "These shared packing items are assigned specifically to you.",

      href:
        `/trips/${tripId}/packing`,

      count:
        assignedPacking.length,

      priority:
        daysUntil <= 7 ||
        lifecycle ===
          "ongoing"
          ? "urgent"
          : "attention",
    });
  }


  if (
    isActiveTrip &&
    shouldShowRequiredPacking &&
    requiredPacking.length >
      0
  ) {
    attentionItems.push({
      id:
        "required-packing",

      category:
        "Packing",

      title:
        `${requiredPacking.length} required ${
          requiredPacking.length ===
          1
            ? "item"
            : "items"
        } still to confirm`,

      detail:
        lifecycle ===
        "ongoing"
          ? "The trip is currently in progress."
          : `The trip begins in ${daysUntil} ${
              daysUntil ===
              1
                ? "day"
                : "days"
            }.`,

      href:
        `/trips/${tripId}/packing`,

      count:
        requiredPacking.length,

      priority:
        daysUntil <= 7 ||
        lifecycle ===
          "ongoing"
          ? "urgent"
          : "info",
    });
  }


  if (
    isActiveTrip &&
    pendingVotes.length >
      0
  ) {
    attentionItems.push({
      id:
        "pending-votes",

      category:
        "Voting",

      title:
        `${pendingVotes.length} ${
          pendingVotes.length ===
          1
            ? "suggestion is"
            : "suggestions are"
        } waiting for your vote`,

      detail:
        "The group has open ideas that you have not responded to yet.",

      href:
        `/trips/${tripId}/voting`,

      count:
        pendingVotes.length,

      priority:
        "attention",
    });
  }


  expenseSummary.forEach(
    (currency) => {
      const userDebts =
        currency.debts.filter(
          (debt) =>
            debt.fromUserId ===
            userId
        );


      if (
        userDebts.length ===
        0
      ) {
        return;
      }


      const totalOwed =
        userDebts.reduce(
          (
            total,
            debt
          ) =>
            total +
            debt.amount,
          0
        );


      attentionItems.push({
        id:
          `expenses-${currency.currency}`,

        category:
          "Expenses",

        title:
          `You owe ${formatMoney(
            totalOwed,
            currency.currency
          )}`,

        detail:
          userDebts.length ===
          1
            ? "There is an outstanding trip balance to settle."
            : `This is split across ${userDebts.length} outstanding balances.`,

        href:
          `/trips/${tripId}/expenses`,

        count:
          userDebts.length,

        priority:
          "attention",
      });
    }
  );


  if (
    isActiveTrip &&
    isTripCreator &&
    plannedItems.length ===
      0 &&
    (
      lifecycle ===
        "ongoing" ||
      (
        daysUntil >= 0 &&
        daysUntil <= 30
      )
    )
  ) {
    attentionItems.push({
      id:
        "empty-itinerary",

      category:
        "Itinerary",

      title:
        "No confirmed itinerary yet",

      detail:
        lifecycle ===
        "ongoing"
          ? "This trip is already in progress and has no confirmed itinerary items."
          : `The trip begins in ${daysUntil} ${
              daysUntil ===
              1
                ? "day"
                : "days"
            }.`,

      href:
        `/trips/${tripId}/itinerary`,

      count:
        1,

      priority:
        daysUntil <= 7 ||
        lifecycle ===
          "ongoing"
          ? "urgent"
          : "info",
    });
  }


  const priorityWeight: Record<
    AttentionPriority,
    number
  > = {
    urgent:
      0,

    attention:
      1,

    info:
      2,
  };


  attentionItems.sort(
    (
      first,
      second
    ) =>
      priorityWeight[
        first.priority
      ] -
      priorityWeight[
        second.priority
      ]
  );


  const attentionCount =
    attentionItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.count,
      0
    );


  // -------------------------------------------------------
  // COMING UP
  // -------------------------------------------------------

  const upcoming:
    UpcomingItem[] = [];


  plannedItems.forEach(
    (item) => {
      const date =
        getItineraryDate(
          item
        );


      if (
        !date ||
        date < today
      ) {
        return;
      }


      upcoming.push({
        id:
          `itinerary-${item.id}`,

        type:
          "Itinerary",

        title:
          item.title,

        detail:
          getItineraryTypeLabel(
            item.item_type
          ),

        date,

        time:
          getItineraryTime(
            item
          ),

        href:
          `/trips/${tripId}/itinerary`,
      });
    }
  );


  assignedTasks.forEach(
    (task) => {
      if (
        !task.due_date ||
        task.due_date <
          today
      ) {
        return;
      }


      upcoming.push({
        id:
          `task-${task.id}`,

        type:
          "Task",

        title:
          task.title,

        detail:
          task.priority ===
          "high"
            ? "High priority responsibility"
            : "Responsibility",

        date:
          task.due_date,

        time:
          null,

        href:
          `/trips/${tripId}/tasks`,
      });
    }
  );


  upcoming.sort(
    (
      first,
      second
    ) => {
      const dateOrder =
        first.date.localeCompare(
          second.date
        );


      if (
        dateOrder !==
        0
      ) {
        return dateOrder;
      }


      return (
        first.time ??
        "99:99"
      ).localeCompare(
        second.time ??
        "99:99"
      );
    }
  );


  const upcomingPreview =
    upcoming.slice(
      0,
      6
    );


  // -------------------------------------------------------
  // PROGRESS
  // -------------------------------------------------------

  const taskProgress =
    getProgress(
      completedTasks.length,
      tasks.length
    );


  const packingProgress =
    getProgress(
      packedItems.length,
      relevantPacking.length
    );


  const placeCount =
    placesResult.count ??
    0;


  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <section className="mt-10">
      {/* Intelligence heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Trip overview
          </h2>

          <p className="mt-1 text-sm text-muted">
            What&apos;s ready,
            what needs attention,
            and what&apos;s coming
            up.
          </p>
        </div>


        <span className="w-fit rounded-full border border-line bg-surface-soft px-3 py-1.5 text-sm font-medium text-ink">
          {getTimingLabel(
            lifecycle,
            today,
            tripStartDate,
            tripEndDate
          )}
        </span>
      </div>


      {/* Needs your attention */}
      <details
        open
        className="group/attention mt-6 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-ink">
                Needs your
                attention
              </h3>


              {attentionCount >
                0 && (
                <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-brand-contrast">
                  {
                    attentionCount
                  }
                </span>
              )}
            </div>


            <p className="mt-1 text-sm text-muted">
              {attentionCount >
              0
                ? "Items on this trip that involve you directly."
                : "Nothing currently needs your attention."}
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
            className="h-5 w-5 shrink-0 text-muted transition-transform group-open/attention:rotate-180"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>


        <div className="border-t border-line p-4 sm:p-6">
          {attentionItems.length ===
          0 ? (
            <div className="rounded-xl border border-success-border bg-success-surface px-4 py-4">
              <p className="font-medium text-success-text">
                You&apos;re
                caught up
              </p>

              <p className="mt-1 text-sm text-success-text">
                There are no
                outstanding
                actions for you
                on this trip
                right now.
              </p>
            </div>
          ) : (
            <div className="grid items-start gap-3 md:grid-cols-2">
              {attentionItems.map(
                (item) => (
                  <Link
                    key={
                      item.id
                    }
                    href={
                      item.href
                    }
                    className={`rounded-xl border p-4 transition hover:opacity-90 ${attentionClasses(
                      item.priority
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted">
                          {
                            item.category
                          }
                        </span>

                        <h4 className="mt-1 font-semibold text-ink">
                          {
                            item.title
                          }
                        </h4>

                        <p className="mt-1 text-sm leading-5 text-muted">
                          {
                            item.detail
                          }
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-medium text-brand-700">
                        →
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </details>


      {/* Planning progress */}
      <section className="mt-8">
        <div>
          <h3 className="text-xl font-semibold text-ink">
            Planning progress
          </h3>

          <p className="mt-1 text-sm text-muted">
            A quick look across
            the main parts of
            this trip.
          </p>
        </div>


        <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProgressCard
            title="Itinerary"
            value={`${plannedItems.length} planned`}
            detail={
              tripType ===
                "group" &&
              activeSuggestions.length >
                0
                ? `${activeSuggestions.length} ${
                    activeSuggestions.length ===
                    1
                      ? "suggestion"
                      : "suggestions"
                  } still open`
                : plannedItems.length >
                    0
                  ? "Confirmed plans for this trip"
                  : "No confirmed plans yet"
            }
            href={`/trips/${tripId}/itinerary`}
          />


          <ProgressCard
            title="Tasks"
            value={
              tasks.length >
              0
                ? `${completedTasks.length}/${tasks.length}`
                : "0"
            }
            detail={
              tasks.length >
              0
                ? `${taskProgress}% complete`
                : "No responsibilities added yet"
            }
            href={`/trips/${tripId}/tasks`}
            progress={
              tasks.length >
              0
                ? taskProgress
                : undefined
            }
          />


          <ProgressCard
            title="Packing"
            value={
              relevantPacking.length >
              0
                ? `${packedItems.length}/${relevantPacking.length}`
                : "0"
            }
            detail={
              relevantPacking.length >
              0
                ? `${packingProgress}% ready across your and shared items`
                : "No packing items yet"
            }
            href={`/trips/${tripId}/packing`}
            progress={
              relevantPacking.length >
              0
                ? packingProgress
                : undefined
            }
          />


          <ProgressCard
            title="Places"
            value={`${placeCount} saved`}
            detail={
              placeCount ===
              0
                ? "Start discovering places for the trip"
                : "Places collected for planning"
            }
            href={`/trips/${tripId}/places`}
          />
        </div>
      </section>


      {/* Coming up + Spending */}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        {/* Coming up */}
        <details className="group/comingup overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-ink">
                  Coming up
                </h3>


                {upcomingPreview.length >
                  0 && (
                  <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                    {
                      upcomingPreview.length
                    }
                  </span>
                )}
              </div>


              <p className="mt-1 text-sm text-muted">
                {upcomingPreview.length >
                0
                  ? `${upcomingPreview.length} upcoming ${
                      upcomingPreview.length ===
                      1
                        ? "item"
                        : "items"
                    }`
                  : "No upcoming events or deadlines"}
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
              className="h-5 w-5 shrink-0 text-muted transition-transform group-open/comingup:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>


          <div className="border-t border-line p-5 sm:p-6">
            {upcomingPreview.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-line p-6 text-center">
                <p className="font-medium text-ink">
                  Nothing
                  scheduled yet
                </p>

                <p className="mt-1 text-sm text-muted">
                  Planned
                  itinerary items
                  and your task
                  deadlines will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {upcomingPreview.map(
                  (item) => {
                    const time =
                      formatOverviewTime(
                        item.time
                      );


                    return (
                      <Link
                        key={
                          item.id
                        }
                        href={
                          item.href
                        }
                        className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-line bg-surface-soft px-2 py-0.5 text-xs font-medium text-muted">
                              {
                                item.type
                              }
                            </span>

                            <span className="text-xs text-subtle">
                              {formatOverviewDate(
                                item.date
                              )}

                              {time
                                ? ` · ${time}`
                                : ""}
                            </span>
                          </div>


                          <p className="mt-2 font-medium text-ink">
                            {
                              item.title
                            }
                          </p>

                          <p className="mt-1 text-sm text-muted">
                            {
                              item.detail
                            }
                          </p>
                        </div>


                        <span className="shrink-0 text-brand-700">
                          →
                        </span>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </details>


        {/* Spending */}
        <details className="group/spending overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-ink">
                  Spending
                </h3>


                {expenseSummary.length >
                  0 && (
                  <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                    {
                      expenses.length
                    }
                  </span>
                )}
              </div>


              <p className="mt-1 text-sm text-muted">
                {expenseSummary.length >
                0
                  ? `${expenses.length} ${
                      expenses.length ===
                      1
                        ? "expense"
                        : "expenses"
                    } recorded`
                  : "No expenses recorded yet"}
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
              className="h-5 w-5 shrink-0 text-muted transition-transform group-open/spending:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>


          <div className="border-t border-line p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm text-muted">
                Trip totals and
                your current
                balance.
              </p>

              <Link
                href={`/trips/${tripId}/expenses`}
                className="shrink-0 text-sm font-medium text-brand-700"
              >
                Open →
              </Link>
            </div>


            {expenseSummary.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-line p-6 text-center">
                <p className="font-medium text-ink">
                  No expenses yet
                </p>

                <p className="mt-1 text-sm text-muted">
                  Shared spending
                  and balances
                  will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenseSummary.map(
                  (currency) => {
                    const balance =
                      currency
                        .balances[
                        userId
                      ] ??
                      0;


                    return (
                      <div
                        key={
                          currency.currency
                        }
                        className="rounded-xl border border-line bg-surface-soft p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted">
                              {
                                currency.currency
                              }
                            </p>

                            <p className="mt-1 text-lg font-semibold text-ink">
                              {formatMoney(
                                currency.totalSpent,
                                currency.currency
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-muted">
                              Total trip
                              spending
                            </p>
                          </div>


                          <div className="text-right">
                            <p
                              className={
                                balance <
                                -0.005
                                  ? "font-semibold text-danger-text"
                                  : balance >
                                      0.005
                                    ? "font-semibold text-brand-700"
                                    : "font-semibold text-ink"
                              }
                            >
                              {balance <
                              -0.005
                                ? `You owe ${formatMoney(
                                    Math.abs(
                                      balance
                                    ),
                                    currency.currency
                                  )}`
                                : balance >
                                    0.005
                                  ? `You're owed ${formatMoney(
                                      balance,
                                      currency.currency
                                    )}`
                                  : "Settled"}
                            </p>

                            <p className="mt-0.5 text-xs text-muted">
                              Your balance
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}


                <p className="pt-1 text-xs text-subtle">
                  {
                    expenses.length
                  }{" "}
                  {expenses.length ===
                  1
                    ? "expense"
                    : "expenses"}{" "}
                  recorded.
                  Different
                  currencies are
                  kept separate.
                </p>
              </div>
            )}
          </div>
        </details>
      </div>


      {/* Recent activity */}
      <details className="group/activity mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-6">
          <div>
            <h3 className="text-xl font-semibold text-ink">
              Recent activity
            </h3>

            <p className="mt-1 text-sm text-muted">
              The latest
              collaborative
              changes on this
              trip.
            </p>
          </div>


          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
              {
                recentActivity.length
              }
            </span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5 text-muted transition-transform group-open/activity:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </summary>


        <div className="border-t border-line p-4 sm:p-6">
          {recentActivity.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center">
              <p className="font-medium text-ink">
                No activity yet
              </p>

              <p className="mt-1 text-sm text-muted">
                New planning
                changes will
                appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-line">
                {recentActivity.map(
                  (event) => {
                    const actorName =
                      event.actor_user_id
                        ? event
                            .actor_profile
                            ?.display_name ??
                          "Traveller"
                        : "TripSync";


                    const avatarUrl =
                      event.actor_user_id
                        ? event
                            .actor_profile
                            ?.avatar_url ??
                          null
                        : null;


                    const displayedActor =
                      event.actor_user_id ===
                      userId
                        ? `${actorName} (You)`
                        : actorName;


                    return (
                      <div
                        key={
                          event.id
                        }
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            {/* Category + timestamp */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-line bg-surface-soft px-2 py-0.5 text-xs font-medium text-muted">
                                {getActivityCategoryLabel(
                                  event.category
                                )}
                              </span>

                              <span className="text-xs text-subtle">
                                {formatActivityTimestamp(
                                  event.created_at
                                )}
                              </span>
                            </div>


                            {/* Actor */}
                            <div className="mt-3 flex items-start gap-3">
                              <Avatar
                                src={
                                  avatarUrl
                                }
                                displayName={
                                  actorName
                                }
                                size="sm"
                              />


                              <div className="min-w-0">
                                <p className="text-sm leading-6 text-ink">
                                  <span className="font-semibold">
                                    {
                                      displayedActor
                                    }
                                  </span>{" "}

                                  {
                                    event.action
                                  }{" "}

                                  <span className="font-semibold">
                                    {
                                      event.subject
                                    }
                                  </span>
                                  .
                                </p>


                                {event.detail && (
                                  <p className="mt-1 text-sm text-muted">
                                    {
                                      event.detail
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>


                          {event.href && (
                            <Link
                              href={
                                event.href
                              }
                              className="shrink-0 text-sm font-medium text-brand-700"
                            >
                              Open →
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>


              <div className="mt-5 border-t border-line pt-4">
                <Link
                  href={`/trips/${tripId}/activity`}
                  className="text-sm font-medium text-brand-700"
                >
                  View all
                  activity →
                </Link>
              </div>
            </>
          )}
        </div>
      </details>
    </section>
  );
}