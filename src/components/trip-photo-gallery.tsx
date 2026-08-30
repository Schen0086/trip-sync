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
};


export default function TripPhotoGallery({
  photos,
  dayOptions,
  placeOptions,
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
    useState("all");

  const [
    placeFilter,
    setPlaceFilter,
  ] =
    useState("all");

  const [
    selectedPhotoId,
    setSelectedPhotoId,
  ] =
    useState<
      string | null
    >(null);

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
            if (
              dayFilter !==
                "all" &&
              photo.photoDate !==
                dayFilter
            ) {
              return false;
            }

            if (
              placeFilter !==
                "all" &&
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


  // Initialise editable fields whenever another
  // photo is opened.
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


  // If filtering removes the currently open image,
  // close the lightbox instead of leaving stale data.
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


  // Prevent the page behind the lightbox from moving.
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


  // Escape and arrow keys make the desktop lightbox
  // usable without reaching for the mouse.
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
      "all"
    );

    setPlaceFilter(
      "all"
    );
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


    // Remove metadata first so the gallery never keeps a
    // record pointing at an image the user can no longer see.
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


    // The database record is already gone. If Storage
    // cleanup fails, the inaccessible orphan is logged
    // rather than restoring stale gallery metadata.
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
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
                >
                  <option value="all">
                    All days
                  </option>

                  <option value="">
                    No day
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
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
                >
                  <option value="all">
                    All places
                  </option>

                  <option value="">
                    No place
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


      {/* Gallery summary */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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
      </div>


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
            (photo) => (
              <article
                key={
                  photo.id
                }
                className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPhotoId(
                      photo.id
                    )
                  }
                  className="group/photo block w-full cursor-pointer overflow-hidden bg-surface-soft text-left"
                  aria-label={`Open photo uploaded by ${photo.uploaderName}`}
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
                        className="h-full w-full object-cover transition duration-300 group-hover/photo:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">
                        Image unavailable
                      </div>
                    )}
                  </div>
                </button>


                <div className="p-3">
                  {photo.caption && (
                    <p className="line-clamp-2 text-sm font-medium leading-5 text-ink">
                      {
                        photo.caption
                      }
                    </p>
                  )}

                  <div className={`${photo.caption ? "mt-2" : ""} flex flex-wrap gap-1.5`}>
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
            )
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
                  saving
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
                              event.target
                                .value
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
                              event.target
                                .value
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
                              event.target
                                .value
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