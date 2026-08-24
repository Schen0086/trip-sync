-- =========================================================
-- TRIP TASKS / RESPONSIBILITIES
-- =========================================================

create table public.trip_tasks (
  id uuid primary key default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  assigned_to uuid
    references public.profiles(id)
    on delete set null,

  title text not null
    check (
      char_length(trim(title))
      between 1 and 160
    ),

  description text
    check (
      description is null
      or char_length(description) <= 1200
    ),

  due_date date,

  priority text not null
    default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high'
      )
    ),

  status text not null
    default 'open'
    check (
      status in (
        'open',
        'completed'
      )
    ),

  completed_at timestamptz,

  completed_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint trip_tasks_completion_check
  check (
    (
      status = 'open'
      and completed_at is null
      and completed_by is null
    )
    or
    (
      status = 'completed'
      and completed_at is not null
      and completed_by is not null
    )
  )
);


create index trip_tasks_trip_id_idx
on public.trip_tasks (
  trip_id
);


create index trip_tasks_assigned_to_idx
on public.trip_tasks (
  assigned_to
);


create index trip_tasks_due_date_idx
on public.trip_tasks (
  trip_id,
  due_date
)
where status = 'open';


-- =========================================================
-- ACTUAL TRIP ATTENDEE HELPER
-- =========================================================

-- Re-create this safely so the Tasks migration does not
-- depend on which earlier migration originally introduced it.

create or replace function private.is_trip_attendee(
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
    from public.trip_participants tp
    where tp.trip_id = check_trip_id
      and tp.user_id = check_user_id
  );
$$;


revoke all
on function private.is_trip_attendee(uuid, uuid)
from public;

grant execute
on function private.is_trip_attendee(uuid, uuid)
to authenticated;

grant execute
on function private.is_trip_attendee(uuid, uuid)
to service_role;


-- =========================================================
-- TASK UPDATE PROTECTION
-- =========================================================

-- Trip creator / task creator:
--   may edit task details.
--
-- Assignee:
--   may complete/reopen their task
--   or release it.
--
-- Any attendee:
--   may claim an unassigned task.
--
-- This trigger ensures those narrower permissions cannot be
-- bypassed by directly calling Supabase from the browser.

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
    raise exception 'You must be signed in';
  end if;


  -- Core ownership fields never change.
  if new.trip_id is distinct from old.trip_id then
    raise exception 'Task trip cannot be changed';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'Task creator cannot be changed';
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


  -- A responsibility may only be assigned to somebody who
  -- is actually attending the trip.
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


  -- Trip creator and original task creator can edit normally.
  if actor_is_trip_creator
     or actor = old.created_by
  then
    null;


  -- Current assignee may only:
  --   * complete/reopen
  --   * release themselves
  elsif old.assigned_to = actor
        and actor_is_attendee
  then
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.due_date is distinct from old.due_date
       or new.priority is distinct from old.priority
    then
      raise exception
        'Only the task creator or trip creator can edit task details';
    end if;

    if new.assigned_to is distinct from old.assigned_to
       and new.assigned_to is not null
    then
      raise exception
        'You may only release a task assigned to you';
    end if;


  -- Any actual attendee may claim an unassigned task,
  -- but may not modify anything else during that update.
  elsif old.assigned_to is null
        and actor_is_attendee
  then
    if new.assigned_to is distinct from actor
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.due_date is distinct from old.due_date
       or new.priority is distinct from old.priority
       or new.status is distinct from old.status
    then
      raise exception
        'You may only claim an unassigned task';
    end if;


  else
    raise exception
      'You are not allowed to update this task';
  end if;


  -- Completion metadata is always maintained by the database.
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      new.completed_at := now();
      new.completed_by := actor;
    else
      new.completed_at := null;
      new.completed_by := null;
    end if;

  elsif old.status = 'completed' then
    new.completed_at := old.completed_at;
    new.completed_by := old.completed_by;

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


create trigger protect_trip_task_update
before update
on public.trip_tasks
for each row
execute function private.protect_trip_task_update();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.trip_tasks
enable row level security;


create policy "Users can view trip tasks"
on public.trip_tasks
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


create policy "Travellers can create trip tasks"
on public.trip_tasks
for insert
to authenticated
with check (
  created_by = (select auth.uid())

  and (
    private.is_trip_creator(trip_id)
    or private.is_trip_attendee(
      trip_id,
      (select auth.uid())
    )
  )

  and (
    assigned_to is null
    or private.is_trip_attendee(
      trip_id,
      assigned_to
    )
  )

  and status = 'open'
  and completed_at is null
  and completed_by is null
);


create policy "Allowed users can update trip tasks"
on public.trip_tasks
for update
to authenticated
using (
  private.can_view_trip(trip_id)

  and (
    private.is_trip_creator(trip_id)

    or created_by = (
      select auth.uid()
    )

    or assigned_to = (
      select auth.uid()
    )

    or (
      assigned_to is null

      and private.is_trip_attendee(
        trip_id,
        (select auth.uid())
      )
    )
  )
)
with check (
  private.can_view_trip(trip_id)

  and (
    assigned_to is null
    or private.is_trip_attendee(
      trip_id,
      assigned_to
    )
  )
);


create policy "Creators can delete trip tasks"
on public.trip_tasks
for delete
to authenticated
using (
  private.is_trip_creator(trip_id)

  or created_by = (
    select auth.uid()
  )
);


-- =========================================================
-- TABLE PRIVILEGES
-- =========================================================

revoke all
on public.trip_tasks
from anon;

grant select, insert, update, delete
on public.trip_tasks
to authenticated;

grant all
on public.trip_tasks
to service_role;


-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_tasks'
  ) then
    alter publication supabase_realtime
    add table public.trip_tasks;
  end if;
end
$$;