-- ============================================================================
-- Migration 004: Multi-Gamme per Offer
-- ============================================================================

-- 1. Create offer_tiers table
create table if not exists public.offer_tiers (
  id              uuid primary key default gen_random_uuid(),
  offer_id        uuid not null references public.offers (id) on delete cascade,
  sort_order      int not null default 0,
  label           text not null check (label in ('economique', 'confort', 'premium', 'vip')),
  hotel_makkah_id  uuid references public.hotels (id) on delete set null,
  hotel_madinah_id uuid references public.hotels (id) on delete set null,
  price_double    int,
  price_triple    int,
  price_quad      int,
  price_quint     int,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_offer_tiers_unique
  on public.offer_tiers (offer_id, label);

create index if not exists idx_offer_tiers_offer
  on public.offer_tiers (offer_id, sort_order);

-- 1b. Add new per-tier columns
alter table public.offer_tiers
  add column if not exists nights_makkah int,
  add column if not exists nights_madinah int,
  add column if not exists distance_to_haram_m int,
  add column if not exists breakfast_included boolean not null default false;

-- 1c. Enable RLS and add anon read policy (needed for public pages)
alter table public.offer_tiers enable row level security;
drop policy if exists anon_read on public.offer_tiers;
create policy anon_read on public.offer_tiers
  for select to anon
  using (is_published);

-- 1d. Admin (authenticated) full access — REQUIRED and easy to miss.
-- schema.sql grants admin_full_access via a one-time loop over the tables that
-- existed when it ran. offer_tiers is created HERE, after that loop, so it never
-- receives the admin grant. Without this policy the admin (authenticated role)
-- can neither read nor write tiers: RLS denies every insert/update while the
-- UI still reports success. Add it explicitly.
drop policy if exists admin_full_access on public.offer_tiers;
create policy admin_full_access on public.offer_tiers
  for all to authenticated
  using (true) with check (true);

-- 2. Migrate existing data from offers to offer_tiers
insert into public.offer_tiers
  (offer_id, sort_order, label, hotel_makkah_id, hotel_madinah_id,
   price_double, price_triple, price_quad, price_quint, is_published)
select
  id, 0, tier_label, hotel_makkah_id, hotel_madinah_id,
  price_double, price_triple, price_quad, price_quint, true
from public.offers
where tier_label is not null;

-- 3. Add tier_label to leads table
alter table public.leads
  add column if not exists tier_label text
  check (tier_label is null or tier_label in ('economique', 'confort', 'premium', 'vip'));

-- 4. Remove old columns from offers (after confirming data is migrated)
--    We keep them temporarily for rollback; remove in a follow-up migration
--    once the new system is verified.
-- alter table public.offers
--   drop column if exists tier_label,
--   drop column if exists hotel_makkah_id,
--   drop column if exists hotel_madinah_id,
--   drop column if exists price_double,
--   drop column if exists price_triple,
--   drop column if exists price_quad,
--   drop column if exists price_quint,
--   drop column if exists starting_price;
