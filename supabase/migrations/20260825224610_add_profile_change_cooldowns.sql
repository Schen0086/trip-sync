-- =========================================================
-- PROFILE IDENTITY CHANGE COOLDOWNS
-- =========================================================

-- Each identity field gets its own independent
-- seven-day cooldown.
alter table public.profiles
add column if not exists
  display_name_changed_at timestamptz,
add column if not exists
  username_changed_at timestamptz,
add column if not exists
  email_change_requested_at timestamptz;


-- =========================================================
-- DISPLAY NAME + USERNAME DATABASE ENFORCEMENT
-- =========================================================

create or replace function private.enforce_profile_identity_cooldowns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Display name
  if new.display_name
     is distinct from
     old.display_name
  then
    if old.display_name_changed_at is not null
       and clock_timestamp() <
         old.display_name_changed_at +
         interval '7 days'
    then
      raise exception
        using
          errcode = 'P0001',
          message =
            'DISPLAY_NAME_CHANGE_COOLDOWN';
    end if;

    new.display_name_changed_at :=
      clock_timestamp();
  end if;


  -- Username
  if new.username
     is distinct from
     old.username
  then
    if old.username_changed_at is not null
       and clock_timestamp() <
         old.username_changed_at +
         interval '7 days'
    then
      raise exception
        using
          errcode = 'P0001',
          message =
            'USERNAME_CHANGE_COOLDOWN';
    end if;

    new.username_changed_at :=
      clock_timestamp();
  end if;


  return new;
end;
$$;


revoke all
on function private.enforce_profile_identity_cooldowns()
from public;


drop trigger if exists
  enforce_profile_identity_cooldowns
on public.profiles;


create trigger enforce_profile_identity_cooldowns
before update
on public.profiles
for each row
execute function private.enforce_profile_identity_cooldowns();


-- =========================================================
-- PROTECT COOLDOWN TIMESTAMPS
-- =========================================================

-- The original profiles table granted UPDATE on the whole
-- row to authenticated users. Replace that with explicit
-- column permissions so users cannot manually clear or
-- manipulate cooldown timestamps through the Data API.
revoke update
on table public.profiles
from authenticated;


grant update (
  display_name,
  username,
  avatar_url,
  theme_preference,
  updated_at
)
on table public.profiles
to authenticated;


-- =========================================================
-- EMAIL CHANGE COOLDOWN
-- =========================================================

-- Email itself lives in Supabase Auth rather than
-- public.profiles. This function securely records a
-- successful email-change request after Auth accepts it.
create or replace function public.mark_email_change_requested()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_previous_change timestamptz;
  v_now timestamptz;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception
      using
        errcode = 'P0001',
        message =
          'AUTHENTICATION_REQUIRED';
  end if;


  v_now :=
    clock_timestamp();


  -- Lock the current user's profile row while checking
  -- and recording the cooldown.
  select
    p.email_change_requested_at
  into
    v_previous_change
  from public.profiles p
  where p.id = v_user_id
  for update;


  if not found then
    raise exception
      using
        errcode = 'P0001',
        message =
          'PROFILE_NOT_FOUND';
  end if;


  if v_previous_change is not null
     and v_now <
       v_previous_change +
       interval '7 days'
  then
    raise exception
      using
        errcode = 'P0001',
        message =
          'EMAIL_CHANGE_COOLDOWN';
  end if;


  update public.profiles
  set
    email_change_requested_at =
      v_now
  where id = v_user_id;


  return
    v_now +
    interval '7 days';
end;
$$;


revoke all
on function public.mark_email_change_requested()
from public;


grant execute
on function public.mark_email_change_requested()
to authenticated;