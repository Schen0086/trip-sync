-- =========================================================
-- EXPENSES + PACKING
-- =========================================================


-- =========================================================
-- ACTUAL TRIP ATTENDEE HELPER
-- =========================================================

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

grant execute
on function private.is_trip_attendee(uuid, uuid)
to authenticated;


-- =========================================================
-- EXPENSES
-- =========================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  paid_by uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null,

  amount numeric(12, 2) not null,

  currency text not null
    default 'EUR',

  category text not null
    default 'other',

  expense_date date,

  notes text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint expenses_title_check
    check (
      char_length(trim(title))
        between 1 and 160
    ),

  constraint expenses_amount_check
    check (
      amount > 0
    ),

  constraint expenses_currency_check
    check (
      currency ~ '^[A-Z]{3}$'
    ),

  constraint expenses_category_check
    check (
      category in (
        'accommodation',
        'transport',
        'food_drink',
        'activities',
        'shopping',
        'groceries',
        'fees',
        'other'
      )
    ),

  constraint expenses_notes_check
    check (
      notes is null
      or char_length(notes) <= 1500
    )
);


create index expenses_trip_id_idx
on public.expenses(trip_id);


create index expenses_paid_by_idx
on public.expenses(paid_by);


create index expenses_created_by_idx
on public.expenses(created_by);


-- =========================================================
-- EXPENSE SPLITS
-- =========================================================

create table public.expense_splits (
  expense_id uuid not null
    references public.expenses(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  amount numeric(12, 2) not null,

  primary key (
    expense_id,
    user_id
  ),

  constraint expense_splits_amount_check
    check (
      amount > 0
    )
);


create index expense_splits_user_id_idx
on public.expense_splits(user_id);


-- =========================================================
-- EXPENSE SETTLEMENTS
-- =========================================================

create table public.expense_settlements (
  id uuid primary key
    default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  from_user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  to_user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  amount numeric(12, 2) not null,

  currency text not null,

  note text,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  created_at timestamptz not null
    default now(),

  constraint expense_settlements_people_check
    check (
      from_user_id <> to_user_id
    ),

  constraint expense_settlements_amount_check
    check (
      amount > 0
    ),

  constraint expense_settlements_currency_check
    check (
      currency ~ '^[A-Z]{3}$'
    ),

  constraint expense_settlements_note_check
    check (
      note is null
      or char_length(note) <= 500
    )
);


create index expense_settlements_trip_id_idx
on public.expense_settlements(trip_id);


-- =========================================================
-- EXPENSE UPDATED_AT
-- =========================================================

create or replace function private.set_expense_updated_at()
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


create trigger set_expense_updated_at
before update
on public.expenses
for each row
execute function private.set_expense_updated_at();


-- =========================================================
-- EXPENSE RLS
-- =========================================================

alter table public.expenses
enable row level security;

alter table public.expense_splits
enable row level security;

alter table public.expense_settlements
enable row level security;


-- Reads happen normally through RLS.
-- Writes happen through validated RPC functions below.
revoke insert, update, delete
on public.expenses
from authenticated;

revoke insert, update, delete
on public.expense_splits
from authenticated;

revoke insert, update, delete
on public.expense_settlements
from authenticated;


grant select
on public.expenses
to authenticated;

grant select
on public.expense_splits
to authenticated;

grant select
on public.expense_settlements
to authenticated;


grant all
on public.expenses
to service_role;

grant all
on public.expense_splits
to service_role;

grant all
on public.expense_settlements
to service_role;


create policy "Users can view expenses"
on public.expenses
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


create policy "Users can view expense splits"
on public.expense_splits
for select
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_id
      and private.can_view_trip(
        e.trip_id
      )
  )
);


create policy "Users can view settlements"
on public.expense_settlements
for select
to authenticated
using (
  private.can_view_trip(trip_id)
);


-- =========================================================
-- CREATE EXPENSE RPC
-- =========================================================

create or replace function public.create_trip_expense(
  p_trip_id uuid,
  p_paid_by uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_category text,
  p_expense_date date,
  p_notes text,
  p_splits jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_expense_id uuid;

  split_total numeric;
  split_count integer;
  distinct_split_count integer;
begin
  current_user_id :=
    (select auth.uid());

  if current_user_id is null then
    raise exception
      'Authentication required';
  end if;

  if not private.can_view_trip(
    p_trip_id
  ) then
    raise exception
      'Trip not found';
  end if;

  if not (
    private.is_trip_creator(
      p_trip_id
    )
    or private.is_trip_attendee(
      p_trip_id,
      current_user_id
    )
  ) then
    raise exception
      'You must be attending this trip to add expenses';
  end if;

  if not private.is_trip_attendee(
    p_trip_id,
    p_paid_by
  ) then
    raise exception
      'Payer must be a trip traveller';
  end if;

  if p_amount <= 0 then
    raise exception
      'Expense amount must be greater than zero';
  end if;

  if jsonb_typeof(p_splits)
    <> 'array'
  then
    raise exception
      'Invalid expense splits';
  end if;

  if jsonb_array_length(
    p_splits
  ) = 0 then
    raise exception
      'At least one traveller must share the expense';
  end if;


  select
    count(*),
    count(distinct split.user_id),
    coalesce(
      sum(split.amount),
      0
    )
  into
    split_count,
    distinct_split_count,
    split_total
  from jsonb_to_recordset(
    p_splits
  )
  as split(
    user_id uuid,
    amount numeric
  );


  if split_count
    <> distinct_split_count
  then
    raise exception
      'A traveller cannot appear twice in an expense split';
  end if;


  if exists (
    select 1
    from jsonb_to_recordset(
      p_splits
    )
    as split(
      user_id uuid,
      amount numeric
    )
    where split.amount <= 0
  ) then
    raise exception
      'Split amounts must be greater than zero';
  end if;


  if exists (
    select 1
    from jsonb_to_recordset(
      p_splits
    )
    as split(
      user_id uuid,
      amount numeric
    )
    where not private.is_trip_attendee(
      p_trip_id,
      split.user_id
    )
  ) then
    raise exception
      'All split members must be trip travellers';
  end if;


  if round(
    split_total,
    2
  ) <> round(
    p_amount,
    2
  ) then
    raise exception
      'Expense splits must equal the expense total';
  end if;


  insert into public.expenses (
    trip_id,
    created_by,
    paid_by,
    title,
    amount,
    currency,
    category,
    expense_date,
    notes
  )
  values (
    p_trip_id,
    current_user_id,
    p_paid_by,
    trim(p_title),
    round(p_amount, 2),
    upper(p_currency),
    p_category,
    p_expense_date,
    nullif(
      trim(p_notes),
      ''
    )
  )
  returning id
  into new_expense_id;


  insert into public.expense_splits (
    expense_id,
    user_id,
    amount
  )
  select
    new_expense_id,
    split.user_id,
    round(
      split.amount,
      2
    )
  from jsonb_to_recordset(
    p_splits
  )
  as split(
    user_id uuid,
    amount numeric
  );


  return new_expense_id;
end;
$$;


-- =========================================================
-- UPDATE EXPENSE RPC
-- =========================================================

create or replace function public.update_trip_expense(
  p_trip_id uuid,
  p_expense_id uuid,
  p_paid_by uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_category text,
  p_expense_date date,
  p_notes text,
  p_splits jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  existing_creator uuid;

  split_total numeric;
  split_count integer;
  distinct_split_count integer;
begin
  current_user_id :=
    (select auth.uid());


  select e.created_by
  into existing_creator
  from public.expenses e
  where e.id = p_expense_id
    and e.trip_id = p_trip_id;


  if existing_creator is null then
    raise exception
      'Expense not found';
  end if;


  if not (
    existing_creator =
      current_user_id

    or private.is_trip_creator(
      p_trip_id
    )
  ) then
    raise exception
      'You cannot edit this expense';
  end if;


  if not private.is_trip_attendee(
    p_trip_id,
    p_paid_by
  ) then
    raise exception
      'Payer must be a trip traveller';
  end if;


  if p_amount <= 0 then
    raise exception
      'Expense amount must be greater than zero';
  end if;


  if jsonb_typeof(p_splits)
    <> 'array'
    or jsonb_array_length(
      p_splits
    ) = 0
  then
    raise exception
      'At least one traveller must share the expense';
  end if;


  select
    count(*),
    count(distinct split.user_id),
    coalesce(
      sum(split.amount),
      0
    )
  into
    split_count,
    distinct_split_count,
    split_total
  from jsonb_to_recordset(
    p_splits
  )
  as split(
    user_id uuid,
    amount numeric
  );


  if split_count
    <> distinct_split_count
  then
    raise exception
      'A traveller cannot appear twice in an expense split';
  end if;


  if exists (
    select 1
    from jsonb_to_recordset(
      p_splits
    )
    as split(
      user_id uuid,
      amount numeric
    )
    where split.amount <= 0
  ) then
    raise exception
      'Split amounts must be greater than zero';
  end if;


  if exists (
    select 1
    from jsonb_to_recordset(
      p_splits
    )
    as split(
      user_id uuid,
      amount numeric
    )
    where not private.is_trip_attendee(
      p_trip_id,
      split.user_id
    )
  ) then
    raise exception
      'All split members must be trip travellers';
  end if;


  if round(
    split_total,
    2
  ) <> round(
    p_amount,
    2
  ) then
    raise exception
      'Expense splits must equal the expense total';
  end if;


  update public.expenses
  set
    paid_by =
      p_paid_by,

    title =
      trim(p_title),

    amount =
      round(
        p_amount,
        2
      ),

    currency =
      upper(
        p_currency
      ),

    category =
      p_category,

    expense_date =
      p_expense_date,

    notes =
      nullif(
        trim(p_notes),
        ''
      )

  where id =
      p_expense_id
    and trip_id =
      p_trip_id;


  delete from public.expense_splits
  where expense_id =
    p_expense_id;


  insert into public.expense_splits (
    expense_id,
    user_id,
    amount
  )
  select
    p_expense_id,
    split.user_id,
    round(
      split.amount,
      2
    )
  from jsonb_to_recordset(
    p_splits
  )
  as split(
    user_id uuid,
    amount numeric
  );
end;
$$;


-- =========================================================
-- DELETE EXPENSE RPC
-- =========================================================

create or replace function public.delete_trip_expense(
  p_trip_id uuid,
  p_expense_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  existing_creator uuid;
begin
  current_user_id :=
    (select auth.uid());


  select e.created_by
  into existing_creator
  from public.expenses e
  where e.id = p_expense_id
    and e.trip_id = p_trip_id;


  if existing_creator is null then
    raise exception
      'Expense not found';
  end if;


  if not (
    existing_creator =
      current_user_id

    or private.is_trip_creator(
      p_trip_id
    )
  ) then
    raise exception
      'You cannot delete this expense';
  end if;


  delete from public.expenses
  where id =
      p_expense_id
    and trip_id =
      p_trip_id;
end;
$$;


-- =========================================================
-- CREATE SETTLEMENT RPC
-- =========================================================

create or replace function public.create_trip_settlement(
  p_trip_id uuid,
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_settlement_id uuid;
begin
  current_user_id :=
    (select auth.uid());


  if not private.can_view_trip(
    p_trip_id
  ) then
    raise exception
      'Trip not found';
  end if;


  if not (
    private.is_trip_creator(
      p_trip_id
    )
    or private.is_trip_attendee(
      p_trip_id,
      current_user_id
    )
  ) then
    raise exception
      'You cannot record repayments for this trip';
  end if;


  if p_from_user_id =
    p_to_user_id
  then
    raise exception
      'Repayment travellers must be different';
  end if;


  if not private.is_trip_attendee(
    p_trip_id,
    p_from_user_id
  ) or not private.is_trip_attendee(
    p_trip_id,
    p_to_user_id
  ) then
    raise exception
      'Both travellers must be attending the trip';
  end if;


  if p_amount <= 0 then
    raise exception
      'Repayment amount must be greater than zero';
  end if;


  insert into public.expense_settlements (
    trip_id,
    from_user_id,
    to_user_id,
    amount,
    currency,
    note,
    created_by
  )
  values (
    p_trip_id,
    p_from_user_id,
    p_to_user_id,
    round(
      p_amount,
      2
    ),
    upper(
      p_currency
    ),
    nullif(
      trim(p_note),
      ''
    ),
    current_user_id
  )
  returning id
  into new_settlement_id;


  return new_settlement_id;
end;
$$;


-- =========================================================
-- DELETE SETTLEMENT RPC
-- =========================================================

create or replace function public.delete_trip_settlement(
  p_trip_id uuid,
  p_settlement_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  existing_creator uuid;
begin
  current_user_id :=
    (select auth.uid());


  select s.created_by
  into existing_creator
  from public.expense_settlements s
  where s.id =
      p_settlement_id
    and s.trip_id =
      p_trip_id;


  if existing_creator is null then
    raise exception
      'Repayment not found';
  end if;


  if not (
    existing_creator =
      current_user_id

    or private.is_trip_creator(
      p_trip_id
    )
  ) then
    raise exception
      'You cannot delete this repayment';
  end if;


  delete from public.expense_settlements
  where id =
      p_settlement_id
    and trip_id =
      p_trip_id;
end;
$$;


-- Security-definer functions must not be public.
revoke execute
on function public.create_trip_expense(
  uuid,
  uuid,
  text,
  numeric,
  text,
  text,
  date,
  text,
  jsonb
)
from public, anon;


revoke execute
on function public.update_trip_expense(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  text,
  text,
  date,
  text,
  jsonb
)
from public, anon;


revoke execute
on function public.delete_trip_expense(
  uuid,
  uuid
)
from public, anon;


revoke execute
on function public.create_trip_settlement(
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text
)
from public, anon;


revoke execute
on function public.delete_trip_settlement(
  uuid,
  uuid
)
from public, anon;


grant execute
on function public.create_trip_expense(
  uuid,
  uuid,
  text,
  numeric,
  text,
  text,
  date,
  text,
  jsonb
)
to authenticated;


grant execute
on function public.update_trip_expense(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  text,
  text,
  date,
  text,
  jsonb
)
to authenticated;


grant execute
on function public.delete_trip_expense(
  uuid,
  uuid
)
to authenticated;


grant execute
on function public.create_trip_settlement(
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text
)
to authenticated;


grant execute
on function public.delete_trip_settlement(
  uuid,
  uuid
)
to authenticated;


-- =========================================================
-- PACKING ITEMS
-- =========================================================

create table public.packing_items (
  id uuid primary key
    default gen_random_uuid(),

  trip_id uuid not null
    references public.trips(id)
    on delete cascade,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  -- Required + personal rows belong
  -- to one traveller.
  owner_user_id uuid
    references public.profiles(id)
    on delete cascade,

  scope text not null,

  -- Only system required rows use this.
  required_key text,

  name text not null,

  category text not null
    default 'other',

  quantity integer not null
    default 1,

  -- Only shared rows can be assigned.
  assigned_to uuid
    references public.profiles(id)
    on delete set null,

  notes text,

  is_packed boolean not null
    default false,

  is_system_required boolean not null
    default false,

  sort_order integer not null
    default 0,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint packing_items_scope_check
    check (
      scope in (
        'required',
        'personal',
        'shared'
      )
    ),

  constraint packing_items_category_check
    check (
      category in (
        'documents',
        'clothing',
        'toiletries',
        'electronics',
        'health',
        'travel',
        'activities',
        'food',
        'other'
      )
    ),

  constraint packing_items_name_check
    check (
      char_length(trim(name))
        between 1 and 160
    ),

  constraint packing_items_quantity_check
    check (
      quantity between 1 and 99
    ),

  constraint packing_items_notes_check
    check (
      notes is null
      or char_length(notes) <= 1000
    ),

  constraint packing_items_scope_shape_check
    check (
      (
        scope = 'required'
        and owner_user_id is not null
        and required_key is not null
        and is_system_required = true
        and assigned_to is null
      )

      or

      (
        scope = 'personal'
        and owner_user_id is not null
        and required_key is null
        and is_system_required = false
        and assigned_to is null
      )

      or

      (
        scope = 'shared'
        and owner_user_id is null
        and required_key is null
        and is_system_required = false
      )
    )
);


create index packing_items_trip_id_idx
on public.packing_items(trip_id);


create index packing_items_owner_user_id_idx
on public.packing_items(owner_user_id);


create index packing_items_assigned_to_idx
on public.packing_items(assigned_to);


create unique index packing_required_item_unique
on public.packing_items(
  trip_id,
  owner_user_id,
  required_key
)
where required_key is not null;


-- =========================================================
-- REQUIRED / MUST-HAVE SEEDING
-- =========================================================

create or replace function private.seed_required_packing_items(
  target_trip_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.packing_items (
    trip_id,
    created_by,
    owner_user_id,
    scope,
    required_key,
    name,
    category,
    quantity,
    notes,
    is_system_required,
    sort_order
  )
  values

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '01_passport',
    'Passport / travel document',
    'documents',
    1,
    'Always confirm that your main travel document is valid and ready.',
    true,
    10
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '02_government_id',
    'Government-issued photo ID',
    'documents',
    1,
    'Keep a suitable secondary form of identification available.',
    true,
    20
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '03_visa',
    'Visa / travel authorisation documents',
    'documents',
    1,
    'If no visa or travel authorisation is required, checking this item means you have confirmed that requirement.',
    true,
    30
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '04_bookings',
    'Tickets, boarding passes & booking confirmations',
    'documents',
    1,
    'Keep transport, accommodation and other important booking information accessible.',
    true,
    40
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '05_payment',
    'Wallet, payment cards & emergency cash',
    'travel',
    1,
    null,
    true,
    50
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '06_phone',
    'Phone',
    'electronics',
    1,
    null,
    true,
    60
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '07_charger',
    'Phone charger / power adapter',
    'electronics',
    1,
    'Remember a destination-compatible plug adapter where required.',
    true,
    70
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '08_medication',
    'Essential medication / prescriptions',
    'health',
    1,
    'If you do not require medication, checking this item means you have confirmed that.',
    true,
    80
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '09_insurance',
    'Travel insurance details',
    'documents',
    1,
    'If insurance is not applicable, checking this item means you have confirmed that.',
    true,
    90
  ),

  (
    target_trip_id,
    target_user_id,
    target_user_id,
    'required',
    '10_emergency',
    'Emergency contact information',
    'documents',
    1,
    'Keep important emergency contacts available even if your phone cannot access the internet.',
    true,
    100
  )

  on conflict (
    trip_id,
    owner_user_id,
    required_key
  )
  where required_key is not null
  do nothing;
end;
$$;


-- Automatically create the required checklist
-- whenever somebody becomes a trip traveller.
create or replace function private.create_required_packing_for_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_required_packing_items(
    new.trip_id,
    new.user_id
  );

  return new;
end;
$$;


create trigger seed_required_packing_after_participant
after insert
on public.trip_participants
for each row
execute function private.create_required_packing_for_participant();


-- Backfill required items for all
-- existing trip participants.
select private.seed_required_packing_items(
  tp.trip_id,
  tp.user_id
)
from public.trip_participants tp;


-- =========================================================
-- PACKING PROTECTION
-- =========================================================

create or replace function private.protect_packing_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id :=
    (select auth.uid());


  if old.trip_id <>
    new.trip_id
  then
    raise exception
      'Trip cannot be changed';
  end if;


  if old.created_by <>
    new.created_by
  then
    raise exception
      'Item creator cannot be changed';
  end if;


  if old.scope <>
    new.scope
  then
    raise exception
      'Packing list type cannot be changed';
  end if;


  if old.owner_user_id
    is distinct from
    new.owner_user_id
  then
    raise exception
      'Packing list owner cannot be changed';
  end if;


  if old.required_key
    is distinct from
    new.required_key
  then
    raise exception
      'Required item identity cannot be changed';
  end if;


  if old.is_system_required <>
    new.is_system_required
  then
    raise exception
      'Required status cannot be changed';
  end if;


  -- Mandatory items may only
  -- change packed state.
  if old.is_system_required then
    if
      old.name
        is distinct from new.name

      or old.category
        is distinct from new.category

      or old.quantity
        is distinct from new.quantity

      or old.assigned_to
        is distinct from new.assigned_to

      or old.notes
        is distinct from new.notes

      or old.sort_order
        is distinct from new.sort_order
    then
      raise exception
        'Required items cannot be edited';
    end if;
  end if;


  -- Other travellers may tick a shared
  -- item, but only its creator or the
  -- trip creator may edit its details.
  if old.scope = 'shared'
    and old.created_by <>
      current_user_id

    and not private.is_trip_creator(
      old.trip_id
    )
  then
    if
      old.name
        is distinct from new.name

      or old.category
        is distinct from new.category

      or old.quantity
        is distinct from new.quantity

      or old.assigned_to
        is distinct from new.assigned_to

      or old.notes
        is distinct from new.notes

      or old.sort_order
        is distinct from new.sort_order
    then
      raise exception
        'Only the item creator can edit shared item details';
    end if;
  end if;


  return new;
end;
$$;


create trigger protect_packing_item
before update
on public.packing_items
for each row
execute function private.protect_packing_item();


create or replace function private.set_packing_updated_at()
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


create trigger set_packing_updated_at
before update
on public.packing_items
for each row
execute function private.set_packing_updated_at();


-- =========================================================
-- PACKING RLS
-- =========================================================

alter table public.packing_items
enable row level security;


grant select, insert, update, delete
on public.packing_items
to authenticated;


grant all
on public.packing_items
to service_role;


-- Shared list is visible to trip viewers.
-- Required/personal lists are private
-- to the traveller they belong to.
create policy "Users can view packing items"
on public.packing_items
for select
to authenticated
using (
  private.can_view_trip(
    trip_id
  )

  and (
    scope = 'shared'

    or owner_user_id =
      (select auth.uid())
  )
);


create policy "Users can create packing items"
on public.packing_items
for insert
to authenticated
with check (
  created_by =
    (select auth.uid())

  and is_system_required =
    false

  and (
    (
      scope = 'personal'

      and owner_user_id =
        (select auth.uid())

      and private.is_trip_attendee(
        trip_id,
        (select auth.uid())
      )
    )

    or

    (
      scope = 'shared'

      and owner_user_id
        is null

      and (
        private.is_trip_attendee(
          trip_id,
          (select auth.uid())
        )

        or private.is_trip_creator(
          trip_id
        )
      )

      and (
        assigned_to is null

        or private.is_trip_attendee(
          trip_id,
          assigned_to
        )
      )
    )
  )
);


create policy "Users can update packing items"
on public.packing_items
for update
to authenticated
using (
  private.can_view_trip(
    trip_id
  )

  and (
    (
      scope in (
        'required',
        'personal'
      )

      and owner_user_id =
        (select auth.uid())

      and private.is_trip_attendee(
        trip_id,
        (select auth.uid())
      )
    )

    or

    (
      scope = 'shared'

      and (
        private.is_trip_attendee(
          trip_id,
          (select auth.uid())
        )

        or private.is_trip_creator(
          trip_id
        )
      )
    )
  )
)
with check (
  private.can_view_trip(
    trip_id
  )

  and (
    (
      scope in (
        'required',
        'personal'
      )

      and owner_user_id =
        (select auth.uid())

      and private.is_trip_attendee(
        trip_id,
        (select auth.uid())
      )
    )

    or

    (
      scope = 'shared'

      and (
        private.is_trip_attendee(
          trip_id,
          (select auth.uid())
        )

        or private.is_trip_creator(
          trip_id
        )
      )

      and (
        assigned_to is null

        or private.is_trip_attendee(
          trip_id,
          assigned_to
        )
      )
    )
  )
);


-- Required items deliberately have
-- no possible DELETE permission.
create policy "Users can delete packing items"
on public.packing_items
for delete
to authenticated
using (
  is_system_required =
    false

  and (
    (
      scope = 'personal'

      and owner_user_id =
        (select auth.uid())
    )

    or

    (
      scope = 'shared'

      and (
        created_by =
          (select auth.uid())

        or private.is_trip_creator(
          trip_id
        )
      )
    )
  )
);


-- =========================================================
-- REALTIME
-- =========================================================

do $$
declare
  table_to_add text;
begin
  foreach table_to_add
  in array array[
    'expenses',
    'expense_splits',
    'expense_settlements',
    'packing_items'
  ]
  loop

    if not exists (
      select 1
      from pg_publication_tables
      where pubname =
          'supabase_realtime'
        and schemaname =
          'public'
        and tablename =
          table_to_add
    )
    then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_to_add
      );
    end if;

  end loop;
end;
$$;