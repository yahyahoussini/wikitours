-- 019 — article_plan: the admin-controlled editorial backlog the daily
-- AI drafter works through (api/cron/draft-article). Requires 017 (is_admin()).
--
-- One row = one future article: the query family it will OWN, the angle, the
-- page it SUPPORTS (and must link to — never compete with), and an optional
-- month so seasonal pieces are drafted ~3 months ahead. The cron takes the
-- first active + queued row, writes an article into `articles` dated for the
-- next free 08:00 slot, and marks the row `drafted`. Whether it publishes by
-- itself is decided mechanically by the quality gate + Réglages (migration 020).
-- Every family below is declared in docs/keyword-map.md (AI-drafted backlog).

create table if not exists public.article_plan (
  id            uuid primary key default gen_random_uuid(),
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  query_family  text not null,
  angle         text,
  category      text check (category in ('confiance', 'omra', 'hajj', 'hotels', 'guide')),
  owner_path    text,          -- locale-relative page this article supports, e.g. /guide-omra/checklist
  season_month  int check (season_month is null or season_month between 1 and 12),
  status        text not null default 'queued' check (status in ('queued', 'drafted', 'skipped')),
  article_id    uuid references public.articles (id) on delete set null,
  drafted_at    timestamptz,
  notes         text,          -- the drafter appends errors / gate results here
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists article_plan_queue_idx
  on public.article_plan (is_active, status, sort_order);

-- Internal table: no anon policy. Admin access through the allowlist predicate
-- (tables created by a migration are NOT covered by schema.sql's policy loop).
alter table public.article_plan enable row level security;
drop policy if exists admin_full_access on public.article_plan;
create policy admin_full_access on public.article_plan
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- Seed: 35 strategy-aligned topics (≈ five weeks at one a day) ---------
-- Only when the table is empty, so re-running is safe. Row 0 is the yearly
-- price bilan written from real offer prices. Evergreen next (1–20), then a
-- per-month series that supplies the informational half of each month hub
-- (the hub+article pattern the keyword map prescribes), then two comparisons.
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
