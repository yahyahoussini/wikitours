-- ============================================================================
-- 012 — optional customer comment on reservation requests.
-- The public lead form (offer booking card + all other placements) gains a
-- free-text "Commentaire" field; shown in the CRM lead detail.
-- The API tolerates this column being absent (retries without it), but run
-- this promptly so no comment is dropped.
-- ============================================================================

alter table leads
  add column if not exists message text;
