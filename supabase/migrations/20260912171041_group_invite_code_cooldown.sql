-- =========================================================
-- GROUP INVITE CODE REGENERATION COOLDOWN
-- =========================================================
-- A group's invite code may be regenerated at most once
-- every 24 hours.
--
-- The cooldown is stored in the private schema so browser
-- clients cannot alter the timestamp to bypass the limit.
-- =========================================================


-- ---------------------------------------------------------
-- PRIVATE COOLDOWN STATE
-- ---------------------------------------------------------

create table if not exists private.group_invite_code_regeneration_limits (
  group_id uuid primary key
    references public.groups(id)
    on delete cascade,

  last_regenerated_at timestamptz not null
);


-- Browser-facing roles must never be able to manipulate
-- the cooldown directly.

revoke all
on table private.group_invite_code_regeneration_limits
from public, anon, authenticated;


-- ---------------------------------------------------------
-- REGENERATE INVITE CODE
-- ---------------------------------------------------------

create or replace function private.regenerate_group_code_impl(
  target_group_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_role text;

  locked_group_id uuid;

  last_regenerated_at timestamptz;
  regenerated_at timestamptz;

  new_code text;
begin
  caller_id :=
    auth.uid();


  if caller_id is null then
    raise exception
      'You must be signed in';
  end if;


  -- Only the current Owner or an Admin may regenerate.
  select gm.role
  into caller_role
  from public.group_members gm
  where gm.group_id =
    target_group_id
    and gm.user_id =
      caller_id;


  if caller_role is null
    or caller_role not in (
      'owner',
      'admin'
    )
  then
    raise exception
      'You do not have permission to regenerate the invite code';
  end if;


  -- Lock the group row so two managers cannot regenerate
  -- simultaneously and both pass the cooldown check.
  select g.id
  into locked_group_id
  from public.groups g
  where g.id =
    target_group_id
  for update;


  if locked_group_id is null then
    raise exception
      'Group not found';
  end if;


  select r.last_regenerated_at
  into last_regenerated_at
  from private.group_invite_code_regeneration_limits r
  where r.group_id =
    target_group_id;


  -- Use a rolling 24-hour window.
  if last_regenerated_at is not null
    and clock_timestamp() <
      last_regenerated_at +
      interval '24 hours'
  then
    raise exception
    using
      errcode =
        'P0001',

      message =
        'GROUP_CODE_REGENERATION_COOLDOWN',

      detail =
        'Invite codes can only be regenerated once every 24 hours.';
  end if;


  regenerated_at :=
    clock_timestamp();


  new_code :=
    private.generate_group_code();


  update public.groups
  set
    group_code =
      new_code,

    updated_at =
      regenerated_at
  where id =
    target_group_id;


  insert into private.group_invite_code_regeneration_limits (
    group_id,
    last_regenerated_at
  )
  values (
    target_group_id,
    regenerated_at
  )
  on conflict (
    group_id
  )
  do update set
    last_regenerated_at =
      excluded.last_regenerated_at;


  return new_code;
end;
$$;


-- Preserve the existing permission model.

revoke all
on function private.regenerate_group_code_impl(uuid)
from public;


grant execute
on function private.regenerate_group_code_impl(uuid)
to authenticated;


revoke all
on function public.regenerate_group_code(uuid)
from public;


grant execute
on function public.regenerate_group_code(uuid)
to authenticated;