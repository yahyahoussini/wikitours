# Brief rédactionnel — articles du blog ($0, sessions Claude Code)

Ce fichier est LU par la session Claude Code (Prompt 2 « générateur », ou une
session à la main) qui rédige les articles du calendrier. Aucun appel de modèle
n'a lieu sur le site : **tout le texte est écrit à l'avance, ici, puis publié à
l'heure.** Deux contrôles mécaniques s'appliquent à chaque fichier :
`scripts/content-gate.mjs` (règles G0–G16, avant toute programmation) et le
contrôle strict de l'ingestion (`src/lib/server/article-gate.mjs`, au
déploiement). Un fichier qui échoue est IGNORÉ et consigné — jamais publié,
jamais mis en brouillon, jamais « corrigé » par le code. La cadence est un
plafond, pas un objectif. **Une règle fausse se corrige dans le contrôle, pas
dans l'article — et se signale dans le rapport.**

Architecture (décisions 2026-09-14) : **GENERATE-AHEAD, RENDER-LIVE,
PUBLISH-BY-TIME.**
- Les faits STABLES viennent de `data/allowed-facts.json` (chaque fait avec sa
  source et sa date). Rien d'autre n'est affirmé comme un fait.
- Les faits VOLATILS — prix, départs, disponibilités, dates de départ, listes
  d'hôtels, distances d'hôtels, modalités d'acompte, appels à l'action,
  comptes à rebours hégiriens, citations d'avis — ne sont JAMAIS dans la
  prose. Ils sont rendus à la demande par des composants serveur placés via des
  **balises**.
- Publier = la date `published_at` est passée (règle de base de données, aucun
  cron). L'ingestion place l'article au créneau `publish_at` de son slot du
  calendrier (`data/content-calendar.json`), jamais avant maintenant + 24 h.

## Ce que fait la session, dans l'ordre

1. Lire `docs/content-system/RESUME.md` (état, procédure, liste « ne pas
   toucher »), `docs/content-system/03-dominance-plan.md`, ce brief,
   `data/allowed-facts.json`, `data/content-formats.json`,
   `data/banned-phrases.json`.
2. Charger `data/content-calendar.json` (ou la table `content_calendar`) : les
   slots `planned` dont `publish_at` est dans les `buffer_days` (réglages),
   par `publish_at` croissant. Ne jamais toucher un slot `scheduled`,
   `published` ou `skipped`. Prendre les 8 premiers (moins si le contexte est
   serré).
3. Pour chaque slot, écrire UN article trilingue selon les RÈGLES, la
   STRUCTURE et le FORMAT ci-dessous, à partir des champs du slot (requêtes,
   angle, `closest_existing_url` + `delta`, `outline`, `faq_seed_questions`,
   `stable_facts_needed`, `live_components_needed`, `forbidden_topics`,
   `length_target`). Enregistrer `content/articles/AAAA-MM-JJ-<slug>.json`.
   - Maître FR, sauf `master_locale = ar_co_master` (slots Ramadan / Hajj) :
     l'arabe est écrit EN PREMIER depuis les requêtes arabes et le plan de
     sections que posent les Marocains en arabe ; le français est ensuite
     adapté depuis l'arabe et le brief (pas une traduction mot à mot) ;
     l'anglais est une adaptation plus courte (« lean »).
4. Relecteurs (sous-agents, un par langue — `docs/content-system/reviewers/`) :
   le relecteur FR note de 1 à 10 ; le relecteur AR aussi. Seuil : 8. Une
   réécriture au plus, puis le slot est `skipped` avec les notes comme motif.
5. `node --env-file=.env.local --import ./tests/register.mjs scripts/content-gate.mjs content/articles/<fichier>.json`
   → tout doit passer (les règles `pending` — G6 statut, G13, G16 — sont
   vérifiées après ingestion et build). Une réécriture au plus.
6. Fichier passant → `status = scheduled` dans le calendrier avec `slug` et le
   `publish_at` du slot ; commit `content: N articles (slots a–b)` ; push. Ligne
   dans `content_ops_events` (ou dans RESUME.md si la table n'existe pas).
7. Mettre à jour `docs/content-system/RESUME.md` et finir par UNE ligne :
   `Scheduled X | Skipped Y | Total N/244 | Buffer until DATE | Ramadan series K/12 done | Hajj series K/8 done | Next run resumes at slot #Z`

## Les balises (RENDER-LIVE)

Une balise est seule sur sa ligne, entourée de lignes vides. Deux graphies
équivalentes : `<Nom attr="valeur" />` ou `{{live:alias attr=valeur}}`. Elle
est rendue côté serveur, à la demande, depuis la base — jamais depuis le
texte. Toute autre forme (balise non fermée, attribut inconnu, alias inconnu)
fait échouer le contrôle. La phrase autour annonce ce que la balise montre
sans le chiffrer : « Voici les départs ouverts pour cette période : » puis la
balise — jamais « 3 départs à partir de 12 300 MAD ».

| Balise | Rend | Attributs |
|---|---|---|
| `<CommercialCTA intent="ramadan" />` `{{live:cta intent=ramadan}}` | l'ancre de la page commerciale, le nombre de départs ouverts et le prix minimum EN DIRECT, le bouton, WhatsApp. **Le résolveur** choisit la meilleure page indexable existante au moment de la consultation (mois noindex ⇒ hub Omra) | `intent` : `ramadan`, `hajj`, `pas_cher`, `premium`, `agency`, `guide`, `hotels`, `next`, `month:1…12`, `city:casablanca…`, `occasion:<slug>` — **jamais une URL**. `to="/omra-ramadan"` (forme historique) reste acceptée |
| `<LiveDepartures filter="ramadan" limit="4" />` `{{live:departures filter=month:10}}` | les cartes des départs ouverts (prix, dates, hôtels, places — tout vient des offres) ; `hajj` ne liste rien (le Hajj n'est pas vendu en ligne) | `filter` : `ramadan`, `hajj`, `next`, `all`, `month:n`, `occasion:<slug>` ; `limit` |
| `<PriceRange filter="month:10" />` `{{live:price filter=ramadan}}` | « Dès X MAD » (et le haut de fourchette) depuis les offres — rien s'il n'y a pas d'inventaire | `filter` comme ci-dessus |
| `<HotelCard slug="anjum" />` `{{live:hotel slug=anjum}}` | la fiche d'UN hôtel partenaire (nom, étoiles, ville, distance, photo, lien) | `slug` (voir `allowed-facts.catalogue.hotels_partenaires`) |
| `<HotelList city="makkah" />` `{{live:hotels city=madinah}}` | les hôtels partenaires d'une ville | `city` : `makkah` / `madinah`, `limit` |
| `<ReviewQuote id="uuid" />` `{{live:review id=…}}` | UN témoignage publié, mot pour mot (jamais réécrit, jamais traduit) ; rien si l'id est inconnu | `id` : un id de la table `testimonials` (liste dans RESUME.md) |
| `<HijriCountdown event="ramadan_1448_start" />` `{{live:countdown event=arafah_1448}}` | « Début du Ramadan : 8 février, dans 147 jours (selon l'observation de la lune · ±2 jours) » | `event` : `ramadan`, `ramadan-last10`, `laylat-al-qadr`, `eid-al-fitr`, `rajab`, `shaban`, `dhul-qada`, `dhul-hijja`, `arafat`, `eid-al-adha`, `muharram`, `ashura`, `mawlid` (prochaine occurrence) ou daté : `ramadan_1448_start`, `ramadan_1448_last10`, `laylat_al_qadr_1448`, `eid_al_fitr_1448`, `arafah_1448`, `eid_al_adha_1448`, `ashura_1449`, `mawlid_1449`, `rajab_1448`, `shaban_1448`, `ramadan_1449_start` |
| `<RamadanNightsTable />` `{{live:ramadan_nights}}` | le tableau des dix dernières nuits (dates grégoriennes calculées, nuits impaires marquées, réserve lunaire) | `year` (hégirien, facultatif) |
| `<PolicyFact key="deposit" />` `{{live:policy key=passport_validity}}` | la règle telle que l'agence l'énonce aujourd'hui (table `policies`, sinon la FAQ) | `key` : `deposit`, `payment`, `passport_validity`, `visa_included`, `children` |
| `<DepositPolicy />` `{{live:deposit}}` | réservation + acompte (forme historique de `PolicyFact`) | — |
| `<HajjBridgeCTA />` `{{live:hajj_bridge}}` | « Pas retenu au tirage au sort du Hajj ? » — départs ouverts et prix en direct, bouton vers le hub Omra. **Obligatoire sur tout slot Hajj** | — |

## RÈGLES ABSOLUES

1. **Aucun fait inventé.** N'affirmer QUE ce qui est dans `data/allowed-facts.json`
   (avec sa source) : entité, licence, adresse, téléphones, horaires, « depuis
   2016 », villes de départ et logistique vers Mohammed V, noms de mois,
   règles (`policies`), catalogue (durées proposées, compagnies, noms des
   hôtels), FAQ, glossaire, faits officiels (`official`, et seulement comme
   STRUCTURE tant que `verification` n'est pas `fetched`). Si un fait manquant
   serait utile, écrire la phrase SANS le chiffre et ajouter une ligne dans
   `needs_review` commençant par « [À VÉRIFIER] ». Jamais de statistique,
   jamais « selon une étude », jamais de règle administrative, religieuse ou
   sanitaire qui n'est pas sourcée. **Tout nombre > 10 dans la prose doit
   figurer dans allowed-facts** (G5).

1 bis. **CE QUE L'AGENCE OBSERVE s'écrit comme une observation, jamais comme un
   fait du monde.** Le climat d'un mois, l'affluence au Haram, la composition
   des groupes, ce qui retarde un dossier, ce que les pèlerins disent au
   retour : rien de tout cela n'a de clé dans `allowed-facts`, et rien de tout
   cela ne s'écrit au présent de vérité générale. Deux formulations, et deux
   seulement :
   - **attribuée** — « ce que nos groupes constatent », « d'après les départs
     que nous encadrons », « les familles nous disent souvent » ; la phrase
     reste qualitative, sans chiffre, sans fréquence (« souvent » oui, « dans
     la plupart des cas » non, « de loin le plus fréquent » jamais) ;
   - **renvoyée** — la question appartient à une page qui la porte : le climat
     et l'affluence d'un mois sont les blocs authorisés de `month_pages`, que
     le lander `/omra-{mois}` rend ; l'article renvoie vers lui par
     `<CommercialCTA intent="month:n" />` au lieu de les réécrire.
   Une observation attribuée n'entre jamais dans la boîte de faits clés (elle
   est réservée aux faits sourcés), jamais dans `excerpt_*` (le bloc
   « réponse d'abord » est cité tel quel par les moteurs de réponse), et ne se
   répète pas d'une section à l'autre. Un tableau est le format le plus
   autoritaire d'une page : il ne contient que des colonnes que les clés
   portent, ou des colonnes explicitement qualitatives (« à qui ce mois
   convient », « contrainte scolaire », « position hégirienne »).
   Le contrôle mécanique ne voit rien de tout cela — c'est le relecteur qui le
   voit, et c'est la première cause d'échec sous le seuil de 8.
2. **Aucun fait volatil dans la prose** — le contrôle échoue sur : toute année
   (« 2026 », « 1448 هـ ») sauf « depuis 2016 » ; tout montant (MAD, DH,
   dirhams, درهم, €, $, « à partir de 12 300 ») ; toute date (« 23 septembre »,
   « 2026-09-23 », y compris les dates d'inscription au Hajj) ; tout nombre de
   places ou « places disponibles » ; toute distance d'hôtel (« à 50 m du
   Haram »). Les balises portent ces faits. Un slot Ramadan/Hajj porte une
   balise hégirienne (`HijriCountdown` ou `RamadanNightsTable`) — le
   composant porte la réserve « selon l'observation de la lune » (G14).
3. **Marque :** « Wiki Tours International (Bab Makka) » à la première mention
   dans chaque corps, puis « Bab Makka » ou « l'agence ». « Bab Makkah » est
   interdit. Bab Makka n'est jamais présentée comme une agence indépendante.
4. Pas de superlatif invérifiable, pas de fausse urgence, aucun nom de
   concurrent (`data/banned-phrases.json`, G10). Pas de remplissage : ni
   « dans cet article nous allons », ni « il est important de noter », ni
   « en conclusion ». Aucun conseil médical ou juridique affirmatif (renvoyer
   au médecin / à l'administration compétente).
5. **Anti-cannibalisation (mécanique) :** l'article SOUTIENT son pilier et sa
   page commerciale. Sa `query_family` n'est JAMAIS la requête d'une page
   commerciale (liste dans `data/lander-registry.json` et
   `docs/keyword-map.md`), ni le titre d'un article existant, ni la requête
   d'un autre slot programmé (G8). Il renvoie vers la page commerciale par
   `<CommercialCTA intent="…" />` — **jamais par un lien markdown en dur vers
   une page commerciale** (G6).
6. **Citations :** aucune citation de plus de cinq mots hors `<ReviewQuote>`,
   sauf un hadith ou un verset dont la source est nommée dans le paragraphe
   (Bukhari, Muslim, sourate…) (G11).
7. **Liens externes :** uniquement `nusuk.sa`, `haj.gov.sa`, `mofa.gov.sa`,
   `tourisme.gov.ma`, `habous.gov.ma`, `saudia.com`, `royalairmaroc.com`,
   `hhr.sa`, `who.int`, dans une section « Sources » ; le contrôle vérifie
   qu'ils répondent (G7).
8. **Auteur :** Yahya Houssini, et personne d'autre — l'ingestion rattache la
   fiche `team_members` « yahya-houssini ». Aucun relecteur. Aucune
   qualification, aucune expérience, aucun titre inventé pour lui.
9. **Champ d'application :** Omra, Omra Ramadan, Hajj. Rien d'autre.
10. Ton : expert, chaleureux, concret, marocain (CIN, dirhams sans montant,
    Casablanca, aéroport Mohammed V, les villes de départ, les vacances
    scolaires). Pas d'auto-promotion lourde.

## ARABE — registre marocain (`body_ar`, `title_ar`, requêtes arabes)

- Arabe naturel pour un lecteur marocain : **mois marocains** (يناير، فبراير،
  مارس، أبريل، ماي، يونيو، يوليوز، غشت، شتنبر، أكتوبر، نونبر، دجنبر — jamais
  أيلول، تشرين، كانون، شباط، سبتمبر، أغسطس، نوفمبر، ديسمبر), **villes en arabe**
  (الدار البيضاء، الرباط، مراكش، فاس، طنجة، أكادير، مكناس، وجدة — jamais en
  caractères latins), **registre religieux** (مكة المكرمة، المدينة المنورة،
  الحرم، المسجد الحرام، المسجد النبوي، العشر الأواخر، ليلة القدر، الإحرام،
  الطواف، السعي، القرعة).
- ≥ 95 % de lettres arabes hors noms propres (hôtels, compagnies, Nusuk,
  WhatsApp, ONCF, Al Boraq) (G9). Darija : dans les requêtes secondaires et,
  avec parcimonie, dans les questions de la FAQ (« شنو خاصني نوجد… », « واش… ») ;
  jamais en translittération latine dans `body_ar`.
- Slot Ramadan ou Hajj (`master_locale = ar_co_master`) : l'arabe est
  **co-maître** — sa propre `query_family_ar`, son propre plan de sections,
  écrit pour un Marocain qui cherche en arabe, pas une traduction. Le slug
  reste le même dans les trois langues.
- `secondary_queries` contient les variantes translittérées que les Marocains
  tapent — « 3omra », « omra », « oumra », « umrah », « hajj », « hadj »,
  « 7ajj », « ramadan », « ramdan » — et `secondary_queries_ar` les tournures
  en darija.

## STRUCTURE — la spécification de qualité (identique dans les trois langues)

- `excerpt_*` = le bloc « réponse d'abord », **40 à 55 mots**, qui répond
  directement à la requête ; il est rendu sous le H1 (`data-answer`,
  speakable) (G2).
- Une **boîte de faits clés** en tête de corps : 3 à 5 puces de faits stables
  (sourcés) et, pour tout ce qui est volatil, une balise (`PriceRange`,
  `HijriCountdown`, `PolicyFact`…).
- **≥ 4 sections `## ` en forme de question** — formulées comme les gens les
  tapent (« Comment… ? », « Combien de temps… ? », « شنو… ؟ », « How… ? ») (G3).
- Un **tableau markdown** dès que des données se comparent (périodes, gammes,
  durées, villes) — sans chiffre volatil dans les cellules.
- Listes et étapes numérotées dès qu'elles rendent l'information extractible.
- `## Questions fréquentes` (ar : `## الأسئلة الشائعة`, en : `## Frequently asked
  questions`) avec **5 ou 6** sous-titres `### ` (une question chacun), chacun
  suivi d'une réponse de **30 à 90 mots**, réponse directe en premier (G4).
- **Liens internes ≥ 4** (liens markdown + balises CTA), dont le pilier (par
  `<CommercialCTA intent>` ou lien markdown vers un pilier non commercial
  comme `/guide-omra`) et **≥ 2 pages sœurs** du même dossier (articles du
  cluster, chapitres du guide) — chemins RELATIFS préfixés par la langue :
  `/fr/…` dans body_fr, `/ar/…` dans body_ar, `/en/…` dans body_en ; jamais
  d'URL de mois datée, jamais de barre oblique finale (G6).
- `<CommercialCTA intent="…" />` là où la lecture appelle l'action (souvent
  avant la FAQ). `<HajjBridgeCTA />` sur tout slot Hajj. Balise hégirienne sur
  tout slot Ramadan/Hajj.
- `## Sources` (facultatif) : liens de la liste blanche uniquement.
- Dernier paragraphe : inviter à écrire à l'agence sur WhatsApp (sans numéro
  dans le texte — le bouton le porte) et à consulter la page commerciale.
- Longueur : selon `length_target` → `data/content-formats.json` (par exemple
  `explainer` fr 1100–1900 mots hors balises, ar 850–1700, en 950–1750) (G1).

## SEO

- `slug` : kebab-case ASCII, 3 à 7 mots, sans année, sans « bab-makka » ni
  « wiki-tours », absent de la table `articles` et des autres fichiers du lot.
- `seo_title_*` : **34 à 49 caractères SANS marque** (le site ajoute « | Bab
  Makka » / « | باب مكة » ; le total doit faire 45 à 60), contient la requête,
  sans année (G12).
- `seo_description_*` : **120 à 155 caractères**, réponse + bénéfice, se
  termine par une ponctuation de phrase, sans point d'exclamation, sans année
  ni montant (G12).
- `title_*` (H1) : ≤ 70 caractères, peut différer du seo_title, sans année.
- `category` : la plus juste parmi `confiance` / `omra` / `hajj` / `hotels` /
  `guide`.
- Similarité : le contrôle compare le corps à chaque article existant
  (Jaccard sur 3-grammes) ; ≥ 0,85 échoue (G15). Le champ `closest_existing_url`
  du slot dit de quoi il faut se DISTINGUER, et `delta` comment.

## FORMAT du fichier `content/articles/AAAA-MM-JJ-<slug>.json`

```json
{
  "slot_index": 12,
  "track": "ramadan | omra | hajj",
  "series_id": "ramadan-1448 | hajj-1448 | premiere-omra | mois-par-mois | null",
  "series_part": 1,
  "master_locale": "fr | ar_co_master",
  "format": "explainer | guide | series_part | comparison | checklist | month_support | faq_post | mega | story",
  "query_family": "<primary_query_fr du slot>",
  "query_family_ar": "<primary_query_ar — obligatoire pour ramadan / hajj>",
  "query_family_en": "<primary_query_en>",
  "secondary_queries": ["3omra maroc", "oumra …"],
  "secondary_queries_ar": ["…"],
  "slot": "omra | ramadan | hajj",
  "owner_path": "<pillar_path du slot, ex. /omra-ramadan>",
  "commercial_intent": "<commercial_intent du slot, ex. ramadan>",
  "category": "omra",
  "slug": "kebab-case-ascii",
  "title_fr": "…", "title_ar": "…", "title_en": "…",
  "excerpt_fr": "40–55 mots", "excerpt_ar": "…", "excerpt_en": "…",
  "body_fr": "markdown avec balises …", "body_ar": "…", "body_en": "…",
  "seo_title_fr": "…", "seo_title_ar": "…", "seo_title_en": "…",
  "seo_description_fr": "…", "seo_description_ar": "…", "seo_description_en": "…",
  "facts_used": ["licence (settings.license_number, 2026-09-14)", "…"],
  "sources": ["https://www.habous.gov.ma/…"],
  "needs_review": ["[À VÉRIFIER] …"]
}
```

`facts_used` cite les clés de `data/allowed-facts.json` (clé, source, date).
Encodage UTF-8, guillemets JSON échappés, retours à la ligne `\n` dans les
corps. Ne jamais modifier un fichier déjà présent dans `content/articles/`
(sauf le remplacement d'un fichier ignoré par le contrôle : nouveau préfixe de
date, ancien fichier supprimé).
