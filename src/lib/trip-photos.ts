export const TRIP_PHOTO_MAX_FILE_SIZE =
  5 * 1024 * 1024;

export const TRIP_PHOTO_MAX_BATCH =
  20;

export const TRIP_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp";

export const TRIP_PHOTO_ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


export type TripPhotoDayOption = {
  value: string;
  label: string;
};


export type TripPhotoPlaceOption = {
  id: string;
  name: string;
};


export type TripPhotoRecord = {
  id: string;

  tripId: string;

  uploadedBy: string;

  storagePath: string;

  imageUrl:
    | string
    | null;

  caption:
    | string
    | null;

  photoDate:
    | string
    | null;

  savedPlaceId:
    | string
    | null;

  placeName:
    | string
    | null;

  uploaderName: string;

  uploaderAvatarUrl:
    | string
    | null;

  createdAt: string;

  canEdit: boolean;
};


export function isSupportedTripPhotoType(
  mimeType: string
) {
  return TRIP_PHOTO_ALLOWED_TYPES.has(
    mimeType
  );
}


export function getTripPhotoExtension(
  mimeType: string
) {
  switch (mimeType) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}


export function formatTripPhotoDate(
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
      year: "numeric",
      timeZone: "UTC",
    }
  );
}


export function formatTripPhotoUploadedAt(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}