-- =========================================================
-- VOTING DISCUSSIONS
-- =========================================================

create table public.suggestion_comments (
  id uuid primary key
    default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  item_id uuid not null,

  author_user_id uuid not null,

  content text not null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint suggestion_comments_item_id_fkey
    foreign key (item_id)
    references public.itinerary_items(id)
    on delete cascade,

  constraint suggestion_comments_author_user_id_fkey
    foreign key (author_user_id)
    references public.profiles(id)
    on delete cascade,

  constraint suggestion_comments_content_check
    check (
      char_length(
        btrim(content)
      ) between 1 and 2000
    )
);


-- =========================================================
-- INDEXES
-- =========================================================

create index suggestion_comments_item_created_idx
on public.suggestion_comments (
  item_id,
  created_at
);


create index suggestion_comments_trip_created_idx
on public.suggestion_comments (
  trip_id,
  created_at desc
);


create index suggestion_comments_author_idx
on public.suggestion_comments (
  author_user_id
);


-- =========================================================
-- COMMENT VALIDATION
-- =========================================================

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
begin
  -- Store comments without accidental leading
  -- or trailing whitespace.
  new.content :=
    btrim(new.content);


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
    on t.id = i.trip_id
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
  -- suggestion is open for voting.
  if v_item_status <>
    'suggested'
  then
    raise exception
      using
        errcode = 'P0001',
        message =
          'SUGGESTION_DISCUSSION_CLOSED';
  end if;


  if tg_op =
    'UPDATE'
  then
    -- Comment identity cannot be moved to a
    -- different trip, suggestion or author.
    if new.trip_id
         is distinct from
         old.trip_id
       or new.item_id
         is distinct from
         old.item_id
       or new.author_user_id
         is distinct from
         old.author_user_id
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


create trigger prepare_suggestion_comment
before insert or update
on public.suggestion_comments
for each row
execute function private.prepare_suggestion_comment();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.suggestion_comments
enable row level security;


-- Anyone who can see the suggestion can see
-- its discussion, including historical discussions.
create policy "Users can view suggestion comments"
on public.suggestion_comments
for select
to authenticated
using (
  private.can_view_itinerary_item(
    item_id
  )
);


-- Posting follows the same eligibility rules
-- as voting on an open suggestion.
create policy "Users can create suggestion comments"
on public.suggestion_comments
for insert
to authenticated
with check (
  author_user_id = (
    select auth.uid()
  )
  and private.can_vote_itinerary_item(
    item_id
  )
);


-- Users control their own comments while the
-- suggestion remains open for voting.
create policy "Users can update own suggestion comments"
on public.suggestion_comments
for update
to authenticated
using (
  author_user_id = (
    select auth.uid()
  )
  and private.can_vote_itinerary_item(
    item_id
  )
)
with check (
  author_user_id = (
    select auth.uid()
  )
  and private.can_vote_itinerary_item(
    item_id
  )
);


create policy "Users can delete own suggestion comments"
on public.suggestion_comments
for delete
to authenticated
using (
  author_user_id = (
    select auth.uid()
  )
  and private.can_vote_itinerary_item(
    item_id
  )
);


-- =========================================================
-- COLUMN PERMISSIONS
-- =========================================================

revoke all
on public.suggestion_comments
from anon, authenticated;


grant select, delete
on public.suggestion_comments
to authenticated;


grant insert (
  trip_id,
  item_id,
  author_user_id,
  content
)
on public.suggestion_comments
to authenticated;


-- Only the body of an existing comment may
-- be directly updated by a normal user.
grant update (
  content
)
on public.suggestion_comments
to authenticated;


grant all
on public.suggestion_comments
to service_role;


-- =========================================================
-- ACTIVITY + NOTIFICATIONS
-- =========================================================

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


  v_href :=
    '/trips/' ||
    new.trip_id::text ||
    '/voting#item-' ||
    new.item_id::text;


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
      'suggestion_comment_created',
      'suggestion_comment',
      new.id,
      'commented on',
      v_item_title,
      v_detail,
      v_href
    );


  -- Notify the suggestion creator.
  -- private.create_notification() already
  -- prevents self-notifications.
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


create trigger capture_suggestion_comment_activity
after insert
on public.suggestion_comments
for each row
execute function private.capture_suggestion_comment_activity();


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
        'suggestion_comments'
  )
  then
    alter publication supabase_realtime
    add table public.suggestion_comments;
  end if;
end
$$;