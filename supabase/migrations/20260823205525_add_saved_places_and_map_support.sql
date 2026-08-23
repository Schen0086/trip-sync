-- =========================================================
-- SAVED PLACES
-- =========================================================

create table public.saved_places (
  id uuid primary key default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  saved_by uuid not null
    references public.profiles(id)
    on delete cascade,

  geoapify_place_id text,

  name text not null,
  category text not null default 'other',

  address text,
  latitude double precision not null,
  longitude double precision not null,

  website_url text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Validate place category
alter table public.saved_places
add constraint saved_places_category_check
check (
  category in (
    'food_drink',
    'attraction',
    'nightlife',
    'activity',
    'shopping',
    'accommodation',
    'other'
  )
);


-- Validate coordinates
alter table public.saved_places
add constraint saved_places_latitude_check
check (
  latitude between -90 and 90
);


alter table public.saved_places
add constraint saved_places_longitude_check
check (
  longitude between -180 and 180
);


-- Helpful indexes
create index saved_places_trip_id_idx
on public.saved_places(trip_id);


create index saved_places_saved_by_idx
on public.saved_places(saved_by);


create index saved_places_trip_category_idx
on public.saved_places(
  trip_id,
  category
);


-- Prevent saving the same Geoapify place twice
-- inside the same trip.
create unique index saved_places_trip_geoapify_unique
on public.saved_places(
  trip_id,
  geoapify_place_id
)
where geoapify_place_id is not null;


-- =========================================================
-- LINK PLACES TO ITINERARY
-- =========================================================

alter table public.itinerary_items
add column source_saved_place_id uuid
references public.saved_places(id)
on delete set null;


create index itinerary_items_source_saved_place_idx
on public.itinerary_items(
  source_saved_place_id
);


-- A saved place can only have one active itinerary/backlog
-- representation at a time.
create unique index itinerary_items_source_saved_place_unique
on public.itinerary_items(
  source_saved_place_id
)
where source_saved_place_id is not null;


-- =========================================================
-- SAVED PLACE RLS
-- =========================================================

alter table public.saved_places
enable row level security;


grant select, insert, update, delete
on public.saved_places
to authenticated;


-- Anyone who can access the trip can see saved places
create policy "Users can view saved places"
on public.saved_places
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


-- Anyone who can access the trip can save a place
create policy "Users can save places"
on public.saved_places
for insert
to authenticated
with check (
  saved_by = (select auth.uid())
  and private.can_view_trip(trip_id)
);


-- Trip creator or person who saved the place can edit it
create policy "Users can update saved places"
on public.saved_places
for update
to authenticated
using (
  private.can_view_trip(trip_id)
  and (
    private.is_trip_creator(trip_id)
    or saved_by = (select auth.uid())
  )
)
with check (
  private.can_view_trip(trip_id)
  and (
    private.is_trip_creator(trip_id)
    or saved_by = (select auth.uid())
  )
);


-- Trip creator or person who saved the place can delete it
create policy "Users can delete saved places"
on public.saved_places
for delete
to authenticated
using (
  private.can_view_trip(trip_id)
  and (
    private.is_trip_creator(trip_id)
    or saved_by = (select auth.uid())
  )
);


-- =========================================================
-- PROTECT PLACE OWNERSHIP
-- =========================================================

create or replace function private.protect_saved_place_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.trip_id <> new.trip_id then
    raise exception 'Trip cannot be changed';
  end if;

  if old.saved_by <> new.saved_by then
    raise exception 'Place owner cannot be changed';
  end if;

  if old.geoapify_place_id is distinct from new.geoapify_place_id then
    raise exception 'Place source cannot be changed';
  end if;

  return new;
end;
$$;


create trigger protect_saved_place_identity
before update on public.saved_places
for each row
execute function private.protect_saved_place_identity();


-- Maintain updated_at
create or replace function private.set_saved_place_updated_at()
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


create trigger set_saved_place_updated_at
before update on public.saved_places
for each row
execute function private.set_saved_place_updated_at();


-- =========================================================
-- REALTIME
-- =========================================================

-- Add saved places to the same global Realtime system
-- already used by TripSync.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'saved_places'
  )
  then
    alter publication supabase_realtime
    add table public.saved_places;
  end if;
end;
$$;