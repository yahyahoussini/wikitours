# Mise en place de la mesure — Bab Makka (Layer 17.2)

> Écrit le 22/09/2026 après lecture du code et des réglages du site. Ce site
> mesure déjà beaucoup **par lui-même** : un traceur maison (`/wt.js`) écrit
> chaque session, chaque clic WhatsApp et chaque formulaire dans sa base
> (tables `sessions`, `events`, `leads`), avec l'attribution premier contact
> sur 30 jours. C'est de là que viennent les chiffres de ce dossier (5 682
> sessions sur 90 jours, 196 clics WhatsApp, 48 leads). Les outils ci-dessous
> ne remplacent pas cette mesure : ils ajoutent ce qu'elle ne peut pas voir —
> les requêtes Google, les impressions, les citations IA, la fiche.

## 0. État des lieux, vérifié dans le code

| Outil | État | Preuve |
|---|---|---|
| Traceur maison | ✅ en place | `public/wt.js` → `/api/t` ; `sessions.entry_path`, `referrer`, `utm_*` ; `events.type = whatsapp_click` |
| GA4 | ✅ chargé, **mais n'avait aucun événement** | `settings.ga4_id` renseigné ; `TrackingScripts.jsx` charge gtag après consentement ; jusqu'au 22/09/2026 seuls Meta et TikTok recevaient les clics |
| GA4 — `whatsapp_click` et les autres événements | ✅ **corrigé le 22/09/2026** | `wt.js` envoie désormais chaque événement du tunnel à `gtag('event', …)` : `whatsapp_click`, `cta_click`, `offer_view`, `form_start`, `tier_select`, `room_select` |
| Meta pixel + API de conversions | ✅ | `settings.meta_pixel_id` ; `Contact` sur clic WhatsApp |
| Bannière de consentement | ✅ activée | les pixels et GA4 attendent `wt_consent=1` ; le traceur maison ne dépend pas du consentement (pas de cookie tiers) |
| IndexNow | ✅ en place et utilisé | clé servie sur `/indexnow-key.txt` ; 24 URL soumises les 21 et 22/09/2026, acceptées par api.indexnow.org et Bing |
| robots.txt + Content-Signal | ✅ | 13 groupes, tous avec `search=yes, ai-input=yes, ai-train=yes` |
| Search Console | ❓ **inconnu** — aucun export n'existe (`data/gsc/` absent) | à faire, § 1 |
| Bing Webmaster Tools | ❓ inconnu | § 2 |
| Google Ads | ✗ non configuré (`google_ads_id` vide) | rien à faire tant qu'il n'y a pas de campagne Google |
| Fiche Google — Performances | ❓ jamais exporté | § 5 |
| Clés d'API (Search Console, SerpApi, PageSpeed, moteurs IA) | ✗ aucune | § 7, facultatif |

## 1. Google Search Console — 20 minutes, propriétaire

1. `search.google.com/search-console` avec le compte Google **de l'entreprise**
   (celui de la fiche). Ajouter une propriété → **Domaine** → `wikitours.ma`
   (pas « préfixe d'URL » : le domaine couvre `/fr`, `/ar`, `/en`, http, www).
2. Vérification par enregistrement DNS TXT chez le registrar du domaine : copier
   la valeur affichée, l'ajouter comme enregistrement TXT sur `wikitours.ma`,
   attendre quelques minutes, « Vérifier ».
3. Sitemaps → soumettre `https://wikitours.ma/sitemap.xml` (276 URL, toutes
   avec `lastmod`).
4. Paramètres → **Contrôle de l'IA générative** (« Generative AI control ») :
   laisser **activé** — c'est la même décision que `Content-Signal: ai-input=yes`
   dans le robots.txt ; désactiver ici contredirait le site.
5. Ajouter l'agence web en **utilisateur**, jamais en propriétaire : le compte
   de l'entreprise reste propriétaire.
6. **Le jour même** : Performances → Exporter → CSV, 12 mois, avec la
   dimension *Requête* → déposer dans `data/gsc/`. Sans cet export, la moitié
   du plan reste une hypothèse (langue des requêtes, impressions, positions
   4–15 à pousser).
7. Puis Inspection d'URL → « Demander l'indexation » sur les pages changées
   cette semaine : `/fr|ar|en/omra-chaabane-ramadan`, `/fr|ar|en/omra-ramadan`,
   `/fr|ar|en/omra-mars`, `/fr|ar|en/omra-fevrier`, les deux départs
   Chaâbane-Ramadan. Google n'utilise pas IndexNow.

## 2. Bing Webmaster Tools — 10 minutes, propriétaire

1. `bing.com/webmasters` → « Importer depuis Google Search Console » (une fois
   le § 1 fait) : le site est vérifié sans nouvel enregistrement DNS.
2. Vérifier que le sitemap importé est bien `https://wikitours.ma/sitemap.xml`.
3. IndexNow : rien à faire, la clé est déjà servie et Bing l'accepte (200 le
   22/09/2026). Bing alimente Copilot et une partie de ChatGPT Search :
   cette propriété compte plus que son trafic direct.

## 3. GA4 — 15 minutes, propriétaire

L'événement existe dès le déploiement du 22/09/2026 ; il reste à le déclarer.

1. GA4 → Administration → **Événements** : attendre l'apparition de
   `whatsapp_click` (24 h après le déploiement, dès le premier clic consenti).
2. Basculer **« Marquer comme événement clé »** sur `whatsapp_click`. C'est
   **la conversion** : les données propriétaires montrent 196 clics WhatsApp
   pour 48 formulaires sur 90 jours, et les visiteurs arabophones écrivent sur
   WhatsApp plutôt que de remplir le formulaire.
3. Optionnel : marquer aussi `form_start` comme événement clé secondaire.
4. **Groupe de canaux « IA »** — Administration → Groupes de canaux → créer un
   groupe personnalisé, canal « AI engines » en **premier**, règle : *source*
   correspond à l'expression régulière :
   ```
   (chatgpt|openai|perplexity|claude|anthropic|gemini|bard|copilot|you\.com|phind|mistral|poe\.com|meta\.ai|duckduckgo.*(ai|assist))
   ```
   Le traceur maison compte déjà ces sources (635 sessions IA sur 90 jours) ;
   GA4 doit les isoler de « Referral » de la même façon.
5. Rapports → **Génération de rapports sur l'IA générative** (si disponible sur
   la propriété) : noter la valeur du jour comme base.
6. Conserver la rétention des données à 14 mois (Administration → Paramètres
   des données → Conservation) pour comparer Ramadan 1448 à Ramadan 1449.

## 4. Fiche Google — le lien tagué

Dans la fiche, champ « Site web » :
```
https://wikitours.ma/fr?utm_source=google&utm_medium=organic&utm_campaign=business_profile
```
Ainsi le trafic de la fiche se distingue de l'organique classique, dans GA4
comme dans le traceur maison (`sessions.utm_campaign = business_profile`).
Le lien du bouton « Réserver » (produits, posts) porte
`utm_campaign=business_profile&utm_content=<slug-du-départ>`.

## 5. Fiche Google — la base de Performances, aujourd'hui

`business.google.com` → Performances → période **6 mois** → relever, une fois,
dans `scoreboard/gbp-baseline.csv` (fichier à créer avec ces colonnes) :

| Colonne | Où le lire |
|---|---|
| `mois` | — |
| `recherches_total` | « Nombre de personnes ayant vu votre profil » |
| `recherches_termes` | « Termes de recherche » — **exporter la liste entière** : c'est le seul endroit où Google donne les mots exacts tapés autour de la fiche, en arabe comme en français |
| `appels` | Appels |
| `messages` | Messages |
| `itineraires` | Itinéraires |
| `clics_site` | Clics vers le site |
| `avis_nouveaux` | Avis → nouveaux sur le mois |

La liste des termes de recherche va aussi dans `data/gsc/` : elle nourrit la
réécriture de `scoreboard/prompts.csv` avec les mots réels.

## 6. Le rythme hebdomadaire, sans clé d'API

Chaque lundi, 45 minutes :

1. Relever les 33 prompts de `scoreboard/prompts.csv` depuis un téléphone à
   Casablanca (navigation privée, position activée) → une ligne par prompt et
   par moteur dans `scoreboard/runs/<AAAA>-W<semaine>.csv`
   (copier `runs-template.csv`). Google : position, propriétaire de l'extrait,
   AI Overview cité ou non, pack local. ChatGPT / Perplexity / Gemini : domaines
   cités dans l'ordre, marque nommée ou non.
2. `npm run score` → part de citation par moteur, part d'extraits, top 1 /
   top 3, pack, séries, domaines les plus cités, test de la « première place ».
3. `npm run market` → `docs/19` réécrit avec les positions de la semaine.
4. `npm run dashboard` → `reports/dashboard.html`, à ouvrir dans le navigateur.
5. Lire Search Console (§ 1) : les requêtes en position 4–15 sont le travail de
   la semaine.

La règle de lecture : **quatre semaines** avant toute conclusion, jamais une
seule ; geler les conclusions pendant un déploiement de mise à jour Google ;
comparer à N-1 autour du Ramadan et de l'été.

## 7. Facultatif — la mesure automatique (clés d'API)

Sans ces clés, tout ce qui précède se fait à la main. Avec elles,
`npm run weekly` fait le relevé seul :

| Clé | Où l'obtenir | Ce qu'elle débloque | Coût |
|---|---|---|---|
| Compte de service Search Console | Google Cloud → IAM → compte de service, ajouté comme utilisateur de la propriété | positions réelles par prompt, requêtes en position 4–15, cannibalisation, CTR | gratuit |
| Clé PageSpeed Insights | Google Cloud → API PageSpeed | Core Web Vitals sur les pages clés (aujourd'hui : quota dépassé sans clé) | gratuit |
| SerpApi | serpapi.com | positions Google depuis le Maroc, extrait, AI Overview, **pack local et grille locale** | payant |
| OpenAI / Perplexity / Gemini | leurs consoles | citations IA automatiques, part de modèle | payant à l'usage — **le site n'a pas de clé Anthropic et n'en aura pas** (règle du projet : 0 $) |

Les clés vont dans `wikitours-seo/.env` (jamais dans le dépôt du site, jamais
sur Vercel).

## 8. Ce que le propriétaire possède

Search Console, GA4, la fiche Google, Bing Webmaster Tools et la future chaîne
YouTube sont créés et détenus par le compte **de l'entreprise**. L'agence web
y est ajoutée comme utilisateur ou gestionnaire, et retirée à la fin du
contrat sans que rien ne soit perdu.
