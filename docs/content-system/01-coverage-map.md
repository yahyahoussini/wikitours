# 01 — Coverage map (brief C1)

What exists, classified. Sources: `docs/content-system/inventory.json` (generated
2026-09-14T10:22Z — 36 posts, 58 landers), `data/lander-registry.json` (rendered H1 / title per
locale), `src/lib/clusters.js` (clusters A–G, `MANDATORY_LINKS`, `HAJJ_BRIDGE_SLUGS`),
`docs/keyword-map.md` (query ownership). 94 rows. Nothing here is a plan; the calendar (C3) reads
this file and never adds a page to an overlap group.

Column notes — **Cluster**: a post's explicit entry in `CLUSTERS`, else its `supports_path`,
else its category (`hajj→G, hotels→F, guide→E, confiance→B, omra→D`); a lander by pillar or
`pages` membership (two letters when it is a page of one cluster and the pillar of another);
departures A, hotels F, the home page is above the clusters. **Primary query**: the rendered H1
reformulated as a search query, lowercase, year removed; for the four occasion hubs whose Arabic
H1 is broken the *intended* query is written and the defect is listed at the end. **Indexable**
is the inventory's value (`scheduled` = a post whose slot has not passed). **Overlap** = the
group id in the section after the table.

| URL | Type | Indexable | Pillar | Cluster | Intent | Format | Season | Audience | Entities | Primary query fr | Primary query ar | Overlap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /blog/jeuner-pendant-omra-ramadan | post-scheduled | scheduled | omra_ramadan | D | informational | explainer | ramadan | all | Haram, jeûne du voyageur, tawaf | omra en jeûnant pendant ramadan | أداء العمرة مع الصيام | O6 |
| /blog/journee-ramadan-la-mecque | post-scheduled | scheduled | omra_ramadan | D | informational | story | ramadan | all | Haram, suhoor, iftar, tarawih | journée de ramadan à la mecque | يوم من رمضان في مكة | O6 |
| /blog/quelle-periode-ramadan-choisir-omra | post-scheduled | scheduled | omra_ramadan | D | commercial-investigation | comparison | ramadan | all | début, milieu, fin du Ramadan, Laylat al-Qadr | quelle période du ramadan choisir pour l'omra | أي فترة من رمضان تختار للعمرة | O2b |
| /blog/ramadan-2027-dates-calendrier | post-scheduled | scheduled | omra_ramadan | D | informational | explainer | ramadan | all | calendrier hégirien, Umm al-Qura | dates ramadan et calendrier omra | تواريخ رمضان ورزنامة العمرة | O2 |
| /blog/imprevus-pendant-omra | post-scheduled | scheduled | preparation | E | informational | guide | evergreen | first-timers | passeport, maladie, égarement, encadrant | que faire en cas d'imprévu pendant l'omra | ماذا تفعل عند الطارئ أثناء العمرة | — |
| /blog/combien-de-fois-omra | post-scheduled | scheduled | spirituality | E | informational | explainer | evergreen | all | Tan'im, miqat, seconde Omra | combien de fois peut-on faire l'omra | كم مرة يمكن أداء العمرة | O10 |
| /blog/omra-badal-pour-un-proche | post-scheduled | scheduled | spirituality | E | informational | explainer | evergreen | all | Omra al-badal, proche défunt ou empêché | omra badal pour un proche | عمرة البدل عن الغير | O10 |
| /blog/telephone-internet-arabie-saoudite | post-scheduled | scheduled | preparation | E | informational | guide | evergreen | all | eSIM, SIM saoudienne, WhatsApp | téléphone et internet en arabie saoudite pendant l'omra | الهاتف والإنترنت بالسعودية أثناء العمرة | — |
| /blog/bagages-omra-restrictions | post-live | yes | preparation | E | informational | checklist | evergreen | all | Zamzam, franchise bagages, interdits | bagages omra poids restrictions zamzam | حقائب العمرة الوزن وماء زمزم | O9 |
| /blog/assurance-voyage-omra | post-live | yes | trust_agency | E | informational | explainer | evergreen | all | assurance voyage, couverture santé | assurance voyage omra ce qui est couvert | تأمين السفر للعمرة | — |
| /blog/omra-8-jours-ou-15-jours | post-live | yes | pricing | D | commercial-investigation | comparison | evergreen | all | La Mecque, Médine, durée du séjour | omra 8 jours ou 15 jours quelle durée | عمرة 8 أيام أم 15 يوما | O1 |
| /blog/prix-omra-maroc-par-gamme-et-mois | post-live | yes | pricing | C | commercial-investigation | comparison | evergreen | budget | gammes, mois, Haram | prix omra maroc par gamme et par mois | أسعار العمرة من المغرب حسب الفئة والشهر | O1 |
| /blog/cout-hajj-maroc | post-live | yes | hajj | G | informational | explainer | hajj | all | Hajj, programme, montant couvert | coût du hajj depuis le maroc | تكلفة الحج من المغرب | O5 |
| /blog/hajj-ministere-ou-agence | post-live | yes | hajj | G | commercial-investigation | comparison | hajj | all | Ministère (Habous), agence agréée | hajj ministère ou agence | الحج برنامج الوزارة أم الوكالة | O5 |
| /blog/pas-tire-au-sort-hajj-omra | post-live | yes | hajj | G | commercial-investigation | guide | hajj | all | القرعة, tirage au sort, Omra (pont) | pas retenu au tirage du hajj que faire | لم تقبل في قرعة الحج ماذا تفعل | O5 |
| /blog/loterie-hajj-maroc | post-live | yes | hajj | G | informational | explainer | hajj | all | القرعة, tirage au sort, quota | loterie hajj maroc tirage au sort | قرعة الحج بالمغرب | O5 |
| /blog/omra-groupe-ou-individuel | post-live | yes | trust_agency | B | commercial-investigation | comparison | evergreen | first-timers | groupe encadré, Omra individuelle | omra en groupe ou en individuel | العمرة في فوج أم فرديا | O3 |
| /blog/application-nusuk-guide | post-live | yes | preparation | E | informational | guide | evergreen | first-timers | Nusuk, Rawdah, permis | application nusuk omra | تطبيق نسك للعمرة | O8 |
| /blog/budget-argent-poche-omra | post-live | yes | pricing | C | informational | guide | evergreen | budget | argent sur place, riyal, cartes | combien d'argent emporter en omra | كم من المال تأخذ للعمرة | O1 |
| /blog/quand-reserver-omra-calendrier | post-live | yes | seasonal | D | informational | guide | evergreen | all | Ramadan, mois, vacances scolaires | quand réserver son omra calendrier mois par mois | متى تحجز العمرة رزنامة شهر بشهر | O2, O4 |
| /blog/hajj-maroc-inscription-quota | post-live | yes | hajj | G | informational | guide | hajj | all | inscription, quota, القرعة | hajj maroc inscription quota déroulement | الحج من المغرب التسجيل والحصة | O5 |
| /blog/omra-octobre-meteo-affluence | post-live | yes | seasonal | D | informational | explainer | month:10 | all | météo, affluence, octobre | omra en octobre météo affluence | العمرة في أكتوبر الطقس والازدحام | O4 |
| /blog/omra-vacances-scolaires | post-live | yes | audiences | D | commercial-investigation | explainer | school-holidays | families | vacances scolaires marocaines | omra vacances scolaires | العمرة في العطلة المدرسية | O7 |
| /blog/invocations-dua-omra | post-live | yes | spirituality | E | informational | guide | evergreen | first-timers | tawaf, sa'i, ihram, dua | invocations dua omra | أدعية العمرة | — |
| /blog/vaccins-sante-omra | post-live | yes | preparation | E | informational | explainer | evergreen | all | méningite ACWY | vaccins santé omra maroc | التلقيح والصحة للعمرة من المغرب | — |
| /blog/que-visiter-la-mecque | post-live | yes | spirituality | F | informational | listing | evergreen | all | Hira, Thawr, sites du Hajj | que voir à la mecque | ماذا تزور في مكة | O8 |
| /blog/gammes-omra-economique-vip | post-live | yes | pricing | C | commercial-investigation | comparison | evergreen | all | économique, confort, premium, VIP | gammes omra économique vip | فئات العمرة من الاقتصادية إلى vip | O1 |
| /blog/omra-en-famille-enfants-parents-ages | post-live | yes | audiences | E | informational | guide | evergreen | families, elderly | enfants, parents âgés, Haram | omra en famille enfants parents âgés | العمرة عائليا مع الأطفال وكبار السن | O7 |
| /blog/omra-10-derniers-jours-ramadan-2027 | post-live | yes | omra_ramadan | D | informational | explainer | ramadan | all | Laylat al-Qadr, 10 derniers jours, Haram | omra 10 derniers jours ramadan laylat al-qadr | عمرة العشر الأواخر من رمضان ليلة القدر | O2b, O6 |
| /blog/que-visiter-medine-ziyara | post-live | yes | spirituality | F | informational | listing | evergreen | all | Médine, ziyara | que visiter à médine ziyara | ماذا تزور في المدينة المنورة | O8 |
| /blog/train-al-haramain-mecque-medine | post-live | yes | preparation | F | informational | guide | evergreen | all | Al Haramain, La Mecque, Médine | train al haramain la mecque médine | قطار الحرمين مكة المدينة | — |
| /blog/comment-choisir-agence-omra | post-live | yes | trust_agency | B | commercial-investigation | checklist | evergreen | first-timers | agence agréée, 7 critères | comment choisir son agence omra au maroc | كيف تختار وكالة العمرة بالمغرب | O3 |
| /blog/difference-omra-hajj | post-live | yes | hajj | G | informational | comparison | evergreen | first-timers | Omra, Hajj, 5 différences | différence omra hajj | الفرق بين العمرة والحج | O5 |
| /blog/premiere-omra-7-erreurs-a-eviter | post-live | yes | preparation | E | informational | checklist | evergreen | first-timers | première Omra, erreurs | première omra erreurs à éviter | أول عمرة أخطاء يجب تجنبها | — |
| /blog/omra-ramadan-2027-quand-reserver | post-live | yes | omra_ramadan | D | commercial-investigation | explainer | ramadan | all | Ramadan, réservation anticipée | omra ramadan quand réserver | عمرة رمضان متى تحجز | O2 |
| /blog/comment-verifier-agence-omra-agreee-maroc | post-live | yes | trust_agency | B | trust | guide | evergreen | all | licence ODV, Ministère du Tourisme | vérifier agence omra agréée maroc | كيف تتحقق من وكالة عمرة مرخصة بالمغرب | O3 |
| / | home | yes | omra | — | commercial-investigation | lander | evergreen | all | Bab Makka, Wiki Tours International, ODV-25012, Haram | omra depuis le maroc | عمرة من المغرب | — |
| /bab-makka | pillar | yes | omra | A (pillar) | commercial-investigation | hub | evergreen | all | Bab Makka, Casablanca, gammes, hôtels | programmes omra depuis le maroc | برامج العمرة من المغرب | — |
| /omra-pas-cher | hub | yes | pricing | C (pillar), A | commercial-investigation | hub | evergreen | budget | chambres partagées, hors pic | omra pas cher depuis le maroc | عمرة رخيصة من المغرب | O1 |
| /hotels-omra | hub | yes | omra | F (pillar), A | commercial-investigation | comparison | evergreen | all | Haram, La Mecque, Médine, distance à pied | hôtels omra la mecque médine distance du haram | فنادق العمرة بمكة والمدينة المسافة إلى الحرم | O8 |
| /agence-omra-casablanca | local | yes | trust_agency | B (pillar) | commercial-investigation | lander | evergreen | all | boulevard Abdelmoumen, Casablanca, ODV-25012, WhatsApp | agence omra casablanca | وكالة عمرة الدار البيضاء | O3 |
| /hajj | hajj | yes | hajj | G (pillar) | commercial-investigation | lander | hajj | all | Wiki Tours International, Hajj, inscription d'intérêt | hajj depuis le maroc | الحج من المغرب | O5 |
| /agrement | trust | yes | trust_agency | B | trust | profile | evergreen | all | ODV-25012, Ministère du Tourisme | agrément agence de voyage wiki tours | ترخيص وكالة الأسفار ويكي تورز | O3 |
| /avis | trust | yes | trust_agency | B | trust | listing | evergreen | all | Bab Makka, témoignages, vidéos | avis pèlerins bab makka | آراء معتمرين باب مكة | — |
| /guide-omra | guide | yes | preparation | E (pillar) | informational | guide | evergreen | first-timers | Bab Makka, pèlerins marocains | guide complet omra depuis le maroc | الدليل الشامل للعمرة من المغرب | — |
| /glossaire-omra | guide | yes | spirituality | E | informational | guide | evergreen | first-timers | ihram, tawaf, sa'i (42 termes) | glossaire omra | معجم العمرة | — |
| /barometre-prix-omra | data | no | pricing | C | informational | comparison | evergreen | budget | prix minimum, prix moyen, mois | prix moyen omra par mois | مؤشر أسعار العمرة | O1 |
| /guide-omra/documents-visa | guide-child | yes | preparation | E | informational | guide | evergreen | first-timers | visa Omra, passeport | documents et visa omra depuis le maroc | وثائق وتأشيرة العمرة من المغرب | — |
| /guide-omra/femme-mahram | guide-child | yes | audiences | E | informational | explainer | evergreen | women | mahram | omra au féminin règle du mahram | عمرة النساء قاعدة المحرم | — |
| /guide-omra/budget | guide-child | yes | pricing | C, E | informational | explainer | evergreen | budget | prix, gammes, hôtels | budget omra ce qui fait le prix | ميزانية العمرة ما يصنع الثمن | O1 |
| /guide-omra/rituels | guide-child | yes | spirituality | E | informational | guide | evergreen | first-timers | ihram, tawaf, sa'i | rites de l'omra pas à pas | مناسك العمرة خطوة بخطوة | O10 |
| /guide-omra/checklist | guide-child | yes | preparation | E | informational | checklist | evergreen | first-timers | valise, documents | checklist omra quoi emporter depuis le maroc | قائمة تحضير العمرة ماذا تأخذ من المغرب | O9 |
| /guide-omra/meilleure-periode | guide-child | yes | seasonal | D, E | informational | guide | evergreen | all | Ramadan, mois, saisons | meilleure période pour l'omra depuis le maroc | أفضل فترة للعمرة من المغرب | O4 |
| /omra-janvier | month | no | seasonal | A, D | commercial-investigation | lander | month:1 | all | Haram, départs, hôtels | omra janvier depuis le maroc | عمرة يناير من المغرب | — |
| /omra-fevrier | month | no | seasonal | A, D | commercial-investigation | lander | month:2 | all | Haram, départs, hôtels | omra février depuis le maroc | عمرة فبراير من المغرب | — |
| /omra-mars | month | no | seasonal | A, D | commercial-investigation | lander | month:3 | all | Haram, départs, hôtels | omra mars depuis le maroc | عمرة مارس من المغرب | — |
| /omra-avril | month | no | seasonal | A, D | commercial-investigation | lander | month:4 | all | Haram, départs, hôtels | omra avril depuis le maroc | عمرة أبريل من المغرب | — |
| /omra-mai | month | no | seasonal | A, D | commercial-investigation | lander | month:5 | all | Haram, départs, hôtels | omra mai depuis le maroc | عمرة ماي من المغرب | — |
| /omra-juin | month | no | seasonal | A, D | commercial-investigation | lander | month:6 | all | Haram, départs, hôtels | omra juin depuis le maroc | عمرة يونيو من المغرب | — |
| /omra-juillet | month | no | seasonal | A, D | commercial-investigation | lander | month:7 | all | Haram, départs, hôtels | omra juillet depuis le maroc | عمرة يوليوز من المغرب | — |
| /omra-aout | month | no | seasonal | A, D | commercial-investigation | lander | month:8 | all | Haram, départs, hôtels | omra août depuis le maroc | عمرة غشت من المغرب | — |
| /omra-septembre | month | yes | seasonal | A, D | commercial-investigation | lander | month:9 | all | Haram, départs, hôtels | omra septembre depuis le maroc | عمرة شتنبر من المغرب | O11 |
| /omra-octobre | month | yes | seasonal | A, D | commercial-investigation | lander | month:10 | all | Haram, départs, hôtels | omra octobre depuis le maroc | عمرة أكتوبر من المغرب | — |
| /omra-novembre | month | yes | seasonal | A, D | commercial-investigation | lander | month:11 | all | Haram, départs, hôtels | omra novembre depuis le maroc | عمرة نونبر من المغرب | — |
| /omra-decembre | month | no | seasonal | A, D | commercial-investigation | lander | month:12 | all | Haram, départs, hôtels | omra décembre depuis le maroc | عمرة دجنبر من المغرب | — |
| /omra-ete | occasion | yes | seasonal | A | commercial-investigation | hub | summer | families | été, La Mecque, Médine, hôtels | omra été | عمرة الصيف [1] | O7 |
| /omra-mawlid | occasion | yes | seasonal | A | commercial-investigation | hub | mawlid | all | Mawlid, La Mecque, hôtels | omra mawlid | عمرة المولد النبوي [1] | — |
| /omra-ramadan | occasion | yes | omra_ramadan | D (pillar), A | commercial-investigation | hub | ramadan | all | Ramadan, Haram, début du mois, 10 derniers jours | omra ramadan | عمرة رمضان [1] | O2, O2b |
| /omra-special-septembre | occasion | yes | seasonal | A | commercial-investigation | hub | month:9 | all | septembre, Haram, La Mecque, Médine | omra spécial septembre | عمرة شتنبر [1] | O11 |
| /omra-rajab | occasion | no (unpublished) | seasonal | A | commercial-investigation | hub | rajab | all | Rajab | omra rajab | عمرة رجب | — |
| /omra-chaabane | occasion | no (unpublished) | seasonal | A | commercial-investigation | hub | shaban | all | Chaâbane | omra chaabane | عمرة شعبان | — |
| /omra-chawal | occasion | no (unpublished) | seasonal | A | commercial-investigation | hub | chawal | all | Chawal | omra chawal | عمرة شوال | — |
| /omra-vacances-scolaires | occasion | no (unpublished) | audiences | A | commercial-investigation | hub | school-holidays | families | vacances scolaires | omra vacances scolaires | عمرة العطلة المدرسية | O7 |
| /omra-5-etoiles | occasion | yes | pricing | A | commercial-investigation | hub | evergreen | premium | hôtels 5 étoiles, Al Haramain, La Mecque, Médine | omra 5 étoiles | عمرة 5 نجوم [1] | — |
| /omra-depuis-casablanca | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Casablanca | omra depuis casablanca | عمرة من الدار البيضاء | — |
| /omra-depuis-rabat | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Rabat | omra depuis rabat | عمرة من الرباط | — |
| /omra-depuis-marrakech | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Marrakech | omra depuis marrakech | عمرة من مراكش | — |
| /omra-depuis-fes | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Fès | omra depuis fès | عمرة من فاس | — |
| /omra-depuis-tanger | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Tanger | omra depuis tanger | عمرة من طنجة | — |
| /omra-depuis-agadir | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Agadir | omra depuis agadir | عمرة من أكادير | — |
| /omra-depuis-meknes | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Meknès | omra depuis meknès | عمرة من مكناس | — |
| /omra-depuis-oujda | city | yes | omra | A | commercial-investigation | lander | evergreen | all | Mohammed V, Oujda | omra depuis oujda | عمرة من وجدة | — |
| /hotel/abraj-al-kiswah | hotel | yes | omra | F | commercial-investigation | profile | evergreen | budget | Abraj Al Kiswah, Haram, La Mecque | hôtel abraj al kiswah la mecque | فندق أبراج الكسوة مكة | — |
| /hotel/anjum | hotel | yes | omra | F | commercial-investigation | profile | evergreen | premium | Anjum, Haram, La Mecque | hôtel anjum makkah la mecque | فندق أنجم مكة | — |
| /hotel/dhiafat-al-rajaa-hotel | hotel | yes | omra | F | commercial-investigation | profile | evergreen | budget | Dhiafat Al Rajaa, La Mecque | dhiafat al rajaa hotel la mecque | فندق ضيافة الرجاء مكة | — |
| /hotel/emaar-grand-hotel | hotel | yes | omra | F | commercial-investigation | profile | evergreen | premium | Emaar Grand, Haram, La Mecque | emaar grand hotel la mecque | فندق إعمار جراند مكة | — |
| /hotel/jayden-medina-hotel | hotel | yes | omra | F | commercial-investigation | profile | evergreen | all | Jayden Medina, Médine (row tagged makkah) | jayden medina hotel médine | فندق جايدن المدينة | — |
| /hotel/makarem-madinah | hotel | yes | omra | F | commercial-investigation | profile | evergreen | premium | Makarem Burj Al Madinah, Médine (row tagged makkah) | makarem burj al madinah médine | فندق مكارم برج المدينة | — |
| /hotel/swiss-international | hotel | yes | omra | F | commercial-investigation | profile | evergreen | premium | Swissôtel Makkah, Haram, Kaaba | swissôtel makkah la mecque | فندق سويس أوتيل مكة | — |
| /hotel/taj-park | hotel | yes | omra | F | commercial-investigation | profile | evergreen | budget | Taj Park, Haram, La Mecque | taj park hotel la mecque | فندق تاج بارك مكة | — |
| /omra/omra-23-sept-au-7-octobre-2026 | departure | yes | omra | A | transactional | lander | month:9 | all | Saudia, Haram, 4 gammes | omra départ 23 septembre depuis le maroc | عمرة انطلاق 23 شتنبر من المغرب | O11 |
| /omra/omra-octobre-2026-6-au-20 | departure | yes | omra | A | transactional | lander | month:10 | all | Saudia, Al Haramain, 4 gammes | omra départ 6 octobre depuis le maroc | عمرة انطلاق 6 أكتوبر من المغرب | — |
| /omra/omra-octobre-2026-vacances-scolaires-17-au-24 | departure | yes | audiences | A | transactional | lander | school-holidays | families | Saudia, vacances scolaires, La Mecque, Médine | omra vacances scolaires octobre départ 17 octobre | عمرة العطلة المدرسية أكتوبر انطلاق 17 أكتوبر | O7 |
| /omra/omra-novembre-2026-4-au-18 | departure | yes | omra | A | transactional | lander | month:11 | all | Saudia, Haram, 4 gammes | omra départ 4 novembre depuis le maroc | عمرة انطلاق 4 نونبر من المغرب | — |

`[1]` = intended query; the rendered Arabic H1 is defective (list at the end of this file).

## Overlaps (inputs — the calendar never adds to them)

Counts are read from the inventory. Where the brief's count differs, the real count is stated.

| Id | Group | Members (from the inventory) | Diagnosis |
|---|---|---|---|
| O1 | Price pages | `/omra-pas-cher` (owner, commercial) · `/barometre-prix-omra` (data, noindex) · `/guide-omra/budget` · `/blog/prix-omra-maroc-par-gamme-et-mois` · `/blog/gammes-omra-economique-vip` · `/blog/omra-8-jours-ou-15-jours` (12 amounts in its fr body) · adjacent: `/blog/budget-argent-poche-omra` | Brief says 7. Six pages answer "what does an Omra cost / what drives the price"; the seventh, pocket money on site, is a distinct question — 7 only if it is counted. `/blog/cout-hajj-maroc` is a different product (moved to O5). The three posts and the guide chapter are one cluster (C) with `/omra-pas-cher` as pillar, so the linking is right; the duplication is in the answers, and the two thin ones (gammes 359 w, budget chapter) restate what the 1 501-word bilan already says. |
| O2 | Ramadan timing (when to book) | `/omra-ramadan` (owner, commercial) · `/blog/omra-ramadan-2027-quand-reserver` · `/blog/ramadan-2027-dates-calendrier` (scheduled) · `/blog/quand-reserver-omra-calendrier` | 4, as the brief says. Keyword-map splits hub (offres/prix) from article (quand/pourquoi), but three articles now answer "when": the deadline post, the dates post and the all-year calendar's Ramadan section. Two of the three carry the year in the slug and die with it. |
| O2b | Which window inside Ramadan | `/blog/quelle-periode-ramadan-choisir-omra` (scheduled) · `/blog/omra-10-derniers-jours-ramadan-2027` · the `/omra-ramadan` ar description names both windows | 2 posts (+ the hub). The window comparison and the last-ten-nights post share the same decision; both are thin (376 / 445 w). |
| O3 | Agency selection | `/blog/comment-choisir-agence-omra` · `/blog/comment-verifier-agence-omra-agreee-maroc` — landers: `/agence-omra-casablanca` (owner), `/agrement`; adjacent `/blog/omra-groupe-ou-individuel` | 2, as the brief says. Choosing and verifying are two halves of one decision; both sit in cluster B and both link the local page as mandated. The `verifier` post (430 w) is the E-E-A-T anchor and is thin. |
| O4 | Best period | `/guide-omra/meilleure-periode` (owner) · `/blog/quand-reserver-omra-calendrier` — partial: `/blog/omra-octobre-meteo-affluence` (one month), `/blog/omra-vacances-scolaires` (one window) | Brief says 2 and names `omra-hiver-vs-ete`; that post does not exist (it is a backlog row in `docs/keyword-map.md`, no URL). The real second member is the month-by-month calendar, which is the same question phrased as "when". The octobre post is the sanctioned informational half of `/omra-octobre`; it is the only month with one. |
| O5 | Hajj process from Morocco | `/blog/loterie-hajj-maroc` · `/blog/hajj-maroc-inscription-quota` · `/blog/pas-tire-au-sort-hajj-omra` · `/blog/hajj-ministere-ou-agence` — plus `/blog/cout-hajj-maroc`, `/blog/difference-omra-hajj`, `/hajj` (owner of the commercial query) | The four bridge posts (`HAJJ_BRIDGE_SLUGS`) each re-explain quota → registration → القرعة before their own angle, at 379–464 w each. Their union is the floor's "process end to end"; written as a fifth post it would be a sixth owner. `/hajj` is interest-only and has no informational body of its own. |
| O6 | Ramadan on the ground | `/blog/journee-ramadan-la-mecque` (scheduled) · `/blog/jeuner-pendant-omra-ramadan` (scheduled) · `/blog/omra-10-derniers-jours-ramadan-2027` | All three describe the Haram day in Ramadan (suhoor, iftar, tarawih, the last nights); the floor's "Laylat al-Qadr hour by hour", "suhoor and iftar", "tarawih" and "fasting while travelling" land on these three URLs, not beside them. All under 450 w. |
| O7 | Families and school holidays | `/blog/omra-en-famille-enfants-parents-ages` · `/blog/omra-vacances-scolaires` · `/omra-vacances-scolaires` (occasion slug reserved, unpublished) · `/omra/omra-octobre-2026-vacances-scolaires-17-au-24` · `/omra-ete` (families) | "omra vacances scolaires" has one live owner (the post) while keyword-map's gap table says the owner should be a month hub and an occasion hub slug is reserved for it — three owners waiting. When the occasion publishes, the post must be re-angled to a how-to or it cannibalises. |
| O8 | Makkah / Madinah visits and the Rawdah | `/blog/que-visiter-medine-ziyara` · `/blog/application-nusuk-guide` (rendered title: réserver la Rawda) · `/blog/que-visiter-la-mecque` · `/hotels-omra` | Mostly complementary (two cities); the shared answer is the Rawdah permit, owned by the Nusuk post and repeated in the ziyara guide. The Makkah post's rendered title names the Hajj sites, which brushes O5. |
| O9 | Packing | `/guide-omra/checklist` (owner of "quoi emporter") · `/blog/bagages-omra-restrictions` | Weight and Zamzam rules vs what to pack: adjacent, and a backlog row "valise omra · que mettre" would be a third. |
| O10 | Second Omra / Tan'im | `/blog/combien-de-fois-omra` (scheduled) · `/blog/omra-badal-pour-un-proche` (scheduled) · `/guide-omra/rituels` | Both scheduled posts explain the Tan'im mechanics for a second ihram; the rites chapter owns the rite itself. |
| O11 | September triple | `/omra-septembre` (month lander) · `/omra-special-septembre` (occasion hub) · `/omra/omra-23-sept-au-7-octobre-2026` (departure) | Three indexable pages on "omra septembre": the occasion hub's title is the month lander's title, and its H1 doubles the year. The month lander is the evergreen owner per the rulebook; the occasion hub is a dated hub in disguise. |

## Observations

- **25 of 36 posts are under 450 words (fr)**; 7 are under 350 (`que-visiter-la-mecque` 325, `assurance-voyage-omra` 326, `telephone-internet-arabie-saoudite` 331, `vaccins-sante-omra` 337, `omra-octobre-meteo-affluence` 338, `combien-de-fois-omra` 339, `bagages-omra-restrictions` 345). Only 11 posts pass 450, and only 2 pass 1 000 (`prix-omra-maroc-par-gamme-et-mois` 1 501, `omra-8-jours-ou-15-jours` 1 174).
- **Arabic bodies run 23–46 % shorter than French** (`invocations-dua-omra` 375 → 204, `jeuner-pendant-omra-ramadan` 393 → 266). Density explains part of it, not a near-halving; the AR-first Ramadan series has no precedent in the corpus.
- **3 posts carry a year in the slug**: `ramadan-2027-dates-calendrier`, `omra-10-derniers-jours-ramadan-2027`, `omra-ramadan-2027-quand-reserver`. They are the Ramadan 1448 spine and they die with the year; the 1449 cycle needs evergreen URLs (the old ones 301, never renamed).
- **34 of 36 posts have no FAQ block.** The two that do (`omra-8-jours-ou-15-jours`, `prix-omra-maroc-par-gamme-et-mois`) carry 3 questions in fr and en and **0 in ar**.
- **The 8 scheduled posts are all thin (331–398 w)**: 4 Ramadan (`ramadan-2027-dates-calendrier`, `quelle-periode-ramadan-choisir-omra`, `journee-ramadan-la-mecque`, `jeuner-pendant-omra-ramadan` — weekly from early October) and 4 guide (`telephone-internet-arabie-saoudite`, `omra-badal-pour-un-proche`, `combien-de-fois-omra`, `imprevus-pendant-omra`). The four Ramadan slots occupy exactly the floor's Hijri overlay, window choice, day in Makkah and fasting topics: the Ramadan series therefore cannot open new URLs for those four — it has to extend these bodies in place (same slug, tags for the dates), and its new URLs are the topics the four do not touch (i'tikaf, Eid, health, DST, women, elderly, packing…).
- **9 of 12 month landers are noindex** (janvier–août, décembre); only septembre, octobre and novembre index, each because a departure exists this cycle. A support post for a noindex month links into a noindex page; the lander indexes only once its authored `month_pages` blocks exist in fr and ar, so those blocks come before any month post. The ten "omra {mois}" plan rows are refused by the gate as lander queries and are still not re-angled.
- **4 occasion slugs are reserved but unpublished** (`/omra-rajab`, `/omra-chaabane`, `/omra-chawal`, `/omra-vacances-scolaires`): no locale content, noindex, not linked. They own the commercial "omra rajab / chaâbane / chawal / vacances scolaires" queries the moment they publish, so any post on those seasons must be an informational angle (why, how, versus Ramadan), never the plain query.
- **All 8 hotels are tagged `city = makkah`**, including Jayden Medina and Makarem Madinah, whose own titles say Médine; their fr and en descriptions place them in Makkah with a Haram distance. Until migration 022's data fix is applied, Madinah content (Rawdah, Masjid Nabawi hotels) has no correctly located hotel anchor and `<HotelList city="madinah">` renders nothing.
- **Rendered H1 defects on 4 indexable occasion hubs** (Latin "Omra" prefix on /ar and /en, a doubled Arabic word, a doubled year on all three locales of `/omra-special-septembre`) — exact strings below. Hotel H1s are Latin on /ar.
- **Cluster D ("Quand partir", pillar `/omra-ramadan`) mixes 10 posts** — 6 Ramadan and 4 that are not (`quand-reserver-omra-calendrier`, `omra-vacances-scolaires`, `omra-octobre-meteo-affluence`, `omra-8-jours-ou-15-jours`), so Ramadan sibling links push readers to duration and October posts. If the Ramadan series grows, a `seasonal` cluster separate from `omra_ramadan` avoids diluting the Ramadan pillar's siblings.
- **Bylines**: 34 posts are signed "Wiki Tours International" (organisation author), 2 by the owner; `author_id` is empty on all 36 rows in the inventory, so the `Person` node of `personNode()` is not yet reached from the bulk of the blog.
- **Outbound links are low on the newest posts**: `telephone-internet-arabie-saoudite` 1; `jeuner`, `journee`, `quelle-periode`, `bagages`, `assurance` 2 each — below the pillar + mandatory target + siblings pattern the cluster components produce for the older posts (`premiere-omra` 11, `cout-hajj` 8).

## Lander defects seen in the rendered H1

Exact strings from `data/lander-registry.json` (rendered on 2026-09-14). The pattern is one
template composing a Latin literal `Omra ` before the occasion's localised name, and the
`special-septembre` occasion name already containing the year.

| Path | Locale | Rendered H1 | Intended |
|---|---|---|---|
| `/omra-ete` | ar | `Omra الصيفالصيف 2026` | عمرة الصيف |
| `/omra-ete` | en | `Omra Summer 2026` | Summer Umrah (the title already says it) |
| `/omra-mawlid` | ar | `Omra المولد النبوي` | عمرة المولد النبوي |
| `/omra-mawlid` | en | `Omra Mawlid` | Mawlid Umrah |
| `/omra-ramadan` | ar | `Omra رمضان` | عمرة رمضان |
| `/omra-ramadan` | fr / en | `Omra Ramadan` | not broken, but the title carries the target year and the H1 does not |
| `/omra-special-septembre` | fr | `Omra Spécial Septembre 2026 2026` | Omra Spécial Septembre (year once) |
| `/omra-special-septembre` | ar | `Omra عمرة شتنبر 2026 2026` | عمرة شتنبر |
| `/omra-special-septembre` | en | `Omra September Special 2026 2026` | September Special Umrah |
| `/omra-5-etoiles` | ar | `Omra 5 نجوم` | عمرة 5 نجوم |
| `/omra-5-etoiles` | en | `Omra 5 stars` | 5-Star Umrah |
| `/hotel/{slug}` ×8 | ar | Latin name + stars (e.g. `Abraj Al Kiswah ★★★`) | the Arabic name the ar title already uses (فندق أبراج الكسوة) |

Adjacent defects in the same registry, not in the H1: `/hotel/jayden-medina-hotel` and
`/hotel/makarem-madinah` fr/en descriptions say "à La Mecque … du Haram" (the `city = makkah`
row); `/hotel/taj-park` ar description starts with a stray `b` and says 4 stars while the H1
shows three; `/hotel/anjum` ar/en descriptions give a Haram distance that differs from the fr one.
