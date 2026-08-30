"use client";

import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import Avatar from "@/components/avatar";

import {
  createBrowserUuid,
} from "@/lib/browser-uuid";

import {
  createClient,
} from "@/lib/supabase/client";


type ProfileAvatarEditorProps = {
  userId: string;

  displayName: string;

  initialAvatarUrl:
    | string
    | null;
};


const MAX_FILE_SIZE =
  5 * 1024 * 1024;


const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


function getExtension(
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


function getOwnAvatarPath(
  avatarUrl:
    | string
    | null,
  userId: string
) {
  if (!avatarUrl) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/avatars/";

  const markerIndex =
    avatarUrl.indexOf(
      marker
    );

  if (
    markerIndex === -1
  ) {
    return null;
  }

  try {
    const rawPath =
      avatarUrl
        .slice(
          markerIndex +
            marker.length
        )
        .split("?")[0];

    const path =
      decodeURIComponent(
        rawPath
      );

    if (
      !path.startsWith(
        `${userId}/`
      )
    ) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}


function getErrorMessage(
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


export default function ProfileAvatarEditor({
  userId,
  displayName,
  initialAvatarUrl,
}: ProfileAvatarEditorProps) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    avatarUrl,
    setAvatarUrl,
  ] = useState<
    string | null
  >(
    initialAvatarUrl
  );

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<
    File | null
  >(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState<
    string | null
  >(null);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<
    string | null
  >(null);


  // Build a temporary local preview
  // whenever a new file is selected.
  useEffect(() => {
    if (
      !selectedFile
    ) {
      setPreviewUrl(
        null
      );

      return;
    }

    const objectUrl =
      URL.createObjectURL(
        selectedFile
      );

    setPreviewUrl(
      objectUrl
    );

    return () => {
      URL.revokeObjectURL(
        objectUrl
      );
    };
  }, [
    selectedFile,
  ]);


  function resetMessages() {
    setErrorMessage(
      null
    );

    setSuccessMessage(
      null
    );
  }


  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    resetMessages();

    const file =
      event.target
        .files?.[0];

    if (!file) {
      return;
    }

    if (
      !ALLOWED_TYPES.has(
        file.type
      )
    ) {
      setSelectedFile(
        null
      );

      event.target.value =
        "";

      setErrorMessage(
        "Choose a JPEG, PNG or WebP image."
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setSelectedFile(
        null
      );

      event.target.value =
        "";

      setErrorMessage(
        "Profile pictures must be 5 MB or smaller."
      );

      return;
    }

    setSelectedFile(
      file
    );
  }


  async function handleUpload() {
    if (
      !selectedFile ||
      busy
    ) {
      return;
    }

    const file =
      selectedFile;

    resetMessages();

    setBusy(
      true
    );

    let newPath:
      | string
      | null = null;

    let newFileUploaded =
      false;

    let profileSaved =
      false;

    try {
      const oldAvatarPath =
        getOwnAvatarPath(
          avatarUrl,
          userId
        );

      const extension =
        getExtension(
          file.type
        );

      // Works on both HTTPS and the
      // HTTP LAN address used for
      // real-device local testing.
      newPath =
        `${userId}/${createBrowserUuid()}.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "avatars"
          )
          .upload(
            newPath,
            file,
            {
              cacheControl:
                "31536000",

              contentType:
                file.type,

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        throw new Error(
          uploadError.message
        );
      }

      newFileUploaded =
        true;

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "avatars"
          )
          .getPublicUrl(
            newPath
          );

      const publicUrl =
        publicUrlData.publicUrl;

      // The public profiles table
      // remains TripSync's
      // authoritative profile.
      const {
        data:
          updatedProfile,

        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            avatar_url:
              publicUrl,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            userId
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        profileError ||
        !updatedProfile
      ) {
        throw new Error(
          profileError?.message ??
            "Unable to save your profile picture."
        );
      }

      profileSaved =
        true;

      // Keep Supabase Auth metadata
      // consistent with the public profile.
      const {
        error:
          authMetadataError,
      } =
        await supabase.auth
          .updateUser({
            data: {
              avatar_url:
                publicUrl,
            },
          });

      if (
        authMetadataError
      ) {
        console.error(
          "Failed to sync avatar to Auth metadata:",
          authMetadataError
        );
      }

      // Delete the previous TripSync
      // avatar only after the new
      // profile URL is safely stored.
      if (
        oldAvatarPath &&
        oldAvatarPath !==
          newPath
      ) {
        const {
          error:
            cleanupError,
        } =
          await supabase.storage
            .from(
              "avatars"
            )
            .remove([
              oldAvatarPath,
            ]);

        if (
          cleanupError
        ) {
          console.error(
            "Failed to remove previous avatar:",
            cleanupError
          );
        }
      }

      setAvatarUrl(
        publicUrl
      );

      setSelectedFile(
        null
      );

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          "";
      }

      setSuccessMessage(
        "Profile picture updated."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to update profile picture:",
        error
      );

      // If Storage succeeded but the
      // profile update did not, avoid
      // leaving an orphaned new image.
      if (
        newFileUploaded &&
        !profileSaved &&
        newPath
      ) {
        const {
          error:
            cleanupError,
        } =
          await supabase.storage
            .from(
              "avatars"
            )
            .remove([
              newPath,
            ]);

        if (
          cleanupError
        ) {
          console.error(
            "Failed to clean up unsuccessful avatar upload:",
            cleanupError
          );
        }
      }

      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to update your profile picture."
        )
      );
    } finally {
      // Always recover the UI,
      // including unexpected Safari
      // or browser-side exceptions.
      setBusy(
        false
      );
    }
  }


  async function handleRemove() {
    if (
      !avatarUrl ||
      busy
    ) {
      return;
    }

    resetMessages();

    setBusy(
      true
    );

    try {
      const oldAvatarPath =
        getOwnAvatarPath(
          avatarUrl,
          userId
        );

      const {
        data:
          updatedProfile,

        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            avatar_url:
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            userId
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        profileError ||
        !updatedProfile
      ) {
        throw new Error(
          profileError?.message ??
            "Unable to remove your profile picture."
        );
      }

      const {
        error:
          authMetadataError,
      } =
        await supabase.auth
          .updateUser({
            data: {
              avatar_url:
                null,
            },
          });

      if (
        authMetadataError
      ) {
        console.error(
          "Failed to clear avatar Auth metadata:",
          authMetadataError
        );
      }

      if (
        oldAvatarPath
      ) {
        const {
          error:
            removeError,
        } =
          await supabase.storage
            .from(
              "avatars"
            )
            .remove([
              oldAvatarPath,
            ]);

        if (
          removeError
        ) {
          console.error(
            "Failed to remove avatar file:",
            removeError
          );
        }
      }

      setAvatarUrl(
        null
      );

      setSelectedFile(
        null
      );

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          "";
      }

      setSuccessMessage(
        "Profile picture removed."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to remove profile picture:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to remove your profile picture."
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  const displayedAvatar =
    previewUrl ??
    avatarUrl;


  return (
    <div className="mt-7 rounded-2xl border border-line bg-surface-soft p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Avatar preview */}
        <Avatar
          src={
            displayedAvatar
          }
          displayName={
            displayName
          }
          size="xl"
        />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">
            Profile picture
          </h3>

          <p className="mt-1 text-sm leading-5 text-muted">
            Add a photo so friends can recognise you throughout TripSync.
          </p>

          {/* Native device picker */}
          <input
            ref={
              inputRef
            }
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handleFileChange
            }
            className="sr-only"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                inputRef.current
                  ?.click()
              }
              className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {avatarUrl
                ? "Choose new photo"
                : "Choose photo"}
            </button>

            {selectedFile && (
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  handleUpload
                }
                className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Uploading..."
                  : "Save photo"}
              </button>
            )}

            {avatarUrl &&
              !selectedFile && (
                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={
                    handleRemove
                  }
                  className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-4 py-2.5 text-sm font-medium text-danger-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy
                    ? "Removing..."
                    : "Remove photo"}
                </button>
              )}
          </div>

          {selectedFile && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
              <p className="min-w-0 truncate text-xs text-muted">
                {
                  selectedFile.name ||
                  "Selected photo"
                }
              </p>

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() => {
                  setSelectedFile(
                    null
                  );

                  if (
                    inputRef.current
                  ) {
                    inputRef.current.value =
                      "";
                  }
                }}
                className="shrink-0 cursor-pointer text-xs font-medium text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Production-facing constraints only. */}
          <p className="mt-3 text-xs leading-5 text-subtle">
            JPEG, PNG or WebP. Maximum 5 MB.
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 text-sm text-danger-text"
            >
              {
                errorMessage
              }
            </p>
          )}

          {successMessage && (
            <p
              role="status"
              className="mt-3 text-sm text-success-text"
            >
              {
                successMessage
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
}