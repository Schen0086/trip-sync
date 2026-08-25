-- =========================================================
-- TRIP ACTIVITY
-- =========================================================

create table public.trip_activity (
  id uuid primary key default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  actor_user_id uuid
    references public.profiles(id)
    on delete set null,

  category text not null
    check (
      category in (
        'tasks',
        'itinerary',
        'voting',
        'places',
        'expenses',
        'packing'
      )
    ),

  event_type text not null,

  entity_type text not null,

  entity_id uuid,

  action text not null,

  subject text not null,

  detail text,

  href text
    check (
      href is null
      or href like '/%'
    ),

  created_at timestamptz not null
    default now()
);


create index trip_activity_trip_created_idx
on public.trip_activity (
  trip_id,
  created_at desc
);


create index trip_activity_actor_idx
on public.trip_activity (
  actor_user_id
);


alter table public.trip_activity
enable row level security;


create policy "Users can view activity for accessible trips"
on public.trip_activity
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


revoke all
on public.trip_activity
from anon, authenticated;

grant select
on public.trip_activity
to authenticated;

grant all
on public.trip_activity
to service_role;


-- =========================================================
-- NOTIFICATIONS
-- =========================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  trip_id uuid
    references public.trips(id)
    on delete cascade,

  actor_user_id uuid
    references public.profiles(id)
    on delete set null,

  activity_id uuid
    references public.trip_activity(id)
    on delete set null,

  type text not null,

  title text not null,

  message text not null,

  href text
    check (
      href is null
      or href like '/%'
    ),

  dedupe_key text,

  read_at timestamptz,

  created_at timestamptz not null
    default now()
);


create index notifications_user_created_idx
on public.notifications (
  user_id,
  created_at desc
);


create index notifications_user_unread_idx
on public.notifications (
  user_id,
  created_at desc
)
where read_at is null;


create unique index notifications_user_dedupe_idx
on public.notifications (
  user_id,
  dedupe_key
)
where dedupe_key is not null;


alter table public.notifications
enable row level security;


create policy "Users can view their notifications"
on public.notifications
for select
to authenticated
using (
  user_id = (
    select auth.uid()
  )
);


create policy "Users can update their notifications"
on public.notifications
for update
to authenticated
using (
  user_id = (
    select auth.uid()
  )
)
with check (
  user_id = (
    select auth.uid()
  )
);


create policy "Users can delete their notifications"
on public.notifications
for delete
to authenticated
using (
  user_id = (
    select auth.uid()
  )
);


-- Users may only directly update read_at.
-- Notification content itself is database-managed.
revoke all
on public.notifications
from anon, authenticated;

grant select, delete
on public.notifications
to authenticated;

grant update(read_at)
on public.notifications
to authenticated;

grant all
on public.notifications
to service_role;


-- =========================================================
-- INTERNAL HELPERS
-- =========================================================

create or replace function private.current_actor_display_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when auth.uid() is null
        then 'TripSync'

      else coalesce(
        (
          select nullif(
            trim(p.display_name),
            ''
          )
          from public.profiles p
          where p.id = auth.uid()
        ),
        'Someone'
      )
    end;
$$;


revoke all
on function private.current_actor_display_name()
from public;


create or replace function private.record_trip_activity(
  p_trip_id uuid,
  p_category text,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_subject text,
  p_detail text default null,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_actor_id uuid;
begin
  if p_trip_id is null
     or nullif(
       trim(p_subject),
       ''
     ) is null
  then
    return null;
  end if;

  v_actor_id := auth.uid();

  if v_actor_id is not null
     and not exists (
       select 1
       from public.profiles p
       where p.id = v_actor_id
     )
  then
    v_actor_id := null;
  end if;


  insert into public.trip_activity (
    trip_id,
    actor_user_id,
    category,
    event_type,
    entity_type,
    entity_id,
    action,
    subject,
    detail,
    href
  )
  values (
    p_trip_id,
    v_actor_id,
    p_category,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_action,
    p_subject,
    p_detail,
    p_href
  )
  returning id
  into v_activity_id;


  return v_activity_id;

exception
  when others then
    raise warning
      'Unable to record TripSync activity: %',
      sqlerrm;

    return null;
end;
$$;


revoke all
on function private.record_trip_activity(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text
)
from public;


create or replace function private.create_notification(
  p_user_id uuid,
  p_trip_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_href text default null,
  p_activity_id uuid default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
  v_actor_id uuid;
begin
  -- Never notify the person who caused the event.
  if p_user_id is null
     or p_user_id = auth.uid()
  then
    return null;
  end if;


  -- Ignore recipients that no longer have a profile.
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  )
  then
    return null;
  end if;


  v_actor_id := auth.uid();

  if v_actor_id is not null
     and not exists (
       select 1
       from public.profiles p
       where p.id = v_actor_id
     )
  then
    v_actor_id := null;
  end if;


  insert into public.notifications (
    user_id,
    trip_id,
    actor_user_id,
    activity_id,
    type,
    title,
    message,
    href,
    dedupe_key
  )
  values (
    p_user_id,
    p_trip_id,
    v_actor_id,
    p_activity_id,
    p_type,
    p_title,
    p_message,
    p_href,
    p_dedupe_key
  )
  on conflict (
    user_id,
    dedupe_key
  )
  where dedupe_key is not null
  do nothing
  returning id
  into v_notification_id;


  return v_notification_id;

exception
  when others then
    raise warning
      'Unable to create TripSync notification: %',
      sqlerrm;

    return null;
end;
$$;


revoke all
on function private.create_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text
)
from public;


-- =========================================================
-- TASK ACTIVITY + NOTIFICATIONS
-- =========================================================

create or replace function private.capture_trip_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_actor_name text;
  v_recipient record;
begin
  v_actor_name :=
    private.current_actor_display_name();


  if tg_op = 'INSERT' then
    v_activity_id :=
      private.record_trip_activity(
        new.trip_id,
        'tasks',
        'task_created',
        'trip_task',
        new.id,
        'added a responsibility',
        new.title,
        null,
        '/trips/' ||
          new.trip_id::text ||
          '/tasks'
      );


    if new.assigned_to is not null then
      perform private.create_notification(
        new.assigned_to,
        new.trip_id,
        'task_assigned',
        'New responsibility',
        v_actor_name ||
          ' assigned you "' ||
          new.title ||
          '".',
        '/trips/' ||
          new.trip_id::text ||
          '/tasks',
        v_activity_id
      );
    end if;


    return new;
  end if;


  -- Assignment changed.
  if new.assigned_to
     is distinct from
     old.assigned_to
  then
    if new.assigned_to is null then
      v_activity_id :=
        private.record_trip_activity(
          new.trip_id,
          'tasks',
          'task_released',
          'trip_task',
          new.id,
          'released a responsibility',
          new.title,
          null,
          '/trips/' ||
            new.trip_id::text ||
            '/tasks'
        );

    elsif old.assigned_to is null then
      v_activity_id :=
        private.record_trip_activity(
          new.trip_id,
          'tasks',
          'task_assigned',
          'trip_task',
          new.id,
          'assigned a responsibility',
          new.title,
          null,
          '/trips/' ||
            new.trip_id::text ||
            '/tasks'
        );

    else
      v_activity_id :=
        private.record_trip_activity(
          new.trip_id,
          'tasks',
          'task_reassigned',
          'trip_task',
          new.id,
          'reassigned a responsibility',
          new.title,
          null,
          '/trips/' ||
            new.trip_id::text ||
            '/tasks'
        );
    end if;


    if new.assigned_to is not null then
      perform private.create_notification(
        new.assigned_to,
        new.trip_id,
        case
          when old.assigned_to is null
            then 'task_assigned'
          else 'task_reassigned'
        end,
        case
          when old.assigned_to is null
            then 'New responsibility'
          else 'Responsibility reassigned'
        end,
        v_actor_name ||
          ' assigned you "' ||
          new.title ||
          '".',
        '/trips/' ||
          new.trip_id::text ||
          '/tasks',
        v_activity_id
      );
    end if;


    if old.assigned_to is not null
       and old.assigned_to
         is distinct from
         new.assigned_to
    then
      perform private.create_notification(
        old.assigned_to,
        new.trip_id,
        'task_assignment_removed',
        'Responsibility changed',
        '"' ||
          new.title ||
          '" is no longer assigned to you.',
        '/trips/' ||
          new.trip_id::text ||
          '/tasks',
        v_activity_id
      );
    end if;
  end if;


  -- Completion state changed.
  if new.status
     is distinct from
     old.status
  then
    v_activity_id :=
      private.record_trip_activity(
        new.trip_id,
        'tasks',
        case
          when new.status = 'completed'
            then 'task_completed'
          else 'task_reopened'
        end,
        'trip_task',
        new.id,
        case
          when new.status = 'completed'
            then 'completed a responsibility'
          else 'reopened a responsibility'
        end,
        new.title,
        null,
        '/trips/' ||
          new.trip_id::text ||
          '/tasks'
      );


    for v_recipient in
      select distinct recipient_id
      from (
        values
          (new.created_by),
          (new.assigned_to)
      ) as recipients(
        recipient_id
      )
      where recipient_id
        is not null
    loop
      perform private.create_notification(
        v_recipient.recipient_id,
        new.trip_id,
        case
          when new.status = 'completed'
            then 'task_completed'
          else 'task_reopened'
        end,
        case
          when new.status = 'completed'
            then 'Responsibility completed'
          else 'Responsibility reopened'
        end,
        v_actor_name ||
          case
            when new.status = 'completed'
              then ' completed "'
            else ' reopened "'
          end ||
          new.title ||
          '".',
        '/trips/' ||
          new.trip_id::text ||
          '/tasks',
        v_activity_id
      );
    end loop;
  end if;


  return new;
end;
$$;


revoke all
on function private.capture_trip_task_activity()
from public;


create trigger capture_trip_task_activity
after insert or update
on public.trip_tasks
for each row
execute function private.capture_trip_task_activity();


-- =========================================================
-- ITINERARY + SUGGESTION ACTIVITY
-- =========================================================

create or replace function private.capture_itinerary_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_actor_name text;
  v_action text;
  v_notification_title text;
  v_notification_message text;
  v_href text;
  v_recipient record;
begin
  v_actor_name :=
    private.current_actor_display_name();


  if tg_op = 'INSERT' then
    if new.origin = 'suggestion' then
      v_href :=
        '/trips/' ||
        new.trip_id::text ||
        '/voting#item-' ||
        new.id::text;

      v_activity_id :=
        private.record_trip_activity(
          new.trip_id,
          'voting',
          'suggestion_created',
          'itinerary_item',
          new.id,
          'suggested',
          new.title,
          null,
          v_href
        );


      -- A new suggestion needs a vote, so notify
      -- the actual travellers except the suggester.
      for v_recipient in
        select tp.user_id
        from public.trip_participants tp
        where tp.trip_id =
          new.trip_id
      loop
        perform private.create_notification(
          v_recipient.user_id,
          new.trip_id,
          'suggestion_new',
          'New suggestion',
          v_actor_name ||
            ' suggested "' ||
            new.title ||
            '".',
          v_href,
          v_activity_id,
          'new-suggestion:' ||
            new.id::text
        );
      end loop;

    else
      perform private.record_trip_activity(
        new.trip_id,
        'itinerary',
        'itinerary_item_created',
        'itinerary_item',
        new.id,
        'added to the itinerary',
        new.title,
        null,
        '/trips/' ||
          new.trip_id::text ||
          '/itinerary'
      );
    end if;


    return new;
  end if;


  -- Suggestion decision changed.
  if new.origin = 'suggestion'
     and new.planning_status
       is distinct from
       old.planning_status
  then
    case new.planning_status
      when 'planned' then
        v_action :=
          'accepted a suggestion';

        v_notification_title :=
          'Suggestion accepted';

        v_notification_message :=
          v_actor_name ||
          ' accepted "' ||
          new.title ||
          '" into the itinerary.';

        v_href :=
          '/trips/' ||
          new.trip_id::text ||
          '/itinerary';


      when 'rejected' then
        v_action :=
          'rejected a suggestion';

        v_notification_title :=
          'Suggestion rejected';

        v_notification_message :=
          v_actor_name ||
          ' rejected "' ||
          new.title ||
          '".';

        v_href :=
          '/trips/' ||
          new.trip_id::text ||
          '/voting#item-' ||
          new.id::text;


      when 'archived' then
        v_action :=
          'archived a suggestion';

        v_notification_title :=
          'Suggestion archived';

        v_notification_message :=
          v_actor_name ||
          ' archived "' ||
          new.title ||
          '".';

        v_href :=
          '/trips/' ||
          new.trip_id::text ||
          '/voting#item-' ||
          new.id::text;


      when 'suggested' then
        v_action :=
          'restored a suggestion to voting';

        v_notification_title :=
          'Suggestion restored';

        v_notification_message :=
          v_actor_name ||
          ' restored "' ||
          new.title ||
          '" to voting.';

        v_href :=
          '/trips/' ||
          new.trip_id::text ||
          '/voting#item-' ||
          new.id::text;


      else
        v_action :=
          'updated a suggestion';

        v_notification_title :=
          'Suggestion updated';

        v_notification_message :=
          v_actor_name ||
          ' updated "' ||
          new.title ||
          '".';

        v_href :=
          '/trips/' ||
          new.trip_id::text ||
          '/voting#item-' ||
          new.id::text;
    end case;


    v_activity_id :=
      private.record_trip_activity(
        new.trip_id,
        case
          when new.planning_status = 'planned'
            then 'itinerary'
          else 'voting'
        end,
        'suggestion_' ||
          new.planning_status,
        'itinerary_item',
        new.id,
        v_action,
        new.title,
        null,
        v_href
      );


    -- Notify the suggester and everyone who
    -- participated in voting on the suggestion.
    for v_recipient in
      select distinct recipient_id
      from (
        select
          new.created_by
            as recipient_id

        union

        select v.user_id
        from public.itinerary_votes v
        where v.item_id =
          new.id
      ) recipients
      where recipient_id
        is not null
    loop
      perform private.create_notification(
        v_recipient.recipient_id,
        new.trip_id,
        'suggestion_' ||
          new.planning_status,
        v_notification_title,
        v_notification_message,
        v_href,
        v_activity_id
      );
    end loop;


    return new;
  end if;


  -- Confirmed itinerary item moved to another day.
  if new.planning_status = 'planned'
     and (
       new.scheduled_date
         is distinct from
         old.scheduled_date

       or new.departure_date
         is distinct from
         old.departure_date

       or new.check_in_date
         is distinct from
         old.check_in_date
     )
  then
    perform private.record_trip_activity(
      new.trip_id,
      'itinerary',
      'itinerary_item_moved',
      'itinerary_item',
      new.id,
      'moved an itinerary item',
      new.title,
      null,
      '/trips/' ||
        new.trip_id::text ||
        '/itinerary'
    );
  end if;


  return new;
end;
$$;


revoke all
on function private.capture_itinerary_activity()
from public;


create trigger capture_itinerary_activity
after insert or update
on public.itinerary_items
for each row
execute function private.capture_itinerary_activity();


-- =========================================================
-- VOTING ACTIVITY
-- =========================================================

create or replace function private.capture_itinerary_vote_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_title text;
begin
  if tg_op = 'UPDATE'
     and new.reaction
       is not distinct from
       old.reaction
     and new.preferred_date
       is not distinct from
       old.preferred_date
  then
    return new;
  end if;


  select
    i.trip_id,
    i.title
  into
    v_trip_id,
    v_title
  from public.itinerary_items i
  where i.id =
    new.item_id;


  if v_trip_id is null then
    return new;
  end if;


  perform private.record_trip_activity(
    v_trip_id,
    'voting',
    case
      when tg_op = 'INSERT'
        then 'vote_created'
      else 'vote_updated'
    end,
    'itinerary_vote',
    new.item_id,
    case
      when tg_op = 'INSERT'
        then 'voted on'
      else 'updated a vote on'
    end,
    v_title,
    null,
    '/trips/' ||
      v_trip_id::text ||
      '/voting#item-' ||
      new.item_id::text
  );


  return new;
end;
$$;


revoke all
on function private.capture_itinerary_vote_activity()
from public;


create trigger capture_itinerary_vote_activity
after insert or update
on public.itinerary_votes
for each row
execute function private.capture_itinerary_vote_activity();


-- =========================================================
-- SAVED PLACE ACTIVITY
-- =========================================================

create or replace function private.capture_saved_place_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_trip_activity(
    new.trip_id,
    'places',
    'place_saved',
    'saved_place',
    new.id,
    'saved a place',
    new.name,
    null,
    '/trips/' ||
      new.trip_id::text ||
      '/places#place-' ||
      new.id::text
  );

  return new;
end;
$$;


revoke all
on function private.capture_saved_place_activity()
from public;


create trigger capture_saved_place_activity
after insert
on public.saved_places
for each row
execute function private.capture_saved_place_activity();


-- =========================================================
-- EXPENSE ACTIVITY
-- =========================================================

create or replace function private.capture_expense_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_trip_activity(
    new.trip_id,
    'expenses',
    'expense_created',
    'expense',
    new.id,
    'added an expense',
    new.title,
    new.currency ||
      ' ' ||
      new.amount::text,
    '/trips/' ||
      new.trip_id::text ||
      '/expenses'
  );

  return new;
end;
$$;


revoke all
on function private.capture_expense_activity()
from public;


create trigger capture_expense_activity
after insert
on public.expenses
for each row
execute function private.capture_expense_activity();


-- Notify each user when an expense split
-- involving them is first created.
create or replace function private.capture_expense_split_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_title text;
  v_currency text;
  v_actor_name text;
begin
  select
    e.trip_id,
    e.title,
    e.currency
  into
    v_trip_id,
    v_title,
    v_currency
  from public.expenses e
  where e.id =
    new.expense_id;


  if v_trip_id is null then
    return new;
  end if;


  v_actor_name :=
    private.current_actor_display_name();


  perform private.create_notification(
    new.user_id,
    v_trip_id,
    'expense_share',
    'Expense involving you',
    v_actor_name ||
      ' added you to "' ||
      v_title ||
      '" with a share of ' ||
      v_currency ||
      ' ' ||
      new.amount::text ||
      '.',
    '/trips/' ||
      v_trip_id::text ||
      '/expenses',
    null,
    'expense-share:' ||
      new.expense_id::text ||
      ':' ||
      new.user_id::text
  );


  return new;
end;
$$;


revoke all
on function private.capture_expense_split_notification()
from public;


create trigger capture_expense_split_notification
after insert
on public.expense_splits
for each row
execute function private.capture_expense_split_notification();


-- =========================================================
-- SETTLEMENT ACTIVITY + NOTIFICATIONS
-- =========================================================

create or replace function private.capture_expense_settlement_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_actor_name text;
begin
  v_actor_name :=
    private.current_actor_display_name();


  v_activity_id :=
    private.record_trip_activity(
      new.trip_id,
      'expenses',
      'settlement_created',
      'expense_settlement',
      new.id,
      'recorded a settlement',
      new.currency ||
        ' ' ||
        new.amount::text,
      null,
      '/trips/' ||
        new.trip_id::text ||
        '/expenses'
    );


  perform private.create_notification(
    new.from_user_id,
    new.trip_id,
    'expense_settlement',
    'Settlement recorded',
    v_actor_name ||
      ' recorded a settlement of ' ||
      new.currency ||
      ' ' ||
      new.amount::text ||
      ' involving you.',
    '/trips/' ||
      new.trip_id::text ||
      '/expenses',
    v_activity_id
  );


  perform private.create_notification(
    new.to_user_id,
    new.trip_id,
    'expense_settlement',
    'Settlement recorded',
    v_actor_name ||
      ' recorded a settlement of ' ||
      new.currency ||
      ' ' ||
      new.amount::text ||
      ' involving you.',
    '/trips/' ||
      new.trip_id::text ||
      '/expenses',
    v_activity_id
  );


  return new;
end;
$$;


revoke all
on function private.capture_expense_settlement_activity()
from public;


create trigger capture_expense_settlement_activity
after insert
on public.expense_settlements
for each row
execute function private.capture_expense_settlement_activity();


-- =========================================================
-- SHARED PACKING ACTIVITY + NOTIFICATIONS
-- =========================================================

create or replace function private.capture_shared_packing_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_actor_name text;
begin
  -- Never expose personal or required packing activity.
  if new.scope <> 'shared' then
    return new;
  end if;


  v_actor_name :=
    private.current_actor_display_name();


  if tg_op = 'INSERT' then
    v_activity_id :=
      private.record_trip_activity(
        new.trip_id,
        'packing',
        'shared_packing_created',
        'packing_item',
        new.id,
        'added a shared packing item',
        new.name,
        null,
        '/trips/' ||
          new.trip_id::text ||
          '/packing'
      );


    if new.assigned_to is not null then
      perform private.create_notification(
        new.assigned_to,
        new.trip_id,
        'packing_assigned',
        'Packing responsibility',
        v_actor_name ||
          ' assigned you "' ||
          new.name ||
          '" on the shared packing list.',
        '/trips/' ||
          new.trip_id::text ||
          '/packing',
        v_activity_id
      );
    end if;


    return new;
  end if;


  -- Assignment changed.
  if new.assigned_to
     is distinct from
     old.assigned_to
  then
    v_activity_id :=
      private.record_trip_activity(
        new.trip_id,
        'packing',
        case
          when new.assigned_to is null
            then 'packing_released'
          else 'packing_assigned'
        end,
        'packing_item',
        new.id,
        case
          when new.assigned_to is null
            then 'released a shared packing responsibility'
          else 'assigned a shared packing responsibility'
        end,
        new.name,
        null,
        '/trips/' ||
          new.trip_id::text ||
          '/packing'
      );


    if new.assigned_to is not null then
      perform private.create_notification(
        new.assigned_to,
        new.trip_id,
        'packing_assigned',
        'Packing responsibility',
        v_actor_name ||
          ' assigned you "' ||
          new.name ||
          '" on the shared packing list.',
        '/trips/' ||
          new.trip_id::text ||
          '/packing',
        v_activity_id
      );
    end if;


    if old.assigned_to is not null
       and old.assigned_to
         is distinct from
         new.assigned_to
    then
      perform private.create_notification(
        old.assigned_to,
        new.trip_id,
        'packing_assignment_removed',
        'Packing responsibility changed',
        '"' ||
          new.name ||
          '" is no longer assigned to you.',
        '/trips/' ||
          new.trip_id::text ||
          '/packing',
        v_activity_id
      );
    end if;
  end if;


  -- Packed/unpacked state changed.
  if new.is_packed
     is distinct from
     old.is_packed
  then
    perform private.record_trip_activity(
      new.trip_id,
      'packing',
      case
        when new.is_packed
          then 'shared_packing_completed'
        else 'shared_packing_reopened'
      end,
      'packing_item',
      new.id,
      case
        when new.is_packed
          then 'marked a shared packing item as packed'
        else 'marked a shared packing item as not packed'
      end,
      new.name,
      null,
      '/trips/' ||
        new.trip_id::text ||
        '/packing'
    );
  end if;


  return new;
end;
$$;


revoke all
on function private.capture_shared_packing_activity()
from public;


create trigger capture_shared_packing_activity
after insert or update
on public.packing_items
for each row
execute function private.capture_shared_packing_activity();


-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname =
      'supabase_realtime'
      and schemaname =
        'public'
      and tablename =
        'trip_activity'
  ) then
    alter publication supabase_realtime
    add table public.trip_activity;
  end if;


  if not exists (
    select 1
    from pg_publication_tables
    where pubname =
      'supabase_realtime'
      and schemaname =
        'public'
      and tablename =
        'notifications'
  ) then
    alter publication supabase_realtime
    add table public.notifications;
  end if;
end
$$;