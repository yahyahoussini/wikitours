# Calendrier de contenu — Bab Makka (Layers 7.7, 9.5, 16.3 : une page par semaine, dans l'ordre de gagnabilité)

Rempli à partir de `scoreboard/prompts.csv` (colonne `w_score`, ≥ 14 d'abord) et de l'arborescence (docs/17-architecture.md). Une page = FR + AR + brief (docs/briefs/) + 3 liens internes entrants + `npm run gate` + IndexNow + demande d'indexation.

| Semaine | Date | Page (URL FR) | Type | Prompt(s) visé(s) (id) | w_score | Format gagnant (SERP) | Preuves à collecter (facts.json ids) | Statut |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-09-21 | /agence-de-voyages-specialisee-omra-casablanca/ | pilier | C1, I1, L1 | | | | brief ☐ · écrit ☐ · gate ☐ · en ligne ☐ |
| 2 | | /prix/ | satellite (commercial) | C5, C6, I3 | | tableau | prix | ☐ |
| 3 | | /comparatif-agence-de-voyages-specialisee-omra-maroc/ | satellite (comparatif honnête, concurrents inclus) | C4, C1 | | listicle / tableau | critères mesurés | ☐ |
| 4 | | /[[FACT NEEDED: problème du client]]/ | satellite (problème) | I5 | | paragraphe | | ☐ |
| 5 | | /agence-de-voyages-specialisee-omra-[[FACT NEEDED: cas d'usage]]/ | satellite (cas d'usage) | I2 | | liste | | ☐ |
| 6 | | /etude-de-cas-[[FACT NEEDED: client]]/ | preuve | C3 | | | résultat mesuré, citation client | ☐ |
| 7 | | /[[FACT NEEDED: méthode]]/ | satellite (méthode, liste ordonnée) | I4 | | liste ordonnée | | ☐ |
| 8 | | /casablanca/ ou /[[FACT NEEDED: quartier]]/ | page ville (contenu réellement local) | L3, L1 | | pack local | adresse, photos, prix locaux | ☐ |
| 9 | | /outil/[[FACT NEEDED: calculateur ou simulateur]]/ | outil gratuit (liens et mentions pendant des années, Layer 11.4 / 16.3) | I3 | | | formule et hypothèses | ☐ |
| 10 | | /[[FACT NEEDED: sous-question 2 du fan-out]]/ | satellite | | | | | ☐ |
| 11 | | /[[FACT NEEDED]]/ | satellite | | | | | ☐ |
| 12 | | Re-mesure + choix des 20 pages suivantes selon ce qui a bougé | — | — | — | — | — | ☐ |

## Règles
- Une requête → une page. Vérifier avant d'écrire qu'aucune page existante ne vise déjà le prompt (cannibalisation, Layer 9.4).
- Les pages villes n'existent que si leur contenu est différent (adresse, photos, prix, clients locaux) ; sinon ce sont des pages satellites d'entrée (doorways) interdites.
- Chaque numéro publié vient de `facts.json` ; ce qui manque reste `[[FACT NEEDED]]` et bloque la porte de sortie.
- Après 90 jours : les pages sans impression depuis 6 mois sont fusionnées ou passées en noindex (Layer 18.7).
