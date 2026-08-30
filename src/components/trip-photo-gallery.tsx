"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import Avatar from "@/components/avatar";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  formatTripPhotoDate,
  formatTripPhotoUploadedAt,
  type TripPhotoDayOption,
  type TripPhotoPlaceOption,
  type TripPhotoRecord,
} from "@/lib/trip-photos";


type TripPhotoGalleryProps = {
  photos:
    TripPhotoRecord[];

  dayOptions:
    TripPhotoDayOption[];

  placeOptions:
    TripPhotoPlaceOption[];

  isTripCreator: boolean;
};

const FILTER_ALL =
  "all";

const FILTER_NONE =
  "none";

function getFileExtension(
  photo: TripPhotoRecord,
  blob?: Blob
) {
  const pathExtension =
    photo.storagePath
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    pathExtension ===
      "jpg" ||
    pathExtension ===
      "jpeg" ||
    pathExtension ===
      "png" ||
    pathExtension ===
      "webp"
  ) {
    return pathExtension ===
      "jpeg"
      ? "jpg"
      : pathExtension;
  }

  switch (
    blob?.type
  ) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}


function createPhotoFileName(
  photo: TripPhotoRecord,
  index: number,
  blob?: Blob
) {
  const extension =
    getFileExtension(
      photo,
      blob
    );

  return `TripSync-photo-${index + 1}.${extension}`;
}


function triggerDownload(
  blob: Blob,
  fileName: string
) {
  const objectUrl =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    objectUrl;

  anchor.download =
    fileName;

  anchor.style.display =
    "none";

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl
      );
    },
    1000
  );
}


export default function TripPhotoGallery({
  photos,
  dayOptions,
  placeOptions,
  isTripCreator,
}: TripPhotoGalleryProps) {
  const router =
    useRouter();

  const supabase =
    createClient();


  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);

  const [
    dayFilter,
    setDayFilter,
  ] =
    useState(
      FILTER_ALL
    );

  const [
    placeFilter,
    setPlaceFilter,
  ] =
    useState(
      FILTER_ALL
    );


  // Lightbox selection.
  const [
    selectedPhotoId,
    setSelectedPhotoId,
  ] =
    useState<
      string | null
    >(null);


  // Multi-select mode.
  const [
    selectionMode,
    setSelectionMode,
  ] =
    useState(false);

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );


  const [
    editCaption,
    setEditCaption,
  ] =
    useState("");

  const [
    editDate,
    setEditDate,
  ] =
    useState("");

  const [
    editPlaceId,
    setEditPlaceId,
  ] =
    useState("");


  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    bulkBusy,
    setBulkBusy,
  ] =
    useState(false);


  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    galleryMessage,
    setGalleryMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    galleryError,
    setGalleryError,
  ] =
    useState<
      string | null
    >(null);


  // Keep filters expanded on larger screens,
  // while saving space on phones.
  useEffect(() => {
    if (
      window.matchMedia(
        "(min-width: 768px)"
      ).matches
    ) {
      setFiltersOpen(
        true
      );
    }
  }, []);


  const visiblePhotos =
    useMemo(
      () =>
        photos.filter(
          (photo) => {
            // Day filter.
            if (
              dayFilter ===
              FILTER_NONE
            ) {
              if (
                photo.photoDate !==
                null
              ) {
                return false;
              }
            } else if (
              dayFilter !==
                FILTER_ALL &&
              photo.photoDate !==
                dayFilter
            ) {
              return false;
            }


            // Place filter.
            if (
              placeFilter ===
              FILTER_NONE
            ) {
              if (
                photo.savedPlaceId !==
                null
              ) {
                return false;
              }
            } else if (
              placeFilter !==
                FILTER_ALL &&
              photo.savedPlaceId !==
                placeFilter
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        photos,
        dayFilter,
        placeFilter,
      ]
    );


  const selectedPhotos =
    useMemo(
      () =>
        photos.filter(
          (photo) =>
            selectedIds.has(
              photo.id
            )
        ),
      [
        photos,
        selectedIds,
      ]
    );


  const selectedPhoto =
    useMemo(
      () =>
        visiblePhotos.find(
          (photo) =>
            photo.id ===
            selectedPhotoId
        ) ??
        null,
      [
        visiblePhotos,
        selectedPhotoId,
      ]
    );


  const selectedIndex =
    selectedPhoto
      ? visiblePhotos.findIndex(
          (photo) =>
            photo.id ===
            selectedPhoto.id
        )
      : -1;


  // Initialise lightbox edit fields.
  useEffect(() => {
    if (
      !selectedPhoto
    ) {
      return;
    }

    setEditCaption(
      selectedPhoto.caption ??
        ""
    );

    setEditDate(
      selectedPhoto.photoDate ??
        ""
    );

    setEditPlaceId(
      selectedPhoto.savedPlaceId ??
        ""
    );

    setMessage(
      null
    );

    setErrorMessage(
      null
    );
  }, [
    selectedPhoto,
  ]);


  // Close the lightbox if filtering hides it.
  useEffect(() => {
    if (
      selectedPhotoId &&
      !visiblePhotos.some(
        (photo) =>
          photo.id ===
          selectedPhotoId
      )
    ) {
      setSelectedPhotoId(
        null
      );
    }
  }, [
    selectedPhotoId,
    visiblePhotos,
  ]);


  // Remove IDs that no longer exist after
  // realtime deletion or router refresh.
  useEffect(() => {
    setSelectedIds(
      (current) => {
        const validIds =
          new Set(
            photos.map(
              (photo) =>
                photo.id
            )
          );

        return new Set(
          Array.from(
            current
          ).filter(
            (id) =>
              validIds.has(
                id
              )
          )
        );
      }
    );
  }, [
    photos,
  ]);


  // Prevent the page behind the lightbox from scrolling.
  useEffect(() => {
    if (
      !selectedPhotoId
    ) {
      return;
    }

    const originalOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [
    selectedPhotoId,
  ]);


  function closeLightbox() {
    if (saving) {
      return;
    }

    setSelectedPhotoId(
      null
    );

    setMessage(
      null
    );

    setErrorMessage(
      null
    );
  }


  function moveLightbox(
    direction: number
  ) {
    if (
      visiblePhotos.length <=
        1 ||
      selectedIndex ===
        -1
    ) {
      return;
    }

    const nextIndex =
      (
        selectedIndex +
        direction +
        visiblePhotos.length
      ) %
      visiblePhotos.length;

    setSelectedPhotoId(
      visiblePhotos[
        nextIndex
      ].id
    );
  }


  // Desktop keyboard lightbox controls.
  useEffect(() => {
    if (
      !selectedPhoto
    ) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        closeLightbox();
        return;
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        moveLightbox(
          -1
        );
        return;
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        moveLightbox(
          1
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  });


  function clearFilters() {
    setDayFilter(
      FILTER_ALL
    );

    setPlaceFilter(
      FILTER_ALL
    );
  }


  function startSelectionMode() {
    setSelectionMode(
      true
    );

    setSelectedPhotoId(
      null
    );

    setGalleryMessage(
      null
    );

    setGalleryError(
      null
    );
  }


  function exitSelectionMode() {
    if (bulkBusy) {
      return;
    }

    setSelectionMode(
      false
    );

    setSelectedIds(
      new Set()
    );

    setGalleryMessage(
      null
    );

    setGalleryError(
      null
    );
  }


  function togglePhotoSelection(
    photoId: string
  ) {
    if (bulkBusy) {
      return;
    }

    setSelectedIds(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(
            photoId
          )
        ) {
          next.delete(
            photoId
          );
        } else {
          next.add(
            photoId
          );
        }

        return next;
      }
    );
  }


  function selectAllVisible() {
    if (bulkBusy) {
      return;
    }

    setSelectedIds(
      (current) => {
        const next =
          new Set(
            current
          );

        visiblePhotos.forEach(
          (photo) => {
            next.add(
              photo.id
            );
          }
        );

        return next;
      }
    );
  }


  function clearSelection() {
    if (bulkBusy) {
      return;
    }

    setSelectedIds(
      new Set()
    );
  }


  async function fetchPhotoFile(
    photo: TripPhotoRecord,
    index: number
  ) {
    if (
      !photo.imageUrl
    ) {
      throw new Error(
        "Photo is unavailable."
      );
    }

    const response =
      await fetch(
        photo.imageUrl
      );

    if (
      !response.ok
    ) {
      throw new Error(
        "Unable to download photo."
      );
    }

    const blob =
      await response.blob();

    return new File(
      [
        blob,
      ],
      createPhotoFileName(
        photo,
        index,
        blob
      ),
      {
        type:
          blob.type ||
          "image/jpeg",
      }
    );
  }

  function downloadPhotoArchive(
    photosToSave:
      TripPhotoRecord[]
  ) {
    if (
      photosToSave.length <
        2
    ) {
      return;
    }


    const tripId =
      photosToSave[0]
        ?.tripId;


    if (!tripId) {
      throw new Error(
        "Trip information is unavailable."
      );
    }


    const downloadUrl =
      new URL(
        `/api/trips/${tripId}/photos/download`,
        window.location.origin
      );


    photosToSave.forEach(
      (photo) => {
        downloadUrl
          .searchParams
          .append(
            "id",
            photo.id
          );
      }
    );


    // One browser download is substantially safer
    // on iOS than firing several full-resolution
    // downloads or sharing several Files together.
    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      downloadUrl.toString();

    anchor.download =
      "TripSync-photos.zip";

    anchor.style.display =
      "none";


    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();
  }

  /**
   * Save one or more photos.
   *
   * Mobile HTTPS browsers can use the native
   * operating-system share sheet when file
   * sharing is supported.
   *
   * Other browsers fall back to normal downloads.
   */
  async function savePhotos(
    photosToSave:
      TripPhotoRecord[]
  ) {
    if (
      photosToSave.length ===
        0 ||
      bulkBusy
    ) {
      return;
    }


    setBulkBusy(
      true
    );

    setGalleryMessage(
      null
    );

    setGalleryError(
      null
    );


    try {
      // Multiple photos are downloaded as one
      // archive. This avoids mobile Safari
      // handling many large image Files at once.
      if (
        photosToSave.length >
        1
      ) {
        downloadPhotoArchive(
          photosToSave
        );

        setGalleryMessage(
          `${photosToSave.length} photos are being prepared for download.`
        );

        return;
      }


      // Preserve the existing successful
      // single-photo save/share experience.
      const photo =
        photosToSave[0];


      if (
        !photo.imageUrl
      ) {
        throw new Error(
          "The selected photo is currently unavailable."
        );
      }


      const file =
        await fetchPhotoFile(
          photo,
          0
        );


      if (
        typeof navigator !==
          "undefined" &&
        typeof navigator.canShare ===
          "function" &&
        typeof navigator.share ===
          "function" &&
        navigator.canShare({
          files: [
            file,
          ],
        })
      ) {
        try {
          await navigator.share({
            files: [
              file,
            ],

            title:
              "TripSync photo",
          });


          setGalleryMessage(
            "Photo ready to save or share."
          );

          return;
        } catch (
          shareError
        ) {
          // Closing the native share sheet
          // is not an application error.
          if (
            shareError instanceof
              DOMException &&
            shareError.name ===
              "AbortError"
          ) {
            return;
          }


          console.error(
            "Native photo sharing failed:",
            shareError
          );
        }
      }


      triggerDownload(
        file,
        file.name
      );


      setGalleryMessage(
        "Photo download started."
      );
    } catch (error) {
      console.error(
        "Failed to save trip photos:",
        error
      );


      setGalleryError(
        error instanceof Error
          ? error.message
          : "Unable to save the selected photos."
      );
    } finally {
      setBulkBusy(
        false
      );
    }
  }


  async function deleteSelectedPhotos() {
    if (
      !isTripCreator ||
      selectedPhotos.length ===
        0 ||
      bulkBusy
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        selectedPhotos.length ===
          1
          ? "Delete this photo from the trip gallery? This cannot be undone."
          : `Delete these ${selectedPhotos.length} photos from the trip gallery? This cannot be undone.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setBulkBusy(
      true
    );

    setGalleryMessage(
      null
    );

    setGalleryError(
      null
    );


    try {
      const photoIds =
        selectedPhotos.map(
          (photo) =>
            photo.id
        );

      const {
        data:
          deletedRows,
        error:
          deleteError,
      } =
        await supabase
          .from(
            "trip_photos"
          )
          .delete()
          .in(
            "id",
            photoIds
          )
          .select(
            "id"
          );


      if (
        deleteError
      ) {
        throw new Error(
          deleteError.message
        );
      }


      if (
        !deletedRows ||
        deletedRows.length !==
          photoIds.length
      ) {
        throw new Error(
          "Not all selected photos could be deleted."
        );
      }


      const storagePaths =
        selectedPhotos.map(
          (photo) =>
            photo.storagePath
        );


      const {
        error:
          storageError,
      } =
        await supabase.storage
          .from(
            "trip-photos"
          )
          .remove(
            storagePaths
          );


      if (
        storageError
      ) {
        // Metadata is already deleted, so do not
        // restore stale records if Storage cleanup
        // itself has a problem.
        console.error(
          "Failed to remove one or more trip photo files:",
          storageError
        );
      }


      const deletedCount =
        selectedPhotos.length;

      setSelectedIds(
        new Set()
      );

      setSelectionMode(
        false
      );

      setGalleryMessage(
        deletedCount ===
          1
          ? "Photo deleted."
          : `${deletedCount} photos deleted.`
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to delete selected trip photos:",
        error
      );

      setGalleryError(
        error instanceof Error
          ? error.message
          : "Unable to delete the selected photos."
      );
    } finally {
      setBulkBusy(
        false
      );
    }
  }


  async function savePhotoDetails() {
    if (
      !selectedPhoto ||
      !selectedPhoto.canEdit ||
      saving
    ) {
      return;
    }

    setSaving(
      true
    );

    setMessage(
      null
    );

    setErrorMessage(
      null
    );


    const {
      data,
      error,
    } =
      await supabase
        .from(
          "trip_photos"
        )
        .update({
          caption:
            editCaption
              .trim()
              .slice(
                0,
                600
              ) ||
            null,

          photo_date:
            editDate ||
            null,

          saved_place_id:
            editPlaceId ||
            null,
        })
        .eq(
          "id",
          selectedPhoto.id
        )
        .select(
          "id"
        )
        .maybeSingle();


    if (
      error ||
      !data
    ) {
      console.error(
        "Failed to update trip photo:",
        error
      );

      setErrorMessage(
        error?.message ??
          "Unable to update the photo."
      );

      setSaving(
        false
      );

      return;
    }


    setMessage(
      "Photo details updated."
    );

    setSaving(
      false
    );

    router.refresh();
  }


  async function deletePhoto() {
    if (
      !selectedPhoto ||
      !selectedPhoto.canEdit ||
      saving
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this photo from the trip gallery? This cannot be undone."
      );

    if (
      !confirmed
    ) {
      return;
    }

    setSaving(
      true
    );

    setMessage(
      null
    );

    setErrorMessage(
      null
    );


    const {
      data,
      error:
        deleteError,
    } =
      await supabase
        .from(
          "trip_photos"
        )
        .delete()
        .eq(
          "id",
          selectedPhoto.id
        )
        .select(
          "id"
        )
        .maybeSingle();


    if (
      deleteError ||
      !data
    ) {
      console.error(
        "Failed to delete trip photo metadata:",
        deleteError
      );

      setErrorMessage(
        deleteError?.message ??
          "Unable to delete the photo."
      );

      setSaving(
        false
      );

      return;
    }


    const {
      error:
        storageError,
    } =
      await supabase.storage
        .from(
          "trip-photos"
        )
        .remove([
          selectedPhoto.storagePath,
        ]);


    if (
      storageError
    ) {
      console.error(
        "Failed to remove trip photo file:",
        storageError
      );
    }


    setSelectedPhotoId(
      null
    );

    setSaving(
      false
    );

    setMessage(
      null
    );

    router.refresh();
  }


  if (
    photos.length ===
    0
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-soft text-muted">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-6 w-6"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />

            <circle
              cx="8.5"
              cy="10"
              r="1.5"
            />

            <path d="m21 15-5-5L5 19" />
          </svg>
        </div>

        <h2 className="mt-4 font-semibold text-ink">
          No trip photos yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Photos shared by travellers will appear here throughout the trip.
        </p>
      </div>
    );
  }


  return (
    <>
      {/* Gallery filters */}
      <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface">
        <button
          type="button"
          onClick={() =>
            setFiltersOpen(
              (current) =>
                !current
            )
          }
          aria-expanded={
            filtersOpen
          }
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-hover"
        >
          <div>
            <p className="text-sm font-medium text-ink">
              Gallery filters
            </p>

            <p className="mt-0.5 text-xs text-muted">
              Filter by trip day or saved place
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
            className={`h-5 w-5 text-muted transition-transform ${
              filtersOpen
                ? "rotate-180"
                : ""
            }`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>


        {filtersOpen && (
          <div className="border-t border-line p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="photo-day-filter"
                  className="mb-1.5 block text-xs font-medium text-ink"
                >
                  Trip day
                </label>

                <select
                  id="photo-day-filter"
                  value={
                    dayFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setDayFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
                >
                  <option
                    value={
                      FILTER_ALL
                    }
                  >
                    All days
                  </option>

                  <option
                    value={
                      FILTER_NONE
                    }
                  >
                    No day
                  </option>

                  {dayOptions.map(
                    (option) => (
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
                  htmlFor="photo-place-filter"
                  className="mb-1.5 block text-xs font-medium text-ink"
                >
                  Place
                </label>

                <select
                  id="photo-place-filter"
                  value={
                    placeFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setPlaceFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
                >
                  <option
                    value={
                      FILTER_ALL
                    }
                  >
                    All places
                  </option>

                  <option
                    value={
                      FILTER_NONE
                    }
                  >
                    No place
                  </option>

                  {placeOptions.map(
                    (place) => (
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


            <button
              type="button"
              onClick={
                clearFilters
              }
              className="mt-4 cursor-pointer text-sm font-medium text-muted transition hover:text-ink"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>


      {/* Gallery selection toolbar */}
      <div className="mb-4 rounded-xl border border-line bg-surface p-3 sm:p-4">
        {!selectionMode ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {
                visiblePhotos.length
              }{" "}
              {visiblePhotos.length ===
              1
                ? "photo"
                : "photos"}
              {visiblePhotos.length !==
                photos.length &&
                ` of ${photos.length}`}
            </p>

            <button
              type="button"
              onClick={
                startSelectionMode
              }
              className="cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
            >
              Select
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">
                {
                  selectedIds.size
                }{" "}
                {selectedIds.size ===
                1
                  ? "photo selected"
                  : "photos selected"}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    bulkBusy
                  }
                  onClick={
                    selectAllVisible
                  }
                  className="cursor-pointer rounded-lg border border-line bg-surface-soft px-3 py-2 text-xs font-medium text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Select visible
                </button>

                {selectedIds.size >
                  0 && (
                  <button
                    type="button"
                    disabled={
                      bulkBusy
                    }
                    onClick={
                      clearSelection
                    }
                    className="cursor-pointer rounded-lg border border-line bg-surface-soft px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    bulkBusy
                  }
                  onClick={
                    exitSelectionMode
                  }
                  className="cursor-pointer rounded-lg px-3 py-2 text-xs font-medium text-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>


            {selectedIds.size >
              0 && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  disabled={
                    bulkBusy
                  }
                  onClick={() =>
                    savePhotos(
                      selectedPhotos
                    )
                  }
                  className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkBusy
                    ? "Preparing..."
                    : selectedIds.size ===
                        1
                      ? "Save photo"
                      : `Save ${selectedIds.size} photos`}
                </button>


                {isTripCreator && (
                  <button
                    type="button"
                    disabled={
                      bulkBusy
                    }
                    onClick={
                      deleteSelectedPhotos
                    }
                    className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-4 py-2.5 text-sm font-medium text-danger-text transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {selectedIds.size ===
                    1
                      ? "Delete photo"
                      : `Delete ${selectedIds.size} photos`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>


      {galleryMessage && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
        >
          {
            galleryMessage
          }
        </div>
      )}


      {galleryError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
        >
          {
            galleryError
          }
        </div>
      )}


      {visiblePhotos.length ===
      0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <h2 className="font-semibold text-ink">
            No photos match these filters
          </h2>

          <p className="mt-2 text-sm text-muted">
            Try another day or place.
          </p>

          <button
            type="button"
            onClick={
              clearFilters
            }
            className="mt-4 cursor-pointer text-sm font-medium text-brand-700"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visiblePhotos.map(
            (photo) => {
              const checked =
                selectedIds.has(
                  photo.id
                );

              return (
                <article
                  key={
                    photo.id
                  }
                  className={`relative min-w-0 overflow-hidden rounded-2xl border bg-surface transition ${
                    checked
                      ? "border-brand-500 ring-2 ring-brand-100"
                      : "border-line"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        selectionMode
                      ) {
                        togglePhotoSelection(
                          photo.id
                        );

                        return;
                      }

                      setSelectedPhotoId(
                        photo.id
                      );
                    }}
                    className="group/photo relative block w-full cursor-pointer overflow-hidden bg-surface-soft text-left"
                    aria-label={
                      selectionMode
                        ? checked
                          ? `Deselect photo uploaded by ${photo.uploaderName}`
                          : `Select photo uploaded by ${photo.uploaderName}`
                        : `Open photo uploaded by ${photo.uploaderName}`
                    }
                    aria-pressed={
                      selectionMode
                        ? checked
                        : undefined
                    }
                  >
                    <div className="aspect-square overflow-hidden">
                      {photo.imageUrl ? (
                        // Private signed URLs are dynamic.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            photo.imageUrl
                          }
                          alt={
                            photo.caption ??
                            `Trip photo uploaded by ${photo.uploaderName}`
                          }
                          loading="lazy"
                          className={`h-full w-full object-cover transition duration-300 ${
                            selectionMode
                              ? ""
                              : "group-hover/photo:scale-[1.02]"
                          }`}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">
                          Image unavailable
                        </div>
                      )}
                    </div>


                    {selectionMode && (
                      <>
                        <div
                          className={`absolute inset-0 transition ${
                            checked
                              ? "bg-brand-600/15"
                              : "bg-black/5"
                          }`}
                        />

                        <span
                          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm ${
                            checked
                              ? "border-brand-600 bg-brand-600 text-brand-contrast"
                              : "border-white bg-black/45 text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      </>
                    )}
                  </button>


                  <div className="p-3">
                    {photo.caption && (
                      <p className="line-clamp-2 text-sm font-medium leading-5 text-ink">
                        {
                          photo.caption
                        }
                      </p>
                    )}

                    <div
                      className={`${photo.caption ? "mt-2" : ""} flex flex-wrap gap-1.5`}
                    >
                      {photo.photoDate && (
                        <span className="rounded-full border border-line bg-surface-soft px-2 py-1 text-[11px] text-muted">
                          {formatTripPhotoDate(
                            photo.photoDate
                          )}
                        </span>
                      )}

                      {photo.placeName && (
                        <span className="max-w-full truncate rounded-full border border-line bg-surface-soft px-2 py-1 text-[11px] text-muted">
                          {
                            photo.placeName
                          }
                        </span>
                      )}
                    </div>


                    <div className="mt-3 flex items-center gap-2">
                      <Avatar
                        src={
                          photo.uploaderAvatarUrl
                        }
                        displayName={
                          photo.uploaderName
                        }
                        size="xs"
                      />

                      <p className="min-w-0 truncate text-xs text-subtle">
                        {
                          photo.uploaderName
                        }
                      </p>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}


      {/* Photo lightbox */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Trip photo"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeLightbox();
            }
          }}
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 p-3 sm:p-6"
        >
          <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">

              {/* Close */}
              <button
                type="button"
                disabled={
                  saving ||
                  bulkBusy
                }
                onClick={
                  closeLightbox
                }
                aria-label="Close photo"
                className="absolute right-3 top-3 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-xl text-ink shadow-sm transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                ×
              </button>


              <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">

                {/* Image */}
                <div className="relative flex min-h-[320px] items-center justify-center bg-black/90 lg:min-h-[650px]">
                  {selectedPhoto.imageUrl ? (
                    // Private signed URLs are dynamic.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        selectedPhoto.imageUrl
                      }
                      alt={
                        selectedPhoto.caption ??
                        `Trip photo uploaded by ${selectedPhoto.uploaderName}`
                      }
                      className="max-h-[78vh] max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-white/70">
                      Image unavailable
                    </p>
                  )}


                  {visiblePhotos.length >
                    1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          moveLightbox(
                            -1
                          )
                        }
                        aria-label="Previous photo"
                        className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/60 text-2xl text-white transition hover:bg-black/75 sm:left-4"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveLightbox(
                            1
                          )
                        }
                        aria-label="Next photo"
                        className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/60 text-2xl text-white transition hover:bg-black/75 sm:right-4"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>


                {/* Details */}
                <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6 lg:max-h-[650px]">
                  <div className="flex items-center gap-3 pr-12">
                    <Avatar
                      src={
                        selectedPhoto.uploaderAvatarUrl
                      }
                      displayName={
                        selectedPhoto.uploaderName
                      }
                      size="md"
                    />

                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {
                          selectedPhoto.uploaderName
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-subtle">
                        {formatTripPhotoUploadedAt(
                          selectedPhoto.createdAt
                        )}
                      </p>
                    </div>
                  </div>


                  {/* Everyone with gallery access can save
                      a single photo from the lightbox. */}
                  <button
                    type="button"
                    disabled={
                      bulkBusy ||
                      !selectedPhoto.imageUrl
                    }
                    onClick={() =>
                      savePhotos([
                        selectedPhoto,
                      ])
                    }
                    className="mt-5 cursor-pointer rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkBusy
                      ? "Preparing..."
                      : "Save photo"}
                  </button>


                  {selectedPhoto.canEdit ? (
                    <div className="mt-6 space-y-5">
                      <div>
                        <label
                          htmlFor="lightbox-photo-caption"
                          className="mb-1.5 block text-sm font-medium text-ink"
                        >
                          Caption
                        </label>

                        <textarea
                          id="lightbox-photo-caption"
                          value={
                            editCaption
                          }
                          onChange={(
                            event
                          ) =>
                            setEditCaption(
                              event.target.value
                            )
                          }
                          maxLength={
                            600
                          }
                          rows={
                            4
                          }
                          disabled={
                            saving
                          }
                          placeholder="Add a caption..."
                          className="w-full resize-none rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
                        />

                        <p className="mt-1 text-right text-xs text-subtle">
                          {
                            editCaption.length
                          }
                          /600
                        </p>
                      </div>


                      <div>
                        <label
                          htmlFor="lightbox-photo-date"
                          className="mb-1.5 block text-sm font-medium text-ink"
                        >
                          Trip day
                        </label>

                        <select
                          id="lightbox-photo-date"
                          value={
                            editDate
                          }
                          onChange={(
                            event
                          ) =>
                            setEditDate(
                              event.target.value
                            )
                          }
                          disabled={
                            saving
                          }
                          className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
                        >
                          <option value="">
                            No day selected
                          </option>

                          {dayOptions.map(
                            (option) => (
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
                          htmlFor="lightbox-photo-place"
                          className="mb-1.5 block text-sm font-medium text-ink"
                        >
                          Place
                        </label>

                        <select
                          id="lightbox-photo-place"
                          value={
                            editPlaceId
                          }
                          onChange={(
                            event
                          ) =>
                            setEditPlaceId(
                              event.target.value
                            )
                          }
                          disabled={
                            saving
                          }
                          className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
                        >
                          <option value="">
                            No place selected
                          </option>

                          {placeOptions.map(
                            (place) => (
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


                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={
                            savePhotoDetails
                          }
                          className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving
                            ? "Saving..."
                            : "Save details"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={
                            deletePhoto
                          }
                          className="cursor-pointer rounded-xl border border-danger-border bg-danger-surface px-4 py-2.5 text-sm font-medium text-danger-text transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {selectedPhoto.caption ? (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                            Caption
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                            {
                              selectedPhoto.caption
                            }
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm italic text-subtle">
                          No caption.
                        </p>
                      )}


                      {selectedPhoto.photoDate && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                            Trip day
                          </p>

                          <p className="mt-1 text-sm text-ink">
                            {formatTripPhotoDate(
                              selectedPhoto.photoDate
                            )}
                          </p>
                        </div>
                      )}


                      {selectedPhoto.placeName && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                            Place
                          </p>

                          <p className="mt-1 text-sm text-ink">
                            {
                              selectedPhoto.placeName
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}


                  {message && (
                    <div
                      role="status"
                      className="mt-5 rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-text"
                    >
                      {
                        message
                      }
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


                  {visiblePhotos.length >
                    1 && (
                    <p className="mt-6 text-xs text-subtle">
                      Photo{" "}
                      {
                        selectedIndex +
                        1
                      }{" "}
                      of{" "}
                      {
                        visiblePhotos.length
                      }
                      . Use the arrow keys on a keyboard to move between photos.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}