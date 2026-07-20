-- ============================================================================
-- 014 — legal pages (mentions légales / politique de confidentialité / CGV).
-- Admin-edited markdown, fr/ar/en. Public pages are noindex + show an empty
-- state until BOTH fr and ar bodies exist AND is_published is on (parity law);
-- footer links appear only then. Ad platforms (Meta/Google) require a live
-- privacy policy URL — fill that one first.
-- ============================================================================

create table if not exists public.legal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_fr text,
  title_ar text,
  title_en text,
  body_md_fr text,
  body_md_ar text,
  body_md_en text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_pages enable row level security;

drop policy if exists "public read legal_pages" on public.legal_pages;
create policy "public read legal_pages" on public.legal_pages
  for select to anon, authenticated
  using (is_published);

drop policy if exists admin_full_access on public.legal_pages;
create policy admin_full_access on public.legal_pages
  for all to authenticated
  using (true) with check (true);

drop trigger if exists touch_updated_at on public.legal_pages;
create trigger touch_updated_at before update on public.legal_pages
  for each row execute function public.touch_updated_at();

-- Seed the three fixed pages (unpublished until the admin fills them).
insert into public.legal_pages (slug, title_fr, title_ar, title_en)
values
  ('mentions-legales', 'Mentions légales', 'الإشعارات القانونية', 'Legal notice'),
  ('politique-de-confidentialite', 'Politique de confidentialité', 'سياسة الخصوصية', 'Privacy policy'),
  ('cgv', 'Conditions générales de vente', 'الشروط العامة للبيع', 'Terms of sale')
on conflict (slug) do nothing;
