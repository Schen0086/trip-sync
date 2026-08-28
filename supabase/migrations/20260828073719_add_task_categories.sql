-- =========================================================
-- TASK CATEGORIES
-- =========================================================

-- Add the category column first without NOT NULL so this
-- migration is also safe if an earlier local attempt created
-- the column but did not finish the migration.
alter table public.trip_tasks
add column if not exists category text;


alter table public.trip_tasks
alter column category set default 'other';


-- Existing task update protection expects auth.uid() to exist.
-- Database migrations do not run as an app user, so temporarily
-- disable user-defined triggers while backfilling old rows.
alter table public.trip_tasks
disable trigger user;


update public.trip_tasks
set category = 'other'
where category is null;


alter table public.trip_tasks
enable trigger user;


alter table public.trip_tasks
alter column category set not null;


alter table public.trip_tasks
drop constraint if exists trip_tasks_category_check;


alter table public.trip_tasks
add constraint trip_tasks_category_check
check (
  category in (
    'booking',
    'transport',
    'documents',
    'payments',
    'shopping',
    'other'
  )
);


create index if not exists trip_tasks_trip_category_idx
on public.trip_tasks (
  trip_id,
  category
);


-- =========================================================
-- UPDATE PROTECTION
-- =========================================================

-- Extend the existing task protection so an assignee cannot
-- bypass the UI and alter the new category field directly.
create or replace function private.protect_trip_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  actor_is_trip_creator boolean;
  actor_is_attendee boolean;
begin
  actor := auth.uid();


  if actor is null then
    raise exception
      'You must be signed in';
  end if;


  -- Core ownership fields never change.
  if new.trip_id
    is distinct from
    old.trip_id
  then
    raise exception
      'Task trip cannot be changed';
  end if;


  if new.created_by
    is distinct from
    old.created_by
  then
    raise exception
      'Task creator cannot be changed';
  end if;


  select exists (
    select 1
    from public.trips t
    where t.id = old.trip_id
      and t.owner_id = actor
  )
  into actor_is_trip_creator;


  select exists (
    select 1
    from public.trip_participants tp
    where tp.trip_id = old.trip_id
      and tp.user_id = actor
  )
  into actor_is_attendee;


  -- Responsibilities may only be assigned to
  -- people actually attending the trip.
  if new.assigned_to is not null
    and not exists (
      select 1
      from public.trip_participants tp
      where tp.trip_id = old.trip_id
        and tp.user_id = new.assigned_to
    )
  then
    raise exception
      'Tasks can only be assigned to travellers attending the trip';
  end if;


  -- Trip creator or original task creator may
  -- edit the responsibility normally.
  if actor_is_trip_creator
    or actor = old.created_by
  then
    null;


  -- Current assignee may only:
  --   * complete/reopen the task
  --   * release themselves
  elsif old.assigned_to = actor
    and actor_is_attendee
  then
    if new.title
        is distinct from
        old.title

      or new.description
        is distinct from
        old.description

      or new.due_date
        is distinct from
        old.due_date

      or new.priority
        is distinct from
        old.priority

      or new.category
        is distinct from
        old.category
    then
      raise exception
        'Only the task creator or trip creator can edit task details';
    end if;


    if new.assigned_to
        is distinct from
        old.assigned_to
      and new.assigned_to is not null
    then
      raise exception
        'You may only release a task assigned to you';
    end if;


  -- Any attendee may claim an unassigned task but
  -- cannot change its other fields at the same time.
  elsif old.assigned_to is null
    and actor_is_attendee
  then
    if new.assigned_to
        is distinct from
        actor

      or new.title
        is distinct from
        old.title

      or new.description
        is distinct from
        old.description

      or new.due_date
        is distinct from
        old.due_date

      or new.priority
        is distinct from
        old.priority

      or new.category
        is distinct from
        old.category

      or new.status
        is distinct from
        old.status
    then
      raise exception
        'You may only claim an unassigned task';
    end if;


  else
    raise exception
      'You are not allowed to update this task';
  end if;


  -- Completion metadata is always maintained by
  -- the database instead of trusting the client.
  if new.status
    is distinct from
    old.status
  then
    if new.status = 'completed' then
      new.completed_at := now();
      new.completed_by := actor;
    else
      new.completed_at := null;
      new.completed_by := null;
    end if;


  elsif old.status = 'completed' then
    new.completed_at :=
      old.completed_at;

    new.completed_by :=
      old.completed_by;


  else
    new.completed_at := null;
    new.completed_by := null;
  end if;


  new.updated_at := now();


  return new;
end;
$$;


revoke all
on function private.protect_trip_task_update()
from public;