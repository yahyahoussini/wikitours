-- ============================================================================
-- Migration 023: evergreen month landers + departure lifecycle from data
-- ============================================================================

-- ---- month_pages: the AUTHORED blocks of /omra-{mois} ------------------------
-- Everything else on a month lander is derived from the departures (prices
-- observed, last season's pattern) or computed (Hijri overlap). These four
-- blocks a human writes, per month, per locale. is_indexable is the admin
-- switch; the page also self-noindexes until weather + suits exist in fr AND
-- ar (monthLanderIndexable, src/lib/months.js). never_sold keeps a month
-- noindex for good — only for months the agency will never sell (client call).
create table if not exists public.month_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in (
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'
  )),
  is_indexable boolean not null default false,
  never_sold boolean not null default false,
  weather_fr text, weather_ar text, weather_en text,
  crowds_fr text, crowds_ar text, crowds_en text,
  suits_fr text, suits_ar text, suits_en text,
  lead_time_fr text, lead_time_ar text, lead_time_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.month_pages enable row level security;
drop policy if exists anon_read on public.month_pages;
create policy anon_read on public.month_pages
  for select to anon using (true);
drop policy if exists admin_full_access on public.month_pages;
create policy admin_full_access on public.month_pages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists touch_updated_at on public.month_pages;
create trigger touch_updated_at before update on public.month_pages
  for each row execute function public.touch_updated_at();

-- One row per month so the admin sees the twelve pages to fill (all noindex
-- until filled — hard constraint 10: content first, noindex removal second).
insert into public.month_pages (slug) values
  ('janvier'), ('fevrier'), ('mars'), ('avril'), ('mai'), ('juin'),
  ('juillet'), ('aout'), ('septembre'), ('octobre'), ('novembre'), ('decembre')
on conflict (slug) do nothing;

-- ---- offers: the lifecycle is code, RLS no longer hides the past -----------
-- A departure's state derives from its RETURN date at request time
-- (src/lib/offers.js offerLifecycle): live → archived (noindex, ≤ 90 days) →
-- retired (301 to the month lander). The 60-day RLS grace (008) is therefore
-- replaced by plain visibility: a published departure stays readable forever —
-- the archived page needs its row, and the month landers' "prices observed"
-- and "last season" blocks are built from exactly these past rows. Listings
-- (getPublishedOffers) filter to not-yet-returned departures in code.
drop policy if exists anon_read on public.offers;
create policy anon_read on public.offers
  for select to anon
  using (is_published);

drop policy if exists anon_read on public.offer_tiers;
create policy anon_read on public.offer_tiers
  for select to anon
  using (
    is_published
    and exists (
      select 1 from public.offers o
      where o.id = offer_tiers.offer_id
        and o.is_published
    )
  );
