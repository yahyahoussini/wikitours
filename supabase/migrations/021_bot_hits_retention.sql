-- 021 — bot_hits_weekly retention.
--
-- The middleware logs every request whose User-Agent matches an AI/search
-- crawler. rollup_bot_hits() folded raw rows into (week, bot, path) counts and
-- purged the raw table — but nothing ever deleted from bot_hits_weekly. Anyone
-- sending "User-Agent: GPTBot" to a unique path therefore created a permanent
-- row: unbounded growth on a free-tier database. Keep 26 weeks — enough for
-- the monthly GEO citation log's trend — and drop the rest in the same nightly
-- pass. (Path length is capped in the middleware from the same change.)

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
  delete from public.bot_hits_weekly where week < (now() - interval '26 weeks')::date;
$$;
