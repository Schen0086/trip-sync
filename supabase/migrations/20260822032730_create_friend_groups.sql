-- Create groups table
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create group members table
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),

  primary key (group_id, user_id),

  constraint group_members_role_check
  check (role in ('owner', 'admin', 'member'))
);

-- Index membership lookups
create index group_members_user_id_idx
on public.group_members(user_id);

create index group_members_group_id_idx
on public.group_members(group_id);

-- Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Give authenticated users table access
grant select, insert, update, delete
on public.groups
to authenticated;

grant select, insert, update, delete
on public.group_members
to authenticated;





-- Create private schema for RLS helpers
create schema if not exists private;

-- Check group membership
create or replace function private.is_group_member(
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
  );
$$;

-- Check group ownership
create or replace function private.is_group_owner(
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
      and role = 'owner'
  );
$$;

-- Allow authenticated users to use RLS helpers
grant usage on schema private to authenticated;

grant execute
on function private.is_group_member(uuid)
to authenticated;

grant execute
on function private.is_group_owner(uuid)
to authenticated;





-- Add creator as group owner
create or replace function private.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (
    group_id,
    user_id,
    role
  )
  values (
    new.id,
    new.created_by,
    'owner'
  );

  return new;
end;
$$;

-- Run after every group creation
create trigger on_group_created
  after insert on public.groups
  for each row
  execute function private.handle_new_group();





  -- Members can view their groups
create policy "Members can view groups"
on public.groups
for select
to authenticated
using (
  created_by = (select auth.uid())
  or private.is_group_member(id)
);

-- Users can create groups for themselves
create policy "Users can create groups"
on public.groups
for insert
to authenticated
with check (
  created_by = (select auth.uid())
);

-- Owners can update groups
create policy "Owners can update groups"
on public.groups
for update
to authenticated
using (
  private.is_group_owner(id)
)
with check (
  private.is_group_owner(id)
);

-- Owners can delete groups
create policy "Owners can delete groups"
on public.groups
for delete
to authenticated
using (
  private.is_group_owner(id)
);

-- Members can view memberships in their groups
create policy "Members can view group members"
on public.group_members
for select
to authenticated
using (
  private.is_group_member(group_id)
);

-- Owners can add members
create policy "Owners can add group members"
on public.group_members
for insert
to authenticated
with check (
  private.is_group_owner(group_id)
);

-- Owners can update member roles
create policy "Owners can update group members"
on public.group_members
for update
to authenticated
using (
  private.is_group_owner(group_id)
)
with check (
  private.is_group_owner(group_id)
);

-- Owners can remove members
create policy "Owners can remove group members"
on public.group_members
for delete
to authenticated
using (
  private.is_group_owner(group_id)
);