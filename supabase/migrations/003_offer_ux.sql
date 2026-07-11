-- 003 — OFFER EXPERIENCE v2 (idempotent; RLS patterns unchanged).
-- leads.room_type: room intent captured silently by the offer-page selector.
-- offers.exclusions_*: the honest "non inclus" list.
-- hotels.logo_path: hotel brand mark (premium trust signal), storage path
-- in the public-images bucket like media.path.

alter table public.leads
  add column if not exists room_type text
    check (room_type is null or room_type in ('double', 'triple', 'quad', 'quint'));

alter table public.offers add column if not exists exclusions_fr text;
alter table public.offers add column if not exists exclusions_ar text;
alter table public.offers add column if not exists exclusions_en text;

alter table public.hotels add column if not exists logo_path text;
