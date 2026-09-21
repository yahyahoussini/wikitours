# Runbook incident — Bab Makka (Layer 18 : trouver la cause d'une baisse en une heure)

Accès nécessaires (à jour dans docs/00-intake.md) : Search Console, Bing Webmaster Tools, hébergeur/CDN, registrar, GA4, profil Google, journaux serveur.

## Les cinq causes et le premier rapport à ouvrir
| Cause | Signature | Premier contrôle |
|---|---|---|
| Technique | Chute brutale, souvent proche de zéro, sur beaucoup de pages | Search Console → Pages ; robots.txt ; erreurs serveur ; un déploiement qui a changé canonicals, noindex ou redirections → `npm run check` |
| Sécurité | Avertissements dans les résultats ; pages inconnues indexées ; requêtes spam | Search Console → Problèmes de sécurité ; view-source des pages clés (liens injectés) |
| Action manuelle | Notification ; une section ou tout le site chute à une date sans mise à jour | Search Console → Actions manuelles |
| Algorithmique | Baisse progressive ou par paliers à partir d'une date de déploiement annoncée ; les concurrents changent de place | Page d'état des mises à jour Google ; comparer les dates |
| Demande | Impressions en baisse, position stable ; saison, actualité, nouvelle fonctionnalité SERP qui absorbe les clics | Google Trends ; carte SERP des prompts ; rapport IA générative |

## Protocole d'une heure
1. **Périmètre** : exporter Pages et Requêtes (28 jours avant / après) → `node <skill>/scripts/gsc-diff.mjs before.csv after.csv`. Une page, une section, un type de requête, ou tout ?
2. **Date** : correspond-elle à un déploiement, une refonte, un core update, une action manuelle, un tournant saisonnier ?
3. **Technique** : inspecter les URL touchées dans Search Console (fetch as Google) ; `npm run check` (statuts, chaînes, canonical, noindex) ; `npm run crawlers` (blocage CDN).
4. **Page de résultats** : chercher les prompts touchés depuis le Maroc ; nouvelles fonctionnalités, nouveaux concurrents, notre page apparaît-elle encore ?
5. **Décider** : corriger (technique) ; nettoyer et demander un réexamen (sécurité, manuelle) ; améliorer et attendre (algorithmique) ; accepter et recibler (demande).

## Récupérations
- **Core update** : pas de correctif unique. Évaluer les pages touchées contre les questions « contenu utile » de Google (expérience de première main, information originale, exactitude, satisfaction), améliorer ou retirer, attendre une mise à jour ultérieure. Ne rien supprimer en panique, ne pas changer d'URL, ne pas tout réécrire pendant le déploiement.
- **Action manuelle** : corriger chaque occurrence, documenter (URL, dates), retirer ou désavouer les liens achetés, une seule demande de réexamen complète.
- **Site piraté** : hors ligne ou page de maintenance, restaurer une sauvegarde saine, changer tous les mots de passe et clés, mettre à jour, retirer pages et liens injectés, demander un examen (Problèmes de sécurité), surveiller l'index pendant des semaines (outil de suppression si besoin).
- **Migration** : inventaire des URL (trafic, liens, positions) ; correspondance une à une ; 301 sans chaîne conservés ≥ 1 an ; titres, contenu, liens internes, hreflang, données structurées équivalents ; sitemap, canonicals, lien du profil, outil de changement d'adresse ; surveiller Pages et Performances chaque jour pendant un mois.
- **Cannibalisation / index gonflé** : requête avec deux de nos URL en alternance → choisir la page propriétaire, fusionner en 301 ; pages sans impression depuis 6 mois → améliorer, fusionner ou noindex.

## Diagnostics côté IA
- Cité le mois dernier, absent ce mois : fraîcheur (un concurrent a publié des chiffres plus récents), indexation Bing (ChatGPT), classement sur les sous-requêtes.
- Cité par Perplexity, jamais par ChatGPT : problème Bing ou manque d'autorité de type Wikipédia ; travailler la liste de mentions.
- Nommé sans lien : le modèle connaît la marque par ses données d'entraînement ; tenir à jour la page À propos et le bloc « en chiffres ».
- Faits faux dans une réponse : corriger la page À propos, le profil et toute page tierce qui porte l'erreur ; les moteurs répètent la version la plus cohérente.
