import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import ConfirmActionButton from "@/components/confirm-action-button";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getPackingCategoryLabel,
  PACKING_CATEGORY_OPTIONS,
  type PackingItem,
} from "@/lib/packing";

import {
  addPackingItem,
  deletePackingItem,
  togglePackingItem,
  updatePackingItem,
} from "./actions";

import PersonName from "@/components/person-name";

type PackingPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function PackingPage({
  params,
  searchParams,
}: PackingPageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

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
    redirect("/login");
  }

  const userId =
    data.claims.sub;

  const {
    data: trip,
  } = await supabase
    .from("trips")
    .select(`
      id,
      name,
      trip_type,
      owner_id
    `)
    .eq("id", id)
    .maybeSingle();

  if (!trip) {
    redirect(
      "/dashboard"
    );
  }

  // Store the confirmed trip ID for nested components
  const tripId =
    trip.id;

  const {
    data: participantRows,
  } = await supabase
    .from("trip_participants")
    .select(
      "user_id, joined_at"
    )
    .eq(
      "trip_id",
      trip.id
    )
    .order(
      "joined_at",
      {
        ascending: true,
      }
    );

  const participantIds =
    participantRows?.map(
      (row) =>
        row.user_id
    ) ?? [];

  const isAttending =
    participantIds.includes(
      userId
    );

  const isTripCreator =
    trip.owner_id ===
    userId;

  const canManageShared =
    isAttending ||
    isTripCreator;

  const {
    data: packingData,
    error: packingError,
  } = await supabase
    .from("packing_items")
    .select("*")
    .eq(
      "trip_id",
      trip.id
    )
    .order(
      "sort_order",
      {
        ascending: true,
      }
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (packingError) {
    console.error(
      "Failed to load packing items:",
      packingError
    );
  }

  const items =
    (packingData ??
      []) as PackingItem[];

  const requiredItems =
    items.filter(
      (item) =>
        item.scope ===
        "required"
    );

  const personalItems =
    items.filter(
      (item) =>
        item.scope ===
        "personal"
    );

  const sharedItems =
    items.filter(
      (item) =>
        item.scope ===
        "shared"
    );

  const requiredPacked =
    requiredItems.filter(
      (item) =>
        item.is_packed
    ).length;

  const personalPacked =
    personalItems.filter(
      (item) =>
        item.is_packed
    ).length;

  const sharedPacked =
    sharedItems.filter(
      (item) =>
        item.is_packed
    ).length;

  const requiredPercent =
    requiredItems.length >
    0
      ? Math.round(
          (requiredPacked /
            requiredItems.length) *
            100
        )
      : 0;

  const allProfileIds =
    new Set<string>(
      participantIds
    );

  sharedItems.forEach(
    (item) => {
      allProfileIds.add(
        item.created_by
      );

      if (
        item.assigned_to
      ) {
        allProfileIds.add(
          item.assigned_to
        );
      }
    }
  );

  const profileMap =
    new Map<
      string,
      {
        display_name:
          | string
          | null;

        username:
          | string
          | null;
      }
    >();

  if (
    allProfileIds.size >
    0
  ) {
    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username"
      )
      .in(
        "id",
        [
          ...allProfileIds,
        ]
      );

    profiles?.forEach(
      (profile) => {
        profileMap.set(
          profile.id,
          profile
        );
      }
    );
  }

  function getName(
    profileId: string
  ) {
    return (
      profileMap.get(
        profileId
      )?.display_name ??
      "Traveller"
    );
  }

  function PackingToggle({
    item,
  }: {
    item: PackingItem;
  }) {
    return (
      <form
        action={
          togglePackingItem
        }
      >
        <input
          type="hidden"
          name="tripId"
          value={tripId}
        />

        <input
          type="hidden"
          name="itemId"
          value={item.id}
        />

        <button
          type="submit"
          aria-label={
            item.is_packed
              ? `Mark ${item.name} as not packed`
              : `Mark ${item.name} as packed`
          }
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition ${
            item.is_packed
              ? "border-brand-600 bg-brand-600 text-brand-contrast"
              : "border-line-strong bg-surface text-muted hover:border-brand-500"
          }`}
        >
          {item.is_packed && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          )}
        </button>
      </form>
    );
  }

  function EditablePackingItem({
    item,
  }: {
    item: PackingItem;
}) {
    const canEdit =
      item.scope ===
      "personal"
        ? item.owner_user_id ===
          userId

        : isTripCreator ||
          item.created_by ===
          userId;

    const assignedToCurrentUser =
      item.scope === "shared" &&
      item.assigned_to === userId;

    return (
      <article
        className={`rounded-xl border p-4 transition ${
          assignedToCurrentUser
            ? "border-brand-500 bg-brand-50"
            : "border-line bg-surface"
        }`}
      >
        <div className="flex items-start gap-3">
          <PackingToggle
            item={item}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`font-medium ${
                  item.is_packed
                    ? "text-subtle line-through"
                    : "text-ink"
                }`}
              >
                {item.name}
              </p>

              {item.quantity >
                1 && (
                <span className="rounded-full border border-line bg-surface-soft px-2 py-0.5 text-xs text-muted">
                  ×
                  {
                    item.quantity
                  }
                </span>
              )}

              <span className="rounded-full border border-line bg-surface-soft px-2 py-0.5 text-xs text-subtle">
                {getPackingCategoryLabel(
                  item.category
                )}
              </span>
            </div>

            {item.scope ===
              "shared" && (
              <div className="mt-2">
                {item.assigned_to ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>
                      Assigned to
                    </span>

                    <PersonName
                      userId={
                        item.assigned_to
                      }
                      currentUserId={
                        userId
                      }
                      displayName={getName(
                        item.assigned_to
                      )}
                      highlightCurrentUser
                      variant="badge"
                    />

                    {assignedToCurrentUser && (
                      <span className="font-semibold text-brand-700">
                        You&apos;re
                        responsible for
                        bringing this
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    Not assigned
                  </p>
                )}
              </div>
            )}

            {item.notes && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                {item.notes}
              </p>
            )}

            {canEdit && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">
                  Edit
                </summary>

                <form
                  action={
                    updatePackingItem
                  }
                  className="mt-4 space-y-4 rounded-xl border border-line bg-surface-soft p-4"
                >
                  <input
                    type="hidden"
                    name="tripId"
                    value={tripId}
                  />

                  <input
                    type="hidden"
                    name="itemId"
                    value={
                      item.id
                    }
                  />

                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">
                      Item
                    </label>

                    <input
                      name="name"
                      type="text"
                      required
                      maxLength={
                        160
                      }
                      defaultValue={
                        item.name
                      }
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink">
                        Category
                      </label>

                      <select
                        name="category"
                        defaultValue={
                          item.category
                        }
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                      >
                        {PACKING_CATEGORY_OPTIONS.map(
                          (
                            option
                          ) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink">
                        Quantity
                      </label>

                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        max="99"
                        required
                        defaultValue={
                          item.quantity
                        }
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                      />
                    </div>
                  </div>

                  {item.scope ===
                    "shared" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink">
                        Assigned
                        to
                      </label>

                      <select
                        name="assignedTo"
                        defaultValue={
                          item.assigned_to ??
                          ""
                        }
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                      >
                        <option value="">
                          Anyone
                        </option>

                        {participantIds.map(
                          (
                            participantId
                          ) => (
                            <option
                              key={
                                participantId
                              }
                              value={
                                participantId
                              }
                            >
                              {getName(
                                participantId
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">
                      Notes
                    </label>

                    <textarea
                      name="notes"
                      rows={3}
                      maxLength={
                        1000
                      }
                      defaultValue={
                        item.notes ??
                        ""
                      }
                      className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast"
                    >
                      Save
                      changes
                    </button>
                  </div>
                </form>

                <form
                  action={
                    deletePackingItem
                  }
                  className="mt-3"
                >
                  <input
                    type="hidden"
                    name="tripId"
                    value={tripId}
                  />

                  <input
                    type="hidden"
                    name="itemId"
                    value={
                      item.id
                    }
                  />

                  <ConfirmActionButton
                    message={`Remove "${item.name}" from the packing list?`}
                    className="cursor-pointer text-sm font-medium text-danger-text"
                  >
                    Remove
                    item
                  </ConfirmActionButton>
                </form>
              </details>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <BackButton
          fallbackHref={`/trips/${trip.id}`}
        />

        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            {trip.name}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Packing
          </h1>

          <p className="mt-2 text-muted">
            Keep track of the
            essentials, your personal
            luggage and shared group
            items.
          </p>
        </header>

        {query.error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {query.error}
          </div>
        )}

        {query.success && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {query.success}
          </div>
        )}

        {/* Not attending */}
        {!isAttending &&
          trip.trip_type ===
            "group" && (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-semibold text-ink">
              You&apos;re not
              currently attending
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              Your personal and
              required packing lists
              become active when
              you&apos;re marked as
              going on this trip. You
              can still view the
              shared group list.
            </p>
          </div>
        )}

        {/* Required list */}
        {isAttending && (
        <details
            open
            className="group mt-10 overflow-hidden rounded-2xl border border-brand-500 bg-surface"
        >
            {/* Collapsible heading */}
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
            <div>
                <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-ink">
                    Required / Must-have
                </h2>

                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    Mandatory
                </span>
                </div>

                <p className="mt-1 text-sm text-muted">
                {requiredPacked}
                {" / "}
                {requiredItems.length}{" "}
                ready
                </p>
            </div>

            {/* Collapse indicator */}
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

            {/* Expanded content */}
            <div className="border-t border-line">
            {/* Explanation + progress */}
            <div className="p-6">
                <p className="max-w-3xl text-sm leading-6 text-muted">
                This checklist is
                automatically included for
                every traveller on every
                trip. These items cannot be
                removed. For conditional
                items such as visas,
                medication or insurance,
                mark the item complete once
                you have either prepared it
                or confirmed it is not
                required.
                </p>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-soft">
                <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{
                    width:
                        `${requiredPercent}%`,
                    }}
                />
                </div>
            </div>

            {/* Required items */}
            <div className="divide-y divide-line border-t border-line">
                {requiredItems.map(
                (item) => (
                    <div
                    key={item.id}
                    className="flex items-start gap-3 px-6 py-4"
                    >
                    <PackingToggle
                        item={item}
                    />

                    <div>
                        <p
                        className={`font-medium ${
                            item.is_packed
                            ? "text-subtle line-through"
                            : "text-ink"
                        }`}
                        >
                        {item.name}
                        </p>

                        <p className="mt-1 text-xs text-subtle">
                        {getPackingCategoryLabel(
                            item.category
                        )}
                        </p>

                        {item.notes && (
                        <p className="mt-2 text-sm leading-6 text-muted">
                            {item.notes}
                        </p>
                        )}
                    </div>
                    </div>
                )
                )}
            </div>
            </div>
        </details>
        )}

        {/* Personal packing */}
        {isAttending && (
          <section className="mt-10">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Personal packing
              </h2>

              <p className="mt-1 text-sm text-muted">
                Your private packing
                list. Other travellers
                cannot see these
                items.
              </p>

              <p className="mt-2 text-xs text-subtle">
                {personalPacked}
                {" / "}
                {
                  personalItems.length
                }{" "}
                packed
              </p>
            </div>

            <details className="mt-5 rounded-2xl border border-line bg-surface">
              <summary className="cursor-pointer px-5 py-4 font-medium text-ink">
                Add personal item
              </summary>

              <form
                action={
                  addPackingItem
                }
                className="space-y-4 border-t border-line p-5"
              >
                <input
                  type="hidden"
                  name="tripId"
                  value={
                    trip.id
                  }
                />

                <input
                  type="hidden"
                  name="scope"
                  value="personal"
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Item
                  </label>

                  <input
                    name="name"
                    required
                    maxLength={
                      160
                    }
                    placeholder="e.g. T-shirts"
                    className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Category
                    </label>

                    <select
                      name="category"
                      defaultValue="clothing"
                      className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                    >
                      {PACKING_CATEGORY_OPTIONS.map(
                        (
                          option
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Quantity
                    </label>

                    <input
                      name="quantity"
                      type="number"
                      min="1"
                      max="99"
                      defaultValue="1"
                      required
                      className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Notes
                  </label>

                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={
                      1000
                    }
                    className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                  />
                </div>

                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                >
                  Add item
                </button>
              </form>
            </details>

            {personalItems.length ===
            0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
                No personal items
                added yet.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {personalItems.map(
                  (item) => (
                    <EditablePackingItem
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* Shared packing */}
        {trip.trip_type ===
          "group" && (
          <section className="mt-10 border-t border-line pt-10">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Shared packing
              </h2>

              <p className="mt-1 text-sm text-muted">
                Items the group only
                needs somebody to
                bring once.
              </p>

              <p className="mt-2 text-xs text-subtle">
                {sharedPacked}
                {" / "}
                {
                  sharedItems.length
                }{" "}
                packed
              </p>
            </div>

            {canManageShared && (
              <details className="mt-5 rounded-2xl border border-line bg-surface">
                <summary className="cursor-pointer px-5 py-4 font-medium text-ink">
                  Add shared item
                </summary>

                <form
                  action={
                    addPackingItem
                  }
                  className="space-y-4 border-t border-line p-5"
                >
                  <input
                    type="hidden"
                    name="tripId"
                    value={
                      trip.id
                    }
                  />

                  <input
                    type="hidden"
                    name="scope"
                    value="shared"
                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Item
                    </label>

                    <input
                      name="name"
                      required
                      maxLength={
                        160
                      }
                      placeholder="e.g. Portable speaker"
                      className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">
                        Category
                      </label>

                      <select
                        name="category"
                        defaultValue="other"
                        className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                      >
                        {PACKING_CATEGORY_OPTIONS.map(
                          (
                            option
                          ) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">
                        Quantity
                      </label>

                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        max="99"
                        defaultValue="1"
                        required
                        className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">
                        Assigned to
                      </label>

                      <select
                        name="assignedTo"
                        defaultValue=""
                        className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                      >
                        <option value="">
                          Anyone
                        </option>

                        {participantIds.map(
                          (
                            participantId
                          ) => (
                            <option
                              key={
                                participantId
                              }
                              value={
                                participantId
                              }
                            >
                              {getName(
                                participantId
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Notes
                    </label>

                    <textarea
                      name="notes"
                      rows={3}
                      maxLength={
                        1000
                      }
                      className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink"
                    />
                  </div>

                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast"
                  >
                    Add shared
                    item
                  </button>
                </form>
              </details>
            )}

            {sharedItems.length ===
            0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
                No shared items
                yet.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {sharedItems.map(
                  (item) => (
                    <EditablePackingItem
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}