# Brief rédactionnel — articles du blog ($0, sessions Claude Code)

Ce fichier est LU par la session Claude Code (routine hebdomadaire ou session à
la main) qui rédige les articles. Aucun appel de modèle n'a lieu sur le site :
**tout le texte est écrit à l'avance, ici, puis publié à l'heure.** Le contrôle
qualité (`src/lib/server/article-gate.mjs`, mode strict) vérifie chaque fichier
mécaniquement à l'ingestion, au déploiement. Un fichier qui échoue est IGNORÉ
et consigné — jamais publié, jamais mis en brouillon, jamais « corrigé » par le
code. La cadence est un plafond, pas un objectif.

Architecture (décision 2026-09-14) : **GENERATE-AHEAD, RENDER-LIVE,
PUBLISH-BY-TIME.**
- Les faits STABLES viennent de `data/allowed-facts.json` (chaque fait avec sa
  source et sa date). Rien d'autre n'est affirmé comme un fait.
- Les faits VOLATILS — prix, départs, disponibilités, dates de départ, listes
  d'hôtels, modalités d'acompte, appels à l'action, comptes à rebours
  hégiriens, citations d'avis — ne sont JAMAIS dans la prose. Ils sont
  rendus à la demande par des composants serveur placés via des **balises**.
- Publier = la date `published_at` est passée (règle de base de données, aucun
  cron). L'ingestion attribue le prochain créneau libre à 08:00 (Casablanca).

## Ce que fait la session, dans l'ordre

1. Lire `data/allowed-facts.json` (dans le dépôt) : entité, licence, adresse,
   téléphones, horaires, villes de départ, noms de mois, FAQ publiée, glossaire.
   Lire `GET https://wikitours.ma/api/content/facts` UNIQUEMENT pour
   `existing_slugs`, `allowed_links` et `plan` (les sujets en file, filtrés sur
   la saison). Ne jamais recopier un prix, une date ou un nombre de places qui
   s'y trouve : ils passent par une balise.
2. Prendre les **7 premiers** sujets du plan (ordre `sort_order`). S'il y en a
   moins, écrire ceux qui restent ; s'il n'y en a aucun, ne rien écrire et le
   signaler dans le message de commit. Un sujet dont `query_family` est la
   requête d'une page commerciale (liste ci-dessous) n'est PAS écrit : le
   signaler, le contrôle le refuserait.
3. Pour chaque sujet, écrire UN article trilingue selon les RÈGLES et le FORMAT
   ci-dessous, et l'enregistrer dans `content/articles/AAAA-MM-JJ-<slug>.json`
   (date = jour de la rédaction, un fichier par article).
4. Vérifier soi-même chaque fichier (la même liste que le contrôle) : JSON
   valide, tous les champs présents, body_fr 800–1200 mots hors balises, ≥ 4
   sections `## `, bloc « ## Questions fréquentes » avec 3 `### `, une balise
   `<CommercialCTA to="{owner_path}" />` dans les trois corps, aucune année
   (sauf « depuis 2016 »), aucun montant, aucune date de départ, aucun nombre
   de places, aucune balise hors registre, aucun « Bab Makkah », aucun lien
   externe, aucun « [À VÉRIFIER] » dans les corps, noms de mois marocains et
   noms de villes en arabe dans body_ar.
5. `git add content/articles && git commit -m "content: N articles"` puis
   `git push origin master`. Si le push est refusé, créer une branche
   `content/AAAA-MM-JJ`, pousser, et ouvrir une pull request.
6. Si le journal de build (ou `article_plan.notes`) montre qu'un fichier
   précédent a été ignoré, le REMPLACER par un nouveau fichier corrigé (nouveau
   préfixe de date) et supprimer l'ancien — c'est la seule exception à « ne
   jamais modifier un fichier déjà présent ».

## Les balises (RENDER-LIVE)

Une balise est auto-fermante, seule sur sa ligne, entourée de lignes vides.
Elle est rendue côté serveur, à la demande, depuis la base — jamais depuis le
texte. Toute autre forme (`<Prix>`, balise non fermée, attribut inconnu) fait
échouer le contrôle.

| Balise | Rend | Attributs |
|---|---|---|
| `<CommercialCTA to="/omra-ramadan" />` | l'ancre descriptive de la page commerciale, le nombre de départs ouverts et le prix minimum EN DIRECT, le bouton, le lien WhatsApp | `to` : `/bab-makka`, `/hajj`, `/omra-pas-cher`, `/omra-5-etoiles`, `/omra-ramadan`, `/omra-{mois}`, `/omra-depuis-{ville}`, `/agence-omra-casablanca`, `/hotels-omra`, `/hotel/{slug}` — **obligatoire une fois vers `owner_path`** |
| `<LiveDepartures month="10" />` · `occasion="ramadan"` · sans attribut | les cartes des départs ouverts (prix, dates, hôtels, places — tout vient des offres) | `month` 1–12, `occasion` (slug), `limit` |
| `<ReviewQuote id="uuid" />` | UN témoignage publié, mot pour mot (jamais réécrit, jamais traduit) | `id` : un id de la table `testimonials` (voir `/api/content/facts` → à venir, ou l'admin → Témoignages) |
| `<HijriCountdown event="ramadan" />` | « Début du Ramadan : 8 février, dans 147 jours (sous réserve de l'observation de la lune) » | `event` : `ramadan`, `laylat-al-qadr`, `eid-al-fitr`, `dhul-hijja`, `arafat`, `eid-al-adha`, `ashura`, `mawlid` |
| `<DepositPolicy />` | les modalités de réservation et d'acompte, telles que le site les affiche | — |
| `<HotelList city="makkah" />` | les hôtels partenaires d'une ville (nom, distance, étoiles) | `city` : `makkah` / `madinah`, `limit` |

La phrase autour de la balise annonce ce qu'elle montre sans le chiffrer :
« Voici les départs ouverts pour ce mois : » puis la balise — jamais « 3 départs
à partir de 12 300 MAD ».

## RÈGLES ABSOLUES

1. **Aucun fait inventé.** N'affirmer QUE ce qui est dans `data/allowed-facts.json`
   (avec sa source) : licence, ville, adresse, téléphones, horaires, « depuis
   2016 », villes de départ, noms de mois, FAQ, glossaire. Si un fait manquant
   serait utile, écrire la phrase SANS le chiffre et ajouter une ligne dans
   `needs_review` commençant par « [À VÉRIFIER] ». Jamais de statistique,
   jamais « selon une étude », jamais de règle administrative, religieuse ou
   sanitaire qui n'est pas dans la FAQ ou le glossaire.
2. **Aucun fait volatil dans la prose** — le contrôle échoue sur : toute année
   (« 2026 », « 1448 هـ ») sauf « depuis 2016 » ; tout montant (MAD, DH,
   dirhams, درهم, €, $, « à partir de 12 300 ») ; toute date de départ
   (« 23 septembre », « 2026-09-23 ») ; tout nombre de places. Les balises
   portent ces faits.
3. **Marque :** « Bab Makka » (sans h) est la graphie canonique ; « Bab Makkah »
   est interdit. L'entité est Wiki Tours International ; Bab Makka n'est jamais
   présentée comme une agence indépendante.
4. Pas de superlatif invérifiable (« meilleure agence », « n°1 », « la moins
   chère »), pas de faux sentiment d'urgence, aucun nom de concurrent, aucun
   lien externe, aucun conseil médical ou juridique affirmatif (renvoyer au
   médecin / à l'administration compétente).
5. **Anti-cannibalisation (mécanique) :** l'article SOUTIENT la page
   propriétaire (`owner_path`). Sa `query_family` n'est JAMAIS une requête de
   page commerciale : « omra depuis le maroc », « agence omra (casablanca) »,
   « omra pas cher », « prix omra maroc », « omra ramadan », « omra {mois} »,
   « omra depuis {ville} », « omra 5 étoiles / de luxe », « omra rajab /
   chaâbane / chawal / mawlid / été », « hajj (depuis le maroc) », « عمرة رمضان »,
   « وكالة عمرة », « الحج من المغرب ». Il possède SA famille de requêtes
   (informationnelle, longue traîne) et renvoie vers la page propriétaire par
   `<CommercialCTA to="{owner_path}" />`.
6. **Auteur :** Yahya Houssini, et personne d'autre — l'ingestion rattache la
   fiche `team_members` « yahya-houssini ». Aucun relecteur. Aucune
   qualification, aucune expérience, aucun titre inventé pour lui.
7. **Champ d'application :** Omra, Omra Ramadan, Hajj. Aucun sujet de voyage
   de loisir dans le calendrier.
8. Ton : expert, chaleureux, concret, marocain (CIN, dirhams sans montant,
   Casablanca, aéroport Mohammed V, les villes de départ). Pas d'auto-promotion
   lourde.

## ARABE — registre marocain (`body_ar`, `title_ar`, requêtes arabes)

- Arabe naturel pour un lecteur marocain : **mois marocains** (يناير، فبراير،
  مارس، أبريل، ماي، يونيو، يوليوز، غشت، شتنبر، أكتوبر، نونبر، دجنبر — jamais
  أيلول، تشرين، كانون، شباط، سبتمبر، أغسطس، نوفمبر، ديسمبر), **villes en arabe**
  (الدار البيضاء، الرباط، مراكش، فاس، طنجة، أكادير، مكناس، وجدة — jamais en
  caractères latins), **registre religieux** (مكة المكرمة، المدينة المنورة،
  الحرم، المسجد الحرام، المسجد النبوي، العشر الأواخر، ليلة القدر، الإحرام،
  الطواف، السعي).
- Pour un sujet Ramadan ou Hajj (`slot` = `ramadan` / `hajj`), l'arabe est
  **co-maître** : il a sa propre `query_family_ar`, son propre plan de
  sections (les questions que les Marocains posent en arabe), pas une
  traduction du français. Le slug reste le même.
- `secondary_queries` (une par ligne) contient les variantes translittérées
  que les Marocains tapent — « 3omra », « omra », « oumra », « umrah »,
  « hajj », « hadj », « 7ajj », « ramadan », « ramdan » — et
  `secondary_queries_ar` les tournures en darija. Ces variantes vivent dans
  les champs de requêtes et, avec parcimonie, dans les questions de la FAQ ;
  jamais comme mot-clé principal, jamais en translittération dans `body_ar`.

## STRUCTURE (identique dans les trois langues, sauf slots Ramadan/Hajj en arabe)

- Premier paragraphe = chapeau « réponse d'abord » de 40 à 60 mots, AVANT tout
  titre, qui répond directement à la question de la requête.
- 4 à 7 sections `## ` dont les titres sont formulés comme les questions ou
  phrases que les gens tapent réellement.
- Listes, étapes numérotées et tableaux markdown dès qu'ils rendent
  l'information extractible.
- Une section `## Questions fréquentes` avec exactement 3 sous-titres `### `
  (une question chacun), chacun suivi d'une réponse de 40 à 60 mots, réponse
  directe en premier.
- Une `<CommercialCTA to="{owner_path}" />` vers la page propriétaire (placée
  là où la lecture appelle l'action, souvent avant la FAQ) ; jusqu'à deux
  autres balises quand le sujet s'y prête (`<LiveDepartures>` pour un sujet
  daté, `<HijriCountdown>` pour Ramadan / Hajj, `<ReviewQuote>` quand un avis
  publié illustre le propos, `<DepositPolicy>` dès qu'on parle de paiement).
- Dernier paragraphe : inviter à écrire à l'agence sur WhatsApp (sans numéro
  dans le texte — le bouton le porte) et à consulter la page propriétaire.
- Liens internes en markdown vers des chemins RELATIFS préfixés par la langue :
  `/fr/…` dans body_fr, `/ar/…` dans body_ar, `/en/…` dans body_en, parmi
  `allowed_links` uniquement (jusqu'à 3).
- Longueur : body_fr 800 à 1200 mots hors balises. body_ar et body_en :
  adaptations fidèles, même structure, mêmes balises.

## SEO

- `slug` : kebab-case ASCII, 3 à 7 mots, sans année, sans « bab-makka » ni
  « wiki-tours », absent de `existing_slugs` et des autres fichiers du lot.
- `seo_title_*` : ≤ 48 caractères, SANS marque (le site ajoute la marque dans
  la langue de la page), contient la requête, sans année.
- `seo_description_*` : 120 à 155 caractères, réponse + bénéfice, sans point
  d'exclamation, sans année ni montant.
- `title_*` (H1) : ≤ 70 caractères, peut différer du seo_title, sans année.
- `excerpt_*` : une ou deux phrases, ≤ 200 caractères, sans année ni montant.
- `category` : la plus juste parmi `confiance` / `omra` / `hajj` / `hotels` /
  `guide` (sinon celle du sujet).

## FORMAT du fichier `content/articles/AAAA-MM-JJ-<slug>.json`

```json
{
  "query_family": "<copié du sujet>",
  "query_family_ar": "<requête arabe — obligatoire pour slot ramadan / hajj>",
  "secondary_queries": ["3omra maroc", "oumra …"],
  "secondary_queries_ar": ["…"],
  "slot": "omra | ramadan | hajj",
  "owner_path": "<copié du sujet, ex. /guide-omra/checklist>",
  "category": "guide",
  "slug": "kebab-case-ascii",
  "title_fr": "…", "title_ar": "…", "title_en": "…",
  "excerpt_fr": "…", "excerpt_ar": "…", "excerpt_en": "…",
  "body_fr": "markdown avec balises …", "body_ar": "…", "body_en": "…",
  "seo_title_fr": "…", "seo_title_ar": "…", "seo_title_en": "…",
  "seo_description_fr": "…", "seo_description_ar": "…", "seo_description_en": "…",
  "facts_used": ["licence (settings.license_number, 2026-09-14)", "…"],
  "needs_review": ["[À VÉRIFIER] …"]
}
```

`facts_used` cite les clés de `data/allowed-facts.json` (clé, source, date).
Encodage UTF-8, guillemets JSON échappés, retours à la ligne `\n` dans les
corps. Ne jamais modifier un fichier déjà présent dans `content/articles/`
(sauf le remplacement d'un fichier ignoré, point 6).
