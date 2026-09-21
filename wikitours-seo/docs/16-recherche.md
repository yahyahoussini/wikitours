# Recherche — Bab Makka (Layer 7) : carte des résultats, concurrents, questions récoltées

Rempli par Claude avec les outils web quand ils existent, sinon par l'agence avant la semaine 2. Les chiffres des concurrents sont
des faits sur les concurrents (page + date), jamais des faits du client.
Automatisation (docs/12 → API) : `npm run serp` écrit `serp/<semaine>/serp-map.md` (§1 prêt à coller), `share-of-voice.csv` (qui possède le marché),
`paa.csv` (§3), `listicles.csv` (§5), `local-pack.csv` ; `npm run crawl -- https://concurrent.ma/` profile chaque concurrent (§2) ;
`npm run gap -- --prompt "…" <URL concurrentes>` écrit le brief à battre par prompt ; `npm run market` synthétise tout dans docs/19.

## 1. Carte des pages de résultats (un bloc par prompt clé, depuis Casablanca sur mobile)
| Prompt (id) | Annonces | Pack local | Extrait | PAA | AI Overview | Vidéo | Images | Forums | Shopping | Sitelinks | Type de page en position 1–3 | Format qui gagne | Intention |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 meilleur agence de voyages spécialisée Omra Casablanca | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | | | |
| L1 agence de voyages spécialisée Omra près de moi | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | | | |
| I3 combien coûte agence de voyages spécialisée Omra au Maroc | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | | | |
| … | | | | | | | | | | | | | |

## 2. Cinq concurrents (Layer 7.5)
| Concurrent | Site | Pages qui se classent sur nos prompts (URL, position) | Avis Google (nb / note / récence) | Domaines référents (si connu) | Qui parle d'eux (médias, listicles, YouTube) | Cité par (moteurs IA) | Vitesse de publication (dates) | Faiblesse exploitable |
|---|---|---|---|---|---|---|---|---|
| [[FACT NEEDED]] | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

## 3. Questions People Also Ask récoltées (3 niveaux, Layer 13.4)
| Question (telle qu'affichée, langue affichée) | Prompt parent | Page / section qui y répond | Réponse en 2 phrases |
|---|---|---|---|
| | | | |

## 4. Mots exacts des prospects (WhatsApp, appels, conversations de vente — Layer 7.3)
- [[FACT NEEDED: 10 formulations réelles, FR / AR / darija]]

## 5. Listicles et annuaires du top 30 (→ docs/06)
| Requête | Page | Domaine | Type (listicle / annuaire / marketplace / média) | Rang |
|---|---|---|---|---|
| | | | | |

## 6. Trois politiques anti-spam que ce secteur viole d'habitude (Layer 6 « Done when »)
1. [[FACT NEEDED: ex. pages villes dupliquées]]
2. [[FACT NEEDED: ex. avis incités / achetés]]
3. [[FACT NEEDED: ex. articles sponsorisés non signalés sur des médias]]

## 7. Système Google qui décide le gagnant, par prompt (colonne `deciding_system` de prompts.csv, à affiner)
Informationnel → passage ranking + contenu utile · Commercial → système d'avis + autorité des liens · Local → pertinence / distance / proéminence · Fraîcheur si prix ou dates dans la requête.
