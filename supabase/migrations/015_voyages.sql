-- ============================================================================
-- 015 — voyages (client request): /voyages becomes a catalog of organized
-- trips (Istanbul, Dubaï, …) — Wiki Tours surfaces, fully separate from
-- Omra/Hajj (which stay under Bab Makka). Admin-managed; every factual field
-- nullable and only rendered when present (LAW §10). Cards + /voyage/{slug}
-- detail pages; galleries via the generic galleries table
-- (entity_type='voyages').
-- ============================================================================

create table if not exists public.voyages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_fr text,
  title_ar text,
  title_en text,
  -- Display destination, e.g. "Istanbul, Turquie" (free text, admin-typed)
  destination text,
  summary_fr text,
  summary_ar text,
  summary_en text,
  description_fr text,
  description_ar text,
  description_en text,
  inclusions_fr text,
  inclusions_ar text,
  inclusions_en text,
  exclusions_fr text,
  exclusions_ar text,
  exclusions_en text,
  conditions_fr text,
  conditions_ar text,
  conditions_en text,
  duration_days integer,
  duration_nights integer,
  date_start date,
  date_end date,
  -- "À partir de" per person, MAD
  starting_price integer,
  airline text,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  seo_title_fr text,
  seo_title_ar text,
  seo_title_en text,
  seo_description_fr text,
  seo_description_ar text,
  seo_description_en text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_voyages_published
  on public.voyages (is_published, sort_order);

alter table public.voyages enable row level security;

drop policy if exists anon_read on public.voyages;
create policy anon_read on public.voyages
  for select to anon using (is_published);

drop policy if exists admin_full_access on public.voyages;
create policy admin_full_access on public.voyages
  for all to authenticated
  using (true) with check (true);

drop trigger if exists touch_updated_at on public.voyages;
create trigger touch_updated_at before update on public.voyages
  for each row execute function public.touch_updated_at();
