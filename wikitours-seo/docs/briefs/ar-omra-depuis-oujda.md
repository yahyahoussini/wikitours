# Brief — `/ar/omra-depuis-oujda` (semaine 2026-W39)

> Coup nº 1 de `docs/19` § 5. C'est le gain le plus rapide du document : la page
> reçoit **déjà** du trafic Google (36 sessions sur 90 jours) sans avoir été
> travaillée. On ne part pas de zéro, on débloque une page qui rame.

## 1. La requête et qui la détient

| | |
|---|---|
| Requête principale | **عمرة رمضان وجدة** (L10, w_score **19** — le plus haut de tout le jeu) |
| Requête secondaire | **عمرة من المغرب وجدة** (L5, w_score 18) |
| Détenteur aujourd'hui | facebook.com et des sites locaux (relevé du 21/09/2026, hors Maroc) |
| Surface qui décide | organique + pack local |
| Page propriétaire | `/ar/omra-depuis-oujda` — **une seule**, jamais une deuxième page Oujda |

## 2. Ce que la page a déjà, et qu'il ne faut pas casser

Contrôlé en direct le 22/09/2026 : 566 mots, 8 h2, FAQ propre à Oujda de
4 questions. **Les réponses sont vraiment locales** — train ONCF direct,
~600 km, vol intérieur, arriver la veille, prix identique quelle que soit la
ville. Ce n'est pas une page-portail, et il ne faut pas la transformer en
page-portail en la gonflant de généralités.

La structure est en revanche identique à celle des sept autres pages villes
(mêmes h2, même liste de départs). **C'est la limite à ne pas franchir** :
huit pages qui ne diffèrent que par un nom de ville, ce sont des pages-portails,
refusées par le registre des risques. Ce qui sauve chaque page, c'est sa
matière locale — donc on en ajoute, on ne duplique pas.

## 3. Le trou réel

La page liste les deux départs Chaâbane-Ramadan 2027 mais **ne dit rien du
Ramadan depuis Oujda**. Or c'est exactement la requête au w_score le plus élevé
du jeu. Un habitant d'Oujda qui prépare le Ramadan ne cherche pas « comment
rejoindre Casablanca » : il cherche s'il peut partir, quand, et ce que ça change
pour lui.

## 4. Ce qu'il faut écrire (arabe d'abord, puis le français)

**Bloc réponse, 40–60 mots, sous le h1, `data-answer`.** Il doit dire, en
arabe : oui depuis Oujda, le dossier se fait à distance, le vol part de
Mohammed V, le prix ne dépend pas de la ville, et nommer les deux départs
Chaâbane-Ramadan 2027 avec leurs dates.

**Un h2 en forme de question, nouveau, propre au Ramadan :**
`هل يمكن أداء عمرة رمضان انطلاقاً من وجدة؟` — réponse directe en premier, puis
les deux programmes datés, puis la logistique de la veille.

**Les faits utilisables, tous vérifiés le 22/09/2026 :**

| Fait | Source |
|---|---|
| Départ 22/01/2027 → 15/02/2027, 25 jours, à partir de 16 500 MAD/personne | table `offers`, publié |
| Départ 01/02/2027 → 15/02/2027, 15 jours, à partir de 16 900 MAD/personne | table `offers`, publié |
| Tous les vols partent de Mohammed V, Casablanca | FAQ `ville-oujda` nº 2 |
| ~600 km, train ONCF direct, vol intérieur possible, arriver la veille | FAQ `ville-oujda` nº 2 et nº 4 |
| Le prix ne dépend pas de la ville ; le trajet jusqu'à l'aéroport reste à votre charge | FAQ `ville-oujda` nº 3 |
| Licence ODV-25012, vérifiable au registre du ministère | `settings`, registre ODV |
| 4,8/5 sur 141 avis Google | `settings.gbp_review_count`, 22/09/2026 |

**Les prix ne s'écrivent pas en dur dans la prose** : ils passent par les
composants qui les rendent à la lecture. Un prix figé dans une phrase est faux
dès la saison suivante.

**Le Ramadan se date avec la réserve d'usage** : le début dépend de
l'observation du croissant. Jamais une date sèche.

## 5. Ce qui manque, et que seul le propriétaire a

Sans ces trois éléments, la page restera bonne mais pas imbattable. Ce sont
précisément les faits qu'aucun concurrent ne peut copier :

- `[[FACT NEEDED: un transport groupé Oujda → Casablanca est-il organisé pour les départs Chaâbane-Ramadan, ou chacun vient-il par ses propres moyens ?]]`
- `[[FACT NEEDED: existe-t-il un point de rendez-vous ou un correspondant à Oujda ?]]`
- `[[FACT NEEDED: combien de pèlerins de l'Oriental sont partis avec nous la saison dernière ?]]` — un chiffre daté, propre à nous, transformerait la page

Tant qu'ils manquent, **ne rien inventer** : la page sort avec ce qui est
vérifié, et les marqueurs restent visibles dans le brief, jamais sur la page.

## 6. Liens internes (au moins 3 entrants, depuis des pages qui reçoivent déjà)

- `/ar/omra-chaabane-ramadan` → la page Oujda, ancre : `العمرة انطلاقاً من وجدة`
- `/ar/omra-ramadan` → idem
- `/ar/bab-makka` → depuis la liste des villes de départ

Sortants depuis la page Oujda : le hub Chaâbane-Ramadan et le hub Ramadan.
Jamais une URL commerciale écrite en dur — l'intention est résolue à la lecture.

## 7. Contrôle

1. `NEXT_DIST_DIR=.next-audit npm run build` — suite + schéma + tests au vert
2. `node tools/check-urls.mjs https://wikitours.ma/ar/omra-depuis-oujda`
3. `node tools/indexnow.mjs --changed …` (clé + `keyLocation`, attendre **200**, jamais 202)
4. Demander l'indexation dans Search Console
5. Relever L5 et L10 à J+7 (29/09) et J+14 (06/10) dans `scoreboard/snippet-targets.csv`

## 8. Ce qu'on ne fait pas

- Pas de deuxième page Oujda, pas de variante « agence omra Oujda » : une
  requête, une page (sinon cannibalisation, et l'audit la refuse).
- Pas de copie du texte de Casablanca avec « Oujda » substitué.
- Pas de promesse de position : on promet la page, la mesure et les relevés
  de J+7 et J+14.
