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

import {
  createBrowserUuid,
} from "@/lib/browser-uuid";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  getTripPhotoExtension,
  isSupportedTripPhotoType,
  TRIP_PHOTO_ACCEPT,
  TRIP_PHOTO_MAX_BATCH,
  TRIP_PHOTO_MAX_FILE_SIZE,
  type TripPhotoDayOption,
  type TripPhotoPlaceOption,
} from "@/lib/trip-photos";


type TripPhotoUploaderProps = {
  tripId: string;

  userId: string;

  dayOptions:
    TripPhotoDayOption[];

  placeOptions:
    TripPhotoPlaceOption[];

  defaultOpen?: boolean;
};


type SelectedPhotoPreviewProps = {
  file: File;
};


function SelectedPhotoPreview({
  file,
}: SelectedPhotoPreviewProps) {
  const [
    previewUrl,
    setPreviewUrl,
  ] = useState<
    string | null
  >(null);


  useEffect(() => {
    const objectUrl =
      URL.createObjectURL(
        file
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
    file,
  ]);


  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="aspect-square bg-surface-soft">
        {previewUrl && (
          // Native object URLs do not
          // need Next Image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              previewUrl
            }
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <p className="truncate px-2 py-2 text-xs text-muted">
        {
          file.name ||
          "New photo"
        }
      </p>
    </div>
  );
}


export default function TripPhotoUploader({
  tripId,
  userId,
  dayOptions,
  placeOptions,
  defaultOpen = false,
}: TripPhotoUploaderProps) {
  const router =
    useRouter();

  const supabase =
    createClient();


  const pickerInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement>(
      null
    );


  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<File[]>(
    []
  );


  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");


  const [
    selectedPlaceId,
    setSelectedPlaceId,
  ] = useState("");


  const [
    caption,
    setCaption,
  ] = useState("");


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    progressMessage,
    setProgressMessage,
  ] = useState<
    string | null
  >(null);


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


  function resetMessages() {
    setErrorMessage(
      null
    );

    setSuccessMessage(
      null
    );

    setProgressMessage(
      null
    );
  }


  function validateFile(
    file: File
  ) {
    if (
      !isSupportedTripPhotoType(
        file.type
      )
    ) {
      return (
        `${file.name || "Photo"} is not a supported format. ` +
        "Use JPEG, PNG or WebP."
      );
    }

    if (
      file.size >
      TRIP_PHOTO_MAX_FILE_SIZE
    ) {
      return (
        `${file.name || "Photo"} is larger than 5 MB.`
      );
    }

    return null;
  }


  function handlePickerChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    resetMessages();

    const files =
      Array.from(
        event.target.files ??
          []
      );

    if (
      files.length === 0
    ) {
      return;
    }

    const accepted:
      File[] = [];

    const errors:
      string[] = [];


    files
      .slice(
        0,
        TRIP_PHOTO_MAX_BATCH
      )
      .forEach(
        (file) => {
          const validationError =
            validateFile(
              file
            );

          if (
            validationError
          ) {
            errors.push(
              validationError
            );

            return;
          }

          accepted.push(
            file
          );
        }
      );


    if (
      files.length >
      TRIP_PHOTO_MAX_BATCH
    ) {
      errors.push(
        `Choose up to ${TRIP_PHOTO_MAX_BATCH} photos at a time.`
      );
    }


    setSelectedFiles(
      accepted
    );

    setCaption(
      ""
    );


    if (
      errors.length >
      0
    ) {
      setErrorMessage(
        errors.join(
          " "
        )
      );
    }


    event.target.value =
      "";
  }


  function handleCameraChange(
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

    const validationError =
      validateFile(
        file
      );


    if (
      validationError
    ) {
      setErrorMessage(
        validationError
      );

      event.target.value =
        "";

      return;
    }


    if (
      selectedFiles.length >=
      TRIP_PHOTO_MAX_BATCH
    ) {
      setErrorMessage(
        `Choose up to ${TRIP_PHOTO_MAX_BATCH} photos at a time.`
      );

      event.target.value =
        "";

      return;
    }


    setSelectedFiles(
      (current) => [
        ...current,
        file,
      ]
    );

    setCaption(
      ""
    );

    event.target.value =
      "";
  }


  function removeSelectedFile(
    index: number
  ) {
    if (busy) {
      return;
    }

    setSelectedFiles(
      (current) =>
        current.filter(
          (
            _file,
            fileIndex
          ) =>
            fileIndex !==
            index
        )
    );

    setCaption(
      ""
    );
  }


  function clearSelection() {
    if (busy) {
      return;
    }

    setSelectedFiles(
      []
    );

    setCaption(
      ""
    );

    if (
      pickerInputRef.current
    ) {
      pickerInputRef.current.value =
        "";
    }

    if (
      cameraInputRef.current
    ) {
      cameraInputRef.current.value =
        "";
    }
  }


  async function uploadPhoto(
    file: File,
    photoCaption:
      | string
      | null
  ) {
    // Do not call crypto.randomUUID()
    // directly here. It is unavailable
    // when a phone accesses the local
    // production build over plain HTTP.
    const photoId =
      createBrowserUuid();

    const extension =
      getTripPhotoExtension(
        file.type
      );

    const storagePath =
      `${tripId}/${userId}/${photoId}.${extension}`;


    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "trip-photos"
        )
        .upload(
          storagePath,
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


    const {
      error:
        metadataError,
    } =
      await supabase
        .from(
          "trip_photos"
        )
        .insert({
          id:
            photoId,

          trip_id:
            tripId,

          uploaded_by:
            userId,

          storage_path:
            storagePath,

          caption:
            photoCaption,

          photo_date:
            selectedDate ||
            null,

          saved_place_id:
            selectedPlaceId ||
            null,
        });


    if (
      metadataError
    ) {
      // Do not leave an orphaned
      // Storage object if metadata
      // creation fails.
      await supabase.storage
        .from(
          "trip-photos"
        )
        .remove([
          storagePath,
        ]);

      throw new Error(
        metadataError.message
      );
    }
  }


  async function handleUpload() {
    if (
      busy ||
      selectedFiles.length ===
        0
    ) {
      return;
    }

    resetMessages();

    setBusy(
      true
    );


    let successfulUploads =
      0;

    const failedFiles:
      File[] = [];


    const singleCaption =
      selectedFiles.length ===
        1
        ? caption
            .trim()
            .slice(
              0,
              600
            ) ||
          null
        : null;


    try {
      for (
        let index = 0;
        index <
        selectedFiles.length;
        index += 1
      ) {
        const file =
          selectedFiles[
            index
          ];

        setProgressMessage(
          `Uploading ${index + 1} of ${selectedFiles.length}...`
        );


        try {
          await uploadPhoto(
            file,
            singleCaption
          );

          successfulUploads +=
            1;
        } catch (
          uploadError
        ) {
          console.error(
            "Failed to upload trip photo:",
            {
              fileName:
                file.name,

              fileType:
                file.type,

              fileSize:
                file.size,

              error:
                uploadError,
            }
          );

          failedFiles.push(
            file
          );
        }
      }


      if (
        successfulUploads >
        0
      ) {
        setSuccessMessage(
          successfulUploads ===
            1
            ? "Photo added to the trip gallery."
            : `${successfulUploads} photos added to the trip gallery.`
        );

        router.refresh();
      }


      if (
        failedFiles.length >
        0
      ) {
        // Keep failures selected so
        // the user can retry rather
        // than choosing them again.
        setSelectedFiles(
          failedFiles
        );

        setErrorMessage(
          failedFiles.length ===
            1
            ? "1 photo could not be uploaded. Please try again."
            : `${failedFiles.length} photos could not be uploaded. Please try again.`
        );
      } else {
        setSelectedFiles(
          []
        );

        setCaption(
          ""
        );
      }


      if (
        pickerInputRef.current
      ) {
        pickerInputRef.current.value =
          "";
      }

      if (
        cameraInputRef.current
      ) {
        cameraInputRef.current.value =
          "";
      }
    } catch (error) {
      // This is a final safeguard for
      // unexpected browser errors that
      // occur outside one file's upload.
      console.error(
        "Unexpected trip photo upload error:",
        error
      );

      setErrorMessage(
        "The photos could not be uploaded. Please try again."
      );
    } finally {
      setProgressMessage(
        null
      );

      setBusy(
        false
      );
    }
  }


  return (
    <details
      open={
        defaultOpen
      }
      className="group/upload overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-surface-hover sm:p-6 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Add photos
          </h2>

          {/* Keep user-facing copy focused
              on actual upload constraints. */}
          <p className="mt-1 text-sm text-muted">
            Up to 20 photos at once, 5 MB each.
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
          className="h-5 w-5 shrink-0 text-muted transition-transform group-open/upload:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>


      <div className="border-t border-line p-5 sm:p-6">
        {/* Normal native picker:
            file browser on desktop,
            native photo picker on mobile. */}
        <input
          ref={
            pickerInputRef
          }
          type="file"
          accept={
            TRIP_PHOTO_ACCEPT
          }
          multiple
          onChange={
            handlePickerChange
          }
          className="sr-only"
        />


        {/* Dedicated rear-camera capture
            for phone-sized layouts. */}
        <input
          ref={
            cameraInputRef
          }
          type="file"
          accept={
            TRIP_PHOTO_ACCEPT
          }
          capture="environment"
          onChange={
            handleCameraChange
          }
          className="sr-only"
        />


        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={
              busy
            }
            onClick={() =>
              pickerInputRef.current
                ?.click()
            }
            className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add photos
          </button>


          <button
            type="button"
            disabled={
              busy
            }
            onClick={() =>
              cameraInputRef.current
                ?.click()
            }
            className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
          >
            Take photo
          </button>
        </div>


        <p className="mt-3 text-xs text-subtle">
          JPEG, PNG or WebP.
        </p>


        {selectedFiles.length >
          0 && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-medium text-ink">
                  Selected photos
                </h3>

                <p className="mt-1 text-xs text-muted">
                  {
                    selectedFiles.length
                  }{" "}
                  {selectedFiles.length ===
                  1
                    ? "photo"
                    : "photos"}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  clearSelection
                }
                className="cursor-pointer text-sm font-medium text-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            </div>


            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {selectedFiles.map(
                (
                  file,
                  index
                ) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${file.size}-${index}`}
                    className="relative"
                  >
                    <SelectedPhotoPreview
                      file={
                        file
                      }
                    />

                    <button
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        removeSelectedFile(
                          index
                        )
                      }
                      aria-label={`Remove ${file.name || "photo"}`}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold text-ink shadow-sm transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>


            {/* Optional metadata applied to the batch. */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="trip-photo-date"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Trip day
                </label>

                <select
                  id="trip-photo-date"
                  value={
                    selectedDate
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedDate(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    busy
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
                >
                  <option value="">
                    No day selected
                  </option>

                  {dayOptions.map(
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
                <label
                  htmlFor="trip-photo-place"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Place
                </label>

                <select
                  id="trip-photo-place"
                  value={
                    selectedPlaceId
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedPlaceId(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    busy
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
                >
                  <option value="">
                    No place selected
                  </option>

                  {placeOptions.map(
                    (
                      place
                    ) => (
                      <option
                        key={
                          place.id
                        }
                        value={
                          place.id
                        }
                      >
                        {
                          place.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>


            {selectedFiles.length ===
              1 && (
              <div className="mt-4">
                <label
                  htmlFor="trip-photo-caption"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Caption
                </label>

                <textarea
                  id="trip-photo-caption"
                  value={
                    caption
                  }
                  onChange={(
                    event
                  ) =>
                    setCaption(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    busy
                  }
                  maxLength={
                    600
                  }
                  rows={
                    3
                  }
                  placeholder="Add a caption..."
                  className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
                />

                <p className="mt-1 text-right text-xs text-subtle">
                  {
                    caption.length
                  }
                  /600
                </p>
              </div>
            )}


            {selectedFiles.length >
              1 && (
              <p className="mt-4 text-xs leading-5 text-subtle">
                The selected day and place will be applied to all photos. Captions can be added individually after upload.
              </p>
            )}


            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  handleUpload
                }
                className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Uploading..."
                  : selectedFiles.length ===
                      1
                    ? "Upload photo"
                    : `Upload ${selectedFiles.length} photos`}
              </button>

              {progressMessage && (
                <span
                  aria-live="polite"
                  className="text-sm text-muted"
                >
                  {
                    progressMessage
                  }
                </span>
              )}
            </div>
          </div>
        )}


        {errorMessage && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            {
              errorMessage
            }
          </div>
        )}


        {successMessage && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
          >
            {
              successMessage
            }
          </div>
        )}
      </div>
    </details>
  );
}