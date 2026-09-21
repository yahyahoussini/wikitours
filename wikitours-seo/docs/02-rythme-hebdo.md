# Rythme hebdomadaire — Bab Makka (≈ 6 h / semaine, créneaux fixes)

| Jour | Bloc | Commandes / actions | Sortie |
|---|---|---|---|
| Lundi, 1 h | Mesurer et lire le marché (Layers 7, 17) | `npm run weekly` (Search Console API, SerpApi, moteurs IA — tout ce qui a une clé ; sinon remplir `scoreboard/runs/2026-09-21.csv` à la main et `npm run score`) ; lire `reports/<semaine>.md`, `docs/19-marche-et-concurrence.md` (qui possède quel prompt, le coup à jouer) et le rapport IA générative de Search Console | Tableau de bord à jour ; les 3 premiers coups de docs/19 deviennent la semaine ; pour la page attaquée : `npm run gap` puis brief |
| Mardi–mercredi, 3 h | Construire (Layers 9, 10, 13) | Une page créée ou réécrite au modèle (FR + AR) ; cibles d'extraits vérifiées à J+7 / J+14 ; `npm run gate` ; déployer ; `npm run indexnow` ; demander l'indexation Google dans Search Console | Une page publiée, auditée, notifiée |
| Chaque jour, 5 min | Avis (Layer 12.4) | Le client envoie la demande d'avis **le jour même** de chaque prestation (message docs/03, lien direct) ; on ne regroupe pas | Chaque client sollicité au moment du résultat |
| Jeudi, 1 h | Mentionner (Layers 12, 15) | Une action hors site (pitch, listicle, annuaire, post LinkedIn, vidéo) ; vérifier que les demandes d'avis de la semaine sont parties ; réponses aux avis postées (< 24 h) ; post Google Business Profile | Une mention en cours, avis en hausse |
| Vendredi, 1 h | Vérifier (Layers 5, 6.5, 18) | Search Console : Pages, Core Web Vitals, Sécurité, Actions manuelles ; `npm run check` ; `npm run crawlers` ; page d'état des mises à jour Google (status.search.google.com) : un core update en cours ? | Zéro erreur, zéro blocage, conclusions gelées si déploiement en cours |

## Mensuel (2 h)
- Relancer les 30 prompts sur tous les moteurs (déjà hebdo) et comparer 4 semaines.
- Publier la vidéo du mois (2 par mois idéalement), chapitrée, transcrite, intégrée.
- Envoyer le lot de pitches médias (5 à 10) avec le chiffre du trimestre.
- Compter les mentions (alertes Google + recherche manuelle « Bab Makka » entre guillemets) ; vérifier les journaux serveur (`log-bots.mjs`) : Googlebot, Bingbot et au moins deux robots IA sur la page pilier.
- Rapport mensuel au client (docs/07-rapport-mensuel.md).

## Programme agressif autorisé (Layer 16.3), planifié ici
Vélocité de contenu (1 page/semaine, mardi–mercredi) · vélocité d'avis (chaque client, jeudi) · étude de données (trimestre) · 2 vidéos/mois · balayage des listicles (jeudi, continu) · balayage des mentions sans lien (mensuel) · **outil gratuit** sur le site (semaine 9 du calendrier de contenu) · page comparatif honnête (semaine 3) · prises de parole (trimestre) · **campagne de marque** (enseigne, véhicules, factures, signature WhatsApp, petite annonce toujours active — mise en place au trimestre 1, permanente).

## Trimestriel (1 jour)
- Publier l'étude de données originale (relevé de prix, benchmark) et la proposer à 30 contacts médias.
- Revérifier chaque chiffre des 20 premières pages ; mettre à jour la note de mise à jour.
- Audit des liens (export Search Console / Ahrefs Webmaster Tools) ; fichier de désaveu vide sauf action manuelle.
- Revue de l'index : pages sans impression depuis 6 mois → améliorer, fusionner ou noindex.
- Surveillance : profils usurpés, fiches dupliquées, domaines copiés (dépôt OMPIC fait une fois, Layer 16.5).

## Règles d'interprétation
- Ne jamais réagir à une seule journée. Ramadan, été et rentrée redistribuent la demande : comparer à la même période de l'année précédente.
- Geler les conclusions pendant un déploiement de core update annoncé (page d'état des mises à jour Google).
- Un changement est réel après 4 semaines dans la même direction.
