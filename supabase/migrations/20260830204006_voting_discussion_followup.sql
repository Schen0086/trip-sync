-- =========================================================
-- VOTING DISCUSSION FOLLOW-UP
-- =========================================================
-- Adds:
-- - One-level replies
-- - Per-user discussion read state
-- - Reply notifications
-- - Exact discussion/comment deep links
-- =========================================================


-- ---------------------------------------------------------
-- ONE-LEVEL REPLIES
-- ---------------------------------------------------------

alter table public.suggestion_comments
add column parent_comment_id uuid;


alter table public.suggestion_comments
add constraint suggestion_comments_parent_comment_id_fkey
foreign key (
  parent_comment_id
)
references public.suggestion_comments(id)
on delete restrict;


alter table public.suggestion_comments
add constraint suggestion_comments_parent_not_self_check
check (
  parent_comment_id is null
  or parent_comment_id <> id
);


create index suggestion_comments_parent_created_idx
on public.suggestion_comments (
  parent_comment_id,
  created_at
)
where parent_comment_id is not null;


-- Existing insert privileges are column-specific,
-- so explicitly allow the new reply field.
grant insert (
  parent_comment_id
)
on public.suggestion_comments
to authenticated;


-- ---------------------------------------------------------
-- COMMENT VALIDATION
-- ---------------------------------------------------------
-- Extend the existing trigger validation so replies:
-- - belong to the same trip
-- - belong to the same suggestion
-- - can only reply to a top-level comment
-- - cannot be moved after creation

create or replace function private.prepare_suggestion_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_trip_id uuid;
  v_item_origin text;
  v_item_status text;
  v_trip_type text;

  v_parent_trip_id uuid;
  v_parent_item_id uuid;
  v_parent_parent_id uuid;
begin
  -- Store comments without accidental leading
  -- or trailing whitespace.
  new.content :=
    btrim(
      new.content
    );


  if char_length(
    new.content
  ) < 1
  or char_length(
    new.content
  ) > 2000
  then
    raise exception
    using
      errcode = 'P0001',
      message =
        'COMMENT_CONTENT_INVALID';
  end if;


  -- The comment must belong to a real suggestion
  -- on the same group trip.
  select
    i.trip_id,
    i.origin,
    i.planning_status,
    t.trip_type
  into
    v_item_trip_id,
    v_item_origin,
    v_item_status,
    v_trip_type
  from public.itinerary_items i
  join public.trips t
    on t.id =
      i.trip_id
  where i.id =
    new.item_id;


  if not found
  or v_item_trip_id
    is distinct from
    new.trip_id
  or v_item_origin <>
    'suggestion'
  or v_trip_type <>
    'group'
  then
    raise exception
    using
      errcode = 'P0001',
      message =
        'INVALID_SUGGESTION_DISCUSSION';
  end if;


  -- Discussions can only be changed while the
  -- suggestion remains open for voting.
  if v_item_status <>
    'suggested'
  then
    raise exception
    using
      errcode = 'P0001',
      message =
        'SUGGESTION_DISCUSSION_CLOSED';
  end if;


  -- Validate replies.
  if new.parent_comment_id
    is not null
  then
    if new.parent_comment_id =
      new.id
    then
      raise exception
      using
        errcode = 'P0001',
        message =
          'INVALID_SUGGESTION_REPLY';
    end if;


    select
      c.trip_id,
      c.item_id,
      c.parent_comment_id
    into
      v_parent_trip_id,
      v_parent_item_id,
      v_parent_parent_id
    from public.suggestion_comments c
    where c.id =
      new.parent_comment_id;


    if not found
    or v_parent_trip_id
      is distinct from
      new.trip_id
    or v_parent_item_id
      is distinct from
      new.item_id
    then
      raise exception
      using
        errcode = 'P0001',
        message =
          'INVALID_SUGGESTION_REPLY';
    end if;


    -- One reply level only.
    if v_parent_parent_id
      is not null
    then
      raise exception
      using
        errcode = 'P0001',
        message =
          'SUGGESTION_REPLY_DEPTH_EXCEEDED';
    end if;
  end if;


  if tg_op =
    'UPDATE'
  then
    -- Comment identity cannot be moved to a
    -- different trip, suggestion, author or thread.
    if new.trip_id
      is distinct from
      old.trip_id
    or new.item_id
      is distinct from
      old.item_id
    or new.author_user_id
      is distinct from
      old.author_user_id
    or new.parent_comment_id
      is distinct from
      old.parent_comment_id
    then
      raise exception
      using
        errcode = 'P0001',
        message =
          'COMMENT_IDENTITY_IMMUTABLE';
    end if;


    new.updated_at :=
      now();
  end if;


  return new;
end;
$$;


revoke all
on function private.prepare_suggestion_comment()
from public;


-- ---------------------------------------------------------
-- DISCUSSION READ STATE
-- ---------------------------------------------------------

create table public.suggestion_discussion_reads (
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  item_id uuid not null
    references public.itinerary_items(id)
    on delete cascade,

  last_read_at timestamptz not null
    default now(),

  primary key (
    user_id,
    item_id
  )
);


create index suggestion_discussion_reads_trip_user_idx
on public.suggestion_discussion_reads (
  trip_id,
  user_id
);


alter table public.suggestion_discussion_reads
enable row level security;


create policy
  "Users can view own discussion read state"
on public.suggestion_discussion_reads
for select
to authenticated
using (
  user_id = (
    select auth.uid()
  )

  and private.can_view_itinerary_item(
    item_id
  )
);


revoke all
on public.suggestion_discussion_reads
from anon, authenticated;


grant select
on public.suggestion_discussion_reads
to authenticated;


grant all
on public.suggestion_discussion_reads
to service_role;


-- ---------------------------------------------------------
-- MARK DISCUSSION READ RPC
-- ---------------------------------------------------------
-- Writes remain database-managed so users cannot manually
-- create read-state rows for other accounts.

create or replace function public.mark_suggestion_discussion_read(
  target_trip_id uuid,
  target_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id :=
    auth.uid();


  if current_user_id
    is null
  then
    raise exception
      'You must be signed in';
  end if;


  if not exists (
    select 1
    from public.itinerary_items i
    where i.id =
      target_item_id

      and i.trip_id =
        target_trip_id

      and i.origin =
        'suggestion'
  )
  then
    raise exception
      'Suggestion not found';
  end if;


  if not private.can_view_itinerary_item(
    target_item_id
  )
  then
    raise exception
      'You do not have access to this discussion';
  end if;


  insert into public.suggestion_discussion_reads (
    user_id,
    trip_id,
    item_id,
    last_read_at
  )
  values (
    current_user_id,
    target_trip_id,
    target_item_id,
    clock_timestamp()
  )
  on conflict (
    user_id,
    item_id
  )
  do update set
    trip_id =
      excluded.trip_id,

    last_read_at =
      excluded.last_read_at;
end;
$$;


revoke all
on function public.mark_suggestion_discussion_read(
  uuid,
  uuid
)
from public;


grant execute
on function public.mark_suggestion_discussion_read(
  uuid,
  uuid
)
to authenticated;


-- ---------------------------------------------------------
-- INITIAL READ BASELINE
-- ---------------------------------------------------------
-- Existing discussions should not suddenly appear as unread
-- for everyone after this feature is deployed.

with suggestion_items as (
  select
    i.id as item_id,
    i.trip_id,
    t.owner_id,
    t.group_id
  from public.itinerary_items i
  join public.trips t
    on t.id =
      i.trip_id
  where i.origin =
    'suggestion'
),

reader_candidates as (
  -- Trip creators.
  select
    si.owner_id as user_id,
    si.trip_id,
    si.item_id
  from suggestion_items si
  where si.owner_id
    is not null


  union


  -- Actual trip participants.
  select
    tp.user_id,
    si.trip_id,
    si.item_id
  from suggestion_items si
  join public.trip_participants tp
    on tp.trip_id =
      si.trip_id


  union


  -- Group members who can view group-trip planning.
  select
    gm.user_id,
    si.trip_id,
    si.item_id
  from suggestion_items si
  join public.group_members gm
    on gm.group_id =
      si.group_id
  where si.group_id
    is not null
)

insert into public.suggestion_discussion_reads (
  user_id,
  trip_id,
  item_id,
  last_read_at
)
select distinct
  rc.user_id,
  rc.trip_id,
  rc.item_id,
  now()
from reader_candidates rc
where rc.user_id
  is not null
on conflict (
  user_id,
  item_id
)
do nothing;


-- ---------------------------------------------------------
-- ACTIVITY + REPLY NOTIFICATIONS
-- ---------------------------------------------------------

create or replace function private.capture_suggestion_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_actor_name text;

  v_item_title text;
  v_suggestion_creator_id uuid;

  v_parent_author_id uuid;

  v_href text;
  v_detail text;
begin
  select
    i.title,
    i.created_by
  into
    v_item_title,
    v_suggestion_creator_id
  from public.itinerary_items i
  where i.id =
    new.item_id

    and i.trip_id =
      new.trip_id

    and i.origin =
      'suggestion';


  if not found then
    return new;
  end if;


  v_actor_name :=
    private.current_actor_display_name();


  -- Deep-link directly to the relevant discussion
  -- and exact comment/reply.
  v_href :=
    '/trips/' ||
    new.trip_id::text ||
    '/voting?discussion=' ||
    new.item_id::text ||
    '#comment-' ||
    new.id::text;


  -- Keep Activity Feed previews compact.
  v_detail :=
    case
      when char_length(
        new.content
      ) > 160
      then
        left(
          new.content,
          157
        ) || '...'

      else
        new.content
    end;


  v_activity_id :=
    private.record_trip_activity(
      new.trip_id,
      'voting',

      case
        when new.parent_comment_id
          is null
        then
          'suggestion_comment_created'

        else
          'suggestion_reply_created'
      end,

      'suggestion_comment',
      new.id,

      case
        when new.parent_comment_id
          is null
        then
          'commented on'

        else
          'replied in'
      end,

      v_item_title,
      v_detail,
      v_href
    );


  -- -------------------------------------------------------
  -- Reply
  -- -------------------------------------------------------
  if new.parent_comment_id
    is not null
  then
    select
      c.author_user_id
    into
      v_parent_author_id
    from public.suggestion_comments c
    where c.id =
      new.parent_comment_id;


    -- Directly notify the person whose comment
    -- received the reply.
    perform private.create_notification(
      v_parent_author_id,
      new.trip_id,
      'suggestion_reply',
      'New reply',

      v_actor_name ||
      ' replied to your comment on "' ||
      v_item_title ||
      '".',

      v_href,
      v_activity_id,
      null
    );


    -- Preserve the existing behaviour where the
    -- suggestion creator follows the discussion,
    -- unless they already received the reply alert.
    if v_suggestion_creator_id
      is distinct from
      v_parent_author_id
    then
      perform private.create_notification(
        v_suggestion_creator_id,
        new.trip_id,
        'suggestion_comment',
        'New discussion comment',

        v_actor_name ||
        ' replied in the discussion for "' ||
        v_item_title ||
        '".',

        v_href,
        v_activity_id,
        null
      );
    end if;


    return new;
  end if;


  -- -------------------------------------------------------
  -- Top-level comment
  -- -------------------------------------------------------
  -- private.create_notification() already prevents
  -- self-notifications.
  perform private.create_notification(
    v_suggestion_creator_id,
    new.trip_id,
    'suggestion_comment',
    'New discussion comment',

    v_actor_name ||
    ' commented on "' ||
    v_item_title ||
    '".',

    v_href,
    v_activity_id,
    null
  );


  return new;
end;
$$;


revoke all
on function private.capture_suggestion_comment_activity()
from public;