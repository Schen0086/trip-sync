-- =========================================================
-- VOTING DECISIONS
-- =========================================================

-- Suggestions can now remain in TripSync after the group
-- has rejected or archived them.
alter table public.itinerary_items
drop constraint if exists itinerary_items_status_check;

alter table public.itinerary_items
add constraint itinerary_items_status_check
check (
  planning_status in (
    'suggested',
    'planned',
    'rejected',
    'archived'
  )
);


-- Only planned items require complete itinerary scheduling
-- information. Rejected/archived suggestions may still be
-- incomplete ideas.
alter table public.itinerary_items
drop constraint if exists itinerary_items_planned_details_check;

alter table public.itinerary_items
add constraint itinerary_items_planned_details_check
check (
  planning_status <> 'planned'

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


-- Direct itinerary entries should always stay planned.
-- Rejected/archived states only make sense for suggestions.
alter table public.itinerary_items
drop constraint if exists itinerary_items_direct_status_check;

alter table public.itinerary_items
add constraint itinerary_items_direct_status_check
check (
  origin = 'suggestion'
  or planning_status = 'planned'
);


-- Keep the previous behaviour where the original suggester
-- may continue editing an accepted suggestion.
-- Once rejected or archived, only the trip creator can
-- alter its details or decision state.
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
    and planning_status in (
      'suggested',
      'planned'
    )
  )
)
with check (
  private.is_trip_creator(trip_id)

  or (
    origin = 'suggestion'
    and created_by = (select auth.uid())
    and planning_status in (
      'suggested',
      'planned'
    )
  )
);