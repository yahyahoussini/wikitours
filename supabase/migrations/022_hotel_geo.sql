-- ============================================================================
-- Migration 022: geo coordinates on hotels
-- ============================================================================

-- Feeds `geo` (GeoCoordinates) into the Hotel JSON-LD on /hotel/[slug], the
-- /hotels-omra ItemList and each departure's itinerary — the same shape as
-- the office coordinates on settings (007). hotelNode() emits geo only when
-- BOTH values are set; they are entered per hotel, never written by code.
alter table public.hotels
  add column if not exists latitude  numeric(9, 6) check (latitude  is null or (latitude  between -90  and 90)),
  add column if not exists longitude numeric(9, 6) check (longitude is null or (longitude between -180 and 180));
