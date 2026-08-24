-- =========================================================
-- TRIP ORGANIZER PERMISSIONS + TASKS / RESPONSIBILITIES
-- =========================================================


-- ---------------------------------------------------------
-- Trip organizer helpers
-- ---------------------------------------------------------

-- A trip organizer is:
--   * the trip creator
--   * the owner of the group containing a group trip
--   * an admin of the group containing a group trip
create or replace function private.can_organize_trip(
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
    from public.trips t
    where t.id = check_trip_id
    and (
      t.owner_id = (select auth.uid())

      or (
        t.trip_type = 'group'
        and t.group_id is not null
        and exists (
          select 1
          from public.group_members gm
          where gm.group_id = t.group_id
          and gm.user_id = (select auth.uid())
          and gm.role in ('owner', 'admin')
        )
      )
    )
  );
$$;


-- Used when deciding whether somebody may create
-- a new trip for a group.
create or replace function private.can_create_group_trip(
  check_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.groups g
    join public.group_members gm
      on gm.group_id = g.id
    where g.id = check_group_id
    and g.status = 'active'
    and gm.user_id = (select auth.uid())
    and gm.role in ('owner', 'admin')
  );
$$;


-- Check whether a specific user created a trip.
create or replace function private.is_trip_creator_user(
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
    from public.trips t
    where t.id = check_trip_id
    and t.owner_id = check_user_id
  );
$$;


-- Keep this helper available even if the earlier
-- expenses/packing migration created it already.
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


grant usage
on schema private
to authenticated;

grant execute
on function private.can_organize_trip(uuid)
to authenticated;

grant execute
on function private.can_create_group_trip(uuid)
to authenticated;

grant execute
on function private.is_trip_creator_user(uuid, uuid)
to authenticated;

grant execute
on function private.is_trip_attendee(uuid, uuid)
to authenticated;


-- ---------------------------------------------------------
-- Allow group admins to create group trips
-- ---------------------------------------------------------

drop policy if exists "Users can create trips"
on public.trips;

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
    and private.can_create_group_trip(group_id)
  )
);


-- ---------------------------------------------------------
-- Allow group admins to organise attendee lists
-- ---------------------------------------------------------

drop policy if exists "Trip creators can add participants"
on public.trip_participants;

drop policy if exists "Trip managers can add participants"
on public.trip_participants;

create policy "Trip organizers can add participants"
on public.trip_participants
for insert
to authenticated
with check (
  private.can_organize_trip(trip_id)

  and private.is_valid_trip_participant(
    trip_id,
    user_id
  )
);


drop policy if exists "Trip creators can remove other participants"
on public.trip_participants;

drop policy if exists "Trip managers can remove participants"
on public.trip_participants;

create policy "Trip organizers can remove other participants"
on public.trip_participants
for delete
to authenticated
using (
  private.can_organize_trip(trip_id)

  -- Organizers cannot remove the actual trip creator.
  and not private.is_trip_creator_user(
    trip_id,
    user_id
  )

  -- Self-removal remains handled by the existing
  -- "Participants can leave group trips" policy.
  and user_id <> (select auth.uid())
);


-- ---------------------------------------------------------
-- Tasks / Responsibilities
-- ---------------------------------------------------------

create table public.trip_tasks (
  id uuid primary key
    default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  assigned_to uuid
    references public.profiles(id)
    on delete set null,

  title text not null,

  description text,

  due_date date,

  priority text not null
    default 'normal',

  is_completed boolean not null
    default false,

  completed_at timestamptz,

  completed_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint trip_tasks_title_length_check
    check (
      char_length(trim(title))
      between 1 and 160
    ),

  constraint trip_tasks_description_length_check
    check (
      description is null
      or char_length(description) <= 1000
    ),

  constraint trip_tasks_priority_check
    check (
      priority in (
        'low',
        'normal',
        'high'
      )
    )
);


create index trip_tasks_trip_id_idx
on public.trip_tasks(trip_id);

create index trip_tasks_assigned_to_idx
on public.trip_tasks(assigned_to);

create index trip_tasks_due_date_idx
on public.trip_tasks(due_date);

create index trip_tasks_open_assignment_idx
on public.trip_tasks(
  trip_id,
  assigned_to,
  is_completed
);


alter table public.trip_tasks
enable row level security;


-- Users only need direct SELECT access.
-- All mutations go through validated RPC functions.
grant select
on public.trip_tasks
to authenticated;

revoke insert, update, delete
on public.trip_tasks
from authenticated;

grant all
on public.trip_tasks
to service_role;


create policy "Users can view trip tasks"
on public.trip_tasks
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


-- ---------------------------------------------------------
-- Automatically maintain updated_at
-- ---------------------------------------------------------

create or replace function private.set_trip_task_updated_at()
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


create trigger set_trip_task_updated_at
before update
on public.trip_tasks
for each row
execute function private.set_trip_task_updated_at();


-- ---------------------------------------------------------
-- Create task
-- ---------------------------------------------------------

create or replace function public.create_trip_task(
  p_trip_id uuid,
  p_title text,
  p_description text,
  p_assigned_to uuid,
  p_due_date date,
  p_priority text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  new_task_id uuid;
  organizer boolean;
begin
  caller_id := (select auth.uid());

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  if not private.can_view_trip(p_trip_id) then
    raise exception 'Trip not found or unavailable';
  end if;

  organizer :=
    private.can_organize_trip(p_trip_id);

  if
    not organizer
    and not private.is_trip_attendee(
      p_trip_id,
      caller_id
    )
  then
    raise exception 'Only trip attendees or organizers can create tasks';
  end if;

  if
    p_title is null
    or char_length(trim(p_title)) = 0
    or char_length(trim(p_title)) > 160
  then
    raise exception 'Task title must be between 1 and 160 characters';
  end if;

  if
    p_description is not null
    and char_length(p_description) > 1000
  then
    raise exception 'Task description must be 1000 characters or fewer';
  end if;

  if p_priority not in (
    'low',
    'normal',
    'high'
  ) then
    raise exception 'Invalid task priority';
  end if;

  if
    p_assigned_to is not null
    and not private.is_trip_attendee(
      p_trip_id,
      p_assigned_to
    )
  then
    raise exception 'Tasks can only be assigned to people attending the trip';
  end if;

  -- Regular attendees may create tasks for themselves
  -- or leave them unassigned. Organizers may assign
  -- anybody attending the trip.
  if
    not organizer
    and p_assigned_to is not null
    and p_assigned_to <> caller_id
  then
    raise exception 'Only trip organizers can assign tasks to other travellers';
  end if;

  insert into public.trip_tasks (
    trip_id,
    created_by,
    assigned_to,
    title,
    description,
    due_date,
    priority
  )
  values (
    p_trip_id,
    caller_id,
    p_assigned_to,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_due_date,
    p_priority
  )
  returning id
  into new_task_id;

  return new_task_id;
end;
$$;


-- ---------------------------------------------------------
-- Update task
-- ---------------------------------------------------------

create or replace function public.update_trip_task(
  p_task_id uuid,
  p_title text,
  p_description text,
  p_assigned_to uuid,
  p_due_date date,
  p_priority text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  existing_task public.trip_tasks%rowtype;
  organizer boolean;
begin
  caller_id := (select auth.uid());

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  select *
  into existing_task
  from public.trip_tasks
  where id = p_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  organizer :=
    private.can_organize_trip(
      existing_task.trip_id
    );

  if
    not organizer
    and existing_task.created_by <> caller_id
  then
    raise exception 'You cannot edit this task';
  end if;

  if
    p_title is null
    or char_length(trim(p_title)) = 0
    or char_length(trim(p_title)) > 160
  then
    raise exception 'Task title must be between 1 and 160 characters';
  end if;

  if
    p_description is not null
    and char_length(p_description) > 1000
  then
    raise exception 'Task description must be 1000 characters or fewer';
  end if;

  if p_priority not in (
    'low',
    'normal',
    'high'
  ) then
    raise exception 'Invalid task priority';
  end if;

  if
    p_assigned_to is not null
    and not private.is_trip_attendee(
      existing_task.trip_id,
      p_assigned_to
    )
  then
    raise exception 'Tasks can only be assigned to people attending the trip';
  end if;

  if
    not organizer
    and p_assigned_to is not null
    and p_assigned_to <> caller_id
  then
    raise exception 'Only trip organizers can assign tasks to other travellers';
  end if;

  update public.trip_tasks
  set
    title =
      trim(p_title),

    description =
      nullif(
        trim(
          coalesce(
            p_description,
            ''
          )
        ),
        ''
      ),

    assigned_to =
      p_assigned_to,

    due_date =
      p_due_date,

    priority =
      p_priority
  where id = p_task_id;
end;
$$;


-- ---------------------------------------------------------
-- Complete / reopen task
-- ---------------------------------------------------------

create or replace function public.toggle_trip_task(
  p_task_id uuid,
  p_completed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  existing_task public.trip_tasks%rowtype;
  organizer boolean;
begin
  caller_id := (select auth.uid());

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  select *
  into existing_task
  from public.trip_tasks
  where id = p_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  organizer :=
    private.can_organize_trip(
      existing_task.trip_id
    );

  if not (
    organizer

    or existing_task.created_by =
      caller_id

    or existing_task.assigned_to =
      caller_id

    or (
      existing_task.assigned_to is null
      and private.is_trip_attendee(
        existing_task.trip_id,
        caller_id
      )
    )
  ) then
    raise exception 'You cannot update this task';
  end if;

  update public.trip_tasks
  set
    is_completed =
      p_completed,

    completed_at =
      case
        when p_completed
          then now()
        else null
      end,

    completed_by =
      case
        when p_completed
          then caller_id
        else null
      end
  where id = p_task_id;
end;
$$;


-- ---------------------------------------------------------
-- Delete task
-- ---------------------------------------------------------

create or replace function public.delete_trip_task(
  p_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  existing_task public.trip_tasks%rowtype;
begin
  caller_id := (select auth.uid());

  if caller_id is null then
    raise exception 'You must be signed in';
  end if;

  select *
  into existing_task
  from public.trip_tasks
  where id = p_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  if not (
    private.can_organize_trip(
      existing_task.trip_id
    )

    or existing_task.created_by =
      caller_id
  ) then
    raise exception 'You cannot delete this task';
  end if;

  delete from public.trip_tasks
  where id = p_task_id;
end;
$$;


-- Lock down RPC access.
revoke all
on function public.create_trip_task(
  uuid,
  text,
  text,
  uuid,
  date,
  text
)
from public, anon;

revoke all
on function public.update_trip_task(
  uuid,
  text,
  text,
  uuid,
  date,
  text
)
from public, anon;

revoke all
on function public.toggle_trip_task(
  uuid,
  boolean
)
from public, anon;

revoke all
on function public.delete_trip_task(
  uuid
)
from public, anon;


grant execute
on function public.create_trip_task(
  uuid,
  text,
  text,
  uuid,
  date,
  text
)
to authenticated;

grant execute
on function public.update_trip_task(
  uuid,
  text,
  text,
  uuid,
  date,
  text
)
to authenticated;

grant execute
on function public.toggle_trip_task(
  uuid,
  boolean
)
to authenticated;

grant execute
on function public.delete_trip_task(
  uuid
)
to authenticated;


-- Realtime
alter publication supabase_realtime
add table public.trip_tasks;