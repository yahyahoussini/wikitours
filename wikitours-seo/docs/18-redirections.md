# Carte des URL et des redirections — Bab Makka (wikitours.ma) — Layers 5.3, 9.5, 18.6

> **Mesuré le 2026-09-21** (10:36–11:20 UTC), en lecture seule, contre la production.
> Sources : `url-report.json` (276 URL du sitemap), `crawl/wikitours.ma.json` (282 pages),
> `check-urls.log` (§ Host variants), `src/middleware.js`, `src/lib/redirects/legacy-map.js`,
> `src/lib/months.js`, `src/lib/offers.js`, la table `public.redirects` (lue via l'API anonyme),
> et 42 relevés de chaînes faits à la main (`fetch`, `redirect: manual`).
>
> ⚠️ **Ce site n'utilise PAS le mécanisme rank-first.** `site.config.json → redirects` est vide et
> doit le rester : il n'y a ni `_redirects` ni `.htaccess`, et `next.config.mjs` n'a ni `redirects()`
> ni `rewrites()`. **Toutes** les redirections sont du code — `src/middleware.js` — plus une table
> admin. Ne lancez jamais `npm run generate` en espérant qu'il écrive une redirection ici : il n'a
> rien à écrire et ce fichier resterait la seule trace lisible.

## 1. Architecture des URL

Toute URL publique est `/{locale}/{slug}` avec `locale ∈ {fr, ar, en}` — il n'existe aucune page
publique sans préfixe de langue, et **les slugs ne sont jamais traduits** (l'anglais et l'arabe
portent le slug français : `/en/omra-pas-cher`, `/ar/guide-omra`). Les **hubs sont la couche SEO
permanente** et leurs URL sont perpétuelles : la date vit dans le H1, le titre et le corps, jamais
dans le chemin (`/omra-octobre`, `/omra-ramadan`, `/omra-pas-cher`, `/hotels-omra`,
`/omra-depuis-casablanca`). Les **pages de départ** `/omra/{slug}` sont au contraire éphémères par
conception — un départ = une URL, avec sa date dans le slug — et leur cycle de vie est dérivé de la
date de RETOUR (`date_end`, `src/lib/offers.js`) : `live` (indexée, dans le sitemap) → `archived`
1 à 90 jours après le retour (200, `noindex, follow`, bandeau) → `retired` au-delà (301 vers le hub
du mois). Aucune URL de départ expirée ne renvoie donc jamais 404, et aucune n'est supprimée. Entre
les deux, un routeur programmatique unique — `[flat]`, `src/app/[locale]/[flat]/page.js` — sert dans
cet ordre les 12 mois, les 8 villes et les occasions de la base ; tout le reste tombe en 404.

## 2. Familles d'URL (état du 2026-09-21)

**301 URL vivantes au total** : 276 dans le sitemap (toutes 200, 0 saut, canonique autoréférente,
4 hreflang, aucune `noindex`), 21 vivantes hors sitemap (volontairement `noindex`), et 4 points
d'entrée non localisés.

| Famille | Exemple FR | URL vivantes | Indexable | Qui détient la règle |
|---|---|---|---|---|
| Accueil | `/fr` | 3 | oui | `src/app/[locale]/page.js` |
| Hub Omra | `/fr/bab-makka` | 3 | oui | `src/app/[locale]/bab-makka/page.js` |
| Hubs commerciaux permanents | `/fr/omra-pas-cher`, `/fr/hotels-omra`, `/fr/agence-omra-casablanca`, `/fr/hajj`, `/fr/voyages` | 15 (5 × 3) | oui | un fichier `page.js` par route |
| Landers de mois `[flat]` — indexables | `/fr/omra-octobre` | 18 (6 mois × 3) | oui | `monthLanderIndexable()`, `src/lib/months.js` + table `month_pages` |
| Landers de mois `[flat]` — non indexables | `/fr/omra-avril` | 18 (6 mois × 3) | **non** (`noindex, follow`) | même prédicat — avril, mai, juin, juillet, août, décembre |
| Landers de ville `[flat]` | `/fr/omra-depuis-casablanca` | 24 (8 × 3) | oui | `CITY_SLUGS` + `cityPageIndexable()`, `src/lib/months.js` + table `city_pages` |
| Landers d'occasion `[flat]` | `/fr/omra-ramadan` | 18 (6 × 3) | oui | table `occasions` (`is_published`) |
| Pages de départ | `/fr/omra/omra-octobre-2026-6-au-20` | 18 (6 × 3) | oui tant que `live` | table `offers` + `offerLifecycle()`, `src/lib/offers.js` |
| Pages hôtel | `/fr/hotel/anjum` | 27 (9 × 3) | oui | table `hotels` |
| Voyages (hors Omra) | `/fr/voyage/istanbul-ete-2026` | 15 (5 × 3) | oui | table `voyages` |
| Index blog | `/fr/blog` | 3 | oui | `src/app/[locale]/blog/page.js` |
| Articles | `/fr/blog/premiere-omra-7-erreurs-a-eviter` | 87 (29 × 3) | oui | table `articles` (RLS : `is_published AND published_at <= now()`) |
| Pilier guide | `/fr/guide-omra` | 3 | oui | `guideIndexable()`, `src/lib/guides.js` |
| Enfants du guide | `/fr/guide-omra/budget` | 18 (6 × 3) | oui | `GUIDE_CHILD_SLUGS`, `src/lib/guides.js` |
| Glossaire | `/fr/glossaire-omra` | 3 | oui | `GLOSSARY_MIN_TERMS` + table `glossary_terms` |
| Confiance / entité | `/fr/avis`, `/fr/agrement`, `/fr/a-propos`, `/fr/contact`, `/fr/equipe`, `/fr/presse` | 18 (6 × 3) | oui | un `page.js` par route ; `/equipe` via `teamIndexable()` |
| Pages légales — publiées | `/fr/politique-de-confidentialite` | 3 | oui | table `legal_pages` + `legalIsFilled()` |
| Pages légales — absentes | `/fr/cgv`, `/fr/mentions-legales` | 0 (**404**) | — | aucune ligne dans `legal_pages` (voir § 5) |
| Baromètre des prix | `/fr/barometre-prix-omra` | 3 | **non** (`noindex, follow`) | `computePeriods()`, `src/lib/barometer.js` — ≥ 3 départs par période |
| Landing pages campagne | `/fr/lp/{slug}` | **0** | (hors sitemap par conception) | table `landing_pages` — vide aujourd'hui |
| Points d'entrée non localisés | `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/indexnow-key.txt` | 4 | 200 | `src/app/robots.js`, `sitemap.js`, `llms.txt/route.js`, `indexnow-key.txt/route.js` |

Le sitemap compte **276 `<loc>`, 276 `<lastmod>`, 1 104 `xhtml:link` et 276 `x-default`** — soit
exactement 4 alternates par URL. *(Correction à la ligne de base du 2026-09-09 notée dans
`CLAUDE.md` : le sitemap porte désormais bien `x-default`.)*

## 3. Redirections en vigueur — 19 règles

`≡` = vérifié en direct le 2026-09-21. « Plateforme » = réglage de domaine Vercel, qui répond
**avant** que le middleware ne s'exécute.

| # | Motif d'origine | Destination | Code | Implémenté dans | Fonctionne ? |
|---|---|---|---|---|---|
| 1 | `http://<tout hôte>/*` | `https://<même hôte>/*` | 308 | Plateforme (HTTPS auto) | ≡ oui |
| 2 | `/chemin/` (slash final) | `/chemin` | 308 | Next (`trailingSlash: false`) | ≡ oui (`/fr/`, `/fr/blog/premiere-omra-7-erreurs-a-eviter/`) |
| 3 | `https://www.wikitours.ma/*` | `https://wikitours.ma/*` | **301** | Plateforme | ≡ oui — mais voir la note ⓐ |
| 4 | `bab-makka.com/*`, `www.bab-makka.com/*` | `https://wikitours.ma/<même chemin>` | **307** | Plateforme | ≡ oui, mais **temporaire** — voir ⓑ |
| 5 | `m.bab-makka.com/*` | `https://wikitours.ma/<même chemin>` | 301 | Plateforme | ≡ oui |
| 6 | `*.bab-makka.com/*` → cible finale en **un seul** 301 | `/{fr}/…` résolu d'avance | 301 | `src/middleware.js:87-98` | **inerte** — la règle 4 répond avant ⓑ |
| 7 | `/{loc}/omra-{mois}-{aaaa}` | `/{loc}/omra-{mois}` | 301 | `src/middleware.js:147-152` | ≡ oui (`/fr/omra-octobre-2026`, `/fr/omra-juillet-2026`) — voir ⓒ |
| 8 | `/bab-makkah` (avec h), avec ou sans locale | `/{loc\|fr}/bab-makka` | 301 | `legacy-map.js:19` via `middleware.js:155-160` | ≡ oui, en un seul saut depuis la forme nue |
| 9 | `/omra/{chiffres}/…` (ancien schéma) | `/{loc\|fr}/bab-makka` | 301 | `legacy-map.js:36` | ≡ oui |
| 10 | `/Vol/{chiffres}/…` | `/{loc\|fr}/bab-makka` | 301 | `legacy-map.js:37` | ≡ oui |
| 11 | `/product/{x}/feed` | `/{loc\|fr}/voyages` | 301 | `legacy-map.js:38` | ≡ oui |
| 12 | `/room_types…` | `/{loc\|fr}/hotels-omra` | 301 | `legacy-map.js:39` | ≡ oui |
| 13 | Table admin `public.redirects` — **12 lignes actives** | cible de la ligne | 308 si `permanent`, sinon 307 | `middleware.js:162-178` ← `getRedirectsMap()`, `src/lib/edge-data.js` | ≡ oui au moment du relevé — voir ⓓ |
| 14 | Garde : une ligne #13 visant un lander de mois `noindex` | `/{loc}/bab-makka` | 308/307 | `middleware.js:172-176` | ≡ oui — les 6 lignes « juillet » atterrissent bien sur `/bab-makka` |
| 15 | Départ *retired* (retour > 90 j) ou départ dépublié déjà parti | `/{loc}/omra-{mois}`, sinon `/{loc}/bab-makka` | 301 | `middleware.js:180-198` + `retiredRedirectPath()` | ≡ oui (`/fr/omra/omra-9-au-23-septembre-2026 → /fr/omra-septembre`) |
| 16 | Chemin nu sans locale (`/`, `/contact`, `/bab-makka`) | `/{locale détectée}/<chemin>` | **307** + `Vary: accept-language` | `middleware.js:217-222` | ≡ oui — `fr→/fr`, `ar→/ar`, `en→/en`, `de→/fr` |
| 17 | `www.wikitours.ma` → apex | apex | 308 | `middleware.js:102-106` | **inatteignable** — la règle 3 répond avant ⓐ |
| 18 | Filet de sécurité mois daté, dans le corps de page | `/{loc}/omra-{mois}` | 308 | `src/app/[locale]/[flat]/page.js:313` | non observable de l'extérieur — ne se déclenche que si le memo 60 s du middleware est périmé |
| 19 | Filet de sécurité cycle de vie, dans le corps de page | hub du mois | 308 | `src/app/[locale]/omra/[slug]/page.js` | idem |

**Les 12 lignes de la table admin `redirects`** (4 chemins × 3 locales, toutes `is_active = true`,
toutes `permanent`) :

| `from_path` | `to_path` | Résultat réel mesuré |
|---|---|---|
| `/{loc}/omra-ramadan-2027` | `/{loc}/omra-ramadan` | 308 → 200 indexable ✔ |
| `/{loc}/omra/omra-juillet-2026-confort` | `/{loc}/omra-juillet` | 308 → **`/{loc}/bab-makka`** (règle 14, cible `noindex`) ✔ |
| `/{loc}/omra/omra-juillet-2026-economique` | `/{loc}/omra-juillet` | 308 → **`/{loc}/bab-makka`** ✔ |
| `/{loc}/omra/omra-5-etoiles-13-au-20-aout-2026` | `/{loc}/omra/omra-5-etoiles-sur-mesure` | 308 → **404** ✘ **à corriger** |

### Notes

- **ⓐ** Le code du middleware annonce un 308 pour `www → apex` ; la production renvoie **301**,
  parce que le réglage de domaine Vercel répond en amont. Le bloc `middleware.js:102-106` est donc
  du code mort en production. Rien à réparer côté SEO (301 est même le meilleur signal), mais il ne
  faut pas croire le code sur parole.
- **ⓑ** `bab-makka.com` est encore configuré en « Redirect to » au niveau du domaine, ce qui répond
  **307 — temporaire**. Une migration de marque permanente qui s'achève sur un 307 ne consolide pas
  l'autorité. Le bloc `middleware.js:87-98` a été écrit pour ramener chaque ancienne URL à sa cible
  finale en **un seul 301**, mais il reste inerte tant que les trois domaines ne sont pas rattachés
  au projet comme domaines *servis* (voir `DEPLOYMENT.md §3`). Tant que ce n'est pas fait :
  `bab-makka.com/omra/1104/… → 307 → wikitours.ma/omra/1104/… → 301 → /fr/bab-makka` = 2 sauts dont
  le premier est temporaire.
- **ⓒ** Pour 6 mois sur 12, la règle 7 atterrit sur un lander `noindex, follow`
  (`/fr/omra-juillet-2026 → 301 → /fr/omra-juillet`, qui est `noindex`). C'est **volontaire** et
  conforme à la contrainte 10 de `CLAUDE.md` — la garde anti-`noindex` (règle 14) ne couvre que la
  table admin et le cycle de vie, pas cette règle. Le `follow` laisse passer le signal vers le hub,
  et la page s'indexera d'elle-même dès que son contenu evergreen sera écrit. **Ne pas « corriger ».**
- **ⓓ** La table admin a été **cassée en production** jusqu'au correctif `087a429` : sur une instance
  edge froide, la première lecture PostgREST expirait, la Map vide était mémorisée et le
  rafraîchissement censé la remplacer gelait avec sa requête — toutes les redirections admin
  renvoyaient 404 (constaté le 2026-09-17). **Ce correctif est commité mais pas poussé** : `master`
  est en avance de 3 commits sur `origin/master`, donc il n'est pas déployé. Au relevé du 2026-09-21
  les 12 lignes fonctionnent (instance chaude), mais le défaut peut réapparaître à chaque démarrage
  à froid tant que les 3 commits ne sont pas poussés.

## 4. Variantes d'hôte — chaînes mesurées

Relevé identique à celui de `check-urls.log` § « Host variants ».

| Point d'entrée | Chaîne exacte | Sauts | Idéal |
|---|---|---|---|
| `https://wikitours.ma/` | `307 → /fr` (200) | **1** | 1 — le saut de locale est délibéré (`Vary: accept-language`) |
| `http://wikitours.ma/` | `308 → https://wikitours.ma/` → `307 → /fr` (200) | **2** | 1 : `301` direct vers `https://wikitours.ma/` |
| `https://www.wikitours.ma/` | `301 → https://wikitours.ma/` → `307 → /fr` (200) | **2** | 1 : `301` direct vers l'apex |
| `http://www.wikitours.ma/` | `308 → https://www.` → `301 → apex` → `307 → /fr` (200) | **3** | **1** : un seul `301` de `http://www.wikitours.ma/*` vers `https://wikitours.ma/*` |
| `http://www.wikitours.ma/fr/bab-makka` | `308 → https://www.` → `301 → apex` (200) | 2 | 1 |
| `https://bab-makka.com/` | `307 → https://wikitours.ma/` → `307 → /fr` (200) | 2 | **1 `301`** vers `https://wikitours.ma/fr` |
| `https://www.bab-makka.com/` | `307 → https://wikitours.ma/` → `307 → /fr` (200) | 2 | idem |
| `https://m.bab-makka.com/` | `301 → https://wikitours.ma/` → `307 → /fr` (200) | 2 | idem |
| `http://bab-makka.com/` | `308 → https://bab-makka.com/` → `307 → apex` → `307 → /fr` (200) | **3** | idem |
| `https://bab-makka.com/omra/1104/omra-touristique-ramadan` | `307 → wikitours.ma/omra/1104/…` → `301 → /fr/bab-makka` (200) | 2 | **1 `301`** (c'est exactement ce que fait le bloc inerte ⓑ) |

Le saut `307 → /{locale}` sur un chemin nu **doit rester** : un navigateur met un 301 en cache quel
que soit `Vary`, et figer une langue pour tout le monde serait pire qu'un saut. **Conséquence
opérationnelle : toute citation externe — Google Business Profile, annuaires, presse, signatures —
doit pointer `https://wikitours.ma/fr/…` en toutes lettres**, jamais `wikitours.ma` nu ni `www.`,
sinon chaque clic paie 1 à 3 sauts.

## 5. Écarts constatés

**URL du sitemap non joignables en un saut : aucune.** Les 276 répondent 200 en 0 saut, canonique
autoréférente, 4 hreflang, aucune `noindex` (`url-report.json` : 276 PASS, 0 FAIL). Le crawl
confirme : « orphans (in sitemap, no inlink found): 0 · in sitemap, not reachable: 0 ».

**Chaînes de 2 sauts ou plus** — toutes listées au § 4 : les 4 variantes d'hôte de `wikitours.ma`
(2 à 3 sauts) et les 4 variantes de `bab-makka.com` (2 à 3 sauts). Aucune chaîne interne : aucun
lien du site ne pointe vers une URL qui redirige (c'est une règle du gate maison,
`scripts/seo-suite.mjs`).

**Redirection vers une 404 — 3 URL, à corriger :**
`/{fr,ar,en}/omra/omra-5-etoiles-13-au-20-aout-2026` → 308 → `/{loc}/omra/omra-5-etoiles-sur-mesure`
→ **404**. La cible n'existe dans aucune table (`offers` ne contient que 6 départs publiés, et
celui-ci n'en fait pas partie). Un 308 vers une 404 ne transmet rien du tout. Corriger la ligne dans
l'admin → `/{loc}/omra-5-etoiles` (le lander d'occasion, indexé et dans le sitemap).

**URL crawlées absentes du sitemap — 6, toutes `noindex` et toutes conformes :**

| URL | Pourquoi hors sitemap | Liens internes entrants |
|---|---|---|
| `/{fr,ar,en}/barometre-prix-omra` | `noindex` tant qu'aucune période n'atteint 3 départs (`src/lib/barometer.js`) ; le sitemap et la balise robots partagent le même prédicat | 13 (dont, en FR : `/fr/bab-makka`, le pilier `/fr/guide-omra` et ses 6 enfants, 2 articles) |
| `/{fr,ar,en}/omra-juillet` | `noindex` : aucun départ ce cycle, aucun bloc evergreen rédigé (`month_pages.is_indexable = false`) | 4 (en FR : `/fr/blog/comment-verifier-agence-omra-agreee-maroc`) |

Ce sont des liens de corps de page, pas d'en-tête ni de pied de page — le gate maison n'interdit que
ces derniers. Ils restent **~30 liens internes qui se déversent dans des pages non indexables** :
à rebrancher au moment où le baromètre atteindra son seuil et où juillet aura son texte.

**URL vivantes ni dans le sitemap ni joignables par un lien — 15.** Les landers
`/{loc}/omra-{avril,mai,juin,aout,decembre}` répondent 200 en `noindex, follow` mais aucun lien
n'y mène (le crawl ne les a pas trouvées). C'est le comportement attendu : elles n'existent que pour
recevoir la règle 7 et les liens externes anciens.

**Autres observations, mesurées :**

- `/fr/cgv` et `/fr/mentions-legales` renvoient **404** — il n'y a qu'une ligne dans `legal_pages`
  (`politique-de-confidentialite`). Ce ne sont pas des redirections cassées (ces URL n'ont jamais
  été publiées), mais deux URL légales attendues par les visiteurs et par les annuaires.
- Locale en majuscules : `/FR/bab-makka` → `307 → /fr/FR/bab-makka` → **404**. `LOCALE_SHAPE`
  (`src/middleware.js:9`) ne reconnaît que les minuscules, donc `FR` est traité comme un chemin nu
  et re-préfixé. Deux sauts pour une 404.
- Slug en casse mixte : `/fr/Bab-Makka` et `/fr/OMRA-PAS-CHER` répondent **200** avec la canonique
  correcte en minuscules — Google consolide, mais un 308 vers la forme minuscule serait plus propre.
- `/admin` sur le domaine principal → `307 → /fr/admin` → 404. **Délibéré** : rediriger vers
  `admin.wikitours.ma` livrerait le nom d'hôte du tableau de bord à un scan.
- `/es/bab-makka` (locale valide en forme, non supportée) → **404 sans redirection**, l'URL est
  conservée. Correct.
- `/lp/{slug}` : 0 URL vivante (`landing_pages` est vide). Le piège noté dans `CLAUDE.md` — une
  landing page dans le sitemap mais liée de nulle part — n'est donc pas armé aujourd'hui.

## 6. À ne jamais changer sans 301 (contraintes `CLAUDE.md`)

1. **`/{locale}/{slug}`** — ne pas restructurer l'architecture d'URL (contrainte 4).
2. **Les slugs ne sont jamais traduits.** `/ar/guide-omra` et `/en/omra-pas-cher` gardent le slug
   français. Une migration de slugs est un chantier séparé, à plus haut risque.
3. **Chaque locale s'auto-canonise** et les `/omra-{mois}-{aaaa}` 301 vers `/omra-{mois}` :
   c'est correct, ne pas y toucher (contrainte 1).
4. **`www → apex`** — ne pas changer (contrainte 2).
5. **hreflang en codes de langue nus + `x-default`** — jamais de code régional (`fr-MA`, `ar-MA`)
   (contrainte 3).
6. **Aucune date dans une URL de hub.** `/omra-ramadan`, `/omra-octobre`, `/omra-pas-cher`,
   `/hotels-omra`, `/omra-depuis-{ville}` restent perpétuels ; l'année vit dans le contenu.
7. **Ne jamais supprimer ni renommer une URL publique sans son 301** — statique dans
   `src/lib/redirects/legacy-map.js`, déplacement de contenu dans la table admin `redirects`.
8. **Les départs ne sont jamais supprimés.** Une date de départ est une donnée, pas une URL ; une
   offre expirée est mise à jour ou redirigée, jamais effacée, jamais 404.
9. **Ne jamais dépublier un départ parti pour le cacher** — c'est ce qui produisait des 404. Laissez
   le cycle de vie l'archiver (90 j) puis le rediriger en 301 vers son hub de mois.
10. **Ne pas retirer le `noindex` d'un lander de mois** tant qu'il n'a pas de vrai contenu
    evergreen (contrainte 10) — et le sitemap ne doit jamais lister une URL `noindex`.
11. **Le saut `307` + `Vary: accept-language` sur les chemins nus** reste temporaire par conception.
12. **`/lp/{slug}` reste hors du sitemap** — surface de campagne, pas de découverte organique.

## Migration (Layer 18.6) — avant tout changement d'URL

1. Inventaire des URL avec trafic, liens et positions (export Search Console + Ahrefs Webmaster Tools).
2. Correspondance une à une, 301 sans chaîne ; conserver ≥ 1 an. Ici : `legacy-map.js` pour un
   renommage de code, la table admin `redirects` pour un déplacement de contenu — jamais les deux.
3. Titres, contenu, liens internes, hreflang, données structurées équivalents sur les nouvelles URL.
4. Sitemap, canonicals, lien du profil Google, outil de changement d'adresse (changement de domaine).
5. Surveiller Pages et Performances chaque jour pendant un mois.
6. **Vérification propre à ce dépôt** : `npm run build` (le `postbuild` lance `scripts/seo-suite.mjs`
   + `scripts/schema-audit.mjs` + `npm test`), puis `BASE_URL=https://wikitours.ma npm run seo:audit`.
   Le gate échoue sur un lien interne qui entre dans une redirection, une URL `noindex` dans le
   sitemap, ou une canonique non autoréférente.

## Actions, dans l'ordre

1. **Pousser les 3 commits en attente** (`087a429` contient le correctif de fiabilité de la table
   `redirects`). Tant qu'ils ne sont pas déployés, un démarrage à froid peut remettre les 12 lignes
   en 404.
2. **Corriger les 3 lignes `omra-5-etoiles-13-au-20-aout-2026`** dans l'admin : cible
   `/{loc}/omra-5-etoiles` au lieu d'une URL qui n'existe pas.
3. **Rattacher `bab-makka.com`, `www.bab-makka.com` et `m.bab-makka.com` au projet comme domaines
   servis** (et retirer le « Redirect to ») pour activer le bloc `middleware.js:87-98` : chaque
   ancienne URL passera alors de 2–3 sauts dont un 307 à **un seul 301**.
4. **Remplacer le 307 par un 301** sur les variantes d'hôte de `bab-makka.com` si le point 3 doit
   attendre — un 307 ne consolide rien.
5. Publier `/cgv` et `/mentions-legales` (lignes `legal_pages` fr + ar), aujourd'hui en 404.
6. Reprendre les ~30 liens internes qui pointent vers `/barometre-prix-omra` et `/omra-juillet`
   quand ces pages deviendront indexables.
