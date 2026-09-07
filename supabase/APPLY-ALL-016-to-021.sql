-- ============================================================================
-- ONE-PASTE APPLY: migrations 016 → 021 plus the seeds they need.
-- Paste the whole file into Supabase → SQL Editor → Run. Idempotent.
-- Seeds below were confirmed against the live project on 2026-09-07:
--   admin_allowlist = the three confirmed Supabase Auth logins
--   blog author     = Yahya Houssini (owner decision)
-- If a fourth admin account is ever created, add its e-mail to BOTH this table
-- and the ADMIN_EMAILS env var on Vercel.
-- ============================================================================

-- ---- 016: offer_tiers anon RLS follows the parent offer ---------------------
drop policy if exists anon_read on public.offer_tiers;
create policy anon_read on public.offer_tiers
  for select to anon
  using (
    is_published
    and exists (
      select 1 from public.offers o
      where o.id = offer_tiers.offer_id
        and o.is_published
        and (o.date_end is null or o.date_end >= current_date - interval '60 days')
    )
  );

-- ---- 017: admin allowlist (seeded FIRST, then the policy rewrite) ----------
create table if not exists public.admin_allowlist (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admin_allowlist enable row level security;

insert into public.admin_allowlist (email, note) values
  ('yahyahoussini366@gmail.com', 'owner / blog author'),
  ('sguerssel@gmail.com',        'direction'),
  ('yassinkdp@gmail.com',        'admin')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

do $$
begin
  if not exists (select 1 from public.admin_allowlist) then
    raise exception 'admin_allowlist is empty — seed it before rewriting the policies.';
  end if;
end $$;

do $$
declare t record;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> 'admin_allowlist'
  loop
    execute format('drop policy if exists admin_full_access on public.%I', t.table_name);
    execute format(
      'create policy admin_full_access on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t.table_name);
  end loop;
end $$;

-- ---- 018: postal code for PostalAddress -------------------------------------
alter table public.settings add column if not exists postal_code text;

-- ---- 019: editorial plan for the daily AI drafter ---------------------------
create table if not exists public.article_plan (
  id            uuid primary key default gen_random_uuid(),
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  query_family  text not null,
  angle         text,
  category      text check (category in ('confiance', 'omra', 'hajj', 'hotels', 'guide')),
  owner_path    text,
  season_month  int check (season_month is null or season_month between 1 and 12),
  status        text not null default 'queued' check (status in ('queued', 'drafted', 'skipped')),
  article_id    uuid references public.articles (id) on delete set null,
  drafted_at    timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists article_plan_queue_idx on public.article_plan (is_active, status, sort_order);
alter table public.article_plan enable row level security;
drop policy if exists admin_full_access on public.article_plan;
create policy admin_full_access on public.article_plan
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Seed only if empty (safe to re-run).
insert into public.article_plan (sort_order, query_family, angle, category, owner_path, season_month)
select * from (values
  (0,  'prix omra depuis le maroc 2026 bilan',
       'Bilan chiffré des prix de l''Omra depuis le Maroc cette année, écrit UNIQUEMENT à partir des offres et gammes de la fiche (min/max par gamme et par chambre, durées, mois). Aucun chiffre hors fiche ; renvoyer au baromètre pour la méthode.',
       'omra', '/barometre-prix-omra', null),
  (1,  'omra depuis casablanca aeroport mohammed v',
       'Guide pratique de l''aéroport Mohammed V pour un départ Omra en groupe : terminal, heure d''arrivée conseillée, enregistrement groupé, accompagnants, parking. Uniquement les faits de la fiche (compagnies, horaires des offres) — le reste sans chiffres.',
       'omra', '/omra-depuis-casablanca', null),
  (2,  'reserver omra depuis la france belgique espagne mre',
       'Marocains résidant à l''étranger : comment réserver avec une agence de Casablanca depuis l''Europe — documents, acompte (règle de la fiche : paiement à l''agence, jamais en ligne), départ depuis le Maroc, contact WhatsApp.',
       'confiance', '/agence-omra-casablanca', null),
  (3,  'omra parents ages accessibilite fauteuil roulant',
       'Préparer l''Omra d''un parent âgé : rythme du séjour, hôtel proche (distances de la fiche), fauteuil au Haram, médicaments, accompagnement. Aucun conseil médical : renvoyer au médecin traitant.',
       'guide', '/guide-omra/checklist', null),
  (4,  'conge omra attestation employeur maroc',
       'Poser ses congés pour l''Omra : durée à prévoir selon les offres de la fiche, quoi demander à l''employeur, anticiper. Pas de règle de droit du travail affirmée : renvoyer aux textes / RH.',
       'guide', '/guide-omra/checklist', null),
  (5,  'passeport omra validite renouvellement',
       'Le passeport pour l''Omra : validité exigée, renouvellement, délais — uniquement ce qui est dans la fiche/FAQ ; sinon indiquer où vérifier (administration).',
       'guide', '/guide-omra/documents-visa', null),
  (6,  'arrivee a jeddah premiere omra jour 1',
       'Le premier jour : arrivée à Jeddah, transfert, miqat, première Omra le soir même — déroulé concret d''un séjour organisé, sans horaires inventés.',
       'guide', '/guide-omra/rituels', null),
  (7,  'priere du vendredi au haram omra',
       'Vivre le vendredi à La Mecque ou Médine pendant l''Omra : arriver tôt, où se placer, conseils de groupe. Rester pratique.',
       'guide', '/guide-omra/rituels', null),
  (8,  'omra 10 jours ou 15 jours quelle duree',
       'Comparer les durées de séjour proposées dans la fiche : rythme, répartition Mecque/Médine, prix réels des offres. Ne jamais citer une durée ou un prix absent de la fiche.',
       'omra', '/bab-makka', null),
  (9,  'hotel a 100 m ou a 1 km du haram faut il payer plus',
       'Comment choisir la distance à l''hôtel : marcher vs navettes, chaleur, prières de nuit, familles — avec les hôtels et distances réels de la fiche. Renvoie au comparatif.',
       'hotels', '/hotels-omra', null),
  (10, 'omra en couple jeunes maries',
       'Partir en couple : chambre double (prix des offres de la fiche), rythme, moments à deux, groupe. Chaleureux, concret.',
       'omra', '/bab-makka', null),
  (11, 'vol casablanca jeddah duree compagnies escales',
       'Le vol Casablanca–Jeddah/Médine : compagnies présentes dans les offres de la fiche, direct ou escale, ce qu''il faut savoir. Aucune durée de vol inventée.',
       'omra', '/omra-depuis-casablanca', null),
  (12, 'journee type omra organisee programme',
       'Une journée type d''une Omra en groupe : prières, tawaf, repas, temps libre, accompagnateur. Programme indicatif, sans horaires précis inventés.',
       'omra', '/bab-makka', null),
  (13, 'agence omra casablanca quand on habite loin',
       'Pourquoi une agence de Casablanca même depuis Fès, Oujda ou Agadir : départs depuis les 8 villes de la fiche, contrat, contact WhatsApp, visite à l''agence facultative selon la FAQ.',
       'confiance', '/agence-omra-casablanca', null),
  (14, 'omra en groupe accompagnateur guide religieux',
       'Ce que change un accompagnateur : logistique, guidance, groupe. Uniquement l''équipe de la fiche ; pas de nom ni de titre inventé.',
       'confiance', '/bab-makka', null),
  (15, 'apres l omra retour maison continuer',
       'Après le retour : fatigue, garder l''élan spirituel, partager, préparer la prochaine. Doux, sans prêche.',
       'guide', '/guide-omra', null),
  (16, 'omra maladie chronique diabete hypertension',
       'Partir avec une maladie chronique : organisation pratique (médicaments, ordonnance, rythme, hôtel proche). Strictement aucun conseil médical : renvoyer au médecin.',
       'guide', '/guide-omra/checklist', null),
  (17, 'omra premiere fois seul sans groupe familial',
       'Partir seul(e) pour une première Omra : rejoindre un groupe organisé, sécurité, accompagnement, chambre partagée (prix triple/quad de la fiche).',
       'omra', '/bab-makka', null),
  (18, 'omra etudiants vacances universitaires',
       'Étudiants : caler l''Omra sur les vacances universitaires, budget serré (gammes économiques de la fiche), voyager en groupe d''amis.',
       'omra', '/omra-pas-cher', null),
  (19, 'omra offrir a ses parents cadeau',
       'Offrir l''Omra à ses parents : comment s''organiser à distance, contrat au nom des parents, accompagnement, paiement à l''agence (règle de la fiche).',
       'confiance', '/agence-omra-casablanca', null),
  (20, 'que mettre dans la valise omra femme homme',
       'Valise Omra : ihram, vêtements, chaussures, pharmacie de base, documents — liste pratique, sans marques ni règles douanières inventées.',
       'guide', '/guide-omra/checklist', null),
  (21, 'omra janvier',   'Omra en janvier : ambiance, affluence, rythme des journées, ce qu''il faut prévoir — chiffres UNIQUEMENT s''ils sont dans la fiche ; sinon décrire sans chiffres et renvoyer au baromètre.', 'omra', '/omra-janvier',   1),
  (22, 'omra fevrier',   'Omra en février : idem — pas de météo ni de prix inventés.', 'omra', '/omra-fevrier',   2),
  (23, 'omra mars',      'Omra en mars : idem — position par rapport au Ramadan selon la fiche uniquement.', 'omra', '/omra-mars',      3),
  (24, 'omra avril',     'Omra en avril : idem.', 'omra', '/omra-avril',     4),
  (25, 'omra mai',       'Omra en mai : idem.', 'omra', '/omra-mai',       5),
  (26, 'omra juin',      'Omra en juin : idem — début de saison chaude, hydratation, horaires du tawaf.', 'omra', '/omra-juin',      6),
  (28, 'omra aout',      'Omra en août : idem — chaleur, vacances, familles.', 'omra', '/omra-aout',      8),
  (29, 'omra septembre', 'Omra en septembre : idem — rentrée, affluence.', 'omra', '/omra-septembre', 9),
  (31, 'omra novembre',  'Omra en novembre : idem.', 'omra', '/omra-novembre',  11),
  (32, 'omra decembre',  'Omra en décembre : idem — vacances de fin d''année, familles.', 'omra', '/omra-decembre',  12),
  (33, 'omra hiver vs ete lequel choisir',
       'Comparer hiver et été pour l''Omra : chaleur, affluence, durée des journées, familles — sans chiffres météo ni prix hors fiche ; renvoyer au baromètre et aux hubs mensuels.',
       'guide', '/guide-omra/meilleure-periode', null),
  (34, 'omra entre amis groupe prive',
       'Organiser une Omra entre amis ou en famille élargie : constituer un groupe, chambres partagées (prix de la fiche), un seul contact avec l''agence.',
       'omra', '/bab-makka', null)
) as v(sort_order, query_family, angle, category, owner_path, season_month)
where not exists (select 1 from public.article_plan);

-- ---- 020: reverse links + mechanical auto-publish ---------------------------
alter table public.articles add column if not exists supports_path text;
create index if not exists articles_supports_path_idx on public.articles (supports_path);
alter table public.settings add column if not exists blog_autopublish boolean not null default true;
alter table public.settings add column if not exists blog_author_name text;
alter table public.settings add column if not exists blog_reviewer_name text;

-- Owner decision 2026-09-07: author = Yahya Houssini, auto-publish ON.
update public.settings
set blog_author_name = coalesce(nullif(blog_author_name, ''), 'Yahya Houssini'),
    blog_autopublish = true
where id = 1;

-- ---- 021: bot_hits_weekly retention (26 weeks) -----------------------------
create or replace function public.rollup_bot_hits()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.bot_hits_weekly (week, bot, path, hits)
  select date_trunc('week', ts)::date, bot, path, count(*)
  from public.bot_hits
  where ts < now() - interval '7 days'
  group by 1, 2, 3
  on conflict (week, bot, path) do update set
    hits = public.bot_hits_weekly.hits + excluded.hits,
    updated_at = now();
  delete from public.bot_hits where ts < now() - interval '7 days';
  delete from public.bot_hits_weekly where week < (now() - interval '26 weeks')::date;
$$;

-- ---- sanity -----------------------------------------------------------------
select
  (select count(*) from public.admin_allowlist)                  as admins,
  (select count(*) from public.article_plan)                     as plan_rows,
  (select blog_author_name from public.settings where id = 1)    as blog_author,
  (select blog_autopublish from public.settings where id = 1)    as autopublish;
