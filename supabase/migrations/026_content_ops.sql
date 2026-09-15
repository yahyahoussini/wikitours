-- 026 — content operations: the settings, the year's calendar, the lander
-- registry, the series, the ops log and the policies the live components read.
--
-- GENERATE-AHEAD, RENDER-LIVE, PUBLISH-BY-TIME (2026-09-14, second brief).
--   * Nothing here changes how a post becomes public: that is still the anon
--     RLS policy on articles (is_published and published_at <= now(), 020).
--   * content_calendar is the PLAN — one row per slot for a year, seeded from
--     data/content-calendar.json by scripts/build-content-calendar.mjs. A slot
--     becomes an articles row only when a Claude Code session writes it and
--     the gate (scripts/content-gate.mjs) passes it; the slot then points at
--     the article (article_id, status = 'scheduled').
--   * Nothing is public except policies and lander_registry (read by the live
--     components and the resolver). The calendar, the settings and the log
--     are admin/service only.
-- Apply after 025. Idempotent.

-- ── settings (one row) ───────────────────────────────────────────────────────
create table if not exists public.content_ops_settings (
  id smallint primary key default 1 check (id = 1),
  cycle_days smallint not null default 3 check (cycle_days between 1 and 30),
  posts_per_cycle smallint not null default 2 check (posts_per_cycle between 1 and 10),
  -- Local times (Africa/Casablanca) of the slots inside a cycle.
  slot_times text[] not null default array['08:30', '18:00'],
  start_date date not null default (current_date + 7),
  -- How far ahead the generator keeps the calendar written (days).
  buffer_days smallint not null default 60 check (buffer_days between 7 and 365),
  enabled boolean not null default false,
  similarity_threshold numeric(3, 2) not null default 0.85 check (similarity_threshold between 0.5 and 1),
  timezone text not null default 'Africa/Casablanca',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.content_ops_settings (id) values (1) on conflict (id) do nothing;

alter table public.content_ops_settings enable row level security;
drop policy if exists content_ops_settings_admin_full_access on public.content_ops_settings;
create policy content_ops_settings_admin_full_access on public.content_ops_settings for all
  using (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')));
drop trigger if exists content_ops_settings_set_updated_at on public.content_ops_settings;
create trigger content_ops_settings_set_updated_at before update on public.content_ops_settings
  for each row execute function public.set_updated_at();

-- ── series ───────────────────────────────────────────────────────────────────
create table if not exists public.content_series (
  id text primary key,
  title_fr text not null, title_ar text, title_en text,
  parts smallint not null check (parts between 1 and 30),
  master_locale text not null default 'fr' check (master_locale in ('fr', 'ar_co_master')),
  track text not null check (track in ('ramadan', 'omra', 'hajj')),
  pillar_path text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_series enable row level security;
drop policy if exists content_series_public_read on public.content_series;
create policy content_series_public_read on public.content_series for select using (true);
drop policy if exists content_series_admin_full_access on public.content_series;
create policy content_series_admin_full_access on public.content_series for all
  using (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')));
drop trigger if exists content_series_set_updated_at on public.content_series;
create trigger content_series_set_updated_at before update on public.content_series
  for each row execute function public.set_updated_at();

-- ── the calendar (one row per slot) ──────────────────────────────────────────
create table if not exists public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  slot_index integer not null unique,
  publish_at timestamptz not null,
  track text not null check (track in ('ramadan', 'omra', 'hajj')),
  pillar text not null check (pillar in ('omra', 'omra_ramadan', 'hajj', 'preparation', 'spirituality', 'trust_agency', 'pricing', 'audiences', 'seasonal')),
  cluster text not null,
  format text not null,
  audience text,
  phase text,
  hijri_anchor text,
  series_id text references public.content_series (id) on delete set null,
  series_part smallint,
  master_locale text not null default 'fr' check (master_locale in ('fr', 'ar_co_master')),
  primary_query_fr text not null,
  primary_query_ar text,
  primary_query_en text,
  secondary_queries text[] not null default '{}',
  intent text,
  -- Never a URL: the resolver turns it into the best indexable lander at request time.
  commercial_intent text,
  pillar_path text not null,
  sibling_paths text[] not null default '{}',
  working_titles jsonb not null default '{}'::jsonb,
  angle text not null,
  closest_existing_url text,
  delta text,
  outline jsonb not null default '[]'::jsonb,
  stable_facts_needed text[] not null default '{}',
  live_components_needed text[] not null default '{}',
  faq_seed_questions text[] not null default '{}',
  forbidden_topics text[] not null default '{}',
  length_target text,
  -- The admin's toggle: off and the generator ignores the slot without losing
  -- the row (src/lib/admin/registry.js « calendrier » publishField).
  is_active boolean not null default true,
  status text not null default 'planned' check (status in ('planned', 'generating', 'scheduled', 'published', 'skipped', 'unfillable')),
  slug text,
  article_id uuid references public.articles (id) on delete set null,
  skip_reason text,
  gate_report jsonb,
  review jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_calendar_publish_at_idx on public.content_calendar (publish_at);
create index if not exists content_calendar_status_idx on public.content_calendar (status);
alter table public.content_calendar enable row level security;
drop policy if exists content_calendar_admin_full_access on public.content_calendar;
create policy content_calendar_admin_full_access on public.content_calendar for all
  using (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')));
drop trigger if exists content_calendar_set_updated_at on public.content_calendar;
create trigger content_calendar_set_updated_at before update on public.content_calendar
  for each row execute function public.set_updated_at();

-- ── the lander registry (pages that OWN a topic) ─────────────────────────────
create table if not exists public.lander_registry (
  path text primary key,
  kind text not null,
  indexable boolean not null default false,
  h1_fr text, h1_ar text, h1_en text,
  title_fr text, title_ar text, title_en text,
  -- The query family the page owns, per locale — a post never targets it.
  query_fr text, query_ar text, query_en text,
  month smallint check (month between 1 and 12),
  occasion text,
  city text,
  hotel text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lander_registry enable row level security;
drop policy if exists lander_registry_public_read on public.lander_registry;
create policy lander_registry_public_read on public.lander_registry for select using (true);
drop policy if exists lander_registry_admin_full_access on public.lander_registry;
create policy lander_registry_admin_full_access on public.lander_registry for all
  using (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')));
drop trigger if exists lander_registry_set_updated_at on public.lander_registry;
create trigger lander_registry_set_updated_at before update on public.lander_registry
  for each row execute function public.set_updated_at();

-- ── the ops log ──────────────────────────────────────────────────────────────
create table if not exists public.content_ops_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  kind text not null,
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  slot_index integer,
  slug text,
  message text not null,
  payload jsonb
);
create index if not exists content_ops_events_at_idx on public.content_ops_events (at desc);
alter table public.content_ops_events enable row level security;
drop policy if exists content_ops_events_admin_full_access on public.content_ops_events;
create policy content_ops_events_admin_full_access on public.content_ops_events for all
  using (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')));

-- ── policies (rendered live by <PolicyFact key /> — never in prose) ──────────
create table if not exists public.policies (
  key text primary key check (key in ('deposit', 'payment', 'passport_validity', 'visa_included', 'children')),
  text_fr text not null, text_ar text, text_en text,
  source text,
  as_of date,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.policies enable row level security;
drop policy if exists policies_public_read on public.policies;
create policy policies_public_read on public.policies for select using (is_published);
drop policy if exists policies_admin_full_access on public.policies;
create policy policies_admin_full_access on public.policies for all
  using (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')));
drop trigger if exists policies_set_updated_at on public.policies;
create trigger policies_set_updated_at before update on public.policies
  for each row execute function public.set_updated_at();

-- Seed from the published FAQ, verbatim — the answers the site already shows
-- (faqs 291929f0 · 4b284c89 · 87ca3c4a). The admin edits them here afterwards.
insert into public.policies (key, text_fr, text_ar, text_en, source, as_of)
select 'deposit', f.answer_fr, f.answer_ar, f.answer_en, 'faqs/' || f.id, current_date
  from public.faqs f where f.id::text like '291929f0%'
on conflict (key) do nothing;
insert into public.policies (key, text_fr, text_ar, text_en, source, as_of)
select 'payment', f.answer_fr, f.answer_ar, f.answer_en, 'faqs/' || f.id, current_date
  from public.faqs f where f.id::text like '4b284c89%'
on conflict (key) do nothing;
insert into public.policies (key, text_fr, text_ar, text_en, source, as_of)
select 'passport_validity', f.answer_fr, f.answer_ar, f.answer_en, 'faqs/' || f.id, current_date
  from public.faqs f where f.id::text like '87ca3c4a%'
on conflict (key) do nothing;
insert into public.policies (key, text_fr, text_ar, text_en, source, as_of)
select 'visa_included', f.answer_fr, f.answer_ar, f.answer_en, 'faqs/' || f.id, current_date
  from public.faqs f where f.id::text like 'db6dea89%'
on conflict (key) do nothing;
insert into public.policies (key, text_fr, text_ar, text_en, source, as_of)
select 'children', f.answer_fr, f.answer_ar, f.answer_en, 'faqs/' || f.id, current_date
  from public.faqs f where f.id::text like '5568a11d%'
on conflict (key) do nothing;

-- ── author profile: what the Person node may carry (E-E-A-T) ─────────────────
-- Filled by the owner from the AUTHOR record (docs/authors-intake.md); never
-- by code. knowsAbout → Person.knowsAbout, affiliation → Person.affiliation.
alter table public.team_members
  add column if not exists knows_about text,
  add column if not exists affiliation text;
