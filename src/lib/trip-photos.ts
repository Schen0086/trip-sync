import {
  IMAGE_ACCEPT,
  IMAGE_ALLOWED_TYPES,
  IMAGE_MAX_FILE_SIZE,
  getImageExtension,
  isSupportedImageType,
} from "@/lib/images";

export const TRIP_PHOTO_MAX_FILE_SIZE =
  IMAGE_MAX_FILE_SIZE;

export const TRIP_PHOTO_MAX_BATCH =
  20;

export const TRIP_PHOTO_ACCEPT =
  IMAGE_ACCEPT;

// Preserve the existing public API for callers that use this constant.
export const TRIP_PHOTO_ALLOWED_TYPES =
  IMAGE_ALLOWED_TYPES;

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
  imageUrl: string | null;
  caption: string | null;
  photoDate: string | null;
  savedPlaceId: string | null;
  placeName: string | null;
  uploaderName: string;
  uploaderAvatarUrl: string | null;
  createdAt: string;
  canEdit: boolean;
};

export function isSupportedTripPhotoType(
  mimeType: string
) {
  return isSupportedImageType(
    mimeType
  );
}

export function getTripPhotoExtension(
  mimeType: string
) {
  return getImageExtension(
    mimeType
  );
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
