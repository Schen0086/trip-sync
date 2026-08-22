-- Create itinerary items
create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  item_type text not null,
  planning_status text not null default 'suggested',
  origin text not null default 'suggestion',

  title text not null,
  description text,
  notes text,

  -- General location
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,

  -- General activity schedule
  scheduled_date date,
  start_time time,
  end_time time,
  website_url text,

  -- Transport
  transport_mode text,
  provider text,
  reference_number text,

  departure_location text,
  departure_address text,
  departure_latitude double precision,
  departure_longitude double precision,
  departure_date date,
  departure_time time,
  departure_details text,

  arrival_location text,
  arrival_address text,
  arrival_latitude double precision,
  arrival_longitude double precision,
  arrival_date date,
  arrival_time time,
  arrival_details text,

  -- Accommodation
  check_in_date date,
  check_in_time time,
  check_out_date date,
  check_out_time time,
  check_in_instructions text,

  -- Booking information
  booking_reference text,
  booking_url text,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Validate item type
alter table public.itinerary_items
add constraint itinerary_items_type_check
check (
  item_type in (
    'activity',
    'transport',
    'accommodation'
  )
);


-- Validate planning status
alter table public.itinerary_items
add constraint itinerary_items_status_check
check (
  planning_status in (
    'suggested',
    'planned'
  )
);


-- Track whether the item started as a direct entry or suggestion
alter table public.itinerary_items
add constraint itinerary_items_origin_check
check (
  origin in (
    'direct',
    'suggestion'
  )
);


-- Planned items need enough scheduling information
alter table public.itinerary_items
add constraint itinerary_items_planned_details_check
check (
  planning_status = 'suggested'
  or (
    item_type = 'activity'
    and scheduled_date is not null
  )
  or (
    item_type = 'transport'
    and departure_location is not null
    and arrival_location is not null
    and departure_date is not null
    and arrival_date is not null
  )
  or (
    item_type = 'accommodation'
    and check_in_date is not null
    and check_out_date is not null
  )
);


-- Validate transport dates
alter table public.itinerary_items
add constraint itinerary_transport_dates_check
check (
  departure_date is null
  or arrival_date is null
  or arrival_date >= departure_date
);


-- Validate accommodation dates
alter table public.itinerary_items
add constraint itinerary_accommodation_dates_check
check (
  check_in_date is null
  or check_out_date is null
  or check_out_date >= check_in_date
);


-- Validate coordinates
alter table public.itinerary_items
add constraint itinerary_latitude_check
check (
  latitude is null
  or latitude between -90 and 90
);

alter table public.itinerary_items
add constraint itinerary_longitude_check
check (
  longitude is null
  or longitude between -180 and 180
);

alter table public.itinerary_items
add constraint itinerary_departure_latitude_check
check (
  departure_latitude is null
  or departure_latitude between -90 and 90
);

alter table public.itinerary_items
add constraint itinerary_departure_longitude_check
check (
  departure_longitude is null
  or departure_longitude between -180 and 180
);

alter table public.itinerary_items
add constraint itinerary_arrival_latitude_check
check (
  arrival_latitude is null
  or arrival_latitude between -90 and 90
);

alter table public.itinerary_items
add constraint itinerary_arrival_longitude_check
check (
  arrival_longitude is null
  or arrival_longitude between -180 and 180
);


-- Helpful indexes
create index itinerary_items_trip_id_idx
on public.itinerary_items(trip_id);

create index itinerary_items_created_by_idx
on public.itinerary_items(created_by);

create index itinerary_items_status_idx
on public.itinerary_items(
  trip_id,
  planning_status
);

create index itinerary_items_scheduled_date_idx
on public.itinerary_items(
  trip_id,
  scheduled_date
);


-- Create suggestion votes
create table public.itinerary_votes (
  item_id uuid not null
    references public.itinerary_items(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  reaction text not null,
  preferred_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    item_id,
    user_id
  )
);


-- Validate reactions
alter table public.itinerary_votes
add constraint itinerary_votes_reaction_check
check (
  reaction in (
    'yes',
    'no',
    'not_sure',
    'dont_mind'
  )
);


-- Vote lookup indexes
create index itinerary_votes_user_id_idx
on public.itinerary_votes(user_id);

create index itinerary_votes_item_id_idx
on public.itinerary_votes(item_id);


-- Enable RLS
alter table public.itinerary_items
enable row level security;

alter table public.itinerary_votes
enable row level security;


-- Table permissions
grant select, insert, update, delete
on public.itinerary_items
to authenticated;

grant select, insert, update, delete
on public.itinerary_votes
to authenticated;


-- Check whether current user can view an itinerary item
create or replace function private.can_view_itinerary_item(
  check_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.itinerary_items i
    where i.id = check_item_id
      and private.can_view_trip(i.trip_id)
  );
$$;


-- Check whether an item can currently be voted on
create or replace function private.can_vote_itinerary_item(
  check_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.itinerary_items i
    where i.id = check_item_id
      and i.planning_status = 'suggested'
      and private.is_group_trip(i.trip_id)
      and private.can_view_trip(i.trip_id)
  );
$$;


grant usage
on schema private
to authenticated;

grant execute
on function private.can_view_itinerary_item(uuid)
to authenticated;

grant execute
on function private.can_vote_itinerary_item(uuid)
to authenticated;


-- Anyone who can view the trip can view its itinerary
create policy "Users can view itinerary items"
on public.itinerary_items
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


-- Trip creator can directly add planned items.
-- Group members can add suggestions.
create policy "Users can create itinerary items"
on public.itinerary_items
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (
      planning_status = 'planned'
      and origin = 'direct'
      and private.is_trip_creator(trip_id)
    )
    or
    (
      planning_status = 'suggested'
      and origin = 'suggestion'
      and private.is_group_trip(trip_id)
      and private.can_view_trip(trip_id)
    )
  )
);


-- Creator can edit anything.
-- Suggestion author can edit their own suggestion.
create policy "Users can update itinerary items"
on public.itinerary_items
for update
to authenticated
using (
  private.is_trip_creator(trip_id)
  or (
    created_by = (select auth.uid())
    and planning_status = 'suggested'
  )
)
with check (
  private.is_trip_creator(trip_id)
  or (
    created_by = (select auth.uid())
    and planning_status = 'suggested'
  )
);


-- Creator can delete anything.
-- Suggestion author can delete their own suggestion.
create policy "Users can delete itinerary items"
on public.itinerary_items
for delete
to authenticated
using (
  private.is_trip_creator(trip_id)
  or (
    created_by = (select auth.uid())
    and planning_status = 'suggested'
  )
);


-- People who can view the trip can see votes
create policy "Users can view itinerary votes"
on public.itinerary_votes
for select
to authenticated
using (
  private.can_view_itinerary_item(item_id)
);


-- Each group member controls their own vote
create policy "Users can create itinerary votes"
on public.itinerary_votes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_vote_itinerary_item(item_id)
);


create policy "Users can update itinerary votes"
on public.itinerary_votes
for update
to authenticated
using (
  user_id = (select auth.uid())
  and private.can_vote_itinerary_item(item_id)
)
with check (
  user_id = (select auth.uid())
  and private.can_vote_itinerary_item(item_id)
);


create policy "Users can delete itinerary votes"
on public.itinerary_votes
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and private.can_vote_itinerary_item(item_id)
);


-- Protect immutable itinerary fields
create or replace function private.protect_itinerary_item_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.trip_id <> new.trip_id then
    raise exception 'Trip cannot be changed';
  end if;

  if old.created_by <> new.created_by then
    raise exception 'Item creator cannot be changed';
  end if;

  if old.item_type <> new.item_type then
    raise exception 'Item type cannot be changed';
  end if;

  if old.origin <> new.origin then
    raise exception 'Item origin cannot be changed';
  end if;

  return new;
end;
$$;


create trigger protect_itinerary_item_identity
before update on public.itinerary_items
for each row
execute function private.protect_itinerary_item_identity();


-- Automatically maintain updated_at
create or replace function private.set_itinerary_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


create trigger set_itinerary_item_updated_at
before update on public.itinerary_items
for each row
execute function private.set_itinerary_updated_at();


create trigger set_itinerary_vote_updated_at
before update on public.itinerary_votes
for each row
execute function private.set_itinerary_updated_at();


-- Validate preferred voting day
create or replace function private.validate_itinerary_vote_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trip_start date;
  trip_end date;
  item_status text;
begin
  select
    t.start_date,
    t.end_date,
    i.planning_status
  into
    trip_start,
    trip_end,
    item_status
  from public.itinerary_items i
  join public.trips t
    on t.id = i.trip_id
  where i.id = new.item_id;

  if trip_start is null then
    raise exception 'Itinerary item not found';
  end if;

  if item_status <> 'suggested' then
    raise exception 'Only suggestions can be voted on';
  end if;

  if new.preferred_date is not null
    and (
      new.preferred_date < trip_start
      or new.preferred_date > trip_end
    )
  then
    raise exception 'Preferred date must be during the trip';
  end if;

  return new;
end;
$$;


create trigger validate_itinerary_vote_date
before insert or update
on public.itinerary_votes
for each row
execute function private.validate_itinerary_vote_date();