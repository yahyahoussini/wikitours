-- 027 — the six-bed room price (chambre sextuple / الغرفة السداسية)
--
-- Why this exists
-- ---------------
-- The Ramadan 2027 offer sheet (32-day programme, 12 February to 15 March)
-- advertises "سعر الفرد يبدأ من 24.900 درهم" — and that headline figure is the
-- price of a SIX-bed room. offer_tiers stops at price_quint, so the cheapest
-- price the site can represent for that departure is 25.900 DH, the five-bed
-- room. The page therefore under-sells the programme by 1.000 DH against the
-- agency's own poster, and against competitors who do advertise six-bed rooms
-- (Manasiki's Ramadan 2027 sheet prints a سداسي at 23.900 DH, read 2026-09-22).
--
-- Six-bed rooms are a real segment of the Moroccan Umrah market, not an edge
-- case: they are how large families and low-budget pilgrims travel. The column
-- belongs in the schema.
--
-- After applying this
-- -------------------
-- 1. Add 'price_sextuple' to ROOM_PRICE_KEYS in src/lib/data/content.js and to
--    the same list in src/lib/month-stats.js — those two drive computeMinPrice,
--    computeMaxPrice and the month landers' observed-price blocks.
-- 2. Add the room to the admin editor: src/components/admin/OfferTierManager.jsx
--    (ROOM_KEYS), src/lib/admin/registry.js, src/app/admin/entity-actions.js
--    (zod schema + the mapped insert), src/app/admin/(protected)/offres/page.js.
-- 3. Add the label to src/i18n/{fr,ar,en}.json under offer.rooms and
--    offer.roomsShort — "Chambre sextuple" / "الغرفة السداسية" / "Six-bed room".
-- 4. Set the price on the economy tier of omra-ramadan-2027-32-jours to 24900
--    and the offer's starting_price to 24900.
--
-- Nothing breaks before step 1: a column the code never reads is inert, and
-- every existing tier keeps a NULL there, which computeMinPrice already skips.

alter table public.offer_tiers
  add column if not exists price_sextuple integer;

comment on column public.offer_tiers.price_sextuple is
  'Per-person price in MAD for a six-bed room. NULL when the tier does not sell one.';

-- The legacy per-offer price columns are kept in step with the tier columns so
-- that an offer with no tiers can still carry the figure (src/lib/data/content.js
-- synthesises a pseudo-tier from these when offer_tiers is empty).
alter table public.offers
  add column if not exists price_sextuple integer;

comment on column public.offers.price_sextuple is
  'Legacy per-offer six-bed price in MAD, used only when the offer has no tiers.';
