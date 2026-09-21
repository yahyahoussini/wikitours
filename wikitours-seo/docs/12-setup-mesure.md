# Mise en place de la mesure en une après-midi — Bab Makka (Layer 17.2)

## Google Search Console
1. Ajouter la propriété **Domaine** `wikitours.ma` (couvre http, https, www, sous-domaines) ; vérification par enregistrement DNS TXT chez le registrar.
2. Utilisateurs : le compte du client est propriétaire ; l'agence est ajoutée comme utilisateur complet.
3. Sitemaps → soumettre `https://wikitours.ma/sitemap.xml`.
4. Paramètres → **Contrôle de l'IA générative** : vérifier que le site n'est PAS exclu des fonctionnalités d'IA générative (AI Overviews, AI Mode) — condition d'éligibilité citée par le guide Google 2026.
5. Performances → onglet **IA générative** (impressions dans AI Overviews / AI Mode ; pas de clics ni de requêtes pour l'instant) : noter la valeur de départ.
6. Inspection d'URL → « Demander l'indexation » pour la page d'accueil et la page pilier.

## Bing Webmaster Tools
1. Ajouter le site ; **Importer depuis Google Search Console** (vérification en un clic).
2. Sitemaps → soumettre la même URL. IndexNow → la clé est `bd8d103eb3fdf7cf0e28400a77bc8cfd`, servie à `https://wikitours.ma/bd8d103eb3fdf7cf0e28400a77bc8cfd.txt` (générée par `npm run generate`). Tester : `npm run indexnow` → 200 ou 202.
3. Vérifier dans Bing : `site:wikitours.ma` après quelques jours. C'est l'index derrière ChatGPT search et Copilot.

## GA4
1. Une propriété, un flux web pour `https://wikitours.ma` ; balise gtag ou GTM chargée après consentement (loi 09-08).
2. Événements : `whatsapp_click` et `phone_click` sont envoyés par `/js/whatsapp-event.js`. Admin → Événements → marquer `whatsapp_click` comme **événement clé**.
3. Admin → Paramètres des données → **Groupes de canaux** → créer « AI » avec la règle *Source de la session* correspond à l'expression régulière :
   `chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|pplx\.ai|copilot\.microsoft\.com|bing\.com/chat|gemini\.google\.com|bard\.google\.com|claude\.ai|anthropic\.com|meta\.ai|grok\.com|x\.ai|deepseek\.com|chat\.mistral\.ai|you\.com|duckduckgo\.com/\?.*ia=chat|poe\.com|kimi\.moonshot\.cn|chatgpt|perplexity`
   (ChatGPT ajoute `utm_source=chatgpt.com` à ses liens de citation ; les visites sans referrer apparaissent en « Direct » : le chiffre GA4 est un plancher.)
4. Rapport Exploration : sessions par page de destination pour le canal AI (les pages que les moteurs recommandent).

## Profil Google Business
- Lien site web : `https://wikitours.ma/?utm_source=google&utm_medium=organic&utm_campaign=business_profile` (séparer le profil de l'organique classique).
- Performances du profil : noter les valeurs de départ (recherches, appels, itinéraires, clics, messages).

## Journaux et CDN
- Accès aux journaux (hébergeur) ou analytics bots du CDN activés.
- Cloudflare : vérifier **AI Crawl Control / Block AI bots / Bot Fight Mode** → désactivés pour un site qui veut être cité ; vérifier que le robots.txt géré n'impose pas `ai-train=no` contre la volonté du client.
- Test : `npm run crawlers` → aucun « BLOCKED AT EDGE ».

## Suivi des positions
- Gratuit : Search Console (positions moyennes, filtrer sur les prompts cibles) + relevé manuel hebdomadaire depuis un mobile au Maroc.
- Payant si le tableau de bord le justifie : un rank tracker avec localisation marocaine ; Ahrefs Brand Radar / Semrush AI toolkit pour la part de citation à grande échelle.

## Looker Studio (facultatif, gratuit)
Une page : ligne de KPI (leads, part de citation, top-3, extraits), tableau des 30 prompts, courbe 16 mois. Sources : Search Console + GA4.

## API (facultatif) — la mesure sans relevé manuel
Les scripts lisent les clés dans les variables d'environnement (`.env.example` → `.env`, jamais commité).
1. **Compte de service Google** (Search Console API + GA4 Data API, gratuit) : console.cloud.google.com → projet → « IAM et administration » → Comptes de service → créer → clé JSON → enregistrer sous `google-service-account.json` à la racine du projet (dans `.gitignore`). Activer les API « Google Search Console API » et « Google Analytics Data API » sur le projet. Puis : Search Console → Paramètres → Utilisateurs → ajouter l'e-mail du compte de service (`…@….iam.gserviceaccount.com`) en accès complet ; GA4 → Admin → Gestion des accès à la propriété → ajouter le même e-mail en Lecteur ; noter l'identifiant numérique de la propriété GA4 (Admin → Détails de la propriété) dans `GA4_PROPERTY_ID` ou `site.config.json → ga4PropertyId`. Test : `npm run gsc -- queries`, `npm run ga4 -- leads`.
2. **SerpApi** (`SERPAPI_KEY`, payant à la recherche) : positions réelles depuis Casablanca sur mobile (nom de lieu canonique résolu automatiquement, ex. « Casablanca,Casablanca-Settat,Morocco »), extraits, PAA, AI Overviews, pack local, part de voix, grille locale. `npm run serp` = 33 recherches par semaine (Google ne rend que 10 résultats par page : `-- --pages 2` double le coût pour voir les positions 11–20 ; + 25 recherches par grille locale). Chaque réponse est enregistrée dans `serp/<semaine>/` et n'est jamais rachetée.
3. **Moteurs IA** (`OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, payants à l'appel) : `npm run ai` interroge ChatGPT (Responses API + outil web_search), Perplexity (Agent API, preset `fast` par défaut — l'ancien endpoint Sonar chat-completions s'arrête le 27 septembre 2026), Gemini (grounding Google Search) et Claude (outil web_search) avec les 33 prompts, enregistre les sources citées, les requêtes de fan-out, les faits repris ou faux, la part de modèle des concurrents. Les identifiants changent : `OPENAI_MODEL`, `PERPLEXITY_PRESET` (fast | low | medium | high), `GEMINI_MODEL`, `ANTHROPIC_MODEL` dans `.env` si l'API refuse la valeur par défaut ; le message d'erreur du fournisseur est affiché tel quel, jamais remplacé par une valeur inventée. Copilot et AI Mode n'ont pas d'API : relevé manuel.
4. **PageSpeed Insights** (`PSI_KEY`, gratuit) : évite la limite anonyme de `npm run cwv`.
5. Charger les clés avant un run (bash : `set -a; . ./.env; set +a` ; PowerShell : `Get-Content .env | ForEach-Object { if ($_ -match "^(\w+)=(.*)$") { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }`), puis `npm run weekly`.
