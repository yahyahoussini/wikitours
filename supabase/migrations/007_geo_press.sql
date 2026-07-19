-- ============================================================================
-- Migration 007: geo coordinates + press URL on settings
-- ============================================================================

-- Feeds `geo` (GeoCoordinates) into the Organization + LocalBusiness JSON-LD
-- (local SEO / map pack), and a canonical press URL for the /presse page.
-- All rendered server-side from the DB (single NAP source — no config module).
alter table public.settings
  add column if not exists latitude  numeric(9, 6) check (latitude  is null or (latitude  between -90  and 90)),
  add column if not exists longitude numeric(9, 6) check (longitude is null or (longitude between -180 and 180)),
  add column if not exists press_url text;
