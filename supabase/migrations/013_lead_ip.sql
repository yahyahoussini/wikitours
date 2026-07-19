-- ============================================================================
-- 013 — capture the submitting IP on each reservation request.
-- Shown on the CRM client profile. The API tolerates the column being absent
-- (retries without it), but run this promptly so IPs start being recorded.
-- ============================================================================

alter table leads
  add column if not exists ip text;
