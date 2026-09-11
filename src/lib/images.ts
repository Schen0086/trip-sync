/**
 * Shared image rules used by profile avatars, group avatars and trip photos.
 * Keep picker/storage constraints in one place so mobile and desktop uploads
 * validate files consistently.
 */

export const IMAGE_MAX_FILE_SIZE =
  5 * 1024 * 1024;

export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp";

export const IMAGE_ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

export type SupportedImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

export type ImageValidationOptions = {
  maxFileSize?: number;
  sizeLabel?: string;
};

export function isSupportedImageType(
  mimeType: string
): mimeType is SupportedImageMimeType {
  return IMAGE_ALLOWED_TYPES.has(
    mimeType
  );
}

export function getImageExtension(
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

export function validateImageFile(
  file: File,
  {
    maxFileSize =
      IMAGE_MAX_FILE_SIZE,
    sizeLabel = "Image",
  }: ImageValidationOptions = {}
) {
  if (
    !isSupportedImageType(
      file.type
    )
  ) {
    return "Choose a JPEG, PNG or WebP image.";
  }

  if (
    file.size >
    maxFileSize
  ) {
    const maxSizeMb =
      Math.round(
        maxFileSize /
          (1024 * 1024)
      );

    return `${sizeLabel} must be ${maxSizeMb} MB or smaller.`;
  }

  return null;
}

export function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}
