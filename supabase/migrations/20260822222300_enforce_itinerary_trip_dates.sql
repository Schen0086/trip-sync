-- Ensure every itinerary date stays inside the trip date range
create or replace function private.validate_itinerary_item_trip_dates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trip_start date;
  trip_end date;
begin
  -- Load trip dates
  select
    start_date,
    end_date
  into
    trip_start,
    trip_end
  from public.trips
  where id = new.trip_id;

  if trip_start is null or trip_end is null then
    raise exception 'Trip not found';
  end if;

  -- Activity date
  if new.scheduled_date is not null
    and (
      new.scheduled_date < trip_start
      or new.scheduled_date > trip_end
    )
  then
    raise exception 'Activity date must be within the trip dates';
  end if;

  -- Transport departure date
  if new.departure_date is not null
    and (
      new.departure_date < trip_start
      or new.departure_date > trip_end
    )
  then
    raise exception 'Departure date must be within the trip dates';
  end if;

  -- Transport arrival date
  if new.arrival_date is not null
    and (
      new.arrival_date < trip_start
      or new.arrival_date > trip_end
    )
  then
    raise exception 'Arrival date must be within the trip dates';
  end if;

  -- Accommodation check-in
  if new.check_in_date is not null
    and (
      new.check_in_date < trip_start
      or new.check_in_date > trip_end
    )
  then
    raise exception 'Check-in date must be within the trip dates';
  end if;

  -- Accommodation check-out
  if new.check_out_date is not null
    and (
      new.check_out_date < trip_start
      or new.check_out_date > trip_end
    )
  then
    raise exception 'Check-out date must be within the trip dates';
  end if;

  return new;
end;
$$;


drop trigger if exists validate_itinerary_item_trip_dates
on public.itinerary_items;


create trigger validate_itinerary_item_trip_dates
before insert or update
on public.itinerary_items
for each row
execute function private.validate_itinerary_item_trip_dates();