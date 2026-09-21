# Pack de transmission — Bab Makka (Layer 20.2) — remis le jour 1 et le dernier jour

Le client possède tout ; l'agence est gestionnaire. Ce document liste chaque actif, chaque fichier et chaque procédure pour qu'un tiers puisse reprendre sans nous.

## 1. Identifiants et propriété (ne pas stocker les mots de passe ici ; utiliser un gestionnaire partagé)
| Actif | Compte propriétaire | Accès agence | Récupération (e-mail / téléphone) | 2FA |
|---|---|---|---|---|
| Domaine wikitours.ma (registrar : [[FACT NEEDED]]) | | | | ☐ |
| Hébergement / CDN | | | | ☐ |
| Search Console | | | | ☐ |
| Bing Webmaster Tools + clé IndexNow (bd8d103eb3fdf7cf0e28400a77bc8cfd) | | | | ☐ |
| Google Business Profile | | | | ☐ |
| GA4 (ID de mesure : [[FACT NEEDED]]) | | | | ☐ |
| YouTube | | | | ☐ |
| Réseaux sociaux | | | | ☐ |

## 2. Fichiers
- Code du site : dépôt / dossier `site/` (déployable tel quel) ; `site.config.json` ; `facts.json` (chaque chiffre et sa source).
- Carte des redirections (chaque changement d'URL jamais effectué) : `site/_redirects` / `.htaccess` + historique dans `docs/18-redirections.md`.
- Outils : `tools/` (copie des scripts, aucune dépendance, Node 18+) ; `npm run` fonctionne sans le skill d'origine.
- Tableau de bord : `scoreboard/` (prompts, runs hebdomadaires, summary.csv).
- Calendrier de contenu et briefs : `docs/briefs/`.
- Photos et vidéos originales (droits : client) : [[FACT NEEDED: emplacement]].

## 3. Procédures
- Publier une page : brief → page FR + AR au modèle → `npm run gate` → déployer → `npm run indexnow` → demander l'indexation dans Search Console → 3 liens internes entrants.
- Rythme hebdomadaire : docs/02-rythme-hebdo.md. Incident : docs/09-runbook-incident.md. Avis : docs/03-messages-avis.md.
- Ce qui ne se fait jamais (Layer 16) : liens achetés, avis incités ou filtrés, pages villes dupliquées, texte caché, nom de profil bourré de mots-clés, mentions achetées non divulguées.

## 4. État à la remise
- Pages indexées : ___ (Google) / ___ (Bing) · Core Web Vitals : ___ % vert · Actions manuelles : aucune ☐ · Sécurité : rien ☐
- Dernier tableau de bord (semaine ___) : top-3 ___ % · extraits ___ % · citation ChatGPT ___ % · Perplexity ___ % · Gemini ___ % · Claude ___ %
- Faits en attente (`grep -r "FACT NEEDED"`) : ___

## 5. Contacts utiles
- Registrar / hébergeur support : [[FACT NEEDED]]
- Juriste (loi 09-08, 31-08, OMPIC) : [[FACT NEEDED]]
- Agence : [[FACT NEEDED: founder]] — +212634845177 — contact@wikitours.ma
