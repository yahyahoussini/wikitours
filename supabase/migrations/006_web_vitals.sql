-- ============================================================================
-- Migration 006: Core Web Vitals as a first-party event type
-- ============================================================================

-- Field CWV (LCP / CLS / INP) collected by public/wt.js and stored like any
-- other beacon event. Google's own CWV report needs enough CrUX traffic before
-- it shows anything; this gives real field data from the first visitor, split
-- by path and device via the existing sessions/visitors joins.
--
-- events.type is guarded by an inline check constraint, which Postgres names
-- events_type_check — it must be replaced, not added to.
alter table public.events drop constraint if exists events_type_check;

alter table public.events add constraint events_type_check check (
  type in (
    'pageview', 'offer_view', 'form_start', 'form_submit',
    'whatsapp_click', 'cta_click', 'web_vital'
  )
);

-- The metric + value live in meta->>'label' as 'LCP:2400' | 'CLS:0.052' |
-- 'INP:120', so no new columns are needed.
