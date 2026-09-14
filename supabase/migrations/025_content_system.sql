-- 025 — the content system: Hijri events (moon-sighting adjustable) and the
-- editorial plan's Arabic / secondary query sets.
--
-- GENERATE-AHEAD, RENDER-LIVE, PUBLISH-BY-TIME (standing brief, 2026-09-14):
--   * Publishing already is "publish_at has passed": the anon RLS policy on
--     articles is `is_published and published_at <= now()` (migration 020).
--     Nothing here changes that model; those two columns ARE the brief's
--     status='scheduled' / publish_at pair.
--   * Hijri dates are computed with @umalqura/core (src/lib/hijri.js) and
--     written here by scripts/build-hijri-events.mjs, so the admin can move a
--     date by a day once the official moon sighting is announced. Every
--     rendering carries the caveat (fr « sous réserve de l'observation de la
--     lune » · ar « حسب رؤية الهلال »).
--   * article_plan gains the Arabic co-master query set (Ramadan / Hajj slots)
--     and the transliterated / Darija secondary queries Moroccans actually type.

create table if not exists public.hijri_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in ('ramadan', 'laylat-al-qadr', 'eid-al-fitr', 'dhul-hijja', 'arafat', 'eid-al-adha', 'ashura', 'mawlid')),
  hijri_year integer not null check (hijri_year between 1400 and 1500),
  hijri_month smallint not null check (hijri_month between 1 and 12),
  hijri_day smallint not null check (hijri_day between 1 and 30),
  -- Computed (Umm al-Qura) at seed time; the admin overwrites it after the sighting.
  gregorian_date date not null,
  is_confirmed boolean not null default false,
  label_fr text, label_ar text, label_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event, hijri_year)
);

alter table public.hijri_events enable row level security;
drop policy if exists hijri_events_public_read on public.hijri_events;
create policy hijri_events_public_read on public.hijri_events for select using (true);
drop policy if exists hijri_events_admin_full_access on public.hijri_events;
create policy hijri_events_admin_full_access on public.hijri_events for all
  using (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(auth.jwt() ->> 'email')));

drop trigger if exists hijri_events_set_updated_at on public.hijri_events;
create trigger hijri_events_set_updated_at before update on public.hijri_events
  for each row execute function public.set_updated_at();

-- Editorial plan: the slot type, the Arabic co-master query (Ramadan / Hajj
-- slots) and the secondary queries — one per line, transliterated variants
-- (3omra, oumra, umrah, hadj, 7ajj, ramdan) and Darija phrasings included.
alter table public.article_plan
  add column if not exists slot text not null default 'omra' check (slot in ('omra', 'ramadan', 'hajj')),
  add column if not exists query_family_ar text,
  add column if not exists secondary_queries text,
  add column if not exists secondary_queries_ar text,
  add column if not exists angle_ar text;
