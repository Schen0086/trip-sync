-- =========================================================
-- ROLLBACK:
-- TASKS / RESPONSIBILITIES + TRIP ORGANIZER PERMISSIONS
-- =========================================================
--
-- Reverses:
-- 20260824030331_add_tasks_and_trip_organizers.sql
--
-- This restores the previous TripSync permissions where:
--   * only the trip creator manages trip attendees
--   * only group owners may create group trips
--   * the trip_tasks feature does not exist
--
-- Existing shared helpers used by other TripSync features,
-- such as private.is_trip_attendee(), are intentionally kept.
-- =========================================================


-- ---------------------------------------------------------
-- Remove task RPC functions first
-- ---------------------------------------------------------

drop function if exists public.create_trip_task(
  uuid,
  text,
  text,
  uuid,
  date,
  text
);

drop function if exists public.update_trip_task(
  uuid,
  text,
  text,
  uuid,
  date,
  text
);

drop function if exists public.toggle_trip_task(
  uuid,
  boolean
);

drop function if exists public.delete_trip_task(
  uuid
);


-- ---------------------------------------------------------
-- Remove trip_tasks from Realtime
-- ---------------------------------------------------------

-- The accidental migration added trip_tasks to the
-- supabase_realtime publication. Remove it before
-- dropping the table.
do $$
begin
  if exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr
      on pr.prpubid = p.oid
    join pg_class c
      on c.oid = pr.prrelid
    join pg_namespace n
      on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'trip_tasks'
  ) then
    alter publication supabase_realtime
    drop table public.trip_tasks;
  end if;
end;
$$;


-- ---------------------------------------------------------
-- Remove tasks table
-- ---------------------------------------------------------

drop table if exists public.trip_tasks;


-- The trigger itself disappeared when the table was dropped,
-- but its trigger function is a separate database object.
drop function if exists private.set_trip_task_updated_at();


-- =========================================================
-- RESTORE PREVIOUS TRIP PERMISSIONS
-- =========================================================


-- ---------------------------------------------------------
-- Restore group trip creation permissions
-- ---------------------------------------------------------

drop policy if exists "Users can create trips"
on public.trips;


-- Personal trips can be created for yourself.
--
-- Group trips can only be created for an active group
-- owned by the current user.
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


-- ---------------------------------------------------------
-- Restore participant insertion permissions
-- ---------------------------------------------------------

drop policy if exists "Trip organizers can add participants"
on public.trip_participants;

drop policy if exists "Trip creators can add participants"
on public.trip_participants;


-- Only the actual trip creator may add travellers.
create policy "Trip creators can add participants"
on public.trip_participants
for insert
to authenticated
with check (
  private.is_trip_creator(trip_id)

  and private.is_valid_trip_participant(
    trip_id,
    user_id
  )
);


-- ---------------------------------------------------------
-- Restore participant removal permissions
-- ---------------------------------------------------------

drop policy if exists "Trip organizers can remove other participants"
on public.trip_participants;

drop policy if exists "Trip creators can remove other participants"
on public.trip_participants;


-- Only the actual trip creator may remove other travellers.
create policy "Trip creators can remove other participants"
on public.trip_participants
for delete
to authenticated
using (
  private.is_trip_creator(trip_id)

  and user_id <> (select auth.uid())
);


-- ---------------------------------------------------------
-- Remove organizer-only helper functions
-- ---------------------------------------------------------

drop function if exists private.can_organize_trip(uuid);

drop function if exists private.can_create_group_trip(uuid);

drop function if exists private.is_trip_creator_user(
  uuid,
  uuid
);


-- =========================================================
-- IMPORTANT:
-- Do NOT remove private.is_trip_attendee(uuid, uuid).
--
-- That helper is also used by existing TripSync features
-- such as Expenses and Packing and therefore remains part
-- of the database.
-- =========================================================