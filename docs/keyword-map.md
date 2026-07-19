# Keyword → page ownership map

**Rule (CLAUDE.md): every new public page declares its keyword owner here
before merge.** One query family = ONE owning page (no cannibalization). The
Volume column is [ADMIN DATA] — fill from Search Console / keyword tool; never
estimate it in code or content.

| Query family (fr) | Owner page | Intent | Volume |
|---|---|---|---|
| omra depuis le maroc · agence omra | `/` (home) | commercial | [ADMIN DATA] |
| agence omra casablanca | `/agence-omra-casablanca` | local | [ADMIN DATA] |
| omra pas cher · prix omra maroc | `/omra-pas-cher` | commercial | [ADMIN DATA] |
| prix moyen omra par mois · statistiques prix | `/barometre-prix-omra` | informational (data) | [ADMIN DATA] |
| omra ramadan {année} | `/omra-ramadan` | seasonal commercial | [ADMIN DATA] |
| omra {mois} {année} | `/omra-{mois}` (12 hubs) | seasonal commercial | [ADMIN DATA] |
| omra depuis {ville} | `/omra-depuis-{ville}` (8, gated) | local commercial | [ADMIN DATA] |
| guide omra · préparer sa omra | `/guide-omra` | informational pillar | [ADMIN DATA] |
| documents omra · visa omra | `/guide-omra/documents-visa` | informational | [ADMIN DATA] |
| omra femme sans mahram · mahram omra | `/guide-omra/femme-mahram` | informational | [ADMIN DATA] |
| budget omra · combien coûte une omra | `/guide-omra/budget` | informational | [ADMIN DATA] |
| rituels omra · comment faire la omra | `/guide-omra/rituels` | informational | [ADMIN DATA] |
| checklist omra · quoi emporter | `/guide-omra/checklist` | informational | [ADMIN DATA] |
| meilleure période omra | `/guide-omra/meilleure-periode` | informational | [ADMIN DATA] |
| ihram / tawaf / sa'i (définitions) | `/glossaire-omra` | informational | [ADMIN DATA] |
| hôtel proche du haram · hôtels omra | `/hotels-omra` | comparison | [ADMIN DATA] |
| {nom d'hôtel} la mecque/médine | `/hotel/{slug}` | informational | [ADMIN DATA] |
| avis wiki tours · avis bab makka | `/avis` | trust | [ADMIN DATA] |
| hajj depuis le maroc | `/hajj` | commercial | [ADMIN DATA] |
| wiki tours international (marque) | `/a-propos` | brand | [ADMIN DATA] |
| agrément agence de voyage (marque) | `/agrement` | trust | [ADMIN DATA] |
| presse · wiki tours média | `/presse` | E-E-A-T | [ADMIN DATA] |
| {offre précise} | `/omra/{slug}` | transactional | [ADMIN DATA] |

## AEO core-question ownership (Phase 4 A3 §17)

| Question | Owner | State |
|---|---|---|
| Prix / combien ça coûte ? | `/omra-pas-cher` (commercial) + `/barometre-prix-omra` (données) | live |
| Documents / visa ? | `/guide-omra/documents-visa` | scaffold — [ADMIN DATA] content |
| Mahram / femmes ? | `/guide-omra/femme-mahram` | scaffold — [ADMIN DATA] content |
| Durée du séjour ? | `/omra/{slug}` (per-offer) + offer FAQ | live (per offer) |
| Meilleure période ? | `/guide-omra/meilleure-periode` | scaffold — [ADMIN DATA] content |
| Paiement / acompte ? | offer FAQ (catégorie `omra`) | [ADMIN DATA] — seed FAQs |
| Où se trouve l'agence ? | `/contact` (direct-answer block) | live |
| Omra depuis {ville} ? | `/omra-depuis-{ville}` FAQ (catégorie `ville-{slug}`) | [ADMIN DATA] — seed city FAQs |

Cannibalization rule: before adding content answering one of these questions on
another page, move ownership here first — two owners for one query is a FAIL.
