# Brief de page — Bab Makka (Layers 9, 10, 13)

Un brief par page avant d'écrire. Copier ce bloc dans `docs/briefs/<url>.md`.

| Champ | Valeur |
|---|---|
| URL (FR / AR) | / … / · /ar/ … / |
| Type | pilier · satellite · ville · service · à-propos · contact |
| Prompt principal (id du tableau de bord) | |
| Intention lue sur la page de résultats | informationnelle · commerciale · transactionnelle · locale · navigationnelle |
| Format qui gagne déjà (SERP) | paragraphe · liste · tableau · vidéo · listicle · pack local |
| Fonctionnalités présentes sur la SERP | extrait · PAA · AI Overview · pack local · vidéo · annonces · forums |
| Sous-questions (fan-out, 3 à 6) → une section h2 chacune | 1. … 2. … 3. … |
| Questions People Also Ask récoltées (3 niveaux) | |
| Titre (catégorie, lieu, marque, < 60 car.) | |
| Meta description (140–160 car., la réponse + un chiffre) | |
| H1 | |
| Bloc réponse (40–60 mots, marque + catégorie + client + lieu + 1 chiffre daté) | |
| Preuves à collecter (facts.json ids) : 2–3 statistiques sourcées, 1 citation nommée, 1 donnée propre | |
| Tableau comparatif (options × critères) | |
| Liste ordonnée (étapes) | |
| Images réelles (fichier, alt factuel, dimensions) | |
| Vidéo (id YouTube, chapitres = sous-questions, transcription) | |
| FAQ (5–8 objections réelles, dont 1 en darija) | |
| Liens internes entrants (≥ 3 : depuis quelles pages, quel texte d'ancre) | |
| Liens internes sortants (pilier + 2 pages sœurs) | |
| Auteur, date de publication, note de mise à jour | [[FACT NEEDED: founder]] · 2026-09-21 · |
| JSON-LD (types) | WebPage + BreadcrumbList + Article/Service (+ FAQPage, VideoObject) |
| Porte de sortie (gate) | `npm run gate` sans FAIL ; `grep "FACT NEEDED"` vide |

## Rappels d'écriture
- Affirmation d'abord, chiffre ensuite, source en troisième. Supprimer « nous pensons », « nous croyons ».
- Une idée par paragraphe, trois phrases maximum. Nom de marque en entier, jamais de pronom pour la marque.
- Définir le terme de catégorie une fois, dans une phrase qui commence par le terme.
- Version arabe écrite nativement (pas de traduction automatique du bloc réponse) ; chiffres, prix et noms identiques dans les deux langues.
- Aucun chiffre inventé. Ce qui manque reste `[[FACT NEEDED: …]]` jusqu'à confirmation du client.
