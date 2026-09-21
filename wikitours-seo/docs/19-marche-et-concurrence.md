# 19 — Marché et concurrence : qui détient l'Omra au Maroc

> **Mesuré le 21/09/2026.** Sans clé SerpApi ni clé d'API d'un moteur IA, les pages
> de résultats ont été relevées avec des outils web depuis l'extérieur du Maroc.
> Ce que cela implique est écrit noir sur blanc au § 2 : **le pack local de Google
> n'a jamais pu être affiché**, donc aucune ligne de ce document n'affirme une
> position dans le pack. Les positions organiques citées viennent de Brave Search
> avec `country=ma` et d'un moteur secondaire ; elles indiquent qui occupe le
> terrain, pas un classement Google exact.
>
> Sources de ce document : 26 requêtes relevées (8 en français, 10 en arabe,
> 8 requêtes villes), le crawl de 5 sites concurrents (`crawl/*.json`), les
> données propriétaires du site (5 682 sessions sur 90 jours) et
> `scoreboard/competitors.csv`.

## 1. Qui détient le marché, par surface

**Google en français — personne ne le détient vraiment.** Les pages qui gagnent
sont faibles : sur « agence omra Casablanca », le premier résultat est
`sabilevoyages.com`, un opérateur basé en France qui affiche ses prix en euros
avec un numéro français — il vend à des pèlerins résidant en France, pas à des
Marocains. Le deuxième est un nom de domaine exact sans aucun prix. Le troisième,
`galaxyvoyage.ma`, se classe sur une page d'accueil dont le H1 parle du tourisme
au Maroc et pas de l'Omra. Le crawl de ce dernier le confirme : **40 pages, dont
35 sous le seuil de contenu, 112,6 mots en moyenne, aucune date, aucun auteur,
deux balises FAQ en tout et zéro lien sortant.** C'est ce site qui détient
pourtant l'extrait optimisé de « meilleure agence omra Casablanca », avec une
seule phrase générique.

**Google en arabe — un incumbent réel, et les réseaux sociaux.** Sur les dix
requêtes arabes relevées, `facebook.com` sort en tête neuf fois, suivi de
`tiktok.com` et `instagram.com` : en arabe, une part du marché se joue sur les
profils sociaux, pas sur les sites. Le seul site qui revient partout est
**`nearalharam.com`**, présent sur 7 des 10 pages arabes. Son crawl explique
pourquoi : **576,8 mots en moyenne, des dates sur 30 pages sur 40, 21 nœuds
`Article`, 22 nœuds `Person`, 39 `BreadcrumbList`, 4 `FAQPage`** et une
production étalée de 2022 à 2026. C'est une vraie opération éditoriale, signée
par des personnes. C'est le concurrent à étudier, parce que l'arabe est
justement là où Google nous envoie déjà du trafic.

**Les moteurs IA — ils nous lisent déjà.** Les données du site montrent que
ChatGPT et consorts ont envoyé 635 sessions en 90 jours, en atterrissant sur
`/fr`, `/en`, `/fr/agence-omra-casablanca` et les pages de départ. Aucune mesure
de citation n'a pu être faite sans clé d'API : savoir *si* nous sommes cités et
*à côté de qui* reste à mesurer (§ 6).

**Notre position organique : absente.** Sur les 26 requêtes relevées,
wikitours.ma n'apparaît qu'une seule fois — et encore, sous la forme de
l'**ancien domaine `bab-makka.com`**, sur « omra depuis Tanger agence ». C'est le
constat central de ce document : le site est techniquement irréprochable
(276/276 URL du sitemap en 200, canoniques autoréférentes, 4 hreflang, tous les
robots d'IA servis) et commercialement invisible sur les requêtes françaises.

## 2. Le pack local : ce qui est décidé par lui, et où nous en sommes

**Ce qui est vérifié.** Bab Makka possède une fiche Google active, liée dans les
réglages par son `place_id`, avec **4,8 étoiles et 141 avis** — un capital
supérieur à celui de la plupart des concurrents relevés.

**Ce qui n'a pas pu être vérifié, et ne doit pas être affirmé.** Le pack local de
Google ne s'est affiché sur **aucune** des 26 requêtes : depuis l'extérieur du
Maroc, Google ne rend pas ses résultats aux outils utilisés. Les noms d'agences
relevés dans un bloc local (Karama Travel, Miya Travel, Omra Maroc Agence de
Voyage, Manasiki Travel, VoyageOR) viennent du bloc local de **Brave**, pas du
pack de Google : ils prouvent que ces requêtes portent une intention locale, ils
ne disent rien de l'ordre du pack de Google.

**Les requêtes que le pack décide** — c'est-à-dire celles où le clic se joue
au-dessus des liens bleus, et où les 141 avis pèsent le plus :

| Requête | Langue | Pourquoi le pack décide |
|---|---|---|
| agence omra Casablanca | fr | intention locale pure, bloc local rendu par tous les moteurs testés |
| agence de voyage omra Casablanca | fr | idem, même bloc |
| meilleure agence omra Casablanca | fr | superlatif + ville : le pack sert de réponse |
| وكالة عمرة الدار البيضاء | ar | équivalent arabe de la première |
| agence omra Rabat / Oujda / Agadir | fr | ville sans intention d'achat immédiate : le pack occupe l'écran |
| وكالة عمرة الرباط | ar | idem |

**Ce que le propriétaire doit vérifier lui-même**, depuis un téléphone à
Casablanca, en navigation privée, position activée — c'est la seule mesure
fiable : pour chacune des sept requêtes ci-dessus, noter si Bab Makka apparaît
dans les trois résultats du pack, et à quelle place. Quinze minutes. Le résultat
va dans `scoreboard/runs/<semaine>.csv`, colonne `map_pack`.

## 3. Faiblesses exploitables, par concurrent

| Concurrent | Ce qui le fait gagner | Faiblesse exploitable (mesurée) |
|---|---|---|
| galaxyvoyage.ma | détient l'extrait optimisé sur deux requêtes commerciales | 35 pages sur 40 en dessous du seuil de contenu, 112 mots de moyenne, **aucune date, aucun auteur**, 2 FAQ en tout. Une page qui répond vraiment reprend l'extrait |
| voyageor.com | détient la couche informationnelle de « agence omra Maroc » avec 5 URL dans le top 21, et sa propre FAQ a été absorbée comme question « People Also Ask » de toute la famille de requêtes | la question détournée à son nom est reproductible : notre balisage FAQ peut viser la même place |
| nearalharam.com | le seul vrai éditeur arabe : 577 mots de moyenne, `Article` + `Person`, fil d'Ariane partout, production depuis 2022 | il écrit pour tout le Moyen-Orient et le Maghreb, pas pour le Maroc : **aucun prix en dirhams, aucun départ depuis Casablanca**. Notre avantage est la localité et les prix réels |
| **almakarimtours.ma** | premier sur « prix omra maroc », présent sur Oujda et Tanger. **Le concurrent français sérieux** : 1 343 mots par page en moyenne, 14 pages avec FAQ, et un balisage complet (`TravelAgency`, `Place`, `Organization`, `Person`, `Article`, fil d'Ariane) — il mérite sa place | 13 pages minces sur 40 et 11 sans date. Sa force est le volume, pas la fraîcheur : une page datée, chiffrée et mise à jour chaque saison le déborde sur les requêtes saisonnières (Ramadan, mois) |
| manasiki.ma | présent sur les requêtes prix et Ramadan, et dans le bloc local ; balisage `TravelAgency` + `Place` sur 39 pages | 408 mots par page, **aucune FAQ, aucun tableau, 32 pages sur 40 sans date**, et un catalogue construit comme un filtre de voyages (`CollectionPage` × 31) plutôt que comme des réponses. Rien à opposer à une page qui répond à des questions |

**Ce qu'aucun d'eux ne fait, et que nous faisons déjà** : publier le prix réel
par gamme **et par type de chambre**, avec le nom de l'hôtel et sa distance au
Haram en mètres. Sur les 26 requêtes relevées, les pages en tête affichent soit
un prix « à partir de » unique, soit rien du tout et un formulaire. C'est notre
différence défendable, et elle est déjà en ligne.

## 4. Carte de bataille : par requête, qui la détient et notre coup

| Requête | Détenteur aujourd'hui | Pourquoi il gagne | Notre coup |
|---|---|---|---|
| agence omra Casablanca | sabilevoyages.com (FR), bloc local | page ville dédiée de 850 mots | `/fr/agence-omra-casablanca` existe et reçoit déjà 57 sessions des moteurs IA : lui ajouter une FAQ, l'agrément vérifiable et les avis. Puis le pack (§ 2) |
| meilleure agence omra Casablanca | galaxyvoyage.ma (extrait) | une phrase générique | un bloc réponse de 40–60 mots qui répond vraiment à « comment choisir », sur la même page |
| agence omra Maroc | voyageor.com | guide de 2 800 mots, daté | notre pilier `/fr/guide-omra` doit porter la même question, avec nos chiffres datés |
| prix omra maroc | almakarimtours.ma | page prix avec l'année | `/fr/barometre-prix-omra` est la bonne page mais reste `noindex` faute de 3 départs par période ; à défaut, `/fr/omra-pas-cher` |
| omra ramadan 2027 prix | omra-compare.com, lepelerinage.com | pages 2027 déjà publiées | `/fr/omra-chaabane-ramadan` est en ligne avec deux programmes datés et chiffrés : c'est notre meilleure carte de la vague 1 |
| عمرة رمضان 2027 المغرب | facebook.com, nearalharam.com | profils sociaux + éditeur arabe | `/ar/omra-chaabane-ramadan` : même contenu, en arabe, avec les prix en dirhams que nearalharam n'a pas |
| ثمن العمرة من المغرب | facebook.com, rahhal.wego.com | agrégateur | page arabe de prix : c'est la requête arabe la plus commerciale et personne de sérieux ne la tient |
| عمرة من وجدة / أكادير / فاس | facebook.com, sites locaux | proximité | nos pages villes arabes reçoivent **déjà** du trafic Google (36, 14 et 6 sessions sur 90 j) sur un contenu mince : les étoffer est le gain le plus rapide du document |
| omra pas cher Casablanca | noussoukitravel.com | page « pas cher » dédiée | `/fr/omra-pas-cher` existe : aligner le titre sur la formulation réelle et y mettre le prix le plus bas réel |
| agence omra Oujda / Agadir | annuaires (telecontact, alapage) | annuaires locaux | inscription aux annuaires (docs/06) + pages villes ; le pack décide (§ 2) |

## 5. Les dix coups, dans l'ordre

1. **Étoffer les pages villes arabes** (`/ar/omra-depuis-oujda`, `-agadir`, `-fes`) — elles reçoivent déjà du trafic Google sur un contenu mince. *Contenu, vague 1.*
2. **Publier la version arabe complète des 14 articles dont le corps arabe fait moins de 300 mots** — même raison, même langue, même moteur. *Contenu, vague 1.*
3. **Rendre la fiche Google décisive** : vérifier le pack depuis Casablanca (§ 2), puis publier un post par semaine et répondre à chaque avis. *Propriétaire, vague 1.*
4. **Ajouter une FAQ à `/bab-makka` et `/hotels-omra`**, en français et en arabe — le hub commercial principal ne répond aujourd'hui à aucune question. *Contenu, vague 1.*
5. **Bloc réponse de 40–60 mots** sur `/fr/agence-omra-casablanca` et `/fr/omra-pas-cher`, pour viser les deux extraits que galaxyvoyage détient avec une phrase générique. *Contenu, vague 2.*
6. **Faire du 301 le statut de l'ancien domaine** `bab-makka.com` : il répond aujourd'hui en **307** (temporaire), ce qui explique qu'il apparaisse encore dans les résultats à la place de wikitours.ma. *Propriétaire, réglage Vercel, vague 1.*
7. **Citer les sources officielles** dans les articles de procédure : les 51 faits de `data/official-facts.json` portent désormais leur URL et leur date. Zéro lien sortant sur 108 pages informationnelles aujourd'hui. *Contenu, vague 2.*
8. **Se faire inscrire dans les listicles** qui se classent sur « meilleures agences omra Maroc » (espacetourisme.com, alx.ma) avec une preuve vérifiable : le numéro d'agrément et la liste officielle du ministère. *Propriétaire, vague 2.*
9. **Page de comparaison honnête** des programmes par gamme et distance au Haram — le format qu'aucun concurrent relevé ne publie. *Contenu, vague 2.*
10. **Mesurer ce qui n'est pas mesuré** (§ 6) avant d'élargir : sans Search Console ni relevé IA, la moitié de ce document reste une hypothèse informée. *Propriétaire, vague 1.*

## 6. Ce qui reste non mesuré, et par qui

| Manque | Pourquoi | Qui |
|---|---|---|
| Le pack local de Google | non rendu depuis l'extérieur du Maroc | le propriétaire, depuis un téléphone à Casablanca (§ 2) |
| Les impressions et les requêtes réelles | aucun export Search Console n'existe | le propriétaire : Performances → Exporter → CSV, 12 mois, dimension requête, dans `data/gsc/` |
| Les citations des moteurs IA | aucune clé d'API | le propriétaire : lancer les 33 prompts dans ChatGPT, Perplexity et Gemini, ou fournir les clés |
| Les positions Google exactes | pas de clé SerpApi | idem, ou relevé manuel hebdomadaire |
| Les notes et avis des concurrents | jamais lus sur une page ouverte | le propriétaire, dans Google Maps — ne jamais les estimer |
| Core Web Vitals | l'API PageSpeed a répondu « quota dépassé » sans clé | clé PageSpeed gratuite, ou relevé manuel |

## 7. Définition de la première place (rappel)

Quatre semaines consécutives de mesure des 33 prompts : position 1 sur la moitié
des requêtes commerciales et locales, top 3 sur le reste, pack tenu ; notre
passage détient l'extrait, la question « autres questions posées » ou la citation
de l'AI Overview sur un tiers ; cité sur la moitié des prompts dans au moins deux
moteurs IA. Aucune position n'est promise ici : c'est le processus et la mesure
hebdomadaire qui sont promis.
