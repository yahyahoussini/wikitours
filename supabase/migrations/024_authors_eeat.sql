-- ============================================================================
-- Migration 024: authors — E-E-A-T for a YMYL site
-- ============================================================================

-- The people behind the content, on the existing team_members rows (the
-- client already entered five real staff with their roles). What is added is
-- what a byline and a Person node need and the client must SUPPLY — nothing
-- here is filled in by code: years of experience, languages, a bio and
-- credentials per locale, an Arabic/English form of the name. is_placeholder
-- marks a stub profile: such a row is NEVER rendered, never emitted as schema,
-- and the build gate fails on any placeholder text reaching a page.
alter table public.team_members
  add column if not exists slug text,
  add column if not exists name_ar text,
  add column if not exists name_en text,
  add column if not exists years_experience integer
    check (years_experience is null or years_experience >= 0),
  add column if not exists languages text,        -- e.g. "français, arabe, darija, anglais"
  add column if not exists bio_fr text,
  add column if not exists bio_ar text,
  add column if not exists bio_en text,
  add column if not exists credentials_fr text,
  add column if not exists credentials_ar text,
  add column if not exists credentials_en text,
  add column if not exists is_placeholder boolean not null default false;

create unique index if not exists team_members_slug_idx
  on public.team_members (slug) where slug is not null;

-- Deterministic slugs for the five people the client entered (their names,
-- as typed). The slug is the stable @id fragment on /equipe and in every
-- article's author node — it must never change once published.
update public.team_members set slug = 'soumaya-guerssel' where slug is null and name = 'Soumaya Guerssel';
update public.team_members set slug = 'abir-aitlho'      where slug is null and name = 'Abir Aitlho';
update public.team_members set slug = 'aya-tahiri'       where slug is null and name = 'Aya Tahiri';
update public.team_members set slug = 'mustapha-elkhaoui' where slug is null and name = 'Mustapha Elkhaoui';
update public.team_members set slug = 'hassan-elasyly'   where slug is null and name = 'Hassan Elasyly';

-- The blog author named in settings.blog_author_name, as a PLACEHOLDER
-- profile: the name is real (it is what the two hand-written articles are
-- signed with), everything else is for the client to supply. Unpublished and
-- flagged, so it cannot render until both are cleared.
insert into public.team_members (name, slug, role_fr, is_placeholder, is_published, sort_order)
select 'Yahya Houssini', 'yahya-houssini', '[À COMPLÉTER] rôle', true, false, 99
where not exists (select 1 from public.team_members where slug = 'yahya-houssini' or name = 'Yahya Houssini');

-- Articles point at people, not at free text: author_id / reviewer_id.
-- author_name / reviewed_by stay as the legacy display fallback.
alter table public.articles
  add column if not exists author_id uuid references public.team_members (id) on delete set null,
  add column if not exists reviewer_id uuid references public.team_members (id) on delete set null;
create index if not exists articles_author_idx on public.articles (author_id);
