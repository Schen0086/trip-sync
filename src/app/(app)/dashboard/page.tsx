import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import DashboardAttention, {
  type DashboardAttentionItem,
} from "@/components/dashboard-attention";

import TripCard from "@/components/trip-card";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  calculateExpenseSummary,
  formatMoney,
  type Expense,
  type ExpenseSettlement,
  type ExpenseSplit,
} from "@/lib/expenses";

import {
  getTripLifecycle,
  type TripLifecycle,
} from "@/lib/trip-utils";


type DashboardPageProps = {
  searchParams: Promise<{
    success?: string;

    q?: string;

    type?: string;

    lifecycle?: string;
  }>;
};


type DashboardTrip = {
  id: string;

  name: string;
  destination: string;

  start_date: string;
  end_date: string;

  budget:
    | number
    | null;

  trip_type: string;
  status: string;

  owner_id: string;

  groups:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};


type DashboardTaskRow = {
  id: string;
  trip_id: string;

  assigned_to:
    | string
    | null;

  due_date:
    | string
    | null;

  status: string;
};


type DashboardPackingRow = {
  trip_id: string;

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


type DashboardItineraryRow = {
  id: string;
  trip_id: string;

  planning_status:
    string;

  origin: string;
};


type TripIntelligence = {
  attentionCount: number;

  assignedTaskCount: number;

  plannedItemCount: number;
};


type TripSectionProps = {
  title: string;

  description: string;

  trips:
    DashboardTrip[];

  participantCounts: Record<
    string,
    number
  >;

  intelligenceByTrip: Record<
    string,
    TripIntelligence
  >;

  defaultOpen?: boolean;
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


function TripSection({
  title,
  description,
  trips,
  participantCounts,
  intelligenceByTrip,
  defaultOpen = false,
}: TripSectionProps) {
  if (
    trips.length ===
    0
  ) {
    return null;
  }

  return (
    <details
      open={
        defaultOpen
      }
      className="group mt-10 overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-ink">
              {title}
            </h3>

            <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs text-muted">
              {
                trips.length
              }
            </span>
          </div>

          <p className="mt-1 text-sm text-muted">
            {
              description
            }
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
          className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="border-t border-line p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map(
            (trip) => {
              const group =
                Array.isArray(
                  trip.groups
                )
                  ? trip.groups[0]
                  : trip.groups;

              const intelligence =
                intelligenceByTrip[
                  trip.id
                ] ?? {
                  attentionCount:
                    0,

                  assignedTaskCount:
                    0,

                  plannedItemCount:
                    0,
                };

              return (
                <TripCard
                  key={
                    trip.id
                  }
                  id={
                    trip.id
                  }
                  name={
                    trip.name
                  }
                  destination={
                    trip.destination
                  }
                  startDate={
                    trip.start_date
                  }
                  endDate={
                    trip.end_date
                  }
                  tripType={
                    trip.trip_type
                  }
                  status={
                    trip.status
                  }
                  groupName={
                    group?.name ??
                    null
                  }
                  participantCount={
                    participantCounts[
                      trip.id
                    ] ?? 0
                  }
                  attentionCount={
                    intelligence.attentionCount
                  }
                  assignedTaskCount={
                    intelligence.assignedTaskCount
                  }
                  plannedItemCount={
                    intelligence.plannedItemCount
                  }
                />
              );
            }
          )}
        </div>
      </div>
    </details>
  );
}


export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const query =
    await searchParams;

  const supabase =
    await createClient();

  // Authentication
  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  // User profile
  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(
      "display_name"
    )
    .eq(
      "id",
      userId
    )
    .single();

  // Trips this user is actually attending
  const {
    data: participations,
  } = await supabase
    .from(
      "trip_participants"
    )
    .select(
      "trip_id"
    )
    .eq(
      "user_id",
      userId
    );

  const tripIds =
    participations?.map(
      (participation) =>
        participation.trip_id
    ) ?? [];

  let trips:
    DashboardTrip[] = [];

  if (
    tripIds.length >
    0
  ) {
    const {
      data: tripData,
    } = await supabase
      .from("trips")
      .select(`
        id,
        name,
        destination,
        start_date,
        end_date,
        budget,
        trip_type,
        status,
        owner_id,
        groups (
          name
        )
      `)
      .in(
        "id",
        tripIds
      )
      .order(
        "start_date",
        {
          ascending:
            true,
        }
      );

    trips =
      (tripData ??
        []) as DashboardTrip[];
  }

  // Participant counts
  const participantCounts: Record<
    string,
    number
  > = {};

  if (
    tripIds.length >
    0
  ) {
    const {
      data:
        participantRows,
    } = await supabase
      .from(
        "trip_participants"
      )
      .select(
        "trip_id"
      )
      .in(
        "trip_id",
        tripIds
      );

    participantRows?.forEach(
      (participant) => {
        participantCounts[
          participant.trip_id
        ] =
          (
            participantCounts[
              participant.trip_id
            ] ?? 0
          ) + 1;
      }
    );
  }

  // -------------------------------------------------------
  // DASHBOARD INTELLIGENCE DATA
  // -------------------------------------------------------

  let taskRows:
    DashboardTaskRow[] = [];

  let packingRows:
    DashboardPackingRow[] = [];

  let itineraryRows:
    DashboardItineraryRow[] = [];

  let expenses:
    Expense[] = [];

  let splits:
    ExpenseSplit[] = [];

  let settlements:
    ExpenseSettlement[] = [];


  if (
    tripIds.length >
    0
  ) {
    const {
      data: taskData,
      error: taskError,
    } = await supabase
      .from("trip_tasks")
      .select(`
        id,
        trip_id,
        assigned_to,
        due_date,
        status
      `)
      .in(
        "trip_id",
        tripIds
      );

    if (taskError) {
      console.error(
        "Failed to load dashboard tasks:",
        taskError
      );
    }

    taskRows =
      (taskData ??
        []) as DashboardTaskRow[];


    const {
      data: packingData,
      error: packingError,
    } = await supabase
      .from(
        "packing_items"
      )
      .select(`
        trip_id,
        scope,
        owner_user_id,
        assigned_to,
        is_packed,
        is_system_required
      `)
      .in(
        "trip_id",
        tripIds
      );

    if (packingError) {
      console.error(
        "Failed to load dashboard packing:",
        packingError
      );
    }

    packingRows =
      (packingData ??
        []) as DashboardPackingRow[];


    const {
      data:
        itineraryData,
      error:
        itineraryError,
    } = await supabase
      .from(
        "itinerary_items"
      )
      .select(`
        id,
        trip_id,
        planning_status,
        origin
      `)
      .in(
        "trip_id",
        tripIds
      );

    if (itineraryError) {
      console.error(
        "Failed to load dashboard itinerary:",
        itineraryError
      );
    }

    itineraryRows =
      (itineraryData ??
        []) as DashboardItineraryRow[];


    const {
      data: expenseData,
      error: expenseError,
    } = await supabase
      .from("expenses")
      .select("*")
      .in(
        "trip_id",
        tripIds
      );

    if (expenseError) {
      console.error(
        "Failed to load dashboard expenses:",
        expenseError
      );
    }

    expenses =
      (expenseData ??
        []) as Expense[];


    const expenseIds =
      expenses.map(
        (expense) =>
          expense.id
      );

    if (
      expenseIds.length >
      0
    ) {
      const {
        data: splitData,
        error: splitError,
      } = await supabase
        .from(
          "expense_splits"
        )
        .select("*")
        .in(
          "expense_id",
          expenseIds
        );

      if (splitError) {
        console.error(
          "Failed to load dashboard expense splits:",
          splitError
        );
      }

      splits =
        (splitData ??
          []) as ExpenseSplit[];
    }


    const {
      data:
        settlementData,
      error:
        settlementError,
    } = await supabase
      .from(
        "expense_settlements"
      )
      .select("*")
      .in(
        "trip_id",
        tripIds
      );

    if (
      settlementError
    ) {
      console.error(
        "Failed to load dashboard settlements:",
        settlementError
      );
    }

    settlements =
      (settlementData ??
        []) as ExpenseSettlement[];
  }


  // Active suggestions requiring a vote
  const activeSuggestions =
    itineraryRows.filter(
      (item) =>
        item.origin ===
          "suggestion" &&
        item.planning_status ===
          "suggested"
    );

  const activeSuggestionIds =
    activeSuggestions.map(
      (item) =>
        item.id
    );

  const userVotedItemIds =
    new Set<string>();

  if (
    activeSuggestionIds.length >
    0
  ) {
    const {
      data: voteRows,
      error: voteError,
    } = await supabase
      .from(
        "itinerary_votes"
      )
      .select(
        "item_id"
      )
      .in(
        "item_id",
        activeSuggestionIds
      )
      .eq(
        "user_id",
        userId
      );

    if (voteError) {
      console.error(
        "Failed to load dashboard votes:",
        voteError
      );
    }

    voteRows?.forEach(
      (vote) =>
        userVotedItemIds.add(
          vote.item_id
        )
    );
  }


  // -------------------------------------------------------
  // BUILD INTELLIGENCE
  // -------------------------------------------------------

  const intelligenceByTrip: Record<
    string,
    TripIntelligence
  > = {};

  trips.forEach(
    (trip) => {
      intelligenceByTrip[
        trip.id
      ] = {
        attentionCount:
          0,

        assignedTaskCount:
          0,

        plannedItemCount:
          itineraryRows.filter(
            (item) =>
              item.trip_id ===
                trip.id &&
              item.planning_status ===
                "planned"
          ).length,
      };
    }
  );


  const attentionItems:
    DashboardAttentionItem[] =
    [];

  let assignedTaskTotal =
    0;

  let pendingVoteTotal =
    0;

  let packingTotal =
    0;


  const activeTrips =
    trips.filter(
      (trip) => {
        const lifecycle =
          getTripLifecycle(
            trip.status,
            trip.start_date,
            trip.end_date
          );

        return (
          lifecycle ===
            "upcoming" ||
          lifecycle ===
            "ongoing"
        );
      }
    );


  activeTrips.forEach(
    (trip) => {
      const intelligence =
        intelligenceByTrip[
          trip.id
        ];

      const lifecycle =
        getTripLifecycle(
          trip.status,
          trip.start_date,
          trip.end_date
        );

      const daysUntil =
        daysBetween(
          today,
          trip.start_date
        );


      // Tasks assigned to current user
      const assignedTasks =
        taskRows.filter(
          (task) =>
            task.trip_id ===
              trip.id &&
            task.assigned_to ===
              userId &&
            task.status ===
              "open"
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

      intelligence.assignedTaskCount =
        assignedTasks.length;

      intelligence.attentionCount +=
        assignedTasks.length;

      assignedTaskTotal +=
        assignedTasks.length;

      if (
        assignedTasks.length >
        0
      ) {
        attentionItems.push({
          id:
            `tasks-${trip.id}`,

          tripName:
            trip.name,

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
            `/trips/${trip.id}/tasks`,

          category:
            "Tasks",

          priority:
            overdueTasks.length >
            0
              ? "urgent"
              : "attention",
        });
      }


      // Shared packing assigned to current user
      const assignedPacking =
        packingRows.filter(
          (item) =>
            item.trip_id ===
              trip.id &&
            item.scope ===
              "shared" &&
            item.assigned_to ===
              userId &&
            !item.is_packed
        );

      if (
        assignedPacking.length >
        0
      ) {
        intelligence.attentionCount +=
          assignedPacking.length;

        packingTotal +=
          assignedPacking.length;

        attentionItems.push({
          id:
            `assigned-packing-${trip.id}`,

          tripName:
            trip.name,

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
            `/trips/${trip.id}/packing`,

          category:
            "Packing",

          priority:
            daysUntil <=
              7 ||
            lifecycle ===
              "ongoing"
              ? "urgent"
              : "attention",
        });
      }


      // Required must-haves only become Dashboard attention
      // as the trip gets reasonably close.
      const requiredPacking =
        packingRows.filter(
          (item) =>
            item.trip_id ===
              trip.id &&
            item.scope ===
              "required" &&
            item.owner_user_id ===
              userId &&
            item.is_system_required &&
            !item.is_packed
        );

      const shouldShowRequiredPacking =
        lifecycle ===
          "ongoing" ||
        (
          daysUntil >=
            0 &&
          daysUntil <=
            30
        );

      if (
        shouldShowRequiredPacking &&
        requiredPacking.length >
          0
      ) {
        intelligence.attentionCount +=
          requiredPacking.length;

        packingTotal +=
          requiredPacking.length;

        attentionItems.push({
          id:
            `required-packing-${trip.id}`,

          tripName:
            trip.name,

          title:
            `${requiredPacking.length} required ${
              requiredPacking.length ===
              1
                ? "item"
                : "items"
            } still to confirm`,

          detail:
            daysUntil >
            0
              ? `The trip begins in ${daysUntil} ${
                  daysUntil ===
                  1
                    ? "day"
                    : "days"
                }.`
              : "The trip is currently in progress.",

          href:
            `/trips/${trip.id}/packing`,

          category:
            "Packing",

          priority:
            daysUntil <=
              7 ||
            lifecycle ===
              "ongoing"
              ? "urgent"
              : "info",
        });
      }


      // Suggestions the user has not voted on
      const pendingVotes =
        activeSuggestions.filter(
          (item) =>
            item.trip_id ===
              trip.id &&
            !userVotedItemIds.has(
              item.id
            )
        );

      if (
        pendingVotes.length >
        0
      ) {
        intelligence.attentionCount +=
          pendingVotes.length;

        pendingVoteTotal +=
          pendingVotes.length;

        attentionItems.push({
          id:
            `votes-${trip.id}`,

          tripName:
            trip.name,

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
            `/trips/${trip.id}/voting`,

          category:
            "Voting",

          priority:
            "attention",
        });
      }


      // Expenses / balances
      const tripExpenses =
        expenses.filter(
          (expense) =>
            expense.trip_id ===
            trip.id
        );

      const tripExpenseIds =
        new Set(
          tripExpenses.map(
            (expense) =>
              expense.id
          )
        );

      const tripSplits =
        splits.filter(
          (split) =>
            tripExpenseIds.has(
              split.expense_id
            )
        );

      const tripSettlements =
        settlements.filter(
          (settlement) =>
            settlement.trip_id ===
            trip.id
        );

      const expenseSummary =
        calculateExpenseSummary(
          tripExpenses,
          tripSplits,
          tripSettlements
        );

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

          intelligence.attentionCount +=
            userDebts.length;

          attentionItems.push({
            id:
              `expenses-${trip.id}-${currency.currency}`,

            tripName:
              trip.name,

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
              `/trips/${trip.id}/expenses`,

            category:
              "Expenses",

            priority:
              "attention",
          });
        }
      );


      // Approaching trip with no confirmed itinerary.
      if (
        trip.owner_id ===
          userId &&
        intelligence.plannedItemCount ===
          0 &&
        (
          lifecycle ===
            "ongoing" ||
          (
            daysUntil >=
              0 &&
            daysUntil <=
              30
          )
        )
      ) {
        intelligence.attentionCount +=
          1;

        attentionItems.push({
          id:
            `itinerary-${trip.id}`,

          tripName:
            trip.name,

          title:
            "No confirmed itinerary yet",

          detail:
            lifecycle ===
            "ongoing"
              ? "This trip is already in progress and currently has no confirmed itinerary items."
              : `The trip begins in ${daysUntil} ${
                  daysUntil ===
                  1
                    ? "day"
                    : "days"
                }.`,

          href:
            `/trips/${trip.id}/itinerary`,

          category:
            "Itinerary",

          priority:
            daysUntil <=
              7 ||
            lifecycle ===
              "ongoing"
              ? "urgent"
              : "info",
        });
      }
    }
  );


  const priorityWeight = {
    urgent: 0,
    attention: 1,
    info: 2,
  };

  attentionItems.sort(
    (a, b) =>
      priorityWeight[
        a.priority
      ] -
      priorityWeight[
        b.priority
      ]
  );


  const outstandingCount =
    Object.values(
      intelligenceByTrip
    ).reduce(
      (
        total,
        value
      ) =>
        total +
        value.attentionCount,
      0
    );


  // -------------------------------------------------------
  // TRIP SEARCH AND FILTERS
  // -------------------------------------------------------

  const tripSearch =
    query.q
      ?.trim() ??
    "";


  const tripTypeFilter =
    query.type ===
      "personal" ||
    query.type ===
      "group"
      ? query.type
      : "all";


  const lifecycleFilter:
    | TripLifecycle
    | "all" =
    query.lifecycle ===
      "ongoing" ||
    query.lifecycle ===
      "upcoming" ||
    query.lifecycle ===
      "past" ||
    query.lifecycle ===
      "cancelled"
      ? query.lifecycle
      : "all";


  const normalizedTripSearch =
    tripSearch
      .toLocaleLowerCase();


  const filteredTrips =
    trips.filter(
      (trip) => {
        const group =
          Array.isArray(
            trip.groups
          )
            ? trip.groups[0]
            : trip.groups;


        const lifecycle =
          getTripLifecycle(
            trip.status,
            trip.start_date,
            trip.end_date
          );


        const matchesSearch =
          normalizedTripSearch.length ===
            0 ||
          trip.name
            .toLocaleLowerCase()
            .includes(
              normalizedTripSearch
            ) ||
          trip.destination
            .toLocaleLowerCase()
            .includes(
              normalizedTripSearch
            ) ||
          (
            group?.name ??
            ""
          )
            .toLocaleLowerCase()
            .includes(
              normalizedTripSearch
            );


        const matchesType =
          tripTypeFilter ===
            "all" ||
          trip.trip_type ===
            tripTypeFilter;


        const matchesLifecycle =
          lifecycleFilter ===
            "all" ||
          lifecycle ===
            lifecycleFilter;


        return (
          matchesSearch &&
          matchesType &&
          matchesLifecycle
        );
      }
    );


  const hasTripFilters =
    Boolean(
      tripSearch
    ) ||
    tripTypeFilter !==
      "all" ||
    lifecycleFilter !==
      "all";


  // Organise the filtered results into the
  // existing lifecycle sections.
  const tripSections: Record<
    TripLifecycle,
    DashboardTrip[]
  > = {
    ongoing: [],
    upcoming: [],
    past: [],
    cancelled: [],
  };


  filteredTrips.forEach(
    (trip) => {
      const lifecycle =
        getTripLifecycle(
          trip.status,
          trip.start_date,
          trip.end_date
        );

      tripSections[
        lifecycle
      ].push(
        trip
      );
    }
  );


  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Page heading */}
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Welcome,{" "}
            {profile?.display_name ??
              "Traveller"}
          </h1>

          <p className="mt-2 text-muted">
            See what needs your
            attention and keep track
            of the trips you&apos;re
            attending.
          </p>
        </header>

        {/* Success message */}
        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {
              query.success
            }
          </div>
        )}

        {/* Intelligence */}
        {trips.length >
          0 && (
          <DashboardAttention
            items={
              attentionItems
            }
            outstandingCount={
              outstandingCount
            }
            assignedTaskCount={
              assignedTaskTotal
            }
            pendingVoteCount={
              pendingVoteTotal
            }
            packingCount={
              packingTotal
            }
          />
        )}

        {/* Trips */}
        <section
          id="trips"
          className="mt-10"
        >
          <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Your trips
              </h2>

              <p className="mt-1 text-muted">
                Personal trips and
                group trips you&apos;re
                attending.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/groups"
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Groups
              </Link>

              <Link
                href="/trips/new"
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Create trip
              </Link>
            </div>
          </div>

          {trips.length >
            0 && (
            <form
              method="get"
              action="/dashboard"
              className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6"
            >
              <div>
                <h3 className="font-semibold text-ink">
                  Find a trip
                </h3>

                <p className="mt-1 text-sm text-muted">
                  Search by trip, destination or group and narrow the results.
                </p>
              </div>


              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
                {/* Search */}
                <div>
                  <label
                    htmlFor="trip-search"
                    className="sr-only"
                  >
                    Search trips
                  </label>

                  <div className="relative">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                      />

                      <path d="m20 20-3.5-3.5" />
                    </svg>

                    <input
                      id="trip-search"
                      type="search"
                      name="q"
                      defaultValue={
                        tripSearch
                      }
                      placeholder="Search trips..."
                      className="w-full rounded-xl border border-line bg-surface-soft py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                  </div>
                </div>


                {/* Trip type */}
                <div>
                  <label
                    htmlFor="trip-type-filter"
                    className="sr-only"
                  >
                    Trip type
                  </label>

                  <select
                    id="trip-type-filter"
                    name="type"
                    defaultValue={
                      tripTypeFilter
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  >
                    <option value="all">
                      All trip types
                    </option>

                    <option value="personal">
                      Personal
                    </option>

                    <option value="group">
                      Group
                    </option>
                  </select>
                </div>


                {/* Lifecycle */}
                <div>
                  <label
                    htmlFor="trip-lifecycle-filter"
                    className="sr-only"
                  >
                    Trip status
                  </label>

                  <select
                    id="trip-lifecycle-filter"
                    name="lifecycle"
                    defaultValue={
                      lifecycleFilter
                    }
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  >
                    <option value="all">
                      All statuses
                    </option>

                    <option value="ongoing">
                      In progress
                    </option>

                    <option value="upcoming">
                      Upcoming
                    </option>

                    <option value="past">
                      Past
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>
              </div>


              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p
                  aria-live="polite"
                  className="text-sm text-muted"
                >
                  Showing{" "}
                  <span className="font-medium text-ink">
                    {
                      filteredTrips.length
                    }
                  </span>{" "}
                  of{" "}
                  {
                    trips.length
                  }{" "}
                  {trips.length ===
                  1
                    ? "trip"
                    : "trips"}
                </p>


                <div className="flex flex-wrap gap-2">
                  {hasTripFilters && (
                    <Link
                      href="/dashboard#trips"
                      className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-ink"
                    >
                      Clear
                    </Link>
                  )}

                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </form>
          )}

          {trips.length ===
          0 ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-8">
              <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-300 bg-brand-50 text-lg font-semibold text-brand-700">
                  T
                </div>

                <h3 className="mt-5 text-lg font-semibold text-ink">
                  No trips yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Create a personal
                  trip or start
                  planning something
                  with your friends.
                </p>

                <Link
                  href="/trips/new"
                  className="mt-6 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700"
                >
                  Create your
                  first trip
                </Link>
              </div>
            </div>
          ) : filteredTrips.length ===
          0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
              <h3 className="font-semibold text-ink">
                No trips found
              </h3>

              <p className="mt-2 text-sm text-muted">
                Try changing your search or filters.
              </p>

              <Link
                href="/dashboard#trips"
                className="mt-5 inline-flex rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              <TripSection
                title="In progress"
                description="Trips happening right now."
                trips={
                  tripSections.ongoing
                }
                participantCounts={
                  participantCounts
                }
                intelligenceByTrip={
                  intelligenceByTrip
                }
                defaultOpen
              />

              <TripSection
                title="Upcoming"
                description="Trips you have coming up."
                trips={
                  tripSections.upcoming
                }
                participantCounts={
                  participantCounts
                }
                intelligenceByTrip={
                  intelligenceByTrip
                }
                defaultOpen
              />

              <TripSection
                title="Past trips"
                description="Trips you've already completed."
                trips={
                  tripSections.past
                }
                participantCounts={
                  participantCounts
                }
                intelligenceByTrip={
                  intelligenceByTrip
                }
              />

              <TripSection
                title="Cancelled"
                description="Trips that have been cancelled."
                trips={
                  tripSections.cancelled
                }
                participantCounts={
                  participantCounts
                }
                intelligenceByTrip={
                  intelligenceByTrip
                }
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}