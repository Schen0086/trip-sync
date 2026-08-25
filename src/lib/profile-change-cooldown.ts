export const PROFILE_CHANGE_COOLDOWN_DAYS =
  7;


const PROFILE_CHANGE_COOLDOWN_MS =
  PROFILE_CHANGE_COOLDOWN_DAYS *
  24 *
  60 *
  60 *
  1000;


export type ProfileChangeCooldownState = {
  isLocked: boolean;

  availableAt:
    | Date
    | null;
};


export function getProfileChangeCooldownState(
  lastChangedAt:
    | string
    | null
    | undefined
): ProfileChangeCooldownState {
  if (!lastChangedAt) {
    return {
      isLocked: false,
      availableAt: null,
    };
  }


  const lastChanged =
    new Date(
      lastChangedAt
    );


  if (
    Number.isNaN(
      lastChanged.getTime()
    )
  ) {
    return {
      isLocked: false,
      availableAt: null,
    };
  }


  const availableAt =
    new Date(
      lastChanged.getTime() +
        PROFILE_CHANGE_COOLDOWN_MS
    );


  return {
    isLocked:
      availableAt.getTime() >
      Date.now(),

    availableAt,
  };
}


export function formatProfileChangeAvailableAt(
  value: Date
) {
  return value.toLocaleString(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }
  );
}