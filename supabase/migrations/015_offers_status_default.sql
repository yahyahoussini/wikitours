-- ============================================================================
-- 015 — offers.status: ensure the live default matches supabase/schema.sql.
-- supabase/schema.sql declares `status text not null default 'open'`, but the
-- live column had no default (pre-dates that line) — an explicit NULL from
-- the admin form's unrequired "Statut" select therefore hit the NOT NULL
-- constraint and aborted the ENTIRE offer insert (gammes never got the
-- chance to exist). The form now always sends a value (registry.js: status
-- is `required` with `default: 'open'`); this migration is defense in depth
-- for any other insert path.
-- ============================================================================

alter table offers
  alter column status set default 'open';

-- Backfill: any pre-existing row that slipped through as NULL (shouldn't
-- exist given the NOT NULL constraint, but safe as a no-op if none do).
update offers set status = 'open' where status is null;
