# 22 — Audit du blog automatisé (21/09/2026)

> Mesuré avec la porte du projet — `npm run content:gate -- --existing` — sur
> les 31 articles en base, plus 90 jours de sessions propriétaires pour savoir
> lesquels rapportent vraiment. Rapports par article :
> `docs/content-system/gate-reports/*.json`.

## 1. Le verdict en trois chiffres

| | |
|---|---|
| Articles audités | 31 |
| Conformes | **2** — et ce sont les deux programmés, écrits après la porte |
| En ligne, sous la barre | **29** |

**Deux bonnes nouvelles, mesurées et non supposées :**
- **Aucun quasi-doublon.** Le test de similarité 3-grammes (G15) passe sur les
  31 articles. Il n'y a pas de contenu de porte (« doorway ») sur ce blog.
- **Aucune cannibalisation.** Le test de propriété de requête (G8) passe partout :
  aucun article ne vise une requête qui appartient à un lander.

Ce qui manque n'est donc pas la singularité des sujets, c'est la **forme** :
la réponse d'abord, les questions, la FAQ, le balisage et les liens.

## 2. Ce qui échoue, par règle

| Règle | Articles | Ce que c'est |
|---|---|---|
| G4 | **29 / 29** | pas de FAQ de 5 à 6 questions |
| G6 | **29 / 29** | moins de 4 liens internes, ou pilier/frères absents |
| G13 | **29 / 29** | nœud `FAQPage` absent (conséquence de G4) |
| G0 | **29 / 29** | **un fait volatil est écrit en clair** — prix, date ou année |
| G2 | 28 | bloc réponse hors de 40–55 mots |
| G1 | 27 | volume insuffisant, surtout en **arabe** |
| G3 | 25 | moins de 4 titres en forme de question |
| G12 | 25 | titre ou meta hors gabarit |
| G10 | 17 | expression interdite (« the best », « 100 % ») |
| G5 | 14 | liens externes hors liste blanche ou absents |

**G0 est le risque réel, pas une coquetterie.** `prix-omra-maroc-par-gamme-et-mois`
— l'article le plus lu du blog — contient **dix montants et six dates écrits dans
le texte**. Le jour où un tarif change, la page ment, et c'est la page que Google
envoie le plus. Le site sait afficher ces chiffres en direct (`<PriceRange />`,
`<LiveDepartures />`) : c'est exactement pour cela que ces composants existent.

## 3. Ce que rapportent ces articles (90 jours, données propriétaires)

16 articles sur 29 reçoivent au moins une session d'entrée. **13 n'en reçoivent
aucune.** La colonne « ar » compte les arrivées sur la version arabe.

| Sessions | dont Google | dont IA | ar | Article |
|---|---|---|---|---|
| 59 | 21 | 33 | 26 | prix-omra-maroc-par-gamme-et-mois |
| 15 | 11 | 1 | 14 | omra-ramadan-2027-quand-reserver |
| 9 | 9 | 0 | 2 | vaccins-sante-omra |
| 7 | 6 | 0 | 5 | omra-octobre-meteo-affluence |
| 6 | 5 | 0 | 3 | comment-verifier-agence-omra-agreee-maroc |
| 6 | 5 | 0 | 5 | omra-vacances-scolaires |
| 5 | 3 | 0 | 1 | hajj-maroc-inscription-quota |
| 3 | 1 | 2 | 1 | omra-10-derniers-jours-ramadan-2027 |
| 3 | 1 | 1 | 1 | invocations-dua-omra |
| 1 à 3 | — | — | — | application-nusuk-guide, budget-argent-poche-omra, quand-reserver-omra-calendrier, assurance-voyage-omra, telephone-internet-arabie-saoudite, gammes-omra-economique-vip, que-visiter-la-mecque |
| 0 | 0 | 0 | 0 | les 13 autres |

**La leçon** : sur les six premiers, l'arabe fait la majorité des arrivées. C'est
la même conclusion que le reste de l'audit — Google envoie de l'arabe, et c'est
la version arabe qui est la plus courte.

## 4. La liste : réécrire, fusionner, désindexer

### 4.1 Réécrire d'abord — six articles, dans cet ordre

Ils ont déjà un public : chaque correction se voit tout de suite.

| # | Article | Pourquoi maintenant | Ce qu'il faut faire |
|---|---|---|---|
| 1 | prix-omra-maroc-par-gamme-et-mois | 59 sessions, et **16 faits volatils écrits en dur** | remplacer chaque prix et chaque date par `<PriceRange />` / `<LiveDepartures />` ; porter l'arabe à hauteur du français ; FAQ 5–6 |
| 2 | omra-ramadan-2027-quand-reserver | 15 sessions dont 14 en arabe, veille de la vague Ramadan | bloc réponse 40–55 mots, 4 questions en H2, FAQ, liens vers `/omra-ramadan` et `/omra-chaabane-ramadan` |
| 3 | vaccins-sante-omra | 9 sessions, **toutes de Google** ; sujet officiel désormais sourcé | réécrire avec le certificat ACYW du ministère saoudien de la Santé et son lien ; arabe à étoffer |
| 4 | omra-octobre-meteo-affluence | 7 sessions ; le seul article « météo » du blog | l'aligner sur le modèle des blocs mois (février/mars) et le relier au lander |
| 5 | comment-verifier-agence-omra-agreee-maroc | 6 sessions ; c'est l'article de confiance | y mettre la preuve forte : l'inscription sur la liste officielle du ministère, avec le lien |
| 6 | omra-vacances-scolaires | 6 sessions dont 5 en arabe | étoffer l'arabe, FAQ, liens |

### 4.2 Fusionner — deux groupes, sept articles vers deux

Aucun n'est un doublon au sens de la porte (G15 passe), mais chacun est trop
court pour répondre seul, et ensemble ils couvrent une seule question.

**Groupe A — le Hajj au Maroc** : `hajj-maroc-inscription-quota` (5 sessions,
à garder comme URL cible), + `loterie-hajj-maroc`, `pas-tire-au-sort-hajj-omra`,
`cout-hajj-maroc`, `hajj-ministere-ou-agence` (0 session chacun). Un seul guide :
les deux canaux officiels, le tirage au sort, ce qu'il se passe quand on n'est
pas tiré, et le coût. Les quatre autres URL **301 vers la cible** — jamais
supprimées.

**Groupe B — la ziyara** : `que-visiter-la-mecque` (1) + `que-visiter-medine-ziyara`
(0) → un guide des lieux, Mecque et Médine. 301 de l'un vers l'autre.

Fusionner, c'est changer des URL : chaque fusion passe par la table
`redirects` de l'admin **avant** la dépublication, et la cible doit déjà
contenir le contenu absorbé.

### 4.3 Désindexer — aucun, et voici pourquoi

Aucun des 29 ne mérite un `noindex` aujourd'hui : pas de doublon, pas de
doorway, pas de page trompeuse. Désindexer un article qui reçoit déjà des
visites de Google se punit soi-même.

Les **13 articles à zéro session** ne sont pas un problème d'index mais un
problème de qualité : ils restent en ligne et passent dans la file de réécriture
après les six premiers. Si, au bilan du trimestre, ils n'ont toujours ni trafic
ni réécriture, la décision se reprend — c'est une décision du propriétaire, pas
une règle technique.

## 5. Les règles que le système de publication doit imposer

La bonne nouvelle : **la porte existe déjà et elle est sévère** — les 29 articles
sont antérieurs, pas tolérés. `scripts/content-gate.mjs` vérifie G0 à G16 avant
qu'un brouillon soit programmé, et `src/lib/server/article-gate.mjs` rejoue la
vérification au build ; un fichier qui échoue est **écarté et journalisé**, jamais
inséré.

Ce qui doit rester vrai, article après article :

1. **Aucun fait volatil dans le texte.** Prix, dates de départ, places, distances
   et politiques passent par une balise qui s'affiche à la lecture. C'est la règle
   G0, et c'est celle que les 29 articles violent tous.
2. **Un fait daté et sourcé par article**, pris dans `data/allowed-facts.json`
   (51 entrées officielles depuis aujourd'hui, 44 lues sur leur source).
3. **Bloc réponse de 40 à 55 mots** sous le H1, marqué `data-answer`.
4. **Au moins quatre H2 en forme de question**, et une FAQ de 5 à 6 questions
   avec des réponses de 30 à 75 mots → le nœud `FAQPage` en découle.
5. **Volume par format et par langue**, l'arabe compris — c'est la règle que les
   14 versions arabes trop courtes violent.
6. **Quatre liens internes minimum**, dont le pilier et deux frères, et jamais
   d'URL commerciale écrite en dur : un article déclare une INTENTION et
   `resolveIntent()` choisit le lander indexable au moment de la requête.
7. **Pureté de langue** : 95 % de lettres arabes en arabe, aucune phrase
   française sur `/en`.
8. **Similarité sous le seuil** (G15) et **propriété de requête** (G8) : une
   requête, une page.
9. **Publication par le temps** : `published_at` passé suffit, aucun cron ne
   publie.

**Ce que la porte ne vérifie pas et que la commande demande — la signature.**
Le système prend aujourd'hui `settings.blog_author_name`. Pour imposer qu'un
article soit signé par une personne nommée ayant l'expérience de l'Omra, il faut
d'abord que cette personne existe dans la base : les deux fiches
« Encadrant Technique & Religieux » (Mustapha Elkhaoui, Hassan Elasyly) ne sont
ni publiées ni biographiées. Tant qu'elles le restent, la règle ne peut pas être
appliquée sans inventer une expérience — ce qui est refusé (§ contrainte 9).

Trois options, au choix du propriétaire : publier les deux encadrants avec de
vraies bios ; garder la signature actuelle ; ou signer par l'agence, ce que font
déjà 27 articles sur 29.

## 6. Le calendrier, dans l'ordre des coups de docs/19

`data/content-calendar.json` tient 253 créneaux. L'ordre à suivre n'est plus
celui du calendrier générique mais celui des dix coups du marché :

1. Les pages villes **arabes** (Oujda, Agadir, Fès) — déjà du trafic sur peu de texte.
2. Les 14 versions **arabes** trop courtes, en commençant par les six articles du § 4.1.
3. La vague **Ramadan** : les questions officielles sont en ligne depuis
   aujourd'hui sur `/omra-ramadan` et `/omra-chaabane-ramadan` ; l'article
   `omra-ramadan-2027-quand-reserver` est la prochaine pièce.
4. Puis seulement les créneaux neufs du calendrier.
