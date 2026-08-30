-- =========================================================
-- TRIP PHOTOS
-- =========================================================
-- Shared private photo galleries for TripSync trips.
--
-- Photos are stored privately in Supabase Storage while
-- metadata such as captions, trip dates and saved-place
-- associations live in public.trip_photos.

-- ---------------------------------------------------------
-- Photo metadata
-- ---------------------------------------------------------
create table public.trip_photos (
  id uuid primary key
    default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  uploaded_by uuid not null
    references public.profiles(id)
    on delete cascade,

  storage_path text not null unique,

  caption text,

  photo_date date,

  saved_place_id uuid
    references public.saved_places(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint trip_photos_caption_length_check
    check (
      caption is null
      or char_length(caption) <= 600
    ),

  constraint trip_photos_storage_path_check
    check (
      storage_path like
        trip_id::text ||
        '/' ||
        uploaded_by::text ||
        '/%'
    )
);

create index trip_photos_trip_created_idx
on public.trip_photos (
  trip_id,
  created_at desc
);

create index trip_photos_uploaded_by_idx
on public.trip_photos (
  uploaded_by
);

create index trip_photos_trip_date_idx
on public.trip_photos (
  trip_id,
  photo_date
);

create index trip_photos_saved_place_idx
on public.trip_photos (
  saved_place_id
);

alter table public.trip_photos
enable row level security;


-- ---------------------------------------------------------
-- Contribution helper
-- ---------------------------------------------------------
-- Viewing a group trip and actually travelling on it are
-- separate concepts in TripSync. Group members may view
-- accessible trips, but only the trip creator or an actual
-- trip participant should upload photos.

create or replace function private.can_contribute_trip_photo(
  check_trip_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_view_trip(check_trip_id)
    and exists (
      select 1
      from public.trips t
      where t.id = check_trip_id
        and (
          t.owner_id = (
            select auth.uid()
          )

          or exists (
            select 1
            from public.trip_participants tp
            where tp.trip_id = t.id
              and tp.user_id = (
                select auth.uid()
              )
          )
        )
    );
$$;

revoke all
on function private.can_contribute_trip_photo(uuid)
from public;

grant execute
on function private.can_contribute_trip_photo(uuid)
to authenticated;


-- ---------------------------------------------------------
-- Metadata validation
-- ---------------------------------------------------------
-- Protects the important identity fields and guarantees
-- that a chosen day/place actually belongs to this trip.

create or replace function private.validate_trip_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trip_start_date date;
  trip_end_date date;
begin
  if tg_op = 'UPDATE' then
    if new.trip_id
         is distinct from
         old.trip_id
       or new.uploaded_by
         is distinct from
         old.uploaded_by
       or new.storage_path
         is distinct from
         old.storage_path
    then
      raise exception
        'Trip photo identity fields cannot be changed';
    end if;
  end if;

  select
    t.start_date,
    t.end_date
  into
    trip_start_date,
    trip_end_date
  from public.trips t
  where t.id = new.trip_id;

  if not found then
    raise exception
      'Trip not found';
  end if;

  if new.photo_date is not null
     and (
       new.photo_date < trip_start_date
       or new.photo_date > trip_end_date
     )
  then
    raise exception
      'Photo date must fall within the trip dates';
  end if;

  if new.saved_place_id is not null
     and not exists (
       select 1
       from public.saved_places sp
       where sp.id = new.saved_place_id
         and sp.trip_id = new.trip_id
     )
  then
    raise exception
      'Photo place must belong to the same trip';
  end if;

  new.caption :=
    nullif(
      trim(
        new.caption
      ),
      ''
    );

  new.updated_at :=
    now();

  return new;
end;
$$;

revoke all
on function private.validate_trip_photo()
from public;

create trigger validate_trip_photo
before insert or update
on public.trip_photos
for each row
execute function private.validate_trip_photo();


-- ---------------------------------------------------------
-- Trip photo RLS
-- ---------------------------------------------------------

create policy
  "Users can view photos for accessible trips"
on public.trip_photos
for select
to authenticated
using (
  private.can_view_trip(
    trip_id
  )
);


create policy
  "Trip travellers can upload photos"
on public.trip_photos
for insert
to authenticated
with check (
  uploaded_by = (
    select auth.uid()
  )
  and private.can_contribute_trip_photo(
    trip_id
  )
);


create policy
  "Uploaders and trip creators can update photos"
on public.trip_photos
for update
to authenticated
using (
  private.can_view_trip(
    trip_id
  )
  and (
    uploaded_by = (
      select auth.uid()
    )
    or private.is_trip_creator(
      trip_id
    )
  )
)
with check (
  private.can_view_trip(
    trip_id
  )
  and (
    uploaded_by = (
      select auth.uid()
    )
    or private.is_trip_creator(
      trip_id
    )
  )
);


create policy
  "Uploaders and trip creators can delete photos"
on public.trip_photos
for delete
to authenticated
using (
  private.can_view_trip(
    trip_id
  )
  and (
    uploaded_by = (
      select auth.uid()
    )
    or private.is_trip_creator(
      trip_id
    )
  )
);


revoke all
on public.trip_photos
from anon, authenticated;

grant
  select,
  insert,
  update,
  delete
on public.trip_photos
to authenticated;

grant all
on public.trip_photos
to service_role;


-- =========================================================
-- PRIVATE PHOTO STORAGE
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'trip-photos',
  'trip-photos',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set
  public =
    excluded.public,

  file_size_limit =
    excluded.file_size_limit,

  allowed_mime_types =
    excluded.allowed_mime_types;


-- Storage paths use:
--
-- <trip-id>/<uploader-id>/<photo-id>.<extension>
--
-- These helpers safely extract the UUID folders without
-- trusting arbitrary text supplied by the browser.

create or replace function private.trip_photo_path_trip_id(
  object_name text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder_name text;
begin
  folder_name :=
    (
      storage.foldername(
        object_name
      )
    )[1];

  if folder_name is null then
    return null;
  end if;

  return folder_name::uuid;

exception
  when others then
    return null;
end;
$$;


create or replace function private.trip_photo_path_uploader_id(
  object_name text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder_name text;
begin
  folder_name :=
    (
      storage.foldername(
        object_name
      )
    )[2];

  if folder_name is null then
    return null;
  end if;

  return folder_name::uuid;

exception
  when others then
    return null;
end;
$$;


revoke all
on function private.trip_photo_path_trip_id(text)
from public;

revoke all
on function private.trip_photo_path_uploader_id(text)
from public;

grant execute
on function private.trip_photo_path_trip_id(text)
to authenticated;

grant execute
on function private.trip_photo_path_uploader_id(text)
to authenticated;


-- Anyone who can view the trip may view its photos.
drop policy if exists
  "Users can view trip photos"
on storage.objects;

create policy
  "Users can view trip photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trip-photos'

  and private.can_view_trip(
    private.trip_photo_path_trip_id(
      name
    )
  )
);


-- Only an actual traveller can upload, and the second
-- folder in the path must be their own user ID.
drop policy if exists
  "Trip travellers can upload trip photos"
on storage.objects;

create policy
  "Trip travellers can upload trip photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-photos'

  and private.trip_photo_path_uploader_id(
    name
  ) = (
    select auth.uid()
  )

  and private.can_contribute_trip_photo(
    private.trip_photo_path_trip_id(
      name
    )
  )
);


-- Files themselves are never modified in place.
-- Replacing a photo means uploading a new object.

drop policy if exists
  "Photo owners can delete trip photo files"
on storage.objects;

create policy
  "Photo owners can delete trip photo files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-photos'

  and private.can_view_trip(
    private.trip_photo_path_trip_id(
      name
    )
  )

  and (
    private.trip_photo_path_uploader_id(
      name
    ) = (
      select auth.uid()
    )

    or private.is_trip_creator(
      private.trip_photo_path_trip_id(
        name
      )
    )
  )
);


-- =========================================================
-- TRIP ACTIVITY
-- =========================================================
-- Add Photos as a supported activity category.

alter table public.trip_activity
drop constraint if exists
  trip_activity_category_check;

alter table public.trip_activity
add constraint trip_activity_category_check
check (
  category in (
    'tasks',
    'itinerary',
    'voting',
    'places',
    'expenses',
    'packing',
    'photos'
  )
);


-- Record gallery uploads/removals in the existing activity
-- feed without creating a notification for every image.
--
-- Multiple images uploaded as one batch are intentionally
-- condensed into a single recent activity item.

create or replace function private.capture_trip_photo_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.trip_activity ta
      where ta.trip_id =
        new.trip_id

        and ta.actor_user_id
          is not distinct from
          auth.uid()

        and ta.event_type =
          'photo_uploaded'

        and ta.created_at >
          now() - interval '30 seconds'
    )
    then
      perform private.record_trip_activity(
        new.trip_id,
        'photos',
        'photo_uploaded',
        'trip_photo',
        new.id,
        'added a photo to',
        'the trip gallery',
        null,
        '/trips/' ||
          new.trip_id::text ||
          '/photos'
      );
    end if;

    return new;
  end if;


  if tg_op = 'DELETE' then
    perform private.record_trip_activity(
      old.trip_id,
      'photos',
      'photo_deleted',
      'trip_photo',
      old.id,
      'removed a photo from',
      'the trip gallery',
      null,
      '/trips/' ||
        old.trip_id::text ||
        '/photos'
    );

    return old;
  end if;


  return new;
end;
$$;

revoke all
on function private.capture_trip_photo_activity()
from public;

create trigger capture_trip_photo_activity
after insert or delete
on public.trip_photos
for each row
execute function private.capture_trip_photo_activity();


-- =========================================================
-- REALTIME
-- =========================================================
-- The existing global TripSync realtime component listens
-- for tables in the Supabase realtime publication.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname =
      'supabase_realtime'
      and schemaname =
        'public'
      and tablename =
        'trip_photos'
  )
  then
    alter publication supabase_realtime
    add table public.trip_photos;
  end if;
end
$$;