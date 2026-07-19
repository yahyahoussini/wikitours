-- ============================================================================
-- Migration 008: offer lifecycle — seat scarcity + 60-day expiry grace
-- ============================================================================

-- Real, nullable seat count. Drives honest scarcity ("X places restantes",
-- shown ONLY when set) and the schema availability (0 → SoldOut). Never invent
-- a value — blank means "fall back to the status enum" (LAWS §6).
alter table public.offers
  add column if not exists seats_remaining int
    check (seats_remaining is null or seats_remaining >= 0);

-- Expiry grace: keep a departed offer readable for 60 days after date_end so its
-- page can show a "Départ effectué — prochains départs" state and 301 cleanly
-- (no 404, no delete). Listings still filter to future departures in code
-- (getPublishedOffers); getOfferBySlug relies on this window. After 60 days the
-- cron writes a 301 to the month hub, and RLS hides the row again.
drop policy if exists anon_read on public.offers;
create policy anon_read on public.offers
  for select to anon
  using (is_published and (date_end is null or date_end >= current_date - interval '60 days'));
