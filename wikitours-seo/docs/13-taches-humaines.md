# Tâches humaines — Bab Makka (ce que Claude Code ne peut pas faire à votre place)

Claude Code écrit les pages, les fichiers techniques, les documents, lance les scripts et vérifie. Tout ce qui demande un compte, un
téléphone, une caméra, une signature ou un déplacement reste ici. Chaque ligne indique le Layer, qui, quand, et comment prouver
que c'est fait. Cocher au fur et à mesure ; Claude relit ce fichier à chaque session hebdo.

---

## ⚠️ État réel au 22/09/2026 — à lire avant le tableau A

Le tableau A ci-dessous vient du gabarit rank-first et parle d'un site à
construire. **Ce site est en ligne depuis des mois** : 279 pages indexables, un
sitemap de 276 URL, une suite de tests au vert. Beaucoup de lignes A sont donc
sans objet (`site/`, `npm run pages`, le déploiement) ou déjà faites. Ce bloc dit
ce qui est vrai aujourd'hui ; en cas de contradiction, **c'est lui qui gagne**.

### Les 6 actions qui bloquent le plan, par ordre de rendement

| # | Action | Temps | Pourquoi elle est première |
|---|---|---|---|
| 1 | **`bab-makka.com` → redirection permanente 301** (Vercel → Domains) | 2 min | ~9 URL de l'ancien domaine sont encore indexées et servies ; en 307 elles ne transmettent aucune autorité. C'est la seule action qui **récupère** de la valeur déjà acquise |
| 2 | **Search Console — propriété Domaine** `wikitours.ma` (DNS TXT), puis export Requêtes 12 mois dans `data/gsc/` | 20 min | sans lui, la moitié de `docs/19` reste une hypothèse : on ne connaît ni les requêtes réelles, ni leur langue, ni les positions 4–15 |
| 3 | **Corriger Telecontact** (`up.telecontact.ma`) : adresse, téléphone, site | 15 min | c'est la fiche que la recherche web recopie comme étant **l**'adresse de l'agence (docs/06 § 3.5) |
| 4 | **Confirmer ou désavouer** `06 63 88 67 09` et `06 75 33 32 23` | 2 min | deux numéros attribués à l'agence par les moteurs, présents dans aucun réglage et sur aucune page |
| 5 | **Clé API PageSpeed** (Google Cloud, gratuite) dans `wikitours-seo/.env` | 10 min | les Core Web Vitals ne sont **pas mesurés** : l'API répond 429 sans clé. Ce n'est pas « ça passe », c'est « on ne sait pas » |
| 6 | **Fiche Google** : retirer « Omra & Hajj » du nom, confirmer le code postal | 10 min | docs/05 ; le nom de la fiche doit être le nom légal |

### Décisions qui n'appartiennent qu'à vous

- **Le dépôt GitHub `yahyahoussini/wikitours` est public et ressort 2ᵉ sur la
  requête « wikitours.ma »** : le laisser ou le passer en privé, mais le choisir.
- **La personne citée dans l'article Yabiladi du 03/03/2026** : confirmer son nom
  et sa fonction avant que quoi que ce soit ne la mentionne (contrainte 9).
- **Les pages `/cgv` et `/mentions-legales`** attendent toujours leur contenu.

### Faits manquants qui bloquent des pages précises

| Fait | Bloque |
|---|---|
| Transport groupé Oujda → Casablanca pour les départs Chaâbane-Ramadan ? | `docs/briefs/ar-omra-depuis-oujda.md` (page de la semaine) |
| Point de rendez-vous ou correspondant à Oujda ? | idem |
| Nombre de pèlerins de l'Oriental partis la saison dernière | idem — ce serait un chiffre à nous, incopiable |
| Questions propres à `/omra-chaabane-ramadan` | sortir ce hub de `BORROWED_FAQ` et lui rendre son balisage FAQ |
| Coordonnées GPS des 8 hôtels | le `geo` des nœuds `Hotel` (migration 022) |

### Ce qui a été fait pour vous depuis le 21/09/2026

- FAQ dupliquée sur 21 URL → un seul propriétaire par jeu de questions ✅
- IndexNow ne validait jamais depuis les outils (202 puis abandon) → **200** ✅
- `priceRange` annonçait un plafond de 16 900 DH au lieu de 33 900 ✅
- Jeton `{month}` visible sur les hubs de mois, majuscules de locale en 404 ✅
- GA4 ne recevait aucun événement du tunnel ✅

---

## A. Avant la mise en ligne (semaines 1–2)
| # | Tâche | Layer | Qui | Preuve | Fait |
|---|---|---|---|---|---|
| A1 | Fournir les faits manquants : `grep -rn "FACT NEEDED" site/ docs/` (prix, résultats, année, clients, citation du fondateur, RC/ICE/IF, hébergeur) | 10, 20 | client | liste vide dans `site/` | ☐ |
| A2 | Photos réelles : façade, équipe, travail, produits (≥ 10, nommées de façon descriptive, droits cédés) ; portrait du fondateur | 10.8, 19.3 | client | fichiers dans `site/img/` | ☐ |
| A2b | Identité visuelle : logo (SVG), favicon 32×32, icon.svg, apple-touch-icon 180×180, image de partage og-bab-makka.png 1200×630, images hero WebP (1200/800/480) — remplacer les fichiers de substitution créés par le scaffold (`site/img/README.md`) | 2.1, 3.3 | client (fichiers) / agence (export) | `npm run images` sans fichier manquant | ☐ |
| A2c | Relecture native des pages arabes et de la question en darija (Claude écrit ; un locuteur natif valide : pas de traduction automatique) | 10.5 | client ou relecteur | pages validées | ☐ |
| A2d | Autorisation écrite des clients nommés (études de cas, témoignages, logos) | 10.3, 12 | client | e-mails d'accord archivés | ☐ |
| A3 | Domaine : registrar au nom du client, 2FA, auto-renouvellement, e-mail de récupération | 3.4, 20.2 | client | capture du registrar | ☐ |
| A4 | Hébergement/CDN : compte client ; désactiver tout blocage des robots IA (Cloudflare : AI Crawl Control, Bot Fight Mode, robots.txt géré) | 3.4, 14.3 | agence | `npm run crawlers` sans blocage | ☐ |
| A4b | Déployer `site/` sur wikitours.ma (Netlify / Cloudflare Pages / rsync ; Claude le fait si la CLI est installée et autorisée) et confirmer HTTP 200 sur l'accueil et le pilier | 3.4 | agence | `npm run check` | ☐ |
| A5 | Google Search Console : propriété Domaine (DNS TXT), utilisateurs, sitemap soumis, contrôle IA générative non désactivé, demande d'indexation accueil + pilier, **alertes e-mail activées** (Actions manuelles, Problèmes de sécurité) | 5.2, 18 | agence (compte client) | captures | ☐ |
| A6 | Bing Webmaster Tools : import depuis GSC, sitemap. **IndexNow : rien à installer** — la clé est `5d7a5b5d9ef83f37a4fa10b13695e1991dd2afb5e0f5f712`, servie sur `/indexnow-key.txt` (et **pas** sur `/<clé>.txt`, qui renvoie 404). La clé d'échafaudage `bd8d103e…` qui figurait ici était fausse. `npm run indexnow` doit répondre **200** : un **202 signifie que le lot a été jeté** faute de validation de clé — ne jamais l'accepter comme un succès | 5.2, 4.3 | agence | sortie du script = 200 | ✅ 22/09/2026 |
| A7 | GA4 : propriété, balise après consentement, `whatsapp_click` en événement clé, groupe de canaux « AI », lien profil tagué | 17.2 | agence | captures | ☐ |
| A8 | Google Business Profile : compte entreprise du client, vérification vidéo des locaux, tous les champs (docs/05) ; **récupérer le lien direct d'avis** (g.page/r/…/review) et le coller dans docs/03 | 12.2–12.4 | client + agence | profil publié, lien d'avis | ☐ |
| A8b | Chaîne YouTube créée sous le compte entreprise du client (agence gestionnaire) avant la première vidéo | 10.8, 20.2 | client | URL de la chaîne | ☐ |
| A9 | Bing Places + Apple Business Connect avec les mêmes données | 12.4 | agence | fiches publiées | ☐ |
| A10 | Rich Results Test + validator.schema.org sur accueil et pilier ; PageSpeed Insights mobile (ou `node …/cwv.mjs`) sur les 6 pages clés | 8.4, 3.5 | agence | captures / sortie | ☐ |
| A11 | Signer le contrat avec les clauses propriété / phases / aucune garantie de position (docs/11) | 20.1 | client + agence | contrat signé | ☐ |
| A12 | Faire valider les pages légales par un juriste (loi 09-08, 31-08) ; formalités CNDP si nécessaires | 20.7 | client | avis écrit | ☐ |
| A13 | Base de référence : lancer les 30 prompts sur Google, ChatGPT, Perplexity, Gemini, Claude depuis un mobile au Maroc → `scoreboard/runs/<semaine>.csv` (si Claude n'a pas d'outils web/navigateur) | 7.6 | agence | fichier rempli, `npm run score` | ☐ |
| A14 | Accès aux journaux serveur/CDN (ou analytics bots) | 17.6 | client → agence | premier `log-bots.mjs` | ☐ |
| A15 | **Mesure automatisée (facultatif, recommandé)** : compte de service Google (docs/12 → API) ajouté à Search Console et à GA4 ; clés API SerpApi / OpenAI / Perplexity / Gemini / Anthropic dans `.env` (jamais dans git) — les scripts `serp`, `ai`, `gsc`, `ga4`, `weekly` remplacent le relevé manuel. Coût : SerpApi et les 4 API IA facturent à l'appel (≈ 33 prompts × 5 moteurs par semaine) ; garder le relevé manuel si le budget ne le permet pas | 17.2, 7.6 | agence (compte client) | `npm run weekly` sans ligne « non mesuré » | ☐ |
| A16 | Remplir `scoreboard/competitors.csv` (nom exact de la fiche Google Maps, domaine, note et nombre d'avis) depuis docs/16 §2 — sans ce fichier, market.mjs ne peut pas attribuer les fiches du pack local ni les mentions IA aux concurrents | 7.5 | agence | fichier rempli | ☐ |

## B. Chaque semaine (rythme docs/02)
| # | Tâche | Layer | Qui | Preuve | Fait |
|---|---|---|---|---|---|
| B1 | Lundi : `npm run weekly` (mesure tout ce qui a une clé, puis score, carte du marché, tableau de bord, rapport) ; relever à la main ce que le rapport liste comme « non mesuré » (Copilot, AI Mode, moteurs sans clé) → `scoreboard/runs/<semaine>.csv` | 17.4 | agence | reports/<semaine>.md | ☐ |
| B1b | Lundi : lire docs/19 (marché et concurrence) — valider les 3 coups de la semaine ; pour la page attaquée, `npm run gap -- --prompt "…" --ours <URL> <URL concurrentes>` et faire écrire la page à Claude à partir du brief d'écart | 7.5, 13 | agence | brief dans docs/gaps/ | ☐ |
| B2 | Mardi–mercredi : publier la page de la semaine (Claude l'écrit) ; déployer ; `npm run indexnow` ; demander l'indexation dans GSC | 10, 4.3 | agence | URL en ligne | ☐ |
| B3 | **Chaque jour** : envoyer la demande d'avis WhatsApp à chaque client au moment du résultat (docs/03) ; répondre à chaque avis < 24 h (Claude rédige les réponses) ; noter le compte hebdo dans `scoreboard/reviews.csv` | 12.4 | client (envoi) / agence (réponses) | ≥ 3 avis/semaine | ☐ |
| B4 | Jeudi : publier le post Google Business Profile et le post LinkedIn (Claude les rédige) | 12.2, 15.2 | agence | posts en ligne | ☐ |
| B5 | Jeudi : une action hors site — pitch, listicle, annuaire, mention sans lien (Claude rédige, l'humain envoie depuis sa boîte mail) | 11, 15 | agence | e-mail envoyé | ☐ |
| B6 | Vendredi : GSC Pages / CWV / Sécurité / Actions manuelles ; `npm run check` ; `npm run crawlers` ; page d'état des mises à jour Google | 5.5, 6.5 | agence | zéro erreur | ☐ |

## C. Chaque mois
| # | Tâche | Layer | Qui | Preuve | Fait |
|---|---|---|---|---|---|
| C1 | Tourner 2 vidéos (le fondateur dit la marque et la catégorie à la caméra ; script écrit par Claude, docs/15) ; publier sur YouTube avec chapitres ; envoyer la transcription à Claude pour intégration | 10.8, 19.2 | client (caméra) / agence (montage, publication) | URL YouTube | ☐ |
| C2 | Envoyer le lot de pitches médias (5–10, rédigés par Claude) | 15.2 | agence | e-mails envoyés | ☐ |
| C3 | Compter les mentions (alertes Google/Talkwalker + recherche « Bab Makka » entre guillemets) → docs/06 | 15 | agence | compteur mensuel | ☐ |
| C4 | Exporter les journaux → `node tools/log-bots.mjs access.log --verify --week` (DNS inverse automatique, visites par semaine) ; vérifier Googlebot, Bingbot, ≥ 2 robots IA sur le pilier | 17.6 | agence | sortie du script | ☐ |
| C8 | Grille locale : `npm run serp -- local-grid --query "<catégorie> <ville>"` (SerpApi, 25 recherches) → les quartiers rouges deviennent les cibles GBP/avis/pages locales du mois ; sans clé, relever 5 points à la main depuis un mobile | 12.1 | agence | grid-*.svg | ☐ |
| C9 | Relire `ai/<semaine>/answers.md` : corriger à la source (page, fiche GBP, annuaire) chaque chiffre ou téléphone faux que les moteurs attribuent à la marque (`facts-propagation.csv`) ; transformer les mentions sans lien (`mentions.csv`) en demandes de lien (docs/06) | 14, 15, 16.5 | agence | corrections envoyées | ☐ |
| C5 | Vérifier `site:wikitours.ma` dans Google et Bing (pages indexées) ; GSC → rapport IA générative (impressions) | 5.2, 14 | agence | chiffres dans le rapport | ☐ |
| C6 | Surveiller profils usurpés, fiches dupliquées, avis contraires à la politique → signaler avec preuves | 16.5 | agence | signalements | ☐ |
| C7 | Rapport mensuel au client (docs/07, rédigé par Claude à partir du tableau de bord) | 17.7, 20.6 | agence | rapport envoyé | ☐ |

## D. Chaque trimestre
| # | Tâche | Layer | Qui | Preuve | Fait |
|---|---|---|---|---|---|
| D1 | Collecter les données de l'étude originale (relevé de prix, benchmark, données internes anonymisées : le client ou l'agence relève, `npm run study -- data.csv --title … --value … --by …` calcule, Claude rédige) ; **confirmer les faits `to-confirm` ajoutés à facts.json** ; publier ; pitcher 30 contacts | 10.3, 15.2 | client + agence | page publiée | ☐ |
| D7 | Crawler les 5 concurrents (`npm run crawl -- https://concurrent.ma/ --max 150`) → docs/19 §2 (faiblesses exploitables) ; rejouer les briefs d'écart sur les 10 prompts prioritaires | 7.5 | agence | crawl/*.json à jour | ☐ |
| D2 | Revérifier chaque chiffre des 20 premières pages avec le client ; mettre à jour `facts.json` (Claude met les pages à jour) | 10.6, 21.6 | client + agence | notes de mise à jour | ☐ |
| D3 | Exporter les liens (GSC / Ahrefs Webmaster Tools) → audit ; désaveu uniquement si action manuelle | 11.6 | agence | export | ☐ |
| D4 | Revue de l'index : pages sans impression depuis 6 mois (export GSC) → Claude propose fusion / noindex | 18.7 | agence | décision | ☐ |
| D5 | Parler : chambre, incubateur, événement du secteur, podcast (Claude prépare l'intervention) | 15.2 | client | page de l'événement | ☐ |
| D6 | Campagne de marque : enseigne, véhicules, factures, signature WhatsApp, petite annonce toujours active sur le nom de marque | 15.4, 16.3 | client | actif | ☐ |

## E. Une fois
| # | Tâche | Layer | Qui | Preuve | Fait |
|---|---|---|---|---|---|
| E1 | Déposer la marque à l'OMPIC | 16.5 | client | récépissé | ☐ |
| E2 | Merchant Center (ecommerce) : compte, flux `merchant-feed.tsv` en récupération planifiée, validation ; flux produits OpenAI pour ChatGPT shopping selon la spec en vigueur | 19.1 | agence | produits approuvés | ☐ |
| E7 | Site existant / migration : inventaire des anciennes URL (trafic, liens, positions) et validation de la carte 301 (docs/18) **avant** tout changement d'URL | 18.6 | agence + client | docs/18 signé | ☐ |
| E3 | Looker Studio : une page (KPI, prompts, tendance) partagée avec le client | 17.7 | agence | lien | ☐ |
| E4 | Sauvegardes : testées une fois ; procédure écrite | 3.4 | agence | restauration réussie | ☐ |
| E5 | Test clavier et lecteur d'écran sur le modèle de page (accessibilité = lisibilité machine) | 2.5 | agence | notes | ☐ |
| E6 | Décider la capacité : heures disponibles ÷ 6 = nombre de clients maximum | 20.3 | agence | chiffre noté | ☐ |

## Ce que Claude fait sans vous (pour mémoire)
Pages FR/AR au modèle, données structurées, robots/sitemap/redirections/IndexNow, audits et vérifications, prompts et scoreboard, briefs, scripts vidéo, posts, réponses aux avis, pitches, rapports, diagnostic de baisse, pages légales (brouillons), flux produits, calendrier de contenu — à condition que les faits soient fournis.
