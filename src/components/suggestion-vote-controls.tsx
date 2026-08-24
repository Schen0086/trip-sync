"use client";

import {
  useRef,
} from "react";

import {
  setSuggestionVote,
} from "@/app/(app)/trips/[id]/itinerary/actions";

import {
  formatTripDay,
  type SuggestionReaction,
} from "@/lib/itinerary";

type SuggestionVoteControlsProps = {
  tripId: string;
  itemId: string;

  tripDates: string[];

  currentVote:
    | {
        reaction:
          SuggestionReaction;

        preferred_date:
          | string
          | null;
      }
    | null;
};

const reactions: {
  value:
    SuggestionReaction;

  symbol: string;
  label: string;
}[] = [
  {
    value: "yes",
    symbol: "👍",
    label: "Want to go",
  },
  {
    value: "no",
    symbol: "👎",
    label:
      "Don't want to go",
  },
  {
    value: "not_sure",
    symbol: "?",
    label: "Not sure",
  },
  {
    value: "dont_mind",
    symbol: "↔",
    label: "Don't mind",
  },
];

export default function SuggestionVoteControls({
  tripId,
  itemId,
  tripDates,
  currentVote,
}: SuggestionVoteControlsProps) {
  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const reactionRef =
    useRef<HTMLInputElement>(
      null
    );

  // Submit the complete vote using the
  // currently selected reaction and day.
  function submitVote(
    reaction?:
      SuggestionReaction
  ) {
    const form =
      formRef.current;

    const reactionInput =
      reactionRef.current;

    if (
      !form ||
      !reactionInput
    ) {
      return;
    }

    // Reaction buttons update the hidden
    // reaction before submitting.
    if (reaction) {
      reactionInput.value =
        reaction;
    }

    // A preferred day by itself is not a
    // complete first vote. Keep the chosen
    // day in the form until a reaction is set.
    if (
      !reactionInput.value
    ) {
      return;
    }

    form.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={
        setSuggestionVote
      }
      className="mt-8 rounded-2xl border border-line bg-surface-soft p-5"
    >
      <input
        type="hidden"
        name="tripId"
        value={tripId}
      />

      <input
        type="hidden"
        name="itemId"
        value={itemId}
      />

      {/* Stores the reaction so changing
          only the preferred day can still
          submit the complete vote. */}
      <input
        ref={reactionRef}
        type="hidden"
        name="reaction"
        defaultValue={
          currentVote?.reaction ??
          ""
        }
      />

      <h4 className="font-semibold text-ink">
        Your vote
      </h4>

      <p className="mt-1 text-sm text-muted">
        Changing your reaction
        or preferred day saves
        automatically.
      </p>

      {/* Preferred day */}
      <div className="mt-4">
        <label
          htmlFor={`preferredDate-${itemId}`}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Preferred day
        </label>

        <select
          id={`preferredDate-${itemId}`}
          name="preferredDate"
          defaultValue={
            currentVote?.preferred_date ??
            ""
          }
          onChange={() =>
            submitVote()
          }
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:max-w-md"
        >
          <option value="">
            No preference
          </option>

          {tripDates.map(
            (
              date,
              index
            ) => (
              <option
                key={date}
                value={date}
              >
                Day{" "}
                {index + 1}
                {" — "}
                {formatTripDay(
                  date
                )}
              </option>
            )
          )}
        </select>

        {!currentVote && (
          <p className="mt-2 text-xs text-subtle">
            You can choose a
            preferred day first.
            Your vote will be saved
            once you also choose a
            reaction.
          </p>
        )}
      </div>

      {/* Reactions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {reactions.map(
          (reaction) => {
            const active =
              currentVote?.reaction ===
              reaction.value;

            return (
              <button
                key={
                  reaction.value
                }
                type="button"
                onClick={() =>
                  submitVote(
                    reaction.value
                  )
                }
                aria-pressed={
                  active
                }
                className={
                  active
                    ? "cursor-pointer rounded-xl border border-brand-500 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700"
                    : "cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
                }
              >
                {
                  reaction.symbol
                }{" "}
                {
                  reaction.label
                }
              </button>
            );
          }
        )}
      </div>
    </form>
  );
}