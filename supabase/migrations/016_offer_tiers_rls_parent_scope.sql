-- 016 — offer_tiers anon RLS must follow the PARENT offer's visibility.
--
-- The anon policy checked only offer_tiers.is_published, which defaults to true
-- (`is_published boolean not null default true`). The tiers of a DRAFT offer —
-- price_double / price_triple / price_quad / price_quint, hotel ids and nights —
-- were therefore readable by anyone holding the public anon key through a direct
-- PostgREST call, exposing the commercially sensitive part of an unannounced
-- departure. The same gap kept serving tiers for offers already aged out past
-- the 60-day grace window, after the parent row had stopped being readable.
--
-- The comment that shipped above the old policy ("once date_end passes, anon can
-- no longer read the row") described the offers policy, not this one.
--
-- No application code depends on the looser rule: both readers already scope by
-- a published offer id (src/lib/data/content.js). The EXISTS lookup rides the
-- existing idx_offer_tiers_offer (offer_id, sort_order) index.
--
-- The parent conditions are spelled out rather than left to the offers policy
-- (which RLS would also apply to this subquery) so the intent survives any later
-- edit to that policy.

drop policy if exists anon_read on public.offer_tiers;
create policy anon_read on public.offer_tiers
  for select to anon
  using (
    is_published
    and exists (
      select 1
      from public.offers o
      where o.id = offer_tiers.offer_id
        and o.is_published
        and (o.date_end is null or o.date_end >= current_date - interval '60 days')
    )
  );
