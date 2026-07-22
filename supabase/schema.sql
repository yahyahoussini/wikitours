-- ============================================================================
-- Wiki Tours / Bab Makkah — schema.sql
-- Postgres (Supabase). Idempotent-ish: guarded creates where possible.
--
-- Security model (LAWS §8):
--   * RLS is ENABLED on every table.
--   * anon        → SELECT on published content only. Zero access to
--                   settings, CRM (leads/lead_activities) and analytics
--                   (visitors/sessions/events/daily_rollups/keyword_checks).
--                   All lead/analytics inserts go through server routes
--                   using the service-role key.
--   * authenticated → full CRUD (the admin back-office). IMPORTANT: public
--                   sign-ups MUST stay disabled in Supabase Auth settings;
--                   admin accounts are created manually.
--   * service_role → bypasses RLS (server-only, LAWS §8).
--
-- Conventions:
--   * Trilingual content columns: <name>_fr / <name>_ar / <name>_en.
--   * Every table has updated_at, auto-touched by trigger.
--   * Past offers are auto-hidden at the RLS layer (LAWS §6), not just in UI.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Helper: auto-touch updated_at
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- SETTINGS — single row (id = 1). NOT anon-readable: holds server tokens
-- (Meta CAPI, TikTok events, IndexNow). Public pages read it server-side.
-- ============================================================================
create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  default_locale text not null default 'fr' check (default_locale in ('fr', 'ar', 'en')),
  whatsapp_number text,
  phone_1 text,
  phone_2 text,
  phone_3 text,
  email text,
  address_fr text,
  address_ar text,
  address_en text,
  opening_hours_fr text,
  opening_hours_ar text,
  opening_hours_en text,
  license_number text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  babmakka_facebook_url text,
  babmakka_instagram_url text,
  babmakka_tiktok_url text,
  babmakka_youtube_url text,
  gbp_review_url text,
  gbp_rating numeric(2, 1) check (gbp_rating is null or (gbp_rating >= 0 and gbp_rating <= 5)),
  gbp_review_count integer,
  community_count text,
  ga4_id text,
  google_ads_id text,
  google_ads_lead_label text,
  meta_pixel_id text,
  meta_capi_token text,
  tiktok_pixel_id text,
  tiktok_events_token text,
  verification_metas text,
  consent_banner_enabled boolean not null default true,
  indexnow_key text,
  story_fr text,
  story_ar text,
  story_en text,
  team_enabled boolean not null default true,
  team_display text not null default 'members' check (team_display in ('members', 'photo')),
  latitude numeric(9, 6) check (latitude is null or (latitude between -90 and 90)),
  longitude numeric(9, 6) check (longitude is null or (longitude between -180 and 180)),
  press_url text,
  gbp_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- MEDIA — the central library
-- ============================================================================
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  kind text not null check (kind in ('image', 'video', 'document')),
  alt_fr text,
  alt_ar text,
  alt_en text,
  width integer,
  height integer,
  size_kb integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GALLERIES — attach N media to ANY record (polymorphic: entity_type is the
-- table name, entity_id the row id).
create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  media_id uuid not null references public.media (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists galleries_entity_idx
  on public.galleries (entity_type, entity_id, sort_order);

-- ============================================================================
-- CONTENT
-- ============================================================================
create table if not exists public.occasions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fr text,
  name_ar text,
  name_en text,
  description_fr text,
  description_ar text,
  description_en text,
  seo_title_fr text,
  seo_title_ar text,
  seo_title_en text,
  seo_description_fr text,
  seo_description_ar text,
  seo_description_en text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  distance_to_haram_m integer,
  stars smallint check (stars is null or (stars between 1 and 5)),
  city text not null check (city in ('makkah', 'madinah')),
  breakfast_included boolean not null default false,
  logo_path text,
  description_fr text,
  description_ar text,
  description_en text,
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

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  occasion_id uuid references public.occasions (id) on delete set null,
  hotel_makkah_id uuid references public.hotels (id) on delete set null,
  hotel_madinah_id uuid references public.hotels (id) on delete set null,
  tier_label text check (tier_label in ('economique', 'confort', 'premium', 'vip')),
  title_fr text,
  title_ar text,
  title_en text,
  summary_fr text,
  summary_ar text,
  summary_en text,
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
  airline text,
  date_start date,
  date_end date,
  price_double integer,
  price_triple integer,
  price_quad integer,
  price_quint integer,
  starting_price integer,
  seats_remaining int check (seats_remaining is null or seats_remaining >= 0),
  status text not null default 'open' check (status in ('open', 'few_left', 'full')),
  is_featured boolean not null default false,
  land_only boolean not null default false,
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

create index if not exists offers_occasion_idx on public.offers (occasion_id);
create index if not exists offers_published_idx on public.offers (is_published, status);
create index if not exists offers_date_end_idx on public.offers (date_end);
create index if not exists offers_featured_idx on public.offers (is_featured) where is_featured;

create table if not exists public.offer_tiers (
  id               uuid primary key default gen_random_uuid(),
  offer_id         uuid not null references public.offers (id) on delete cascade,
  sort_order       int not null default 0,
  label            text not null check (label in ('economique', 'confort', 'premium', 'vip')),
  hotel_makkah_id  uuid references public.hotels (id) on delete set null,
  hotel_madinah_id uuid references public.hotels (id) on delete set null,
  nights_makkah    int,
  nights_madinah   int,
  distance_to_haram_m int,
  breakfast_included boolean not null default false,
  price_double     int,
  price_triple     int,
  price_quad       int,
  price_quint      int,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists idx_offer_tiers_unique
  on public.offer_tiers (offer_id, label);

create index if not exists idx_offer_tiers_offer
  on public.offer_tiers (offer_id, sort_order);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fr text,
  name_ar text,
  name_en text,
  tagline_fr text,
  tagline_ar text,
  tagline_en text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_fr text,
  role_ar text,
  role_en text,
  sameas_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('text', 'video', 'screenshot')),
  author_name text,
  author_city text,
  trip_label_fr text,
  trip_label_ar text,
  trip_label_en text,
  content_fr text,
  content_ar text,
  content_en text,
  rating smallint check (rating is null or (rating between 1 and 5)),
  offer_id uuid references public.offers (id) on delete set null,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_published_idx
  on public.testimonials (is_published, sort_order);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question_fr text,
  question_ar text,
  question_en text,
  answer_fr text,
  answer_ar text,
  answer_en text,
  category text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faqs_category_idx on public.faqs (category, sort_order);

create table if not exists public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  title_fr text,
  title_ar text,
  title_en text,
  body_fr text,
  body_ar text,
  body_en text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_fr text,
  title_ar text,
  title_en text,
  excerpt_fr text,
  excerpt_ar text,
  excerpt_en text,
  body_fr text,
  body_ar text,
  body_en text,
  category text check (category in ('confiance', 'omra', 'hajj', 'hotels', 'guide')),
  author_name text,
  reviewed_by text,
  published_at timestamptz,
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

create index if not exists articles_published_idx
  on public.articles (is_published, published_at desc);
create index if not exists articles_category_idx on public.articles (category);

create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_fr text,
  title_ar text,
  title_en text,
  subtitle_fr text,
  subtitle_ar text,
  subtitle_en text,
  body_md_fr text,
  body_md_ar text,
  body_md_en text,
  cta_label_fr text,
  cta_label_ar text,
  cta_label_en text,
  cta_target text check (cta_target in ('offer', 'babmakkah', 'whatsapp')),
  cta_offer_id uuid references public.offers (id) on delete set null,
  show_lead_form boolean not null default true,
  noindex boolean not null default false,
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

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  text_fr text,
  text_ar text,
  text_en text,
  link text,
  variant text not null default 'info' check (variant in ('info', 'gold')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_active_idx on public.announcements (is_active);

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  permanent boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin-editable navigation. Header/footer render from this with sensible
-- code fallbacks when the location is empty.
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('header', 'footer_col1', 'footer_col2')),
  label_fr text,
  label_ar text,
  label_en text,
  href text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menus_location_idx on public.menus (location, sort_order);

-- Wiki Tours parent services (/voyages): Individuels / Groupes / Incentive.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  section text not null check (section in ('individuels', 'groupes', 'incentive')),
  name_fr text,
  name_ar text,
  name_en text,
  description_fr text,
  description_ar text,
  description_en text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_section_idx on public.services (section, sort_order);

-- Voyages — organized trips (Istanbul, Dubaï, …), Wiki Tours surfaces fully
-- separate from Omra/Hajj (Bab Makka). Cards on /voyages + /voyage/{slug}
-- detail pages; galleries via galleries(entity_type='voyages'). Every factual
-- field nullable, rendered only when present (LAW §10).
create table if not exists public.voyages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_fr text,
  title_ar text,
  title_en text,
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

create index if not exists idx_voyages_published on public.voyages (is_published, sort_order);

-- ============================================================================
-- CRM — never readable by anon. Inserts only via server routes
-- (service role); reads only for authenticated admins.
-- ============================================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locale text check (locale in ('fr', 'ar', 'en')),
  offer_id uuid references public.offers (id) on delete set null,
  offer_title text,
  room_type text
    check (room_type is null or room_type in ('double', 'triple', 'quad', 'quint')),
  full_name text not null,
  city text,
  phone text not null,
  message text,
  ip text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  gclid text,
  fbclid text,
  visitor_id uuid,
  region text,
  geo_city text,
  country text,
  device text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'paid_deposit', 'traveled', 'lost')),
  assigned_to text,
  value_mad integer,
  user_agent text,
  updated_at timestamptz not null default now()
);

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_offer_idx on public.leads (offer_id);
create index if not exists leads_visitor_idx on public.leads (visitor_id);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('note', 'status_change', 'whatsapp', 'call', 'review_request')),
  body text,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_idx
  on public.lead_activities (lead_id, created_at desc);

-- ============================================================================
-- ANALYTICS — first-party, no anon access. 90-day event retention.
-- ============================================================================
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  first_seen timestamptz not null default now(),
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  first_referrer text,
  country text,
  region text,
  city text,
  device text,
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.visitors (id) on delete cascade,
  started_at timestamptz not null default now(),
  entry_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  region text,
  city text,
  device text,
  updated_at timestamptz not null default now()
);

create index if not exists sessions_visitor_idx on public.sessions (visitor_id);
create index if not exists sessions_started_idx on public.sessions (started_at);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  session_id uuid references public.sessions (id) on delete cascade,
  visitor_id uuid,
  ts timestamptz not null default now(),
  type text not null check (
    type in (
      'pageview', 'offer_view', 'form_start', 'form_submit',
      'whatsapp_click', 'cta_click', 'web_vital',
      'tier_select', 'room_select',
      'tel_click', 'faq_expand', 'devis_request'
    )
  ),
  path text,
  offer_id uuid references public.offers (id) on delete set null,
  meta jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists events_ts_idx on public.events (ts);
create index if not exists events_type_ts_idx on public.events (type, ts);
create index if not exists events_session_idx on public.events (session_id);
create index if not exists events_visitor_idx on public.events (visitor_id);
create index if not exists events_path_idx on public.events (path);

create table if not exists public.daily_rollups (
  date date not null,
  path text not null,
  pageviews integer not null default 0,
  offer_views integer not null default 0,
  leads integer not null default 0,
  whatsapp_clicks integer not null default 0,
  top_source text,
  top_city text,
  updated_at timestamptz not null default now(),
  primary key (date, path)
);

-- ============================================================================
-- SEO / GEO / AEO tracking
-- ============================================================================
create table if not exists public.keyword_checks (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  engine text not null check (engine in ('google', 'chatgpt', 'perplexity', 'gemini', 'ai_overview')),
  "position" integer,
  cited boolean,
  checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists keyword_checks_kw_idx
  on public.keyword_checks (keyword, engine, checked_at desc);

-- AI/search bot logger (migration 009): raw hits from the middleware
-- (service role writes; no anon policy). The nightly cron folds rows older
-- than 7 days into bot_hits_weekly and deletes them (bounded growth).
create table if not exists public.bot_hits (
  id bigint generated always as identity primary key,
  bot text not null,
  path text not null,
  ua text,
  ts timestamptz not null default now()
);

create index if not exists bot_hits_ts_idx on public.bot_hits (ts);
create index if not exists bot_hits_bot_ts_idx on public.bot_hits (bot, ts);

create table if not exists public.bot_hits_weekly (
  week date not null,
  bot text not null,
  path text not null,
  hits int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (week, bot, path)
);

-- ============================================================================
-- PROGRAMMATIC CONTENT SURFACES (migration 009)
-- ============================================================================

-- City pages (/omra-depuis-{ville}) anti-doorway guard: unique local content
-- + explicit indexability toggle. Page ships NOINDEX until content is filled
-- AND the toggle is on.
create table if not exists public.city_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  is_indexable boolean not null default false,
  intro_fr text, intro_ar text, intro_en text,
  logistics_fr text, logistics_ar text, logistics_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Guide cluster (/guide-omra + children). is_published = anon-visible;
-- is_indexable = admin index switch (page also self-noindexes while empty).
create table if not exists public.guide_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  is_published boolean not null default false,
  is_indexable boolean not null default false,
  title_fr text, title_ar text, title_en text,
  summary_fr text, summary_ar text, summary_en text,
  body_fr text, body_ar text, body_en text,
  author_name text,
  author_sameas_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Glossary (/glossaire-omra) — DefinedTerm entries.
create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  is_published boolean not null default false,
  term_fr text, term_ar text, term_en text,
  definition_fr text, definition_ar text, definition_en text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- updated_at triggers on every table that has the column
-- ============================================================================
do $$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and tb.table_type = 'BASE TABLE'
  loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t.table_name);
    execute format(
      'create trigger touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()',
      t.table_name
    );
  end loop;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on every table in public.
do $$
declare
  t record;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security', t.table_name);
  end loop;
end;
$$;

-- Admin (authenticated) full access on every table.
-- NOTE: public sign-ups must remain DISABLED in Supabase Auth; admin accounts
-- are provisioned manually. Tighten to a role claim later if needed.
do $$
declare
  t record;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('drop policy if exists admin_full_access on public.%I', t.table_name);
    execute format(
      'create policy admin_full_access on public.%I
         for all to authenticated using (true) with check (true)',
      t.table_name
    );
  end loop;
end;
$$;

-- ---- anon read policies: PUBLISHED CONTENT ONLY --------------------------
-- (No anon policy exists on settings, leads, lead_activities, visitors,
--  sessions, events, daily_rollups, keyword_checks, bot_hits,
--  bot_hits_weekly → anon is fully denied.)

drop policy if exists anon_read on public.media;
create policy anon_read on public.media
  for select to anon using (true);

drop policy if exists anon_read on public.galleries;
create policy anon_read on public.galleries
  for select to anon using (true);

drop policy if exists anon_read on public.occasions;
create policy anon_read on public.occasions
  for select to anon using (is_published);

drop policy if exists anon_read on public.hotels;
create policy anon_read on public.hotels
  for select to anon using (is_published);

-- Past offers auto-hidden at the DB layer (LAWS §6): once date_end passes,
-- anon can no longer read the row — no code change, no cron needed.
drop policy if exists anon_read on public.offer_tiers;
create policy anon_read on public.offer_tiers
  for select to anon
  using (is_published);

-- 60-day grace after date_end (migration 008): the departed page stays
-- readable for its "Départ effectué" state until the cron 301s it.
drop policy if exists anon_read on public.offers;
create policy anon_read on public.offers
  for select to anon
  using (is_published and (date_end is null or date_end >= current_date - interval '60 days'));

drop policy if exists anon_read on public.destinations;
create policy anon_read on public.destinations
  for select to anon using (is_published);

drop policy if exists anon_read on public.team_members;
create policy anon_read on public.team_members
  for select to anon using (is_published);

drop policy if exists anon_read on public.testimonials;
create policy anon_read on public.testimonials
  for select to anon using (is_published);

drop policy if exists anon_read on public.faqs;
create policy anon_read on public.faqs
  for select to anon using (is_published);

drop policy if exists anon_read on public.timeline_items;
create policy anon_read on public.timeline_items
  for select to anon using (is_published);

drop policy if exists anon_read on public.articles;
create policy anon_read on public.articles
  for select to anon
  using (is_published and (published_at is null or published_at <= now()));

drop policy if exists anon_read on public.landing_pages;
create policy anon_read on public.landing_pages
  for select to anon using (is_published);

drop policy if exists anon_read on public.voyages;
create policy anon_read on public.voyages
  for select to anon using (is_published);

drop policy if exists anon_read on public.announcements;
create policy anon_read on public.announcements
  for select to anon
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists anon_read on public.redirects;
create policy anon_read on public.redirects
  for select to anon using (is_active);

drop policy if exists anon_read on public.menus;
create policy anon_read on public.menus
  for select to anon using (is_active);

drop policy if exists anon_read on public.services;
create policy anon_read on public.services
  for select to anon using (is_published);

drop policy if exists anon_read on public.city_pages;
create policy anon_read on public.city_pages
  for select to anon using (true);

drop policy if exists anon_read on public.guide_pages;
create policy anon_read on public.guide_pages
  for select to anon using (is_published);

drop policy if exists anon_read on public.glossary_terms;
create policy anon_read on public.glossary_terms
  for select to anon using (is_published);

-- ============================================================================
-- ANALYTICS MAINTENANCE
-- ============================================================================

-- Retention: events 90 days · sessions/visitors 13 months. Invoked nightly
-- by the Vercel cron (/api/cron/rollup); pg_cron works as an alternative:
--   select cron.schedule('cleanup-analytics', '10 3 * * *',
--                        $$select public.cleanup_analytics()$$);
create or replace function public.cleanup_analytics()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.events where ts < now() - interval '90 days';
  delete from public.sessions where started_at < now() - interval '13 months';
  delete from public.visitors where first_seen < now() - interval '13 months';
$$;

-- Fold raw bot hits older than 7 days into weekly counts, then purge them.
-- Idempotent under daily cron: each slice is aggregated once and deleted.
create or replace function public.rollup_bot_hits()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.bot_hits_weekly (week, bot, path, hits)
  select date_trunc('week', ts)::date, bot, path, count(*)
  from public.bot_hits
  where ts < now() - interval '7 days'
  group by 1, 2, 3
  on conflict (week, bot, path) do update set
    hits = public.bot_hits_weekly.hits + excluded.hits,
    updated_at = now();
  delete from public.bot_hits where ts < now() - interval '7 days';
$$;

-- Materialize one day of per-path rollups (idempotent upsert). Run monthly
-- for the previous month (or daily for yesterday), e.g. with pg_cron:
--   select cron.schedule('rollup-daily', '30 3 * * *',
--                        $$select public.rollup_daily((now() - interval '1 day')::date)$$);
create or replace function public.rollup_daily(day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.daily_rollups
    (date, path, pageviews, offer_views, leads, whatsapp_clicks, top_source, top_city)
  select
    day,
    e.path,
    count(*) filter (where e.type = 'pageview'),
    count(*) filter (where e.type = 'offer_view'),
    count(*) filter (where e.type = 'form_submit'),
    count(*) filter (where e.type = 'whatsapp_click'),
    (
      select s.utm_source
      from public.events e2
      join public.sessions s on s.id = e2.session_id
      where e2.path = e.path
        and e2.ts >= day and e2.ts < day + 1
        and s.utm_source is not null
      group by s.utm_source
      order by count(*) desc
      limit 1
    ),
    (
      select s.city
      from public.events e2
      join public.sessions s on s.id = e2.session_id
      where e2.path = e.path
        and e2.ts >= day and e2.ts < day + 1
        and s.city is not null
      group by s.city
      order by count(*) desc
      limit 1
    )
  from public.events e
  where e.ts >= day and e.ts < day + 1
    and e.path is not null
  group by e.path
  on conflict (date, path) do update set
    pageviews = excluded.pageviews,
    offer_views = excluded.offer_views,
    leads = excluded.leads,
    whatsapp_clicks = excluded.whatsapp_clicks,
    top_source = excluded.top_source,
    top_city = excluded.top_city,
    updated_at = now();
end;
$$;
