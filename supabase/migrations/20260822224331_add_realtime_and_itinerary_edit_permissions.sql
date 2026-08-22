-- =========================================================
-- ITINERARY EDIT PERMISSIONS
-- =========================================================

-- Replace the itinerary update policy.
-- The trip creator can edit every item.
-- The original suggester can continue editing their suggestion,
-- even after the trip creator schedules it.
drop policy if exists "Users can update itinerary items"
on public.itinerary_items;


create policy "Users can update itinerary items"
on public.itinerary_items
for update
to authenticated
using (
  private.is_trip_creator(trip_id)
  or (
    origin = 'suggestion'
    and created_by = (select auth.uid())
  )
)
with check (
  private.is_trip_creator(trip_id)
  or (
    origin = 'suggestion'
    and created_by = (select auth.uid())
  )
);


-- Protect fields that should not be changeable by a suggestion author.
create or replace function private.protect_itinerary_item_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An item cannot be moved to another trip.
  if old.trip_id <> new.trip_id then
    raise exception 'Trip cannot be changed';
  end if;

  -- The original author cannot be changed.
  if old.created_by <> new.created_by then
    raise exception 'Item creator cannot be changed';
  end if;

  -- Activity/transport/accommodation type cannot be changed.
  if old.item_type <> new.item_type then
    raise exception 'Item type cannot be changed';
  end if;

  -- A direct item cannot become a suggestion and vice versa.
  if old.origin <> new.origin then
    raise exception 'Item origin cannot be changed';
  end if;

  -- Only the trip creator can promote/demote a suggestion.
  if old.planning_status <> new.planning_status
    and not private.is_trip_creator(old.trip_id)
  then
    raise exception 'Only the trip creator can change planning status';
  end if;

  return new;
end;
$$;


-- =========================================================
-- SUPABASE REALTIME
-- =========================================================

-- Add all current collaborative TripSync tables to the
-- supabase_realtime publication.
--
-- The checks make this migration safe if a table has already
-- been enabled manually in the Supabase dashboard.
do $$
declare
  table_to_add text;
begin
  foreach table_to_add in array array[
    'profiles',
    'groups',
    'group_members',
    'trips',
    'trip_participants',
    'itinerary_items',
    'itinerary_votes'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_to_add
    )
    then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_to_add
      );
    end if;
  end loop;
end;
$$;