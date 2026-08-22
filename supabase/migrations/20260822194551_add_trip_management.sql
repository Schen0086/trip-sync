-- Add trip status
alter table public.trips
add column status text not null default 'planned';


-- Validate trip status
alter table public.trips
add constraint trips_status_check
check (
  status in ('planned', 'cancelled')
);


-- Create trip participants
create table public.trip_participants (
  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  joined_at timestamptz not null default now(),

  primary key (trip_id, user_id)
);


-- Participant lookup indexes
create index trip_participants_user_id_idx
on public.trip_participants(user_id);

create index trip_participants_trip_id_idx
on public.trip_participants(trip_id);


-- Enable RLS
alter table public.trip_participants
enable row level security;


-- Table permissions
grant select, insert, delete
on public.trip_participants
to authenticated;

grant select, insert, delete
on public.trip_participants
to service_role;


-- Check if current user can view a trip
create or replace function private.can_view_trip(
  check_trip_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = check_trip_id
      and (
        (
          t.trip_type = 'personal'
          and t.owner_id = (select auth.uid())
        )
        or
        (
          t.trip_type = 'group'
          and exists (
            select 1
            from public.group_members gm
            where gm.group_id = t.group_id
              and gm.user_id = (select auth.uid())
          )
        )
      )
  );
$$;


-- Check if current user manages a trip
create or replace function private.can_manage_trip(
  check_trip_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = check_trip_id
      and (
        (
          t.trip_type = 'personal'
          and t.owner_id = (select auth.uid())
        )
        or
        (
          t.trip_type = 'group'
          and exists (
            select 1
            from public.group_members gm
            where gm.group_id = t.group_id
              and gm.user_id = (select auth.uid())
              and gm.role = 'owner'
          )
        )
      )
  );
$$;


-- Check valid trip participant
create or replace function private.is_valid_trip_participant(
  check_trip_id uuid,
  check_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = check_trip_id
      and (
        (
          t.trip_type = 'personal'
          and t.owner_id = check_user_id
        )
        or
        (
          t.trip_type = 'group'
          and exists (
            select 1
            from public.group_members gm
            where gm.group_id = t.group_id
              and gm.user_id = check_user_id
          )
        )
      )
  );
$$;


-- Check if trip is a group trip
create or replace function private.is_group_trip(
  check_trip_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips
    where id = check_trip_id
      and trip_type = 'group'
  );
$$;


-- Check if group is active
create or replace function private.is_group_active(
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
    from public.groups
    where id = check_group_id
      and status = 'active'
  );
$$;


-- Allow authenticated users to use helpers
grant execute
on function private.can_view_trip(uuid)
to authenticated;

grant execute
on function private.can_manage_trip(uuid)
to authenticated;

grant execute
on function private.is_valid_trip_participant(uuid, uuid)
to authenticated;

grant execute
on function private.is_group_trip(uuid)
to authenticated;

grant execute
on function private.is_group_active(uuid)
to authenticated;


-- Participants can be viewed by anyone who can view the trip
create policy "Users can view trip participants"
on public.trip_participants
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


-- Trip managers can add valid participants
create policy "Trip managers can add participants"
on public.trip_participants
for insert
to authenticated
with check (
  private.can_manage_trip(trip_id)
  and private.is_valid_trip_participant(
    trip_id,
    user_id
  )
);


-- Group trip owners can remove participants
create policy "Trip managers can remove participants"
on public.trip_participants
for delete
to authenticated
using (
  private.can_manage_trip(trip_id)
  and private.is_group_trip(trip_id)
);


-- Replace trip creation policy
drop policy if exists "Users can create trips"
on public.trips;


-- Personal trips can be created for yourself.
-- Group trips can only be created for active groups you own.
create policy "Users can create trips"
on public.trips
for insert
to authenticated
with check (
  (
    trip_type = 'personal'
    and owner_id = (select auth.uid())
    and group_id is null
  )
  or
  (
    trip_type = 'group'
    and owner_id = (select auth.uid())
    and group_id is not null
    and private.is_group_owner(group_id)
    and private.is_group_active(group_id)
  )
);


-- Add existing trip owners as participants
insert into public.trip_participants (
  trip_id,
  user_id
)
select
  id,
  owner_id
from public.trips
on conflict do nothing;


-- Automatically add trip creator as participant
create or replace function private.handle_new_trip_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_participants (
    trip_id,
    user_id
  )
  values (
    new.id,
    new.owner_id
  )
  on conflict do nothing;

  return new;
end;
$$;


drop trigger if exists on_trip_created_participant
on public.trips;


create trigger on_trip_created_participant
after insert on public.trips
for each row
execute function private.handle_new_trip_participant();