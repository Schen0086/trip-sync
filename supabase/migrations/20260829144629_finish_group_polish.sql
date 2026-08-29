-- =========================================================
-- GROUP POLISH
-- =========================================================
-- Adds private group avatars and safe ownership transfer.

-- ---------------------------------------------------------
-- Group avatar metadata
-- ---------------------------------------------------------
alter table public.groups
add column avatar_path text;

alter table public.groups
add constraint groups_avatar_path_check
check (
  avatar_path is null
  or avatar_path like id::text || '/%'
);

-- Existing group permissions use column-level grants.
grant select (avatar_path)
on public.groups
to authenticated;

grant update (avatar_path)
on public.groups
to authenticated;

-- ---------------------------------------------------------
-- Private group avatar storage
-- ---------------------------------------------------------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'group-avatars',
  'group-avatars',
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
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Safely read the group UUID from:
-- group-avatars/<group-id>/<filename>
create or replace function private.group_avatar_group_id(
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
  folder_name := (
    storage.foldername(object_name)
  )[1];

  if folder_name is null then
    return null;
  end if;

  if folder_name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  return folder_name::uuid;
exception
  when others then
    return null;
end;
$$;

revoke all
on function private.group_avatar_group_id(text)
from public;

grant execute
on function private.group_avatar_group_id(text)
to authenticated;

-- Group members can read avatar objects so the app can
-- create short-lived signed URLs. Only the current owner
-- can upload, replace or remove group avatar objects.
drop policy if exists
  "Group members can view group avatars"
on storage.objects;

create policy
  "Group members can view group avatars"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'group-avatars'
  and private.is_group_member(
    private.group_avatar_group_id(name)
  )
);

drop policy if exists
  "Group owners can upload group avatars"
on storage.objects;

create policy
  "Group owners can upload group avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'group-avatars'
  and private.is_group_owner(
    private.group_avatar_group_id(name)
  )
);

drop policy if exists
  "Group owners can update group avatars"
on storage.objects;

create policy
  "Group owners can update group avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'group-avatars'
  and private.is_group_owner(
    private.group_avatar_group_id(name)
  )
)
with check (
  bucket_id = 'group-avatars'
  and private.is_group_owner(
    private.group_avatar_group_id(name)
  )
);

drop policy if exists
  "Group owners can delete group avatars"
on storage.objects;

create policy
  "Group owners can delete group avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'group-avatars'
  and private.is_group_owner(
    private.group_avatar_group_id(name)
  )
);

-- Keep group visibility tied to current membership.
-- This matters after ownership transfer because created_by
-- remains the historical creator rather than the current owner.
drop policy if exists "Members can view groups"
on public.groups;

create policy "Members can view groups"
on public.groups
for select
to authenticated
using (
  private.is_group_member(id)
);

-- ---------------------------------------------------------
-- Ownership transfer
-- ---------------------------------------------------------
create or replace function private.transfer_group_ownership_impl(
  target_group_id uuid,
  new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_role text;
  target_role text;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  if new_owner_user_id is null then
    raise exception 'Choose a new owner';
  end if;

  select role
  into caller_role
  from public.group_members
  where group_id = target_group_id
    and user_id = caller_id;

  if caller_role is distinct from 'owner' then
    raise exception 'Only the current owner can transfer ownership';
  end if;

  if new_owner_user_id = caller_id then
    raise exception 'You are already the group owner';
  end if;

  select role
  into target_role
  from public.group_members
  where group_id = target_group_id
    and user_id = new_owner_user_id;

  if target_role is null then
    raise exception 'The new owner must already be a group member';
  end if;

  if target_role = 'owner' then
    raise exception 'This user is already the group owner';
  end if;

  -- Remove the current owner first so the unique owner index
  -- remains valid, then promote the selected member. The RPC
  -- runs in one database transaction, so either both happen
  -- or neither happens.
  update public.group_members
  set role = 'admin'
  where group_id = target_group_id
    and user_id = caller_id
    and role = 'owner';

  update public.group_members
  set role = 'owner'
  where group_id = target_group_id
    and user_id = new_owner_user_id;

  update public.groups
  set updated_at = now()
  where id = target_group_id;
end;
$$;

create or replace function public.transfer_group_ownership(
  target_group_id uuid,
  new_owner_user_id uuid
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.transfer_group_ownership_impl(
    target_group_id,
    new_owner_user_id
  );
$$;

revoke all
on function private.transfer_group_ownership_impl(uuid, uuid)
from public;

revoke all
on function public.transfer_group_ownership(uuid, uuid)
from public;

grant execute
on function private.transfer_group_ownership_impl(uuid, uuid)
to authenticated;

grant execute
on function public.transfer_group_ownership(uuid, uuid)
to authenticated;