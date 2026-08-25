-- =========================================================
-- PROFILE AVATARS
-- =========================================================

-- Public avatars are appropriate because profile pictures
-- are intentionally visible to other TripSync users.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- Users need SELECT access to their own files for
-- operations such as replacing/removing avatars.
drop policy if exists
  "Users can view their own avatar objects"
on storage.objects;

create policy
  "Users can view their own avatar objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (
    select auth.uid()::text
  )
);


-- Each user's files live under:
-- avatars/<user-id>/<filename>
drop policy if exists
  "Users can upload their own avatars"
on storage.objects;

create policy
  "Users can upload their own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
);


drop policy if exists
  "Users can update their own avatars"
on storage.objects;

create policy
  "Users can update their own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (
    select auth.uid()::text
  )
)
with check (
  bucket_id = 'avatars'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
);


drop policy if exists
  "Users can delete their own avatars"
on storage.objects;

create policy
  "Users can delete their own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (
    select auth.uid()::text
  )
);