-- 020 — Autonomous blog: reverse internal links + mechanical auto-publish.
--
-- articles.supports_path: the owner page an article supports (the drafter
-- copies it from article_plan.owner_path; admins can set it on any article).
-- Hub pages render RelatedArticles from it — the hub → article half of the
-- internal-linking loop. The article → hub half is enforced by the drafter's
-- quality gate.
--
-- settings.blog_autopublish: the owner's decision (2026-09-04) that no daily
-- human action is required. When ON, the drafter publishes a draft ITSELF —
-- but ONLY when the code-side gate passes with zero problems and zero
-- unsourced-price / external-link / missing-link flags, AND an author is
-- configured (E-E-A-T needs a named person). Anything less lands as a draft
-- with the review e-mail, exactly as before. Default ON per that decision;
-- the admin can switch it off at any time (LAW §4).

alter table public.articles add column if not exists supports_path text;
create index if not exists articles_supports_path_idx on public.articles (supports_path);

alter table public.settings add column if not exists blog_autopublish boolean not null default true;
alter table public.settings add column if not exists blog_author_name text;
alter table public.settings add column if not exists blog_reviewer_name text;
