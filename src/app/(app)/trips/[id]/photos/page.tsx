import {
  redirect,
} from "next/navigation";

import BackButton from "@/components/back-button";
import TripPhotoGallery from "@/components/trip-photo-gallery";
import TripPhotoUploader from "@/components/trip-photo-uploader";

import {
  formatTripDay,
  getTripDates,
} from "@/lib/itinerary";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  type TripPhotoDayOption,
  type TripPhotoPlaceOption,
  type TripPhotoRecord,
} from "@/lib/trip-photos";


type TripPhotosPageProps = {
  params: Promise<{
    id: string;
  }>;
};


type TripPhotoRow = {
  id: string;

  trip_id: string;

  uploaded_by: string;

  storage_path: string;

  caption:
    | string
    | null;

  photo_date:
    | string
    | null;

  saved_place_id:
    | string
    | null;

  created_at: string;
};


type ProfileRow = {
  id: string;

  display_name:
    | string
    | null;

  avatar_url:
    | string
    | null;
};


export default async function TripPhotosPage({
  params,
}: TripPhotosPageProps) {
  const {
    id,
  } =
    await params;


  const supabase =
    await createClient();


  const {
    data,
    error:
      authError,
  } =
    await supabase.auth.getClaims();


  if (
    authError ||
    !data?.claims
  ) {
    redirect(
      "/login"
    );
  }


  const userId =
    data.claims.sub;


  const {
    data: trip,
    error:
      tripError,
  } =
    await supabase
      .from(
        "trips"
      )
      .select(`
        id,
        name,
        destination,
        trip_type,
        owner_id,
        start_date,
        end_date
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();


  if (
    tripError
  ) {
    console.error(
      "Failed to load trip photos trip:",
      tripError
    );
  }


  if (!trip) {
    redirect(
      "/dashboard"
    );
  }


  const isTripCreator =
    trip.owner_id ===
    userId;


  // A normal group member may have access to view
  // the trip without actually participating in it.
  let isTripParticipant =
    false;


  if (
    trip.trip_type ===
      "group" &&
    !isTripCreator
  ) {
    const {
      data:
        participant,
    } =
      await supabase
        .from(
          "trip_participants"
        )
        .select(
          "user_id"
        )
        .eq(
          "trip_id",
          trip.id
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    isTripParticipant =
      Boolean(
        participant
      );
  }


  const canUpload =
    isTripCreator ||
    isTripParticipant;


  // Saved places can optionally be associated with photos.
  const {
    data:
      savedPlaceData,
    error:
      savedPlacesError,
  } =
    await supabase
      .from(
        "saved_places"
      )
      .select(`
        id,
        name
      `)
      .eq(
        "trip_id",
        trip.id
      )
      .order(
        "name",
        {
          ascending:
            true,
        }
      );


  if (
    savedPlacesError
  ) {
    console.error(
      "Failed to load photo place options:",
      savedPlacesError
    );
  }


  const placeOptions:
    TripPhotoPlaceOption[] =
    (
      savedPlaceData ??
      []
    ).map(
      (place) => ({
        id:
          place.id,

        name:
          place.name,
      })
    );


  const placeNameById =
    new Map(
      placeOptions.map(
        (place) => [
          place.id,
          place.name,
        ]
      )
    );


  const tripDates =
    getTripDates(
      trip.start_date,
      trip.end_date
    );


  const dayOptions:
    TripPhotoDayOption[] =
    tripDates.map(
      (
        date,
        index
      ) => ({
        value:
          date,

        label:
          `Day ${index + 1} — ${formatTripDay(
            date
          )}`,
      })
    );


  // Load photo metadata.
  const {
    data:
      photoData,
    error:
      photosError,
  } =
    await supabase
      .from(
        "trip_photos"
      )
      .select(`
        id,
        trip_id,
        uploaded_by,
        storage_path,
        caption,
        photo_date,
        saved_place_id,
        created_at
      `)
      .eq(
        "trip_id",
        trip.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (
    photosError
  ) {
    console.error(
      "Failed to load trip photos:",
      photosError
    );
  }


  const photoRows =
    (
      photoData ??
      []
    ) as TripPhotoRow[];


  // Load uploader profiles separately so this does not
  // depend on PostgREST relationship shape inference.
  const uploaderIds =
    Array.from(
      new Set(
        photoRows.map(
          (photo) =>
            photo.uploaded_by
        )
      )
    );


  let profileRows:
    ProfileRow[] = [];


  if (
    uploaderIds.length >
    0
  ) {
    const {
      data:
        profileData,
      error:
        profilesError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(`
          id,
          display_name,
          avatar_url
        `)
        .in(
          "id",
          uploaderIds
        );


    if (
      profilesError
    ) {
      console.error(
        "Failed to load trip photo uploaders:",
        profilesError
      );
    }


    profileRows =
      (
        profileData ??
        []
      ) as ProfileRow[];
  }


  const profileById =
    new Map(
      profileRows.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );


  // Photos stay private. Each authorised page load gets
  // a temporary signed URL instead of a permanent public URL.
  const photos:
    TripPhotoRecord[] =
    await Promise.all(
      photoRows.map(
        async (
          photo
        ) => {
          const {
            data:
              signedUrlData,
            error:
              signedUrlError,
          } =
            await supabase.storage
              .from(
                "trip-photos"
              )
              .createSignedUrl(
                photo.storage_path,
                60 *
                  60 *
                  24
              );


          if (
            signedUrlError
          ) {
            console.error(
              `Failed to sign trip photo ${photo.id}:`,
              signedUrlError
            );
          }


          const profile =
            profileById.get(
              photo.uploaded_by
            );


          return {
            id:
              photo.id,

            tripId:
              photo.trip_id,

            uploadedBy:
              photo.uploaded_by,

            storagePath:
              photo.storage_path,

            imageUrl:
              signedUrlData?.signedUrl ??
              null,

            caption:
              photo.caption,

            photoDate:
              photo.photo_date,

            savedPlaceId:
              photo.saved_place_id,

            placeName:
              photo.saved_place_id
                ? placeNameById.get(
                    photo.saved_place_id
                  ) ??
                  null
                : null,

            uploaderName:
              profile?.display_name ??
              "Traveller",

            uploaderAvatarUrl:
              profile?.avatar_url ??
              null,

            createdAt:
              photo.created_at,

            canEdit:
              photo.uploaded_by ===
                userId ||
              isTripCreator,
          };
        }
      )
    );


  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <BackButton
          fallbackHref={`/trips/${trip.id}`}
        />


        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                {
                  trip.name
                }
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                Trip photos
              </h1>

              <p className="mt-2 max-w-2xl text-muted">
                Share memories from{" "}
                {
                  trip.destination
                }
                , add captions, and organise photos by trip day or place.
              </p>
            </div>


            <div className="shrink-0 rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                Gallery
              </p>

              <p className="mt-1 font-semibold text-ink">
                {
                  photos.length
                }{" "}
                {photos.length ===
                1
                  ? "photo"
                  : "photos"}
              </p>
            </div>
          </div>
        </header>


        {photosError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            Unable to load the trip gallery.
          </div>
        )}


        <section className="mt-8">
          {canUpload ? (
            <TripPhotoUploader
              tripId={
                trip.id
              }
              userId={
                userId
              }
              dayOptions={
                dayOptions
              }
              placeOptions={
                placeOptions
              }
              defaultOpen={
                photos.length ===
                0
              }
            />
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="font-medium text-ink">
                Shared trip gallery
              </p>

              <p className="mt-1 text-sm leading-6 text-muted">
                You can view this gallery because you have access to the trip. Only travellers participating in this trip can add photos.
              </p>
            </div>
          )}
        </section>


        <section className="mt-8">
          <TripPhotoGallery
            photos={
                photos
            }
            dayOptions={
                dayOptions
            }
            placeOptions={
                placeOptions
            }
            isTripCreator={
                isTripCreator
            }
            />
        </section>
      </div>
    </main>
  );
}