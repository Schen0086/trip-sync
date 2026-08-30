import JSZip from "jszip";

import {
  createClient,
} from "@/lib/supabase/server";


export const runtime =
  "nodejs";


type DownloadPhotosRouteProps = {
  params: Promise<{
    id: string;
  }>;
};


type PhotoDownloadRow = {
  id: string;

  storage_path: string;

  photo_date:
    | string
    | null;
};


const MAX_DOWNLOAD_PHOTOS =
  20;


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


function getFileExtension(
  storagePath: string
) {
  const extension =
    storagePath
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    extension ===
      "png" ||
    extension ===
      "webp" ||
    extension ===
      "jpg" ||
    extension ===
      "jpeg"
  ) {
    return extension ===
      "jpeg"
      ? "jpg"
      : extension;
  }

  return "jpg";
}


function createFileName(
  photo: PhotoDownloadRow,
  index: number
) {
  const number =
    String(
      index + 1
    ).padStart(
      2,
      "0"
    );

  const datePart =
    photo.photo_date
      ? `-${photo.photo_date}`
      : "";

  const extension =
    getFileExtension(
      photo.storage_path
    );

  return (
    `TripSync-photo-${number}` +
    `${datePart}.${extension}`
  );
}


export async function GET(
  request: Request,
  {
    params,
  }: DownloadPhotosRouteProps
) {
  const {
    id: tripId,
  } =
    await params;


  const supabase =
    await createClient();


  // Require a signed-in TripSync user.
  const {
    data:
      authData,

    error:
      authError,
  } =
    await supabase.auth
      .getClaims();


  if (
    authError ||
    !authData?.claims
  ) {
    return new Response(
      "Unauthorized",
      {
        status: 401,
      }
    );
  }


  const requestUrl =
    new URL(
      request.url
    );


  const requestedIds =
    requestUrl.searchParams
      .getAll(
        "id"
      )
      .filter(
        (photoId) =>
          UUID_PATTERN.test(
            photoId
          )
      );


  const photoIds =
    Array.from(
      new Set(
        requestedIds
      )
    );


  if (
    photoIds.length ===
    0
  ) {
    return new Response(
      "No photos selected.",
      {
        status: 400,
      }
    );
  }


  if (
    photoIds.length >
    MAX_DOWNLOAD_PHOTOS
  ) {
    return new Response(
      `Select up to ${MAX_DOWNLOAD_PHOTOS} photos at a time.`,
      {
        status: 400,
      }
    );
  }


  // RLS ensures the signed-in user can only
  // retrieve photos from trips they may view.
  const {
    data:
      photoData,

    error:
      photoError,
  } =
    await supabase
      .from(
        "trip_photos"
      )
      .select(`
        id,
        storage_path,
        photo_date
      `)
      .eq(
        "trip_id",
        tripId
      )
      .in(
        "id",
        photoIds
      );


  if (
    photoError
  ) {
    console.error(
      "Failed to load photos for archive:",
      {
        message:
          photoError.message,

        code:
          photoError.code,

        details:
          photoError.details,

        hint:
          photoError.hint,
      }
    );

    return new Response(
      "Unable to prepare the selected photos.",
      {
        status: 500,
      }
    );
  }


  const photos =
    (
      photoData ??
      []
    ) as PhotoDownloadRow[];


  // Do not silently return a partial archive.
  if (
    photos.length !==
    photoIds.length
  ) {
    return new Response(
      "One or more selected photos are unavailable.",
      {
        status: 404,
      }
    );
  }


  // Restore the order selected by the client.
  const photoById =
    new Map(
      photos.map(
        (photo) => [
          photo.id,
          photo,
        ]
      )
    );


  const orderedPhotos =
    photoIds
      .map(
        (photoId) =>
          photoById.get(
            photoId
          )
      )
      .filter(
        (
          photo
        ): photo is PhotoDownloadRow =>
          Boolean(
            photo
          )
      );


  const zip =
    new JSZip();


  // Download sequentially so the server does not
  // request every full-resolution image at once.
  for (
    let index = 0;
    index <
    orderedPhotos.length;
    index += 1
  ) {
    const photo =
      orderedPhotos[
        index
      ];


    const {
      data:
        photoBlob,

      error:
        storageError,
    } =
      await supabase.storage
        .from(
          "trip-photos"
        )
        .download(
          photo.storage_path
        );


    if (
      storageError ||
      !photoBlob
    ) {
      console.error(
        "Failed to download trip photo for archive:",
        {
          photoId:
            photo.id,

          storagePath:
            photo.storage_path,

          error:
            storageError,
        }
      );

      return new Response(
        "Unable to prepare one or more selected photos.",
        {
          status: 500,
        }
      );
    }


    const arrayBuffer =
      await photoBlob
        .arrayBuffer();


    zip.file(
      createFileName(
        photo,
        index
      ),
      arrayBuffer
    );
  }


  // JPEG/PNG/WebP files are already compressed.
  // STORE avoids wasting CPU trying to compress them again.
  const zipBuffer =
    await zip
      .generateAsync({
        type:
          "arraybuffer",

        compression:
          "STORE",
      });


  return new Response(
    zipBuffer,
    {
      status: 200,

      headers: {
        "Content-Type":
          "application/zip",

        "Content-Disposition":
          'attachment; filename="TripSync-photos.zip"',

        "Cache-Control":
          "private, no-store",

        "Content-Length":
          String(
            zipBuffer.byteLength
          ),
      },
    }
  );
}