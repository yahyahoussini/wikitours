# Script vidéo — Bab Makka (Layers 10.8, 19.2 : une vidéo par page pilier, deux par mois)

Pourquoi : les mentions YouTube sont le corrélat le plus fort de la visibilité IA mesuré par Ahrefs (≈ 0,737) et YouTube est le domaine le plus cité dans les AI Overviews. La vidéo doit dire **le nom de la marque et la catégorie à la caméra**, répondre à la question dans les 15 premières secondes, et porter des chapitres nommés comme les sous-questions de la page.

## Fiche
| Champ | Valeur |
|---|---|
| Page soutenue | /agence-de-voyages-specialisee-omra-casablanca/ |
| Titre YouTube (= la question de la page, < 70 caractères) | [[FACT NEEDED: ex. « Combien coûte agence de voyages spécialisée Omra à Casablanca en 2026 ? »]] |
| Durée cible | 3 à 6 minutes |
| Intervenant | [[FACT NEEDED: founder]], [[FACT NEEDED: founder role]] — face caméra, dans les locaux réels |
| Miniature | visage + 3 mots de la question + logo ; pas de texte trompeur |
| Description YouTube (150 premiers caractères = la réponse) | [[FACT NEEDED]] + lien vers https://wikitours.ma/agence-de-voyages-specialisee-omra-casablanca/ + NAP |
| Chapitres (timestamps) | 0:00 réponse en une phrase · 0:15 [[FACT NEEDED: sous-question 1]] · … · fin : comment nous contacter |

## Script (à lire naturellement, chiffres de facts.json uniquement)
**0:00–0:15 — La réponse d'abord.**
« Je suis [[FACT NEEDED: founder]], [[FACT NEEDED: founder role]] de Bab Makka, agence de voyages spécialisée Omra à Casablanca. [[FACT NEEDED: réponse à la question du titre en une phrase avec un chiffre daté]]. »

**0:15–1:30 — Sous-question 1 : [[FACT NEEDED]]**
« [[FACT NEEDED: réponse directe]]. [[FACT NEEDED: exemple concret, chiffre, source]]. »

**1:30–2:45 — Sous-question 2 : [[FACT NEEDED]]**
« [[FACT NEEDED]] »

**2:45–4:00 — Ce que nous avons mesuré (données propres)**
« Chez [[FACT NEEDED: N clients / relevés]] en [[FACT NEEDED: année]], [[FACT NEEDED: résultat]]. »

**4:00–4:30 — Erreur fréquente / objection principale**
« [[FACT NEEDED]] »

**4:30–fin — Contact**
« Pour un devis, écrivez à Bab Makka sur WhatsApp au +212634845177 ou passez au [[FACT NEEDED: adresse parlée, repère connu]]. Tout est détaillé sur wikitours.ma. »

## Après le tournage
1. Publier sur la chaîne du client (compte client, agence gestionnaire) ; chapitres ; description avec le lien de la page et le NAP ; fiche de fin vers le site.
2. Envoyer la transcription (sous-titres YouTube exportés) à Claude → intégration sous la façade vidéo de la page (`templates/lite-youtube.html`) + nœud `VideoObject` (nom, description, miniature, date, durée, embedUrl).
3. Version arabe : même script, réécrit nativement, ou sous-titres arabes.
4. Ajouter l'URL à docs/06 (mentions) et au rapport mensuel.
