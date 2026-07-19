-- ============================================================================
-- Migration 009: Phase 5 taxonomy coverage — analytics events, AI-bot logger,
-- city-page guard, guide cluster, glossary, GBP/person fields
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Analytics event types.
-- BUG FIX: wt.js already sends tier_select/room_select, but the check
-- constraint rejected them — and because /api/t inserts each batch as one
-- statement, EVERY batch containing one was silently dropped. Extend the list
-- and add the Phase 5 events (tel_click, faq_expand, devis_request).
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.events'::regclass and contype = 'c';
  if c is not null then
    execute format('alter table public.events drop constraint %I', c);
  end if;
end;
$$;

alter table public.events add constraint events_type_check check (
  type in (
    'pageview', 'offer_view', 'form_start', 'form_submit',
    'whatsapp_click', 'cta_click', 'web_vital',
    'tier_select', 'room_select',
    'tel_click', 'faq_expand', 'devis_request'
  )
);

-- ---------------------------------------------------------------------------
-- 2) AI/search bot logger. Raw hits inserted by the middleware (service role;
-- no anon policy → invisible to the public API). Growth is capped by the
-- nightly cron: rows older than 7 days are folded into bot_hits_weekly then
-- deleted.
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

-- ---------------------------------------------------------------------------
-- 3) City pages (/omra-depuis-{ville}) anti-doorway guard. One row per city
-- slug: unique local content slots + the explicit indexability toggle. The
-- page ships NOINDEX until an admin fills the content AND flips the toggle
-- (Phase 4 A2 §12). Missing row ⇒ generic template + noindex.
create table if not exists public.city_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  is_indexable boolean not null default false,
  intro_fr text, intro_ar text, intro_en text,
  logistics_fr text, logistics_ar text, logistics_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_city_pages on public.city_pages;
create trigger touch_city_pages before update on public.city_pages
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Guide cluster (/guide-omra + children). Content is admin-authored
-- (LAWS §4/§6 — scaffolds render an honest "en préparation" empty state until
-- then). is_published = visible to anon; is_indexable = admin index switch —
-- the page additionally self-noindexes while body/summary are empty.
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

drop trigger if exists touch_guide_pages on public.guide_pages;
create trigger touch_guide_pages before update on public.guide_pages
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Glossary (/glossaire-omra) — DefinedTerm entries.
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

drop trigger if exists touch_glossary_terms on public.glossary_terms;
create trigger touch_glossary_terms before update on public.glossary_terms
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6) Settings: Google Business Profile listing URL (schema hasMap + sameAs).
alter table public.settings
  add column if not exists gbp_url text;

-- 7) Team members: public profile URL (Person schema sameAs slot — LinkedIn
-- etc.). Empty ⇒ omitted from the schema, never guessed.
alter table public.team_members
  add column if not exists sameas_url text;

-- ---------------------------------------------------------------------------
-- 8) RLS. bot_hits / bot_hits_weekly: NO anon policy (service + admin only).
alter table public.bot_hits enable row level security;
alter table public.bot_hits_weekly enable row level security;
alter table public.city_pages enable row level security;
alter table public.guide_pages enable row level security;
alter table public.glossary_terms enable row level security;

drop policy if exists admin_full_access on public.bot_hits;
create policy admin_full_access on public.bot_hits
  for all to authenticated using (true) with check (true);

drop policy if exists admin_full_access on public.bot_hits_weekly;
create policy admin_full_access on public.bot_hits_weekly
  for all to authenticated using (true) with check (true);

drop policy if exists admin_full_access on public.city_pages;
create policy admin_full_access on public.city_pages
  for all to authenticated using (true) with check (true);

drop policy if exists admin_full_access on public.guide_pages;
create policy admin_full_access on public.guide_pages
  for all to authenticated using (true) with check (true);

drop policy if exists admin_full_access on public.glossary_terms;
create policy admin_full_access on public.glossary_terms
  for all to authenticated using (true) with check (true);

drop policy if exists anon_read on public.city_pages;
create policy anon_read on public.city_pages
  for select to anon using (true);

drop policy if exists anon_read on public.guide_pages;
create policy anon_read on public.guide_pages
  for select to anon using (is_published);

drop policy if exists anon_read on public.glossary_terms;
create policy anon_read on public.glossary_terms
  for select to anon using (is_published);
