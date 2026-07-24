# Keyword → page ownership map

**Rule (CLAUDE.md): every new public page declares its keyword owner here
before merge.** One query family = ONE owning page (no cannibalization). The
Volume column is [ADMIN DATA] — fill from Search Console / keyword tool; never
estimate it in code or content.

States audited 2026-07-23. "live" = published, indexable, passing `seo:audit`.

| Query family (fr) | Owner page | Intent | Volume |
|---|---|---|---|
| omra depuis le maroc · agence omra | `/` (home) | commercial | [ADMIN DATA] |
| agence omra casablanca · وكالة عمرة · umrah agency | `/agence-omra-casablanca` (+ FAQ `agence`) | local | [ADMIN DATA] |
| omra pas cher · prix omra maroc | `/omra-pas-cher` | commercial | [ADMIN DATA] |
| prix moyen omra par mois · statistiques prix | `/barometre-prix-omra` | informational (data) | [ADMIN DATA] |
| omra ramadan {année} (commercial) | `/omra-ramadan` | seasonal commercial | [ADMIN DATA] |
| quand réserver omra ramadan (info) | `/blog/omra-ramadan-2027-quand-reserver` | informational seasonal | [ADMIN DATA] |
| omra {mois} {année} | `/omra-{mois}` (12 hubs) | seasonal commercial | [ADMIN DATA] |
| omra depuis {ville} | `/omra-depuis-{ville}` (8 villes, live) | local commercial | [ADMIN DATA] |
| guide omra · préparer sa omra | `/guide-omra` | informational pillar | [ADMIN DATA] |
| documents omra · visa omra | `/guide-omra/documents-visa` | informational | [ADMIN DATA] |
| omra femme sans mahram · mahram omra | `/guide-omra/femme-mahram` | informational | [ADMIN DATA] |
| budget omra · combien coûte une omra | `/guide-omra/budget` | informational | [ADMIN DATA] |
| rituels omra · comment faire la omra | `/guide-omra/rituels` | informational | [ADMIN DATA] |
| checklist omra · quoi emporter | `/guide-omra/checklist` | informational | [ADMIN DATA] |
| meilleure période omra | `/guide-omra/meilleure-periode` | informational | [ADMIN DATA] |
| ihram / tawaf / sa'i (définitions) | `/glossaire-omra` | informational | [ADMIN DATA] |
| première omra · erreurs à éviter | `/blog/premiere-omra-7-erreurs-a-eviter` | informational | [ADMIN DATA] |
| agence omra agréée · vérifier agrément | `/blog/comment-verifier-agence-omra-agreee-maroc` | informational E-E-A-T | [ADMIN DATA] |
| différence omra hajj · omra ou hajj | `/blog/difference-omra-hajj` | informational | [ADMIN DATA] |
| comment choisir agence omra (critères) | `/blog/comment-choisir-agence-omra` | informational (comparison) | [ADMIN DATA] |
| {nom d'hôtel} distance haram (FAQ auto) | `/hotel/{slug}` (computed from DB fields) | informational long-tail | [ADMIN DATA] |
| omra rajab · omra chaâbane · omra chawal | `/omra-{occasion}` (hubs hijri, gated) | seasonal commercial | [ADMIN DATA] |
| hôtel proche du haram · hôtels omra | `/hotels-omra` | comparison | [ADMIN DATA] |
| {nom d'hôtel} la mecque/médine | `/hotel/{slug}` | informational | [ADMIN DATA] |
| avis wiki tours · avis bab makka | `/avis` | trust | [ADMIN DATA] |
| hajj depuis le maroc | `/hajj` | commercial | [ADMIN DATA] |
| wiki tours international (marque) | `/a-propos` | brand | [ADMIN DATA] |
| agrément agence de voyage (marque) | `/agrement` | trust | [ADMIN DATA] |
| presse · wiki tours média | `/presse` | E-E-A-T | [ADMIN DATA] |
| {offre précise} | `/omra/{slug}` | transactional | [ADMIN DATA] |
| voyage organisé maroc · voyages organisés | `/voyages` | commercial (non-Omra) | [ADMIN DATA] |
| voyage organisé {destination} depuis maroc | `/voyage/{slug}` | transactional (non-Omra) | [ADMIN DATA] |

Note the ramadan split: the **hub** owns the commercial query (offres, prix,
réserver), the **article** owns the informational one (quand / pourquoi tôt).
Same pattern for any future hub+article pair — declare both rows here.

## SERP battle map (incumbents observed 2026-07 — re-verify quarterly)

Internal intelligence, never shipped as content. Source: manual SERP review
2026-07-22. "Weakness" = what our owner page exploits.

| Query family | Incumbents to beat | Their weakness | Our weapon |
|---|---|---|---|
| omra pas cher / prix | omra-compare.com, VoyageOr, Galaxy Voyage | generic price prose, no real per-tier figures, pages dated per year (die at expiry) | evergreen `/omra-pas-cher` + `/barometre-prix-omra` (real DB data, only original stats page in the niche) |
| omra ramadan | Manasiki, Safire, Espace Tourisme | dated URLs rebuilt yearly (lose history); no early-booking mechanic | evergreen hub + booking-window article + priority-waitlist FAQ |
| agence omra casablanca | Safire, Alsirate, Noussouki + map pack | thin trust pages, licence rarely shown | dedicated page + `/agrement` + `/avis`; map-pack needs GBP link [ADMIN DATA] |
| visa / documents omra | France-centric .fr guides | Paris/euros/ATOUT France — wrong country for Moroccan searchers | Morocco-specific chapter (CIN, Casablanca, MAD), fr **+ ar** |
| première omra | 100 % French .fr sites | zero Moroccan agencies in the SERP | the only Moroccan-agency answer, with ar parity |
| définitions (ihram, tawaf…) | scattered wiki/blog fragments | no agency owns the definition cluster | 30-term glossary + verbatim `llms.txt` ingestion |
| requêtes en arabe (عمرة من المغرب…) | **nobody** — all rivals are French-only | zero ar content anywhere | full fr/ar/en parity is a standing law of this site |
| omra depuis rabat / marrakech / fès… | **nobody** — rivals have zero per-city pages | Casablanca-generic offers only | 8 dedicated city pages: answer-first lede, real route logistics, 3 local FAQs each, ar parity |

## AEO core-question ownership (Phase 4 A3 §17)

Every question below is answered verbatim in `/llms.txt` (single source: the
`faqs` table and owner pages — never a second copy).

| Question | Owner | State |
|---|---|---|
| Prix / combien ça coûte ? | `/omra-pas-cher` (commercial) + `/barometre-prix-omra` (données) | live |
| Documents / visa ? | `/guide-omra/documents-visa` | live |
| Mahram / femmes ? | `/guide-omra/femme-mahram` | live |
| Durée du séjour ? | `/omra/{slug}` (per-offer) + offer FAQ | live |
| Meilleure période ? | `/guide-omra/meilleure-periode` | live |
| Paiement / acompte ? | offer FAQ (catégorie `omra`) | live |
| Visa inclus dans le prix ? | offer FAQ (catégorie `omra`) | live |
| Vols depuis quelle ville ? | offer FAQ (catégorie `omra`) | live |
| Famille / enfants ? | offer FAQ (catégorie `omra`) | live |
| Être averti des nouveaux départs ? | offer FAQ (catégorie `omra`) | live |
| Bab Makka = Wiki Tours ? | FAQ `confiance` (home + `/agrement`) | live |
| Depuis quand l'agence existe ? | FAQ `confiance` | live |
| Où lire les avis ? | FAQ `confiance` + `/avis` | live |
| Hajj et autres voyages ? | FAQ `confiance` (réponse) → liens `/hajj` + `/voyages` | live |
| Quand réserver le Ramadan ? | `/blog/omra-ramadan-2027-quand-reserver` | live |
| Comment vérifier une agence agréée ? | `/blog/comment-verifier-agence-omra-agreee-maroc` | live |
| Que veut dire ihram / tawaf / miqat ? | `/glossaire-omra` | live (30 termes) |
| Omra ou Hajj — quelle différence ? | `/blog/difference-omra-hajj` | live |
| Pourquoi une agence agréée ? | FAQ `agence` (`/agence-omra-casablanca`) | live |
| Faut-il venir à l'agence pour réserver ? | FAQ `agence` | live |
| Que se passe-t-il après ma demande ? | FAQ `agence` | live |
| Où se trouve l'agence ? | `/contact` (direct-answer block) | live |
| Omra depuis {ville} ? | `/omra-depuis-{ville}` FAQ (catégorie `ville-{slug}`) | live (8 villes × 3 FAQ) |

Cannibalization rule: before adding content answering one of these questions on
another page, move ownership here first — two owners for one query is a FAIL.

## Coverage gaps (declare an owner here BEFORE building)

Honest backlog — each needs real data before it can exist (LAW: never invent).

| Gap | Blocked on | Candidate owner |
|---|---|---|
| omra vacances scolaires | a real offer aligned on school holidays | month hub of that period (no new page) |
| hajj {année} prix / inscription | client's Hajj program data [CONTENT NEEDED] | `/hajj` (existing owner — content refresh) |
| licence / agrément number visible | `settings.license_number` [ADMIN DATA] | `/agrement` (already wired, renders when set) |
