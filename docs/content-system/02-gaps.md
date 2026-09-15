# 02 — Gaps (brief C2)

The floor of `content/ARTICLE-BRIEF.md`, checked row by row against what exists. Sources:
`docs/content-system/01-coverage-map.md` (94 URLs, overlap groups O1–O11), `docs/content-system/inventory.json`
(36 posts, 58 landers, word counts per locale), `data/lander-registry.json` (rendered H1 / title per
locale), `src/lib/clusters.js` (clusters A–G). Every URL below comes from those data files; none is invented.

**How status is decided.** `covered` only when one existing post or lander answers that exact
question at useful depth. The inventory says 25 of 36 posts are under 450 words in French and only
two pass 1 000, so a post that merely touches a floor topic is `partial`, and the Note says what is
missing. `missing` means no page answers the question — an adjacent URL named in the Note is the page
the future answer should link to, not the answer itself. Status is about the ANSWER, not about
linking: a `partial` row whose page is already exactly on topic is a rewrite of that body, never a
second URL on the same query (hard constraint 4, and the gate refuses a `query_family` that is a
lander's query).

---

## OMRA RAMADAN 1448 (the priority — every item, FR and AR)

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| Hijri overlay 1448 and 1449 with computed Gregorian windows | partial | /blog/ramadan-2027-dates-calendrier | 387 mots fr / 277 ar, et le millésime est dans le slug : la page meurt avec le cycle. Un seul cycle traité, jamais le suivant, et les fenêtres sont en prose au lieu de passer par `<HijriCountdown>` / `hijri_events`. À réécrire en place, pas à dupliquer. |
| Why Ramadan sells out and when the decision must be made | partial | /blog/omra-ramadan-2027-quand-reserver, /omra-ramadan | 441 mots, millésime dans le slug, et O2 : trois articles répondent déjà à « quand » (celui-ci, les dates, le calendrier mois par mois). Le mécanisme de la rareté — contingents hôteliers, sièges affrétés — n'est expliqué nulle part. |
| Why it costs more (mechanisms — numbers live) | partial | /blog/prix-omra-maroc-par-gamme-et-mois, /guide-omra/budget, /barometre-prix-omra | Le bilan tarifaire (1 501 mots, la page la plus longue du corpus) montre que le tarif bouge d'un mois à l'autre ; aucune page n'explique pourquoi ce mois-là est la pointe. Le baromètre, qui porterait la donnée, est noindex tant que l'échantillon reste sous son seuil. |
| First 10 vs middle vs last 10 nights vs full month | partial | /blog/quelle-periode-ramadan-choisir-omra, /blog/omra-10-derniers-jours-ramadan-2027 | O2b : deux articles minces (376 et 445 mots) pour une seule décision, et l'option « le mois entier » n'est traitée nulle part. Le comparatif doit devenir l'arbitrage profond ; le second se recentre sur la nuit. |
| Laylat al-Qadr in Makkah: what actually happens, hour by hour | partial | /blog/omra-10-derniers-jours-ramadan-2027 | 445 mots pour couvrir les dix nuits entières : le déroulé heure par heure d'une seule nuit y tient en un paragraphe. C'est la requête la plus forte du bloc et elle n'a pas de page à elle. |
| I'tikaf at the Haram: rules, registration, realities | missing | — | Aucune page. Adjacents : /blog/application-nusuk-guide pour la partie permis, /hotels-omra pour la contrainte de distance qu'un i'tikaf impose. |
| Fasting while travelling: the traveller's rukhsa explained responsibly | partial | /blog/jeuner-pendant-omra-ramadan | 393 mots fr / 266 ar, angle « est-ce possible et comment s'organiser » : de l'organisation, pas de la règle. La rukhsa avec ses sources — et le refus de trancher à la place d'un savant — reste à écrire dans ce même corps. |
| Suhoor and iftar in Makkah and Madinah (hotel and Haram) | partial | /blog/journee-ramadan-la-mecque | 371 mots fr / 244 ar pour décrire une journée entière ; les deux repas y tiennent en deux phrases. Le fonctionnement concret — service à l'hôtel, nappes au Haram, heure de sortie — n'y est pas. |
| Tarawih at the Haram: timings, crowd flow, where to stand, women's sections | partial | /blog/journee-ramadan-la-mecque | Même article, mêmes 371 mots : trois sujets du floor y sont empilés. Les flux de foule et la section des femmes sont deux questions d'orientation, pas une ambiance ; elles méritent leur URL. |
| Nusuk permits and crowd control in Ramadan | partial | /blog/application-nusuk-guide | 611 mots, une des rares pages au-dessus du seuil, mais entièrement evergreen : le régime de permis propre au mois et la régulation d'accès ne sont pas traités. |
| Hotel distance matters far more in Ramadan | partial | /hotels-omra, /hotel/anjum, /hotel/abraj-al-kiswah | Le hub compare les distances hors contexte saisonnier ; rien n'explique ce que la même distance devient quand les abords saturent. À noter : les deux établissements de Médine portent `city = makkah`, donc `<HotelList city="madinah">` ne rend rien tant que la donnée n'est pas corrigée. |
| Ramadan Omra with elderly parents | partial | /blog/omra-en-famille-enfants-parents-ages | 586 mots partagés entre deux publics, sans cadre saisonnier. Les décisions propres à un parent âgé qui jeûne — horaires, repos, accès — n'y sont pas. |
| With children | partial | /blog/omra-en-famille-enfants-parents-ages | Même article, même partage. Rien sur l'enfant qui ne jeûne pas dans un séjour organisé autour du jeûne. |
| For women | missing | — | Adjacent : /guide-omra/femme-mahram, qui répond à une autre question (la règle du mahram) et ne mentionne pas le mois. Espaces de prière, affluence, cycle, sortie nocturne : rien. |
| Health: hydration, medication timing, sleep, heat | missing | — | Adjacent : /blog/vaccins-sante-omra (337 mots), qui traite la vaccination avant le départ, pas la conduite d'un traitement ni l'inversion du sommeil pendant le jeûne. |
| Ramadan packing list | partial | /guide-omra/checklist, /blog/bagages-omra-restrictions | Le chapitre est la liste de référence et l'article couvre le poids et les interdits ; l'écart propre au mois — tapis, gourde, tenue de nuit, trousse — n'est écrit nulle part. |
| Daily spiritual programme template | partial | /blog/journee-ramadan-la-mecque | L'article décrit une journée, il n'en propose pas une. Un modèle actionnable est un autre format, et le seul du bloc qui se prête à une page qu'on imprime et qu'on emporte. |
| Ramadan duas | partial | /blog/invocations-dua-omra | 375 mots fr et 204 ar — le corps arabe le plus court du corpus, pour un sujet arabe par nature. Les invocations y sont accrochées aux rites, pas aux nuits. |
| The "Umrah in Ramadan equals Hajj" hadith explained with sources | missing | — | Aucune page, alors que c'est le motif de départ le plus cité. Adjacent : /blog/difference-omra-hajj, qui compare les deux cultes sans citer ce hadith. À sourcer, jamais à paraphraser. |
| Eid al-Fitr in Makkah: prayer, crowds, logistics | missing | — | Aucune page, aucun hub. Adjacent : /omra-ramadan, qui s'arrête au mois. |
| Omra Sha'ban and Omra Rajab as alternatives | missing | /omra-rajab, /omra-chaabane | Les deux slugs sont réservés mais non publiés : aucun contenu dans aucune locale, noindex, non liés. Ils prendront la requête commerciale dès publication, donc l'article ne peut être qu'un angle « pourquoi / au lieu de », jamais la requête nue. |
| Arriving before the 1st: visa and flight timing | partial | /guide-omra/documents-visa | Le chapitre couvre le visa et le passeport hors saison ; la question posée ici est un calage de calendrier et elle n'a pas d'endroit. |
| Morocco's Ramadan DST change and flight schedules | missing | — | Aucune page ne mentionne le changement d'heure marocain, qui décale l'enregistrement et la rupture du jeûne pour les départs de Mohammed V. Adjacent : /omra-depuis-casablanca. |
| Deposit, cancellation and waitlist in Ramadan (policy live) | missing | — | La politique existe comme balise (`<DepositPolicy>`), aucune page ne l'explique. Adjacents : /bab-makka, /omra-ramadan. C'est la question qui bloque la décision quand le programme affiche complet. |
| Ramadan Omra vs Ramadan at home, honestly | missing | — | Aucune page ne pose l'arbitrage, ni le coût familial, ni ce qu'on perd à la maison. C'est le seul angle du bloc qui peut dire « restez », et c'est ce qui le rend crédible. |
| Keeping the momentum after | missing | — | Rien sur le retour. Adjacent : /avis, où les pèlerins le racontent sans qu'aucune page ne le traite. |
| Ramadan 1449 early cycle | missing | — | Les trois pages qui portent le cycle courant ont le millésime dans le slug (/blog/ramadan-2027-dates-calendrier, /blog/omra-10-derniers-jours-ramadan-2027, /blog/omra-ramadan-2027-quand-reserver) : le cycle suivant n'a aucune URL, et les anciennes devront rediriger, jamais être renommées. |
| Ramadan Omra from each of the 8 cities | partial | /omra-depuis-casablanca, /omra-depuis-rabat, /omra-depuis-marrakech, /omra-depuis-fes, /omra-depuis-tanger, /omra-depuis-agadir, /omra-depuis-meknes, /omra-depuis-oujda | Les huit landers existent, sont indexables et possèdent la requête « omra depuis {ville} » : huit articles jumeaux seraient refusés par la porte comme requête de lander. L'angle qui reste — rejoindre Mohammed V aux horaires du mois — est un sujet, pas huit. |
| Ramadan Omra glossary (AR-first) | partial | /glossaire-omra | 42 termes, evergreen, et rien du mois (i'tikaf, qiyam, suhoor, tarawih). Aucun contenu du corpus n'est pensé en arabe d'abord : les corps arabes font 23 à 46 % de moins que les français. |
| "First Ramadan Omra" mistakes | partial | /blog/premiere-omra-7-erreurs-a-eviter | 540 mots et 11 liens sortants : la meilleure page du corpus pour ce public, mais entièrement hors saison. Les erreurs propres au mois n'y figurent pas. |
| Ramadan Omra FAQ mega-post | missing | — | 34 des 36 articles n'ont aucun bloc FAQ, et les deux qui en ont portent trois questions en fr et en en, zéro en ar. Il n'existe donc ni page FAQ du mois, ni `FAQPage` arabe sur le blog. |

---

## HAJJ 1448 DEPUIS LE MAROC

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| The Moroccan Hajj process end to end (Habous, registration, القرعة, quota, agency share) | partial | /blog/hajj-maroc-inscription-quota, /blog/loterie-hajj-maroc, /hajj | O5 : le processus complet est l'union de quatre articles de 379 à 464 mots qui répètent chacun quota → inscription → القرعة avant leur propre angle. Écrit comme cinquième page, il deviendrait un sixième propriétaire de la même requête : c'est un approfondissement de /blog/hajj-maroc-inscription-quota. |
| Registration timeline | partial | /blog/hajj-maroc-inscription-quota | 464 mots, le plus long du bloc, mais sans chronologie : les étapes sont décrites, jamais ordonnées dans le temps. Les échéances étant volatiles, elles doivent passer par une balise, pas par la prose. |
| Eligibility and priority rules | partial | /blog/loterie-hajj-maroc | Les règles d'âge et de priorité sont effleurées à l'intérieur de l'explication du tirage (386 mots) ; c'est pourtant la première question posée, et elle décide si la suite sert à quelque chose. |
| Costs and tiers (mechanisms; numbers live) | partial | /blog/cout-hajj-maroc | 408 mots sur ce que couvre le montant. Les paliers et les mécanismes qui les séparent ne sont pas décomposés, et la page ne peut pas porter de chiffre en dur. |
| Agency vs ministry (exists) | partial | /blog/hajj-ministere-ou-agence | Existe, 379 mots — sous le seuil : le comparatif tient en une liste. Le floor le donne pour acquis ; la profondeur, elle, ne l'est pas. |
| After rejection → Omra (exists; extend with the bridge) | partial | /blog/pas-tire-au-sort-hajj-omra | Existe, 408 mots, et c'est la page du pont (`HAJJ_BRIDGE_SLUGS`). Le pont y est une conclusion, pas un parcours : ce que devient le budget, le délai, le dossier. |
| Hajj badal | missing | — | Adjacent : /blog/omra-badal-pour-un-proche (programmé, 364 mots), qui traite la Omra al-badal — un autre culte, d'autres conditions. Rien sur le Hajj badal. |
| Saving plans | missing | — | Aucune page. Adjacents : /blog/cout-hajj-maroc, /guide-omra/budget. Sujet à écrire sans le moindre montant, en mécanismes et en durées relatives. |
| Health requirements | partial | /blog/vaccins-sante-omra | 337 mots, cadrés Omra. Les exigences propres au Hajj — effort, chaleur, durée, aptitude — ne sont pas traitées. |
| Rituals day by day (Mina, Arafah, Muzdalifah, Jamarat, tawaf al-ifadah) | missing | — | Adjacents : /blog/difference-omra-hajj (446 mots, nomme les étapes sans les dérouler) et /guide-omra/rituels, qui est le chapitre des rites de l'Omra. Le déroulé jour par jour n'existe pas. |
| Hajj for the elderly | missing | — | Adjacent : /blog/omra-en-famille-enfants-parents-ages, hors sujet ici. C'est la population majoritaire du Hajj marocain et elle n'a pas de page. |
| What the agency contract covers | partial | /blog/cout-hajj-maroc | L'article répond « ce que couvre le montant » ; il ne lit pas le contrat — obligations, substitutions, recours. Adjacent : /agrement. |
| Hajj packing | missing | — | Adjacent : /guide-omra/checklist, qui est la liste Omra : durée, campement et effort n'ont rien à voir. |
| Hajj for women | missing | — | Adjacent : /guide-omra/femme-mahram, qui traite le mahram pour l'Omra. Rien sur le Hajj au féminin. |
| Post-Hajj: what changes | missing | — | Aucune page sur le retour, le statut, les attentes de l'entourage. Adjacent : /avis. |
| Hajj 1449 registration cycle | missing | — | Aucune URL pour le cycle suivant ; les quatre articles existants sont formulés au présent du cycle courant et vieilliront en silence. |

---

## OMRA CORE — PREPARATION

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| Ihram wearing and mistakes | partial | /guide-omra/rituels, /blog/premiere-omra-7-erreurs-a-eviter, /glossaire-omra | Le chapitre déroule la séquence des rites, l'article liste sept erreurs toutes catégories : le geste lui-même — nouer, refaire, réparer, ce qui invalide — n'a pas de page. |
| Money / cards / SAR | covered | /blog/budget-argent-poche-omra | 619 mots fr / 420 ar sur l'argent sur place, le riyal et les cartes : la question est posée et répondue au bon niveau. Une des rares pages du corpus au-dessus du seuil. |
| SIM / eSIM | partial | /blog/telephone-internet-arabie-saoudite | 331 mots fr / 231 ar et **un seul** lien sortant, le plus faible du corpus : programmé mais mince, et orphelin dans le graphe. |
| Mohammed V step by step | missing | — | Les huit landers villes nomment Mohammed V sans décrire l'aéroport. Adjacent : /omra-depuis-casablanca. C'est la première angoisse d'un primo-partant et personne ne la traite. |
| Saudia vs RAM | missing | — | Les départs citent la compagnie (/omra/omra-octobre-2026-6-au-20) sans comparer. Adjacent : /bab-makka. |
| Jeddah vs Madinah arrival | missing | — | Adjacent : /blog/train-al-haramain-mecque-medine (606 mots), qui relie les deux villes mais ne traite pas le choix du point d'entrée ni ce qu'il change à l'ihram. |
| Accessibility and wheelchairs at the Haram | missing | — | Adjacent : /blog/omra-en-famille-enfants-parents-ages, qui évoque les parents âgés sans traiter le fauteuil, les portes accessibles ni les étages de tawaf. |
| Lost documents and emergencies | partial | /blog/imprevus-pendant-omra | 398 mots, programmé, exactement sur le sujet mais sous le seuil : perte, maladie et égarement en un seul corps, sans procédure suivie jusqu'au bout. |
| What to wear by season | missing | — | Adjacent : /guide-omra/checklist, qui liste sans saisonnaliser. Aucune page ne relie tenue et mois. |
| Haram etiquette | missing | — | Aucune page sur les usages — files, poussettes, téléphones, place des groupes. Adjacent : /glossaire-omra. |
| Photography rules | missing | — | Aucune page. Question posée par tout le monde et jamais répondue ; adjacent : /blog/que-visiter-la-mecque. |
| Zamzam transport | partial | /blog/bagages-omra-restrictions | 345 mots pour trois sujets (poids, interdits, Zamzam) : le Zamzam y est un tiers de page. |
| Jet lag | missing | — | Aucune page sur le décalage, ni sur la première nuit. Adjacent : /guide-omra/checklist. |
| Weather by month | partial | /blog/omra-octobre-meteo-affluence | Un mois sur douze (338 mots). Les blocs météo des landers mensuels sont la place correcte de cette réponse et ne sont pas écrits : neuf landers sur douze restent noindex faute de ces blocs en fr et en ar. |

---

## OMRA CORE — SPIRITUALITY

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| Tawaf types | partial | /guide-omra/rituels, /glossaire-omra | Le chapitre décrit un tawaf, celui de l'Omra ; les types (qudum, ifada, wada') n'existent que comme définitions isolées du glossaire. |
| Sa'i | partial | /guide-omra/rituels | Traité comme une étape de la séquence. Les questions réelles — étages, fauteuil, décompte, interruption — n'y sont pas. |
| Talbiyah | partial | /blog/invocations-dua-omra | 375 mots fr / 204 ar pour toutes les invocations du parcours : la talbiya y est une ligne, alors qu'elle est la seule formule que chacun doit savoir avant de partir. |
| Rawdah reservation | covered | /blog/application-nusuk-guide, /blog/que-visiter-medine-ziyara | 611 mots et le titre rendu porte la réservation de la Rawda : la question est possédée. O8 : le guide de la ziyara redonne la même réponse — à recentrer sur la visite, en pointant vers l'article Nusuk. |
| Multiple umrahs (Tan'im) | partial | /blog/combien-de-fois-omra, /guide-omra/rituels | 339 mots, programmé, le plus court des programmés. O10 : partage la mécanique du second ihram avec /blog/omra-badal-pour-un-proche. |
| Omra for the deceased | partial | /blog/omra-badal-pour-un-proche | 364 mots, programmé : exactement sur le sujet mais trop court pour distinguer défunt, malade et empêché, qui n'ont pas les mêmes conditions. |
| Common fiqh questions | missing | — | Aucune page de questions-réponses de fiqh, et 34 des 36 articles n'ont aucun bloc FAQ. Adjacents : /glossaire-omra, /guide-omra/rituels. Sujet à ne publier qu'avec des sources. |
| History sites in Makkah and Madinah (pilgrimage context only) | partial | /blog/que-visiter-la-mecque, /blog/que-visiter-medine-ziyara | 325 et 372 mots : deux des pages les plus courtes du corpus pour deux villes. Le titre rendu du premier nomme les sites du Hajj, ce qui le fait empiéter sur le bloc Hajj (O8/O5). |

---

## OMRA CORE — TRUST

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| Scams and red flags | partial | /blog/comment-verifier-agence-omra-agreee-maroc, /agrement | 430 mots — sous le seuil — pour la page qui porte l'E-E-A-T du site. L'angle est la vérification ; les signaux d'alerte (prix hors marché, virement personnel, absence de contrat) y tiennent en une liste. |
| Reading the contract | missing | — | Aucune page. Adjacents : /blog/assurance-voyage-omra, /agrement. C'est le document que tout le monde signe et que personne n'explique. |
| What no-online-payment protects | missing | — | Le site ne prend aucun paiement en ligne — c'est une décision structurante et aucune page ne dit pourquoi c'est une protection. Adjacents : /agence-omra-casablanca, /bab-makka. |
| Reading reviews critically | partial | /avis | Le lander expose les témoignages ; aucune page n'apprend à les lire (mélange fr/ar/darija, ancienneté, ce qu'un avis ne prouve pas). |
| Cancelled-flight scenario | partial | /blog/assurance-voyage-omra | 326 mots, angle couverture : le scénario vécu — qui prévient, qui reloge, qui rembourse — n'est pas déroulé. |
| Group size and supervision | covered | /blog/omra-groupe-ou-individuel | 595 mots fr / 422 ar : la question du groupe et de l'encadrement est posée et tranchée au bon niveau. Cluster B, lié au lander local comme prévu. |

---

## OMRA CORE — PRICING MECHANISMS (numbers live)

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| Why prices move | covered | /blog/prix-omra-maroc-par-gamme-et-mois, /guide-omra/budget, /barometre-prix-omra | 1 501 mots fr / 1 157 ar, plus le chapitre « ce qui fait le prix » : répondu. Le risque ici n'est pas l'absence mais O1 — six pages sur la même question — et le fait que le baromètre, moitié donnée de la réponse, est noindex sous son seuil d'échantillon. |
| Room-type economics | partial | /blog/gammes-omra-economique-vip, /omra-pas-cher | 359 mots pour l'article : il compare des gammes, pas des occupations. Ce que change le passage d'une chambre partagée à une chambre seule n'est expliqué nulle part. |
| Hidden costs | partial | /blog/budget-argent-poche-omra, /blog/cout-hajj-maroc | L'argent de poche est traité (619 mots) ; « ce qui n'est pas dans le forfait » n'a pas de propriétaire côté Omra. |
| Saving plan | missing | — | Aucune page. Adjacents : /omra-pas-cher, /guide-omra/budget. À écrire en mécanismes et en horizons, sans un seul montant. |
| Price vs value | partial | /blog/gammes-omra-economique-vip, /omra-5-etoiles | Le sujet apparaît par les gammes ; personne ne pose la question inverse — ce que vaut une distance, une nuit de plus, un vol direct — qui est celle qui fait accepter un écart de prix. |

---

## OMRA CORE — AUDIENCES

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| Elderly | partial | /blog/omra-en-famille-enfants-parents-ages | 586 mots partagés avec les enfants : deux publics opposés dans une page. Les décisions propres au grand âge — rythme, traitement, accès, accompagnement — ne tiennent pas dans une moitié de page. |
| Reduced mobility | missing | — | Aucune page. Adjacent : /hotels-omra, où la distance est le critère qui décide pour ce public. |
| Diaspora FR/BE/ES/IT/NL from Casablanca | missing | — | Les huit landers villes sont des pages de départ intérieur. Adjacent : /omra-depuis-casablanca. Rien pour le MRE qui rentre pour partir avec sa famille. |
| Couples | missing | — | Aucune page. Adjacent : /guide-omra/femme-mahram, qui traite l'époux comme règle, jamais le couple comme public. |
| Groups and companies | partial | /blog/omra-groupe-ou-individuel | 595 mots, mais côté particulier : le groupe constitué (association, entreprise, quartier, famille élargie) et ce qu'il change n'est pas traité. |
| Students | missing | — | Aucune page. Adjacents : /omra-pas-cher, /blog/omra-vacances-scolaires (qui vise les familles, pas les étudiants). |
| Converts | missing | — | Aucune page. Adjacents : /glossaire-omra, /guide-omra/rituels — les deux supposent un vocabulaire acquis. |
| First flight ever | missing | — | Adjacent : /blog/premiere-omra-7-erreurs-a-eviter, qui parle de la première Omra, pas du premier vol. Deux peurs différentes. |

---

## OMRA CORE — SEASONAL

| Topic | Status | Existing URL(s) | Note |
|---|---|---|---|
| Support content for every /omra-{month} | partial | /blog/omra-octobre-meteo-affluence, /omra-octobre | Un mois sur douze a son article de soutien. Les onze autres landers n'en ont aucun, et neuf d'entre eux sont noindex : un article de soutien y pointerait vers une page non indexable. Les blocs rédigés (météo, à qui ça convient) en fr et en ar passent avant. |
| Rajab | missing | /omra-rajab | Slug réservé, non publié, aucune locale, noindex, non lié. L'article ne peut être qu'un angle informationnel : le hub prendra la requête. |
| Sha'ban | missing | /omra-chaabane | Même situation que Rajab. |
| Shawwal | missing | /omra-chawal | Même situation ; en plus, la fenêtre juste après le mois de jeûne est celle que personne n'explique. |
| Dhul Qa'dah | missing | — | Ni slug réservé, ni article : le seul mois sacré sans aucune surface. |
| Muharram / Ashura | missing | — | Aucune surface non plus, alors que c'est une date repère du calendrier marocain. |
| Mawlid | partial | /omra-mawlid | Hub commercial indexable, sans contre-partie informationnelle. Son H1 rendu est défectueux (`Omra المولد النبوي` sur /ar) : la page se présente mal avant même d'être soutenue. |
| Moroccan school holidays | partial | /blog/omra-vacances-scolaires, /omra-vacances-scolaires, /omra/omra-octobre-2026-vacances-scolaires-17-au-24 | O7 : trois propriétaires en attente pour une requête. L'article (371 mots) la possède aujourd'hui ; le jour où le hub d'occasion publie, il doit devenir un « comment », sans quoi il cannibalise. |
| Eid al-Adha period | missing | — | Aucune page. Adjacent : /hajj — c'est la même fenêtre, et rien ne dit à un candidat Omra ce qui change alors. |
| Summer heat | partial | /omra-ete | Hub commercial indexable, H1 rendu cassé (`Omra الصيفالصيف 2026`), et aucun contenu sur la chaleur, l'hydratation ou les horaires de tawaf. /omra-juillet et /omra-aout sont noindex. |
| Winter | missing | — | Aucune page. /omra-decembre, /omra-janvier et /omra-fevrier sont tous les trois noindex : la saison basse, celle où les prix sont les plus accessibles, n'a aucune surface indexable. |

---

## Added by this analysis

39 questions que pose un Marocain entre « est-ce que j'y vais » et « je suis rentré », absentes du
floor et sans URL existante. Format : question — pillar / audience.

### OMRA RAMADAN 1448

- Comment demander un congé à un employeur marocain pour partir pendant le mois, et quelle durée demander — omra_ramadan / all
- Où prier quand le Haram est saturé : extensions, esplanades, rues, et à quel moment renoncer à entrer — omra_ramadan / all
- Faire Médine avant La Mecque pendant le mois : ce que change l'ordre des deux villes — omra_ramadan / all
- Ce que fait réellement l'accompagnateur pendant le mois : horaires, joignabilité, ce qu'il ne fait pas — trust_agency / first-timers
- Manger marocain pendant un jeûne saoudien : digestion, habitudes, ce qu'on emporte de chez soi — omra_ramadan / all
- Zakat al-fitr versée sur place : où, quand, par quel canal, et à qui l'on s'adresse — spirituality / all
- Le vendredi au Haram pendant le mois : arriver quand, ressortir comment — omra_ramadan / all
- Travailler à distance depuis La Mecque pendant le mois : ce qui tient et ce qui ne tient pas — omra_ramadan / all

### HAJJ 1448 DEPUIS LE MAROC

- Ce que devient un dossier non retenu : circuit administratif, reconduction, ce qu'on récupère — hajj / all
- Ce que prévoient l'employeur et l'administration marocaine pour un salarié qui part — hajj / all
- Partir en couple : deux dossiers, un seul tirage, et ce qui se passe quand un seul sort — hajj / couples
- Ce que vit la famille restée au Maroc pendant l'absence : joignabilité, procurations, organisation — hajj / families
- Vérifier qu'une agence est réellement attributaire d'un quota avant de signer — trust_agency / all

### OMRA CORE — PREPARATION

- Passer la douane marocaine au retour : dattes, tapis, cadeaux, ce qui est déclaré — preparation / all
- Voyager avec un traitement chronique : ordonnance, conditionnement, contrôle à l'aéroport — preparation / elderly
- Prier à bord et en escale : ablutions, direction, heures rattrapées — preparation / first-timers
- Choisir sa place en avion quand on voyage en état d'ihram — preparation / first-timers
- Les heures d'attente à l'arrivée : transfert, bus, regroupement, ce qu'on fait de ce temps — preparation / all
- Les portes du Haram et les points de rendez-vous : ne plus se perdre en ressortant — preparation / first-timers

### OMRA CORE — SPIRITUALITY

- Les erreurs de niyya : à quel moment l'intention est réellement prise — spirituality / first-timers
- Se couper les cheveux : taqsir ou halq, qui fait quoi, où et par qui — spirituality / all
- La prière du voyageur (qasr) pendant le séjour et au retour — spirituality / all
- Que faire des vêtements d'ihram après l'Omra — spirituality / all

### OMRA CORE — TRUST

- Vérifier que l'hôtel annoncé est bien celui où l'on dormira — trust_agency / all
- Ce qui se passe quand l'agence change d'hôtel ou d'horaire après la réservation — trust_agency / all
- Reconnaître une fausse page Facebook ou un faux WhatsApp au nom d'une agence — trust_agency / all
- Ce qu'une agence ne peut pas promettre : visa, sièges, chambres attenantes — trust_agency / first-timers

### OMRA CORE — PRICING MECHANISMS

- Pourquoi deux pèlerins du même groupe ne paient pas la même chose — pricing / all
- Changer un nom ou une date sur un dossier : ce qui est possible, ce qui se refacture — pricing / all
- Comparer deux devis d'agences ligne à ligne : ce qu'on regarde dans l'ordre — pricing / budget

### OMRA CORE — AUDIENCES

- Partir avec un parent malvoyant ou malentendant — audiences / elderly
- Voyager entre sœurs ou entre amies : ce que le groupe change concrètement — audiences / women
- Passeports et autorisations des enfants mineurs côté marocain — audiences / families
- Partir seul après un veuvage : chambre, groupe, accompagnement — audiences / elderly
- Emmener un adolescent qui n'a jamais prié en groupe — audiences / families

### OMRA CORE — SEASONAL

- Les ponts et jours fériés marocains comme fenêtres de départ — seasonal / all
- Partir juste avant la saison du Hajj : ce que la montée en charge change sur place — seasonal / all
- Examens et concours : les fenêtres réelles des étudiants marocains — seasonal / students
- Les départs de fin d'année : ce que la haute saison aérienne change au programme — seasonal / all

---

## Counts

| Block | covered | partial | missing | Floor total | Added |
|---|---|---|---|---|---|
| OMRA RAMADAN 1448 | 0 | 19 | 12 | 31 | 8 |
| HAJJ 1448 DEPUIS LE MAROC | 0 | 8 | 8 | 16 | 5 |
| OMRA CORE — PREPARATION | 1 | 5 | 8 | 14 | 6 |
| OMRA CORE — SPIRITUALITY | 1 | 6 | 1 | 8 | 4 |
| OMRA CORE — TRUST | 1 | 3 | 2 | 6 | 4 |
| OMRA CORE — PRICING MECHANISMS | 1 | 3 | 1 | 5 | 3 |
| OMRA CORE — AUDIENCES | 0 | 2 | 6 | 8 | 5 |
| OMRA CORE — SEASONAL | 0 | 4 | 7 | 11 | 4 |
| **Total** | **4** | **50** | **45** | **99** | **39** |

**The honest number is 109 distinct new angles**, and it is reached like this. The floor holds 99
rows; this analysis adds 39; that is 138 line items. Four rows are `covered` and open no URL at all
(−4). Twenty-eight `partial` rows are pages that already sit exactly on the question and are only
thin — the four programmed Ramadan articles occupy the Hijri overlay, the window comparison, the day
in Makkah and the fasting question; the four Hajj bridge articles are, together, the end-to-end
process; the same holds for the SIM, the emergencies, the Zamzam, the talbiyah, the Tan'im, the badal,
the red flags, the cancelled flight, the room types, the hidden costs, the elderly and the constituted
group. Each of those is a rewrite of one body, never a second URL on the same query, or the gate
refuses it (−28). Three more rows are not blog angles at all but authored blocks on a lander — the
weather of each month, the Mawlid hub, the summer hub (−3). That leaves 103. Two rows expand:
« support content for every /omra-{month} » is eleven distinct months once October is removed (+10),
and the Hajj day-by-day ritual splits once (+1). That gives 114, from which five near-collisions have
to come off — the Ramadan packing list against the Ramadan health page, the elderly against the
children page, the two Hajj audience pages, the saturated-Haram question against the tarawih crowd
flow, and the alternatives to the month against the Rajab and Sha'ban rows (−5). **109.**

Two things that number is not. It is not 109 × 3: a French, an Arabic and an English version are one
URL and one file in the ingest, so a trilingual page is one slot, not three. And it is not a year of
publishing. Against the 244 slots a year of publishing at the planned cadence would need, 109 angles
fill **45 %** — a shortfall of **135 slots**. Counting the 28 rewrite rows as slots, because a rewrite
costs an editorial week exactly like a new page, brings the usable total to 137 and the shortfall to
107 — still 44 % of the year unfilled. The gap does not close by inventing topics: it closes by depth,
which is the same conclusion the coverage map reached from the other side, since 25 of 36 posts sit
under 450 words in French and the Arabic bodies run 23 to 46 % shorter still. The honest plan is
fewer URLs, each answered once and properly, plus the lander blocks that unlock nine noindex months —
not 244 new pages.
