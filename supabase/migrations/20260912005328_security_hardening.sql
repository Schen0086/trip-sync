-- =========================================================
-- TRIPSYNC SECURITY HARDENING
-- =========================================================
-- Tightens Data API privileges without changing intended
-- application behaviour.
--
-- RLS remains responsible for row-level access.
-- These grants restrict which operations/columns a browser
-- client can attempt within those permitted rows.
-- =========================================================


-- =========================================================
-- ANONYMOUS ACCESS
-- =========================================================
-- TripSync has no signed-out application data features.
-- Authentication itself uses Supabase Auth rather than these
-- public application tables.

revoke all privileges
on table
  public.profiles,
  public.groups,
  public.group_members,
  public.trips,
  public.trip_participants,
  public.itinerary_items,
  public.itinerary_votes,
  public.saved_places,
  public.expenses,
  public.expense_splits,
  public.expense_settlements,
  public.packing_items,
  public.trip_tasks,
  public.trip_activity,
  public.notifications,
  public.suggestion_comments,
  public.suggestion_discussion_reads,
  public.trip_photos
from anon;


-- =========================================================
-- GROUP MEMBERS
-- =========================================================
-- Owners are allowed to promote/demote non-owner members,
-- but membership identity must not be directly mutable.
--
-- This prevents browser clients from changing:
-- - group_id
-- - user_id
-- - joined_at

revoke update
on table public.group_members
from authenticated;


grant update (
  role
)
on table public.group_members
to authenticated;


-- =========================================================
-- TRIPS
-- =========================================================
-- Restrict creation to the fields used by TripSync.
-- IDs/timestamps continue to come from the database.

revoke insert
on table public.trips
from authenticated;


grant insert (
  name,
  destination,
  description,
  start_date,
  end_date,
  budget,
  trip_type,
  owner_id,
  group_id,
  status
)
on table public.trips
to authenticated;


-- Trip editing deliberately does not permit changing:
-- - id
-- - owner_id
-- - trip_type
-- - group_id
-- - created_at

revoke update
on table public.trips
from authenticated;


grant update (
  name,
  destination,
  description,
  start_date,
  end_date,
  budget,
  status,
  updated_at
)
on table public.trips
to authenticated;


-- =========================================================
-- SAVED PLACES
-- =========================================================
-- The browser may provide the place's initial data, but not
-- its database identity or timestamps.

revoke insert
on table public.saved_places
from authenticated;


grant insert (
  trip_id,
  saved_by,
  geoapify_place_id,
  name,
  category,
  address,
  latitude,
  longitude,
  website_url,
  notes
)
on table public.saved_places
to authenticated;


-- Place identity fields remain protected by the existing
-- database trigger. Column privileges provide an additional
-- layer and prevent IDs/timestamps being targeted directly.

revoke update
on table public.saved_places
from authenticated;


grant update (
  name,
  category,
  address,
  latitude,
  longitude,
  website_url,
  notes
)
on table public.saved_places
to authenticated;


-- =========================================================
-- TRIP PHOTOS
-- =========================================================
-- Creation needs the generated photo ID and Storage identity,
-- but database timestamps remain database-managed.

revoke insert
on table public.trip_photos
from authenticated;


grant insert (
  id,
  trip_id,
  uploaded_by,
  storage_path,
  caption,
  photo_date,
  saved_place_id
)
on table public.trip_photos
to authenticated;


-- Once created, only user-facing metadata is editable.
--
-- The existing RLS policy still determines WHO may edit.
-- This grant determines WHAT they may edit.

revoke update
on table public.trip_photos
from authenticated;


grant update (
  caption,
  photo_date,
  saved_place_id
)
on table public.trip_photos
to authenticated;