# Brief rédactionnel — articles hebdomadaires ($0, routine cloud)

Ce fichier est LU par la routine cloud qui rédige les articles chaque semaine
sur l'abonnement Claude du propriétaire (aucune clé API, aucun coût par jeton).
Les règles ci-dessous sont les mêmes que celles du rédacteur API ; le contrôle
qualité (`src/lib/server/article-gate.mjs`) les vérifie mécaniquement à
l'ingestion, au moment du déploiement. Un article qui échoue reste brouillon.

## Ce que fait la routine, dans l'ordre

1. `GET https://wikitours.ma/api/content/facts` — la FICHE : faits de
   l'entreprise, offres en cours avec prix par gamme, hôtels, FAQ publiée,
   équipe, slugs existants, liens autorisés, et le PLAN éditorial (sujets en
   file, déjà filtrés sur la saison).
2. Prendre les **7 premiers** sujets du plan (ordre `sort_order`). S'il y en a
   moins, écrire ceux qui restent ; s'il n'y en a aucun, ne rien écrire et le
   signaler dans le message de commit.
3. Pour chaque sujet, écrire UN article trilingue selon les RÈGLES et le FORMAT
   ci-dessous, et l'enregistrer dans `content/articles/AAAA-MM-JJ-<slug>.json`
   (date = jour de la rédaction, un fichier par article).
4. Vérifier soi-même chaque fichier : JSON valide, tous les champs présents,
   body_fr 800–1200 mots, ≥ 4 sections `## `, bloc « ## Questions fréquentes »
   avec 3 `### `, lien vers la page propriétaire dans les trois corps,
   aucun prix qui n'est pas dans la FICHE, aucun « Bab Makkah », aucun lien
   externe, aucun « [À VÉRIFIER] » dans les corps.
5. `git add content/articles && git commit -m "content: N articles hebdomadaires"`
   puis `git push origin master`. Si le push est refusé, créer une branche
   `content/AAAA-MM-JJ`, pousser, et ouvrir une pull request.

Le déploiement Vercel qui suit exécute `scripts/ingest-articles.mjs` : il
applique le contrôle qualité, décide de la publication (Réglages → Blog
automatique : auto-publication activée + auteur configuré + contrôle propre),
attribue à chaque article le prochain créneau libre à 08:00 (Casablanca), un
par jour, et marque le sujet du plan comme rédigé. Le cron de sortie quotidien
(07:00 UTC) met chaque article en ligne à sa date, rafraîchit les pages et
prévient IndexNow.

## RÈGLES ABSOLUES

1. **Aucun fait inventé.** N'utiliser QUE les faits de la FICHE (licence,
   adresse, téléphones, offres, prix, durées, compagnies, hôtels, distances,
   FAQ, équipe). Aucun prix, date, durée, distance, nombre, horaire, nom de
   compagnie, règle administrative, religieuse ou sanitaire qui n'y figure pas.
   Si un fait manquant serait utile, écrire la phrase SANS le chiffre et
   ajouter une ligne dans `needs_review` commençant par « [À VÉRIFIER] ».
   Jamais de statistique, jamais « selon une étude ». Jamais « [À VÉRIFIER] »
   dans le corps du texte.
2. **Marque :** « Bab Makka » (sans h) est la graphie canonique ; « Bab Makkah »
   est interdit. L'entité est Wiki Tours International ; Bab Makka n'est jamais
   présentée comme une agence indépendante.
3. Pas de superlatif invérifiable (« meilleure agence », « n°1 », « la moins
   chère »), pas de faux sentiment d'urgence, aucun nom de concurrent, aucun
   lien externe, aucun conseil médical ou juridique affirmatif (renvoyer au
   médecin / à l'administration compétente).
4. **Anti-cannibalisation :** l'article SOUTIENT la page propriétaire
   (`owner_path` du sujet). Il ne cible pas le mot-clé principal de cette
   page ; il possède SA propre famille de requêtes (`query_family`) et renvoie
   vers la page propriétaire avec une ancre descriptive.
5. Ton : expert, chaleureux, concret, marocain (CIN, dirhams/MAD, Casablanca,
   aéroport Mohammed V, les villes de départ de la fiche). Pas d'auto-promotion
   lourde.

## STRUCTURE (identique dans les trois langues)

- Premier paragraphe = chapeau « réponse d'abord » de 40 à 60 mots, AVANT tout
  titre, qui répond directement à la question de la requête.
- 4 à 7 sections `## ` dont les titres sont formulés comme les questions ou
  phrases que les gens tapent réellement.
- Listes, étapes numérotées et tableaux markdown dès qu'ils rendent
  l'information extractible.
- Une section `## Questions fréquentes` avec exactement 3 sous-titres `### `
  (une question chacun), chacun suivi d'une réponse de 40 à 60 mots, réponse
  directe en premier.
- Dernier paragraphe : inviter à écrire à l'agence sur WhatsApp (numéro de la
  fiche uniquement) et à consulter la page propriétaire.
- Liens internes en markdown vers des chemins RELATIFS préfixés par la langue :
  `/fr/…` dans body_fr, `/ar/…` dans body_ar, `/en/…` dans body_en.
  OBLIGATOIRE : un lien vers la page propriétaire. Facultatif : jusqu'à 3 liens
  parmi `allowed_links`. Aucun autre lien.
- Longueur : body_fr 800 à 1200 mots. body_ar (arabe standard moderne, naturel
  pour un lecteur marocain, jamais une translittération) et body_en =
  adaptations fidèles, même structure, mêmes liens avec le préfixe adapté.

## SEO

- `slug` : kebab-case ASCII, 3 à 7 mots, sans année, sans « bab-makka » ni
  « wiki-tours », absent de `existing_slugs` et des autres fichiers du lot.
- `seo_title_*` : ≤ 48 caractères, SANS marque (le site ajoute « | Bab Makka »),
  contient la requête.
- `seo_description_*` : 120 à 155 caractères, réponse + bénéfice, sans point
  d'exclamation.
- `title_*` (H1) : ≤ 70 caractères, peut différer du seo_title.
- `excerpt_*` : une ou deux phrases, ≤ 200 caractères.
- `category` : la plus juste parmi `confiance` / `omra` / `hajj` / `hotels` /
  `guide` (sinon celle du sujet).

## FORMAT du fichier `content/articles/AAAA-MM-JJ-<slug>.json`

```json
{
  "query_family": "<copié du sujet>",
  "owner_path": "<copié du sujet, ex. /guide-omra/checklist>",
  "category": "guide",
  "slug": "kebab-case-ascii",
  "title_fr": "…", "title_ar": "…", "title_en": "…",
  "excerpt_fr": "…", "excerpt_ar": "…", "excerpt_en": "…",
  "body_fr": "markdown …", "body_ar": "markdown …", "body_en": "markdown …",
  "seo_title_fr": "…", "seo_title_ar": "…", "seo_title_en": "…",
  "seo_description_fr": "…", "seo_description_ar": "…", "seo_description_en": "…",
  "facts_used": ["…"],
  "needs_review": ["[À VÉRIFIER] …"]
}
```

Encodage UTF-8, guillemets JSON échappés, retours à la ligne `\n` dans les
corps. Ne jamais modifier un fichier déjà présent dans `content/articles/`.
