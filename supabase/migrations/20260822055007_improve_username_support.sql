-- Remove old case-sensitive username constraint
alter table public.profiles
drop constraint if exists profiles_username_key;


-- Remove existing username format constraint
alter table public.profiles
drop constraint if exists profiles_username_format_check;


-- Remove existing case-insensitive username index
drop index if exists public.profiles_username_lower_unique;


-- Normalise existing usernames
update public.profiles
set username = lower(trim(username))
where username is not null;


-- Validate usernames
alter table public.profiles
add constraint profiles_username_format_check
check (
  username is null
  or (
    username = lower(username)
    and username ~ '^[a-z0-9_]{3,30}$'
  )
);


-- Make usernames case-insensitively unique
create unique index profiles_username_lower_unique
on public.profiles (lower(username))
where username is not null;