create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allow authenticated users to read profiles.
-- RLS below still determines which rows can be accessed.
grant select on public.profiles to authenticated;

-- Allow users to update profiles.
-- RLS ensures they can only update their own.
grant update on public.profiles to authenticated;

-- Service role retains full access.
grant select, insert, update, delete
on public.profiles
to service_role;

alter table public.profiles enable row level security;


-- Any logged-in user can see profiles.
-- This will eventually allow people in groups/trips to see each other.
create policy "Authenticated users can view profiles"
on public.profiles
for select
to authenticated
using (true);


-- A user may only edit their own profile.
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) = id
)
with check (
  (select auth.uid()) = id
);


-- Automatically create a profile whenever
-- Supabase Auth creates a new user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    display_name
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      'Traveller'
    )
  );

  return new;
end;
$$;


create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();


-- Create profiles for users that already existed
-- before we added the trigger.
insert into public.profiles (
  id,
  display_name
)
select
  id,
  coalesce(
    nullif(raw_user_meta_data ->> 'display_name', ''),
    'Traveller'
  )
from auth.users
on conflict (id) do nothing;