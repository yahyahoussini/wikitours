# 20 — Inventaire du blog (mesuré le 21/09/2026)

Compté directement dans la base : le corps de chaque article, balises de composants
retirées (prix, départs, CTA — ils s'affichent à la lecture, pas dans le texte stocké).
Le nombre de mots du français, de l'arabe et de l'anglais est donc celui que lit un
moteur, à l'exception des blocs qui se calculent à l'affichage.

| Total | En ligne | Programmés | Retenus |
|---|---|---|---|
| 40 | 29 | 2 | 9 |

## 1. Articles de moins de 300 mots

**En français : aucun.** Le plus court fait 317 mots, la médiane 424.

**En arabe : 14 articles en ligne** passent sous 300 mots. C'est la version
arabe qui est courte, pas l'article : le texte arabe fait en moyenne 68 % du français
sur ces pages. Pour un lecteur marocain arrivant par une requête en arabe, la page
répond moins bien que sa jumelle française.

| Article | mots AR | mots FR | écart |
|---|---|---|---|
| invocations-dua-omra | 196 | 383 | −49 % |
| que-visiter-la-mecque | 210 | 317 | −34 % |
| assurance-voyage-omra | 212 | 321 | −34 % |
| omra-octobre-meteo-affluence | 225 | 331 | −32 % |
| telephone-internet-arabie-saoudite | 225 | 327 | −31 % |
| vaccins-sante-omra | 233 | 322 | −28 % |
| que-visiter-medine-ziyara | 242 | 368 | −34 % |
| bagages-omra-restrictions | 243 | 348 | −30 % |
| hajj-ministere-ou-agence | 244 | 347 | −30 % |
| gammes-omra-economique-vip | 253 | 355 | −29 % |
| loterie-hajj-maroc | 261 | 384 | −32 % |
| omra-vacances-scolaires | 270 | 372 | −27 % |
| cout-hajj-maroc | 276 | 403 | −32 % |
| pas-tire-au-sort-hajj-omra | 282 | 403 | −30 % |

**En anglais : 5 articles en ligne** passent sous 300 mots : vaccins-sante-omra (266), que-visiter-la-mecque (286), omra-octobre-meteo-affluence (283), assurance-voyage-omra (279), telephone-internet-arabie-saoudite (284).

Un mot sur le seuil : 300 mots n'est pas une règle de Google. Le vrai risque est
qu'une page courte réponde moins complètement qu'une page concurrente sur la même
question. Ces 14 pages arabes sont donc à réécrire dans l'ordre du trafic, pas toutes
en même temps.

## 2. Articles signés « Yahya Houssini »

6 articles portent la signature, dont 2 en ligne.

| Article | État | Date | Signature | Lien vers la fiche |
|---|---|---|---|---|
| prix-omra-maroc-par-gamme-et-mois | en ligne | 2026-09-07 | Yahya Houssini | **non — texte libre** |
| omra-8-jours-ou-15-jours | en ligne | 2026-09-07 | Yahya Houssini | **non — texte libre** |
| guide-omra-ramadan-1-vivre-le-mois | retenu | 2026-09-21 | Yahya Houssini | oui |
| inscription-hajj-maroc-les-etapes | programmé | 2026-09-22 | Yahya Houssini | oui |
| omra-en-novembre-meteo-affluence-conseils | retenu | 2026-09-24 | Yahya Houssini | oui |
| reserver-omra-depuis-l-europe-agence-casablanca | programmé | 2026-09-25 | Yahya Houssini | oui |

**Vérifié sur le site le 21/09/2026 : la signature fonctionne.** Les deux
articles en ligne portent la signature en texte libre, mais `findAuthor()`
(`src/lib/authors.js`) rapproche ce texte du nom de la fiche d'équipe : la page
émet bien le nœud `Person` complet, avec le `@id` qui pointe vers `/fr/equipe`,
le rôle et la bio. Rien n'est cassé.

Ce qui reste utile : renseigner le champ « Auteur (membre de l'équipe) » sur ces
deux articles plutôt que le texte libre. Le rapprochement se fait par le nom ;
le jour où le nom change d'un caractère, la signature retombe sur l'agence sans
prévenir. Les quatre autres articles (programmés et retenus) utilisent déjà le
lien.

Les deux articles en ligne sont signés en texte libre, pas
par le lien vers la fiche d'équipe. Résultat : la signature s'affiche, mais elle ne
produit ni nœud `Person` ni lien vers `/equipe`. Les quatre autres (programmés et
retenus) utilisent bien le lien. Correction : dans Admin → Articles, remplacer le
champ « Auteur (texte libre) » par le champ « Auteur (membre de l'équipe) » sur ces
deux articles.

Les 27 autres articles en ligne sont signés « Wiki Tours International »,
c'est-à-dire par l'agence. C'est honnête tant que les personnes n'ont pas de bio ;
ce n'est pas un défaut à corriger article par article, mais la raison pour laquelle
il vaut la peine de compléter les fiches d'équipe.

## 3. Tableau complet

| Article | État | Date | FR | AR | EN | Signature | Type |
|---|---|---|---|---|---|---|---|
| comment-verifier-agence-omra-agreee-maroc | en ligne | 2026-07-11 | 424 | 306 | 382 | Wiki Tours International | texte libre |
| omra-ramadan-2027-quand-reserver | en ligne | 2026-07-23 | 439 | 310 | 381 | Wiki Tours International | texte libre |
| premiere-omra-7-erreurs-a-eviter | en ligne | 2026-07-23 | 537 | 390 | 494 | Wiki Tours International | texte libre |
| difference-omra-hajj | en ligne | 2026-07-23 | 446 | 308 | 387 | Wiki Tours International | texte libre |
| comment-choisir-agence-omra | en ligne | 2026-07-23 | 571 | 421 | 506 | Wiki Tours International | texte libre |
| train-al-haramain-mecque-medine | en ligne | 2026-07-24 | 603 | 430 | 525 | Wiki Tours International | texte libre |
| que-visiter-medine-ziyara | en ligne | 2026-07-24 | 368 | 242 | 330 | Wiki Tours International | texte libre |
| omra-10-derniers-jours-ramadan-2027 | en ligne | 2026-07-28 | 442 | 313 | 401 | Wiki Tours International | texte libre |
| omra-en-famille-enfants-parents-ages | en ligne | 2026-07-29 | 573 | 393 | 502 | Wiki Tours International | texte libre |
| invocations-dua-omra | en ligne | 2026-08-24 | 383 | 196 | 321 | Wiki Tours International | texte libre |
| vaccins-sante-omra | en ligne | 2026-08-24 | 322 | 233 | 266 | Wiki Tours International | texte libre |
| que-visiter-la-mecque | en ligne | 2026-08-24 | 317 | 210 | 286 | Wiki Tours International | texte libre |
| gammes-omra-economique-vip | en ligne | 2026-08-24 | 355 | 253 | 303 | Wiki Tours International | texte libre |
| omra-vacances-scolaires | en ligne | 2026-08-25 | 372 | 270 | 330 | Wiki Tours International | texte libre |
| omra-octobre-meteo-affluence | en ligne | 2026-08-26 | 331 | 225 | 283 | Wiki Tours International | texte libre |
| hajj-maroc-inscription-quota | en ligne | 2026-08-27 | 467 | 313 | 411 | Wiki Tours International | texte libre |
| quand-reserver-omra-calendrier | en ligne | 2026-08-28 | 603 | 436 | 522 | Wiki Tours International | texte libre |
| budget-argent-poche-omra | en ligne | 2026-08-29 | 606 | 404 | 504 | Wiki Tours International | texte libre |
| application-nusuk-guide | en ligne | 2026-08-31 | 596 | 402 | 532 | Wiki Tours International | texte libre |
| omra-groupe-ou-individuel | en ligne | 2026-09-01 | 590 | 417 | 514 | Wiki Tours International | texte libre |
| loterie-hajj-maroc | en ligne | 2026-09-02 | 384 | 261 | 333 | Wiki Tours International | texte libre |
| pas-tire-au-sort-hajj-omra | en ligne | 2026-09-03 | 403 | 282 | 350 | Wiki Tours International | texte libre |
| hajj-ministere-ou-agence | en ligne | 2026-09-04 | 347 | 244 | 301 | Wiki Tours International | texte libre |
| cout-hajj-maroc | en ligne | 2026-09-05 | 403 | 276 | 341 | Wiki Tours International | texte libre |
| prix-omra-maroc-par-gamme-et-mois | en ligne | 2026-09-07 | 1490 | 1132 | 1333 | Yahya Houssini | texte libre |
| omra-8-jours-ou-15-jours | en ligne | 2026-09-07 | 1164 | 866 | 1079 | Yahya Houssini | texte libre |
| assurance-voyage-omra | en ligne | 2026-09-08 | 321 | 212 | 279 | Wiki Tours International | texte libre |
| bagages-omra-restrictions | en ligne | 2026-09-12 | 348 | 243 | 306 | Wiki Tours International | texte libre |
| telephone-internet-arabie-saoudite | en ligne | 2026-09-16 | 327 | 225 | 284 | Wiki Tours International | texte libre |
| omra-badal-pour-un-proche | retenu | 2026-09-20 | 364 | 249 | 315 | Wiki Tours International | texte libre |
| guide-omra-ramadan-1-vivre-le-mois | retenu | 2026-09-21 | 1764 | 1221 | 1650 | Yahya Houssini | fiche liée |
| inscription-hajj-maroc-les-etapes | programmé | 2026-09-22 | 1908 | 1338 | 1666 | Yahya Houssini | fiche liée |
| omra-en-novembre-meteo-affluence-conseils | retenu | 2026-09-24 | 1544 | 1102 | 1410 | Yahya Houssini | fiche liée |
| combien-de-fois-omra | retenu | 2026-09-24 | 340 | 230 | 297 | Wiki Tours International | texte libre |
| reserver-omra-depuis-l-europe-agence-casablanca | programmé | 2026-09-25 | 2059 | 1426 | 1807 | Yahya Houssini | fiche liée |
| imprevus-pendant-omra | retenu | 2026-09-28 | 392 | 257 | 348 | Wiki Tours International | texte libre |
| ramadan-2027-dates-calendrier | retenu | 2026-10-01 | 382 | 275 | 336 | Wiki Tours International | texte libre |
| quelle-periode-ramadan-choisir-omra | retenu | 2026-10-08 | 376 | 254 | 352 | Wiki Tours International | texte libre |
| journee-ramadan-la-mecque | retenu | 2026-10-15 | 374 | 244 | 333 | Wiki Tours International | texte libre |
| jeuner-pendant-omra-ramadan | retenu | 2026-10-22 | 391 | 261 | 360 | Wiki Tours International | texte libre |

## 4. Ce que ce tableau ne dit pas

- Le nombre de mots **affichés** est plus élevé : prix, départs, FAQ et encadrés
  s'insèrent à la lecture. Le chiffre ci-dessus est le texte écrit.
- Aucune donnée de Search Console n'était disponible pendant cette mesure, donc
  l'ordre de réécriture ne peut pas encore suivre le trafic réel. Export à fournir.
