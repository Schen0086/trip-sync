-- Create trips table
create table public.trips (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  destination text not null,
  description text,

  start_date date not null,
  end_date date not null,

  budget numeric(12, 2),

  trip_type text not null,

  owner_id uuid not null
    references public.profiles(id)
    on delete cascade,

  group_id uuid
    references public.groups(id)
    on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trips_type_check
  check (trip_type in ('personal', 'group')),

  constraint trips_dates_check
  check (end_date >= start_date),

  constraint trips_budget_check
  check (budget is null or budget >= 0),

  constraint trips_group_type_check
  check (
    (
      trip_type = 'personal'
      and group_id is null
    )
    or
    (
      trip_type = 'group'
      and group_id is not null
    )
  )
);

-- Index common trip lookups
create index trips_owner_id_idx
on public.trips(owner_id);

create index trips_group_id_idx
on public.trips(group_id);

create index trips_start_date_idx
on public.trips(start_date);

-- Enable RLS
alter table public.trips enable row level security;

-- Give authenticated users table access
grant select, insert, update, delete
on public.trips
to authenticated;

-- Service role access
grant select, insert, update, delete
on public.trips
to service_role;





-- Users can view their personal trips
-- or trips belonging to their groups
create policy "Users can view accessible trips"
on public.trips
for select
to authenticated
using (
  (
    trip_type = 'personal'
    and owner_id = (select auth.uid())
  )
  or
  (
    trip_type = 'group'
    and private.is_group_member(group_id)
  )
);

-- Users can create personal trips for themselves
-- or group trips for groups they own
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
  )
);

-- Owners can update their trips
create policy "Users can update owned trips"
on public.trips
for update
to authenticated
using (
  (
    trip_type = 'personal'
    and owner_id = (select auth.uid())
  )
  or
  (
    trip_type = 'group'
    and private.is_group_owner(group_id)
  )
)
with check (
  owner_id = (select auth.uid())
  and (
    (
      trip_type = 'personal'
      and group_id is null
    )
    or
    (
      trip_type = 'group'
      and group_id is not null
      and private.is_group_owner(group_id)
    )
  )
);

-- Owners can delete their trips
create policy "Users can delete owned trips"
on public.trips
for delete
to authenticated
using (
  (
    trip_type = 'personal'
    and owner_id = (select auth.uid())
  )
  or
  (
    trip_type = 'group'
    and private.is_group_owner(group_id)
  )
);