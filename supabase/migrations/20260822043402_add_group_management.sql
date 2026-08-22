-- Add group management fields
alter table public.groups
add column group_code text;

alter table public.groups
add column status text not null default 'active';

alter table public.groups
add column closed_at timestamptz;


-- Create private schema if needed
create schema if not exists private;


-- Generate a unique group code
create or replace function private.generate_group_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(
      substring(
        replace(gen_random_uuid()::text, '-', '')
        from 1 for 8
      )
    );

    exit when not exists (
      select 1
      from public.groups
      where group_code = candidate
    );
  end loop;

  return candidate;
end;
$$;


-- Give existing groups a code
update public.groups
set group_code = private.generate_group_code()
where group_code is null;


-- Make group codes required
alter table public.groups
alter column group_code set not null;


-- Validate group code format
alter table public.groups
add constraint groups_group_code_check
check (group_code ~ '^[0-9A-F]{8}$');


-- Validate group status
alter table public.groups
add constraint groups_status_check
check (status in ('active', 'closed'));


-- Keep status and closed_at consistent
alter table public.groups
add constraint groups_closed_state_check
check (
  (
    status = 'active'
    and closed_at is null
  )
  or
  (
    status = 'closed'
    and closed_at is not null
  )
);


-- Group codes must be unique
create unique index groups_group_code_idx
on public.groups(group_code);


-- Allow only one owner per group
create unique index group_members_one_owner_idx
on public.group_members(group_id)
where role = 'owner';


-- Automatically create a code for new groups
create or replace function private.set_group_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.group_code is null then
    new.group_code :=
      private.generate_group_code();
  end if;

  return new;
end;
$$;


create trigger set_group_code_before_insert
before insert on public.groups
for each row
execute function private.set_group_code();


-- Check whether current user is a group admin
create or replace function private.is_group_admin(
  check_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = check_group_id
      and user_id = (select auth.uid())
      and role = 'admin'
  );
$$;


-- Check whether current user manages a group
create or replace function private.can_manage_group_members(
  check_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = check_group_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;


-- Private add-by-email implementation
create or replace function private.add_group_member_by_email_impl(
  target_group_id uuid,
  target_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_role text;
  target_user_id uuid;
  group_status text;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  -- Check caller role
  select role
  into caller_role
  from public.group_members
  where group_id = target_group_id
    and user_id = caller_id;

  if caller_role is null
     or caller_role not in ('owner', 'admin') then
    raise exception 'You do not have permission to add members';
  end if;

  -- Check group status
  select status
  into group_status
  from public.groups
  where id = target_group_id;

  if group_status is null then
    raise exception 'Group not found';
  end if;

  if group_status <> 'active' then
    raise exception 'This group is closed';
  end if;

  -- Find confirmed account
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email))
    and email_confirmed_at is not null
  limit 1;

  if target_user_id is null then
    raise exception
      'No confirmed TripSync account found with that email';
  end if;

  -- Prevent duplicate membership
  if exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = target_user_id
  ) then
    raise exception 'This user is already in the group';
  end if;

  -- Add member
  insert into public.group_members (
    group_id,
    user_id,
    role
  )
  values (
    target_group_id,
    target_user_id,
    'member'
  );

  return target_user_id;
end;
$$;


-- Private join-by-code implementation
create or replace function private.join_group_by_code_impl(
  supplied_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  matched_group_id uuid;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  -- Find active group
  select id
  into matched_group_id
  from public.groups
  where group_code = upper(trim(supplied_code))
    and status = 'active'
  limit 1;

  if matched_group_id is null then
    raise exception 'Invalid or inactive group code';
  end if;

  -- Prevent duplicate membership
  if exists (
    select 1
    from public.group_members
    where group_id = matched_group_id
      and user_id = caller_id
  ) then
    raise exception 'You are already in this group';
  end if;

  -- Join as member
  insert into public.group_members (
    group_id,
    user_id,
    role
  )
  values (
    matched_group_id,
    caller_id,
    'member'
  );

  return matched_group_id;
end;
$$;


-- Private invite-code lookup
create or replace function private.get_group_invite_code_impl(
  target_group_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_role text;
  invite_code text;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  select role
  into caller_role
  from public.group_members
  where group_id = target_group_id
    and user_id = caller_id;

  if caller_role is null
     or caller_role not in ('owner', 'admin') then
    raise exception
      'You do not have permission to view the invite code';
  end if;

  select group_code
  into invite_code
  from public.groups
  where id = target_group_id;

  return invite_code;
end;
$$;


-- Private regenerate-code implementation
create or replace function private.regenerate_group_code_impl(
  target_group_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_role text;
  new_code text;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  select role
  into caller_role
  from public.group_members
  where group_id = target_group_id
    and user_id = caller_id;

  if caller_role is null
     or caller_role not in ('owner', 'admin') then
    raise exception
      'You do not have permission to regenerate the invite code';
  end if;

  new_code := private.generate_group_code();

  update public.groups
  set
    group_code = new_code,
    updated_at = now()
  where id = target_group_id;

  return new_code;
end;
$$;


-- Remove previous member management policies
drop policy if exists "Owners can add group members"
on public.group_members;

drop policy if exists "Owners can update group members"
on public.group_members;

drop policy if exists "Owners can remove group members"
on public.group_members;

drop policy if exists "Admins can remove group members"
on public.group_members;

drop policy if exists "Members can leave groups"
on public.group_members;


-- Direct membership insertion is not allowed
revoke insert
on public.group_members
from authenticated;


-- Owner can change non-owner roles
create policy "Owners can update group members"
on public.group_members
for update
to authenticated
using (
  (select private.is_group_owner(group_id))
  and role <> 'owner'
)
with check (
  (select private.is_group_owner(group_id))
  and role in ('admin', 'member')
);


-- Owner can remove non-owner members
create policy "Owners can remove group members"
on public.group_members
for delete
to authenticated
using (
  (select private.is_group_owner(group_id))
  and role <> 'owner'
);


-- Admin can remove normal members
create policy "Admins can remove group members"
on public.group_members
for delete
to authenticated
using (
  (select private.is_group_admin(group_id))
  and role = 'member'
);


-- Members/admins can leave themselves
create policy "Members can leave groups"
on public.group_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and role <> 'owner'
);


-- Prevent direct access to the group code
revoke select
on public.groups
from authenticated;

grant select (
  id,
  name,
  description,
  created_by,
  created_at,
  updated_at,
  status,
  closed_at
)
on public.groups
to authenticated;


-- Restrict group insertion fields
revoke insert
on public.groups
from authenticated;

grant insert (
  name,
  description,
  created_by
)
on public.groups
to authenticated;


-- Restrict group update fields
revoke update
on public.groups
from authenticated;

grant update (
  name,
  description,
  updated_at,
  status,
  closed_at
)
on public.groups
to authenticated;


-- Private schema permissions
grant usage
on schema private
to authenticated;

grant execute
on function private.is_group_admin(uuid)
to authenticated;

grant execute
on function private.can_manage_group_members(uuid)
to authenticated;

grant execute
on function private.add_group_member_by_email_impl(uuid, text)
to authenticated;

grant execute
on function private.join_group_by_code_impl(text)
to authenticated;

grant execute
on function private.get_group_invite_code_impl(uuid)
to authenticated;

grant execute
on function private.regenerate_group_code_impl(uuid)
to authenticated;


-- Public add-by-email RPC
create or replace function public.add_group_member_by_email(
  target_group_id uuid,
  target_email text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.add_group_member_by_email_impl(
    target_group_id,
    target_email
  );
$$;


-- Public join-by-code RPC
create or replace function public.join_group_by_code(
  supplied_code text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.join_group_by_code_impl(
    supplied_code
  );
$$;


-- Public invite-code lookup RPC
create or replace function public.get_group_invite_code(
  target_group_id uuid
)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.get_group_invite_code_impl(
    target_group_id
  );
$$;


-- Public regenerate-code RPC
create or replace function public.regenerate_group_code(
  target_group_id uuid
)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.regenerate_group_code_impl(
    target_group_id
  );
$$;


-- Restrict RPC access
revoke all
on function public.add_group_member_by_email(uuid, text)
from public;

revoke all
on function public.join_group_by_code(text)
from public;

revoke all
on function public.get_group_invite_code(uuid)
from public;

revoke all
on function public.regenerate_group_code(uuid)
from public;


grant execute
on function public.add_group_member_by_email(uuid, text)
to authenticated;

grant execute
on function public.join_group_by_code(text)
to authenticated;

grant execute
on function public.get_group_invite_code(uuid)
to authenticated;

grant execute
on function public.regenerate_group_code(uuid)
to authenticated;