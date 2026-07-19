-- ============================================================================
-- 011 — Bab Makka social profiles (second set alongside the Wiki Tours ones).
-- Rendered in the footer under their own brand label and as sameAs on the
-- Brand node of offer-page Product JSON-LD. Empty ⇒ omitted (LAW §10).
-- ============================================================================

alter table settings
  add column if not exists babmakka_facebook_url text,
  add column if not exists babmakka_instagram_url text,
  add column if not exists babmakka_tiktok_url text,
  add column if not exists babmakka_youtube_url text;
