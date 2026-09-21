# Arborescence — Bab Makka (Layer 9) : une requête, une page ; tout à ≤ 3 clics ; ≥ 3 liens entrants par page

## Arbre (FR ; miroir /ar/ pour chaque page de contenu)
```
/                                   accueil — phrase de catégorie, bloc réponse, services, preuves, CTA WhatsApp
/agence-de-voyages-specialisee-omra-casablanca/                          PILIER — la catégorie entièrement répondue (prompts : C1, I1, L1)
/prix/                              satellite commercial — prix (C5, C6, I3)
/comparatif-agence-de-voyages-specialisee-omra-maroc/ satellite commercial — comparatif honnête avec critères, concurrents inclus (C4)
/[[FACT NEEDED: probleme]]/         satellite informationnel — le problème (I5)
/agence-de-voyages-specialisee-omra-[[FACT NEEDED: cas-d-usage]]/  satellite informationnel — cas d'usage (I2)
/etude-de-cas-[[FACT NEEDED]]/      preuve — étude de cas nommée (C3)
/[[FACT NEEDED: methode]]/          satellite informationnel — méthode en étapes (I4)
/casablanca/                     page ville — uniquement si contenu réellement local (L3)
/outil/[[FACT NEEDED]]/             outil gratuit (calculateur / simulateur) — liens et mentions
/a-propos/                          source de vérité + bloc « en chiffres »
/a-propos/[[FACT NEEDED: fondateur]]/  page personne — bio, diplômes, photo, sameAs
/contact/                           NAP, horaires, carte, WhatsApp, téléphone, formulaire à champs étiquetés
/mentions-legales/  /confidentialite/  [/cgv/ si ecommerce]   pages légales (FR)
/404.html                           vraie 404
```

## Fan-out par prompt clé (Layer 9.2 : 3 à 6 sous-requêtes → sections du pilier ou pages satellites, jamais des quasi-doublons)
| Prompt clé | Sous-requête 1 | 2 | 3 | 4 | 5 | Où (section h2 du pilier / page satellite) |
|---|---|---|---|---|---|---|
| C1 | | | | | | |
| I3 | | | | | | |
| L1 | | | | | | |

## Maillage interne (Layer 11.3)
- Accueil → chaque hub/pilier avec les mots de la catégorie.
- Pilier → chaque satellite depuis la section qui introduit sa sous-question.
- Chaque satellite → pilier + 2 satellites sœurs (ancres descriptives, jamais « cliquez ici »).
- Nouvelle page = 3 liens entrants le jour de la publication (depuis les pages qui se classent déjà : GSC → Pages).
- Vérification : `npm run links` (orphelins, profondeur, ancres génériques, liens cassés).

## Règles d'URL (Layer 9.5)
Minuscules, tirets, mots de la catégorie, pas de dates ni de paramètres ni de mots vides ; `/ar/` en premier pour l'arabe ; politique de slash final fixée dans `site.config.json` ; tout changement passe par `redirects` (301, sans chaîne).

## Pages enregistrées dans site.config.json → pages[]
Chaque page : `path`, `type`, `title {fr, ar}`, `description {fr, ar}`, `alt {ar}`, `published`, `updated`, et pour les services `serviceName`, `serviceType`, `price`.
