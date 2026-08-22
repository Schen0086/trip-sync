-- Check whether current user created a trip
create or replace function private.is_trip_creator(
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
      and owner_id = (select auth.uid())
  );
$$;


-- Allow authenticated users to use helper
grant execute
on function private.is_trip_creator(uuid)
to authenticated;


-- Replace participant insertion policy
drop policy if exists "Trip managers can add participants"
on public.trip_participants;


-- Only the trip creator can add travellers
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


-- Replace participant removal policy
drop policy if exists "Trip managers can remove participants"
on public.trip_participants;


-- Creator can remove other travellers
create policy "Trip creators can remove other participants"
on public.trip_participants
for delete
to authenticated
using (
  private.is_trip_creator(trip_id)
  and user_id <> (select auth.uid())
);


-- Travellers can remove themselves from group trips
create policy "Participants can leave group trips"
on public.trip_participants
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_group_trip(trip_id)
);