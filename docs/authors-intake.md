# Authors intake — what the client must supply, per person

Omra is YMYL. Every article now renders a byline and both dates, and every
author is a `Person` node that resolves to the Organization
(`worksFor → https://wikitours.ma/#organization`). **Nothing in this file was
invented**: the six names below are the five staff records the client entered in
the admin (« Équipe ») plus the blog author named in the settings. Everything
marked **to supply** is empty in the database today and stays invisible until
filled — a profile with no bio is never rendered, never emitted as schema.

How it is applied once supplied: admin → **Équipe** (fields below) → publish the
person → admin → **Articles** → « Auteur » / « Relu par » pick the person. The
public team page is `/{locale}/equipe` (noindex until at least one complete
profile is published).

## Per person

| # | Name (as entered) | Role (as entered) | slug (fixed) | To supply |
|---|---|---|---|---|
| 1 | Soumaya Guerssel | Directrice Générale | `soumaya-guerssel` | see list |
| 2 | Abir Aitlho | Chef d'Agence | `abir-aitlho` | see list |
| 3 | Aya Tahiri | Responsable Omra & Hajj | `aya-tahiri` | see list |
| 4 | Mustapha Elkhaoui | Encadrant Technique & Religieux | `mustapha-elkhaoui` | see list |
| 5 | Hassan Elasyly | Encadrant Technique & Religieux | `hassan-elasyly` | see list |
| 6 | Yahya Houssini | Développeur full-stack et guide expert Omra et Hajj (owner's own words, 2026-09-17; profile published) | `yahya-houssini` | Arabic spelling of the name, languages, profile link |

For **each** of the six:

| Field | Admin field | Format | Why it matters |
|---|---|---|---|
| Name in Arabic script | `name_ar` | e.g. مصطفى الخاوي | shown on /ar pages and in the Arabic Person node |
| Name in Latin (English form if different) | `name_en` | optional | /en pages |
| Role in fr / ar / en | `role_*` | fr exists for 1–5; ar + en to supply | `jobTitle` |
| Years of experience in Omra/Hajj | `years_experience` | integer | E-E-A-T experience signal — must be true, the site prints it |
| Languages spoken | `languages` | "français, arabe, darija, anglais" | `knowsLanguage` |
| Bio in fr and ar (en optional) | `bio_fr`, `bio_ar`, `bio_en` | 60–120 words, first person or third, factual: since when, what they do on departures, how many groups accompanied if known | the byline links here; required for the profile to render |
| Credentials (optional) | `credentials_*` | e.g. formation religieuse, licence de guide, formations sécurité — only if real and verifiable | `hasCredential` |
| Photo | Équipe → galerie | portrait, ≥ 600 px | `image`; shown on /equipe and bylines |
| Public profile URL (optional) | `sameas_url` | LinkedIn / Facebook | `sameAs` |

## Article attribution to decide (36 articles)

Today: 34 articles are signed « Wiki Tours International » (the organisation is
the schema `author` — honest, not anonymous, but weak), 2 are signed Yahya
Houssini. For each article the client chooses an **author** (who takes
responsibility for the content) and, for the ritual and health articles, a
**reviewer** (« Relu par ») — candidates to CONFIRM, not decided here:

| Article | Suggested reviewer to confirm | Why |
|---|---|---|
| invocations-dua-omra, omra-badal-pour-un-proche, combien-de-fois-omra, jeuner-pendant-omra-ramadan, omra-10-derniers-jours-ramadan-2027, difference-omra-hajj | Mustapha Elkhaoui or Hassan Elasyly | the two « Encadrant Technique & Religieux » |
| vaccins-sante-omra, assurance-voyage-omra, imprevus-pendant-omra, omra-en-famille-enfants-parents-ages | Aya Tahiri (Responsable Omra & Hajj) or a named external health professional | health / duty-of-care content |
| all others | the person who actually wrote or validated the text | — |

Rules the build enforces: a placeholder profile (`is_placeholder`) never
renders and never becomes schema; any page carrying `[À COMPLÉTER]`,
`[PLACEHOLDER]`, `[CONTENT NEEDED]` or `[TRANSLATION NEEDED]` fails the
structured-data gate (`scripts/schema-audit.mjs`); the team page stays noindex
until one complete, published profile exists.
