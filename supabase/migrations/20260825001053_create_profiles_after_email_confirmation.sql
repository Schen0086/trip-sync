-- =========================================================
-- CREATE PROFILES ONLY FOR CONFIRMED AUTH USERS
-- =========================================================

-- The original trigger created public.profiles immediately
-- when auth.users was created, even before email confirmation.
drop trigger if exists
  on_auth_user_created
on auth.users;


-- Reuse the existing function name so the migration history
-- remains straightforward.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Do not create an application profile until the
  -- user's email address has actually been confirmed.
  if new.email_confirmed_at is null then
    return new;
  end if;

  insert into public.profiles (
    id,
    display_name
  )
  values (
    new.id,

    coalesce(
      nullif(
        trim(
          new.raw_user_meta_data
            ->> 'display_name'
        ),
        ''
      ),
      'Traveller'
    )
  )
  on conflict (id)
  do nothing;

  return new;
end;
$$;


-- Handles users that are already confirmed at creation time,
-- for example if confirmation is ever disabled or an admin
-- creates a confirmed account.
create trigger on_auth_user_created
after insert
on auth.users
for each row
execute function public.handle_new_user();


-- Normal email signups are inserted unconfirmed first.
-- Create their TripSync profile when confirmation completes.
create trigger on_auth_user_email_confirmed
after update of email_confirmed_at
on auth.users
for each row
when (
  old.email_confirmed_at is null
  and
  new.email_confirmed_at is not null
)
execute function public.handle_new_user();


-- Ensure every existing confirmed Auth user has a profile.
insert into public.profiles (
  id,
  display_name
)
select
  u.id,

  coalesce(
    nullif(
      trim(
        u.raw_user_meta_data
          ->> 'display_name'
      ),
      ''
    ),
    'Traveller'
  )
from auth.users u
where
  u.email_confirmed_at
    is not null
on conflict (id)
do nothing;