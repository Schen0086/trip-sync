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

import GroupAvatar from "@/components/group-avatar";

import {
  createBrowserUuid,
} from "@/lib/browser-uuid";

import {
  createClient,
} from "@/lib/supabase/client";


type GroupAvatarEditorProps = {
  groupId: string;

  groupName: string;

  initialAvatarPath:
    | string
    | null;

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


export default function GroupAvatarEditor({
  groupId,
  groupName,
  initialAvatarPath,
  initialAvatarUrl,
}: GroupAvatarEditorProps) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const inputRef =
    useRef<HTMLInputElement>(
      null
    );


  const [
    avatarPath,
    setAvatarPath,
  ] = useState<
    string | null
  >(
    initialAvatarPath
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


  // Keep local state aligned after a server refresh.
  useEffect(() => {
    setAvatarPath(
      initialAvatarPath
    );

    setAvatarUrl(
      initialAvatarUrl
    );
  }, [
    initialAvatarPath,
    initialAvatarUrl,
  ]);


  // Build a temporary local preview.
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
        "Group pictures must be 5 MB or smaller."
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

    let fileUploaded =
      false;

    let groupSaved =
      false;

    try {
      const extension =
        getExtension(
          file.type
        );

      newPath =
        `${groupId}/${createBrowserUuid()}.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "group-avatars"
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

      fileUploaded =
        true;

      const {
        data:
          updatedGroup,

        error:
          groupError,
      } =
        await supabase
          .from(
            "groups"
          )
          .update({
            avatar_path:
              newPath,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            groupId
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        groupError ||
        !updatedGroup
      ) {
        throw new Error(
          groupError?.message ??
            "Unable to save the group picture."
        );
      }

      groupSaved =
        true;

      const {
        data:
          signedUrlData,

        error:
          signedUrlError,
      } =
        await supabase.storage
          .from(
            "group-avatars"
          )
          .createSignedUrl(
            newPath,
            3600
          );

      if (
        signedUrlError
      ) {
        console.error(
          "Failed to create group avatar URL:",
          signedUrlError
        );
      }

      // Remove the previous image only after
      // the new database value is safely stored.
      if (
        avatarPath &&
        avatarPath !==
          newPath
      ) {
        const {
          error:
            cleanupError,
        } =
          await supabase.storage
            .from(
              "group-avatars"
            )
            .remove([
              avatarPath,
            ]);

        if (
          cleanupError
        ) {
          console.error(
            "Failed to remove previous group avatar:",
            cleanupError
          );
        }
      }

      setAvatarPath(
        newPath
      );

      setAvatarUrl(
        signedUrlData?.signedUrl ??
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
        "Group picture updated."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to update group picture:",
        error
      );

      // Avoid an orphaned Storage file
      // when the database update fails.
      if (
        fileUploaded &&
        !groupSaved &&
        newPath
      ) {
        const {
          error:
            cleanupError,
        } =
          await supabase.storage
            .from(
              "group-avatars"
            )
            .remove([
              newPath,
            ]);

        if (
          cleanupError
        ) {
          console.error(
            "Failed to clean up unsuccessful group picture upload:",
            cleanupError
          );
        }
      }

      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to update the group picture."
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function handleRemove() {
    if (
      !avatarPath ||
      busy
    ) {
      return;
    }

    resetMessages();

    setBusy(
      true
    );

    const oldPath =
      avatarPath;

    try {
      const {
        data:
          updatedGroup,

        error:
          groupError,
      } =
        await supabase
          .from(
            "groups"
          )
          .update({
            avatar_path:
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            groupId
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        groupError ||
        !updatedGroup
      ) {
        throw new Error(
          groupError?.message ??
            "Unable to remove the group picture."
        );
      }

      const {
        error:
          removeError,
      } =
        await supabase.storage
          .from(
            "group-avatars"
          )
          .remove([
            oldPath,
          ]);

      if (
        removeError
      ) {
        console.error(
          "Failed to remove group avatar file:",
          removeError
        );
      }

      setAvatarPath(
        null
      );

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
        "Group picture removed."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to remove group picture:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to remove the group picture."
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
    <div className="rounded-2xl border border-line bg-surface-soft p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <GroupAvatar
          src={
            displayedAvatar
          }
          groupName={
            groupName
          }
          size="xl"
        />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">
            Group picture
          </h3>

          <p className="mt-1 text-sm leading-5 text-muted">
            Add an image to make this group easier to recognise across TripSync.
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

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                inputRef.current
                  ?.click()
              }
              className="cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {avatarPath
                ? "Choose new image"
                : "Choose image"}
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
                className="cursor-pointer rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Uploading..."
                  : "Save picture"}
              </button>
            )}

            {avatarPath &&
              !selectedFile && (
                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={
                    handleRemove
                  }
                  className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-3.5 py-2 text-sm font-medium text-danger-text transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy
                    ? "Removing..."
                    : "Remove"}
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

          <p className="mt-3 text-xs text-subtle">
            JPEG, PNG or WebP. Maximum 5 MB.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
        >
          {
            errorMessage
          }
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
        >
          {
            successMessage
          }
        </div>
      )}
    </div>
  );
}