-- ============================================================================
-- Migration 005: Editable "Notre histoire" story + team display controls
-- ============================================================================

-- A written story (per locale) that replaces the milestone timeline on the home
-- "Notre histoire" section, plus team controls: an on/off toggle and a choice
-- between individual member cards and a single full-team photo.
alter table public.settings
  add column if not exists story_fr     text,
  add column if not exists story_ar     text,
  add column if not exists story_en     text,
  add column if not exists team_enabled boolean not null default true,
  add column if not exists team_display text not null default 'members'
    check (team_display in ('members', 'photo'));

-- The single "full team" photo reuses the polymorphic galleries table under a
-- virtual entity (entity_type = 'settings_team'), mirroring settings_hero /
-- settings_office. No new table, so the existing galleries/media RLS already
-- covers reads (anon) and admin writes — no extra policy needed.





