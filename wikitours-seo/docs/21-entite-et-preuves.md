# 21 — Couche entité et preuves (Layers 8, 12.7, 19)

> **Vérifié en production le 21/09/2026** en lisant le JSON-LD servi, pas le code.
> Ce site **génère son balisage depuis la base** (`settings`, `team_members`,
> `offers`, `hotels`) : il n'y a pas de bloc à coller dans un thème. Les blocs
> ci-dessous sont donc de deux sortes — ce qui est **déjà émis** (pour contrôle)
> et ce qui **manque faute de faits** (à remplir dans l'admin, pas dans le code).

## 1. Ce qui est déjà en place — vérifié, ne pas refaire

Le nœud `TravelAgency` est servi sur **les 282 pages** (monté une fois dans
`src/app/[locale]/layout.js`). Relevé sur `https://wikitours.ma/fr` :

| Élément demandé | État | Valeur servie |
|---|---|---|
| Type | ✅ | `TravelAgency`, `@id` `#organization`, `url` invariant par langue |
| Licence comme identifiant | ✅ **déjà fait deux fois** | `identifier: "ODV-25012"` **et** `hasCredential` → `EducationalOccupationalCredential` (`credentialCategory: license`, `identifier: ODV-25012`, `recognizedBy` → `GovernmentOrganization` « Ministère du Tourisme — Royaume du Maroc ») |
| NAP | ✅ | `address` → `PostalAddress` (rue, ville, pays), `telephone` : les 3 numéros, `email` |
| Géo | ✅ | `geo` → `GeoCoordinates` 33.5673 / −7.6256 |
| Horaires | ✅ | `openingHoursSpecification` |
| Carte | ✅ | `hasMap` → l'URL de la fiche Google (par `place_id`) |
| `sameAs` | ✅ 6 profils | Facebook Wiki Tours, Instagram Wiki Tours, Facebook Bab Makka, Instagram Bab Makka, TikTok Bab Makka, **fiche Google** |
| Zone servie | ✅ | `Country` Maroc + les 8 villes, chacune reliée à sa page Wikipédia |
| Marque | ✅ | `brand` → `#brand` (Bab Makka), jamais une seconde organisation |
| Note et avis | ✅ **volontairement absents du balisage** | 4,8 / 141 avis en contenu visible et dans `llms.txt` uniquement. Une note qu'une entreprise publie sur elle-même est inéligible aux étoiles et déclenche des actions manuelles. Ne jamais l'ajouter |
| `Person` | ✅ pour Yahya Houssini | `@id` = `/fr/equipe#yahya-houssini`, `jobTitle`, `description`, `worksFor` → `#organization` ; repris comme `author` des articles signés |

**Conclusion : la commande demandait de construire une couche entité qui existe
déjà.** Ce qui suit est la liste de ce qui manque réellement.

## 2. Ce qui manque — et pourquoi rien n'a été inventé

### 2.1 YouTube dans `sameAs`
`settings.youtube_url` et `settings.babmakka_youtube_url` sont **vides**. Le code
les inclurait automatiquement s'ils étaient remplis (`OrgJsonLd.jsx`, lignes
52–62). **À faire par le propriétaire** : Admin → Réglages → coller l'URL de la
chaîne. S'il n'y a pas de chaîne, ne rien coller : un `sameAs` vers un profil
vide ou abandonné affaiblit l'entité au lieu de la renforcer.

### 2.2 Page fondateur
Aucun fondateur n'est déclaré nulle part dans la base. La fiche
« Soumaya Guerssel — Directrice Générale » existe mais n'est pas publiée, et
**diriger n'est pas fonder** : rien ne permet d'écrire l'un à partir de l'autre.

`[[FACT NEEDED: qui a fondé Wiki Tours International, en quelle année, et sous
quel rôle exact aujourd'hui]]`

Dès que le propriétaire le dit, la page se remplit toute seule : le champ
« Auteur » de l'admin Équipe produit le nœud `Person`, la carte `/equipe` et le
lien depuis `/a-propos`, sans une ligne de code.

### 2.3 Page mourchid (encadrant religieux)
Deux fiches existent — **Mustapha Elkhaoui** et **Hassan Elasyly**, toutes deux
« Encadrant Technique & Religieux » — **non publiées, sans biographie**. Les deux
chiffres que la commande demande n'existent dans aucune table :

`[[FACT NEEDED: années d'expérience de chaque encadrant]]`
`[[FACT NEEDED: nombre de groupes accompagnés, et depuis quelle date il est compté]]`

Ces deux faits sont exactement ceux qui distinguent une page mourchid crédible
d'une page vide. Ils doivent venir de l'agence, jamais d'une estimation : un
nombre de groupes inventé est le genre de détail qu'un client vérifie en agence.

**Ce qui est prêt à recevoir ces faits** : Admin → Équipe → champs *Rôle*,
*Années d'expérience Omra / Hajj*, *Bio (60–120 mots, factuelle)*, *Langues
parlées*, *Formations / références*. Remplir en français **et en arabe** : la
page `/ar/equipe` retombe silencieusement sur le français si l'arabe manque.

### 2.4 « Qui parle de nous » sur `/a-propos`
La page ne porte aujourd'hui aucune liste de preuves. Trois éléments sont
**vérifiables aujourd'hui** et peuvent y figurer sans rien inventer :

1. **Presse** — Yabiladi, sur les perturbations des vols directs vers l'Omra :
   `https://en.yabiladi.com/articles/details/189517/middle-east-disruptions-direct-umrah.html`
   (déjà dans `settings.press_url`, déjà rendu sur `/presse`).
2. **Licence vérifiable** — ODV-25012, et surtout : **Wiki Tours International
   figure sur la liste officielle des Organisateurs-Distributeurs de Voyages du
   Ministère du Tourisme** (fait `ma_wiki_tours_sur_liste_odv`, lu le
   21/09/2026 sur le site du ministère). C'est la preuve la plus forte du
   dossier, et elle n'est utilisée nulle part sur le site.
3. **Avis Google** — 4,8 / 5 sur 141 avis au 21/09/2026, en texte visible, avec
   le lien vers la fiche. Jamais dans le balisage (§ 1).

`[[FACT NEEDED: autres mentions presse, partenariats, ou labels obtenus]]`

## 3. Les blocs, tels qu'ils seront émis

### 3.1 Nœud `Person` d'un encadrant — ce que l'admin produira

Rien à coller : remplir la fiche suffit. Voici ce que le site émettra, pour
contrôle, une fois les champs remplis (les `[[FACT NEEDED]]` marquent ce qui
manque encore) :

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://wikitours.ma/fr/equipe#mustapha-elkhaoui",
  "name": "Mustapha Elkhaoui",
  "url": "https://wikitours.ma/fr/equipe#mustapha-elkhaoui",
  "jobTitle": "Encadrant Technique & Religieux",
  "description": "[[FACT NEEDED: bio de 60–120 mots, faits vérifiables]]",
  "knowsLanguage": "[[FACT NEEDED: langues parlées]]",
  "hasCredential": "[[FACT NEEDED: formations ou références réelles]]",
  "worksFor": { "@id": "https://wikitours.ma/#organization" }
}
```

Le champ « années d'expérience » et le nombre de groupes accompagnés ne sont pas
des propriétés schema.org : ils vivent **dans la bio visible**, où ils comptent
pour le lecteur et pour les moteurs qui citent des passages. Formulation type,
une fois les chiffres fournis : « Encadre les groupes Omra de Wiki Tours depuis
[[ANNÉE]] ; il a accompagné [[N]] groupes depuis [[DATE]]. »

### 3.2 Bloc « Qui parle de nous » — HTML prêt pour `/a-propos`

À insérer dans `src/app/[locale]/a-propos/page.js`, après la section équipe.
Les trois chaînes de texte passent par les dictionnaires (`src/i18n/*.json`),
jamais en dur, sinon la page arabe rendra du français :

```jsx
<section className="mt-12 max-w-prose">
  <h2 className="text-xl font-bold text-bm-black">{t.about.proofTitle}</h2>
  <ul className="mt-4 flex flex-col gap-3 text-bm-black/80">
    {settings?.press_url ? (
      <li>
        <a href={settings.press_url} rel="noopener" target="_blank" className="underline">
          {t.about.proofPress}
        </a>
      </li>
    ) : null}
    {settings?.license_number ? (
      <li>{t.about.proofLicence.replace('{n}', settings.license_number)}</li>
    ) : null}
    {settings?.gbp_rating && settings?.gbp_review_count ? (
      <li>
        <a href={settings.gbp_review_url ?? settings.gbp_url} rel="noopener" target="_blank" className="underline">
          {t.about.proofReviews
            .replace('{rating}', String(settings.gbp_rating))
            .replace('{count}', String(settings.gbp_review_count))}
        </a>
      </li>
    ) : null}
  </ul>
</section>
```

Chaînes à ajouter aux trois dictionnaires, sous `about` :

| Clé | fr | ar | en |
|---|---|---|---|
| `proofTitle` | Qui parle de nous | من يتحدث عنّا | Who writes about us |
| `proofPress` | Yabiladi — les perturbations des vols directs vers l'Omra | يابلادي — اضطرابات الرحلات المباشرة للعمرة | Yabiladi — disruptions to direct Umrah flights |
| `proofLicence` | Licence d'agence de voyages {n}, inscrite sur la liste officielle des Organisateurs-Distributeurs de Voyages du Ministère du Tourisme | رخصة وكالة أسفار {n}، مسجّلة في اللائحة الرسمية لمنظّمي وموزّعي الأسفار لدى وزارة السياحة | Travel agency licence {n}, listed on the Ministry of Tourism's official register of travel organisers |
| `proofReviews` | {rating} sur 5 — {count} avis Google | {rating} من 5 — {count} تقييماً على جوجل | {rating} out of 5 — {count} Google reviews |

**La règle qui ne bouge pas** : ce bloc est du **contenu visible**. La note et le
nombre d'avis n'entrent dans aucun nœud de balisage (§ 1).

## 4. NAP : la vérification que seul le propriétaire peut faire

Le site sert une NAP unique, issue de la base. Personne ici ne peut lire la fiche
Google pour la comparer. **Quinze minutes, dans la fiche Google, champ par champ** —
tout écart, même une abréviation, casse la correspondance d'entité :

| Champ | Ce que le site publie |
|---|---|
| Nom | Wiki Tours International (marque affichée : Bab Makka) |
| Adresse | Immeuble Anoual Capital Center, 418 Angle Bd Abdelmoumen et Bd Anoual, Magasin N°1 RDC, Casablanca |
| Téléphone principal | +212 634 845 177 |
| Autres numéros | +212 660 655 655 · +212 694 139 494 |
| WhatsApp | +212 601 351 105 |
| Site | https://wikitours.ma |
| Horaires | lun–ven 08:30–21:30 · sam 08:30–14:30 · dim fermé |
| Coordonnées | 33.5673, −7.6256 |

`[[FACT NEEDED: code postal de l'agence]]` — absent de la base, et attendu par
les annuaires comme par le balisage postal.

## 5. Ce qu'il reste à faire, par qui

| # | Action | Qui | Bloqué par |
|---|---|---|---|
| 1 | Comparer la NAP à la fiche Google, champ par champ (§ 4) | propriétaire | — |
| 2 | Fournir le code postal | propriétaire | — |
| 3 | Publier les deux fiches d'encadrant avec bio fr + ar, années d'expérience, groupes accompagnés | propriétaire → admin | faits manquants (§ 2.3) |
| 4 | Déclarer le fondateur (nom, année, rôle) | propriétaire | fait manquant (§ 2.2) |
| 5 | Coller l'URL YouTube si la chaîne existe | propriétaire | — |
| 6 | Ajouter le bloc « Qui parle de nous » (§ 3.2) | code + dictionnaires | prêt, en attente du feu vert |
| 7 | Fournir les autres mentions presse | propriétaire | — |
