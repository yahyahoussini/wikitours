import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { BRAND } from '@/lib/brand';
import { clampDesc } from '@/lib/seo';
import { withBrand } from '@/lib/titles';
import { CITY_SLUGS, MONTH_SLUGS } from '@/lib/months';
import { GUIDE_PILLAR_SLUG, GUIDE_CHILD_SLUGS } from '@/lib/guides';
import { computeMinPrice } from '@/lib/data/content';

/**
 * Strategy-driven blog drafter — writes ONE trilingual article from the next
 * row of `article_plan`, grounded EXCLUSIVELY in facts pulled from the DB, and
 * saves it as an UNPUBLISHED draft dated for the next free 08:00 slot.
 *
 * Why a human stays in the loop (CLAUDE.md, LAW §10, and Google's scaled-
 * content policy): an LLM will invent prices, dates and rules for a religious-
 * travel site if allowed to. So the model only ever sees a FACT SHEET built
 * from published rows, is told to write around any missing fact and list it in
 * `needs_review`, and a code-side gate re-checks slug, length, structure, the
 * owner link, the FAQ block and every MAD amount against the fact sheet. The
 * reviewer gets the draft + the flags by e-mail; nothing goes live untouched.
 *
 * Never import this module client-side.
 */

export const DRAFT_MODEL = process.env.ARTICLE_DRAFT_MODEL ?? 'claude-opus-5';
/** Stop drafting while this many AI drafts sit unreviewed — bounds cost. */
export const MAX_PENDING_AI_DRAFTS = 7;

const nf = new Intl.NumberFormat('fr-MA');
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIES = new Set(['confiance', 'omra', 'hajj', 'hotels', 'guide']);

const DraftSchema = z.object({
  slug: z.string(),
  title_fr: z.string(),
  title_ar: z.string(),
  title_en: z.string(),
  excerpt_fr: z.string(),
  excerpt_ar: z.string(),
  excerpt_en: z.string(),
  body_fr: z.string(),
  body_ar: z.string(),
  body_en: z.string(),
  seo_title_fr: z.string(),
  seo_title_ar: z.string(),
  seo_title_en: z.string(),
  seo_description_fr: z.string(),
  seo_description_ar: z.string(),
  seo_description_en: z.string(),
  category: z.enum(['confiance', 'omra', 'hajj', 'hotels', 'guide']),
  internal_links: z.array(z.string()),
  facts_used: z.array(z.string()),
  needs_review: z.array(z.string()),
});

/* ---------------------------------------------------------------- facts --- */

/**
 * Everything the model is allowed to state as fact. Published rows only —
 * exactly what the public already sees — read with the service client so the
 * cron does not depend on anon RLS. Also returns the price set the gate uses
 * and the slugs/links the prompt needs.
 */
export async function buildFactSheet(admin, { today }) {
  const [settingsRes, offersRes, hotelsRes, faqsRes, articlesRes, teamRes] = await Promise.all([
    admin
      .from('settings')
      .select('license_number, address_fr, phone_1, whatsapp_number, email, opening_hours_fr, gbp_rating, gbp_review_count')
      .eq('id', 1)
      .maybeSingle(),
    admin
      .from('offers')
      .select('slug, title_fr, date_start, date_end, duration_days, duration_nights, airline, land_only, starting_price, occasion:occasions(name_fr, slug), tiers:offer_tiers(label, price_double, price_triple, price_quad, price_quint, is_published)')
      .eq('is_published', true)
      .gte('date_end', today)
      .order('date_start', { ascending: true }),
    admin
      .from('hotels')
      .select('name, city, distance_to_haram_m, stars, breakfast_included')
      .eq('is_published', true)
      .order('distance_to_haram_m', { ascending: true }),
    admin
      .from('faqs')
      .select('question_fr, answer_fr, category')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .limit(80),
    // ALL articles (any status): duplicates must be avoided against drafts
    // and scheduled posts too, not just the live ones.
    admin.from('articles').select('slug, title_fr, is_published, published_at'),
    admin.from('team_members').select('name, role_fr').eq('is_published', true),
  ]);

  const s = settingsRes.data ?? {};
  const offers = (offersRes.data ?? []).map((o) => {
    const tiers = (o.tiers ?? []).filter((t) => t.is_published !== false);
    const min = computeMinPrice(tiers) ?? o.starting_price ?? null;
    return {
      titre: o.title_fr,
      url: `/omra/${o.slug}`,
      depart: o.date_start,
      retour: o.date_end,
      duree_jours: o.duration_days,
      nuits: o.duration_nights,
      compagnie: o.airline ?? null,
      sans_vol: !!o.land_only,
      occasion: o.occasion?.name_fr ?? null,
      prix_min_mad: min,
      gammes: tiers.map((t) => ({
        gamme: t.label,
        double: t.price_double,
        triple: t.price_triple,
        quad: t.price_quad,
        quint: t.price_quint,
      })),
    };
  });

  // Every MAD figure the model may legitimately quote.
  const priceSet = new Set();
  for (const o of offers) {
    if (o.prix_min_mad) priceSet.add(Number(o.prix_min_mad));
    for (const g of o.gammes) for (const k of ['double', 'triple', 'quad', 'quint']) if (g[k]) priceSet.add(Number(g[k]));
  }

  const facts = {
    entite: {
      organisation: BRAND.parent,
      marque_omra: BRAND.lockup,
      graphie_canonique: BRAND.service,
      ville: 'Casablanca',
      fondee_en: 2016,
      licence: s.license_number ?? null,
      adresse: s.address_fr ?? null,
      telephone: s.phone_1 ?? null,
      whatsapp: s.whatsapp_number ?? null,
      email: s.email ?? null,
      horaires: s.opening_hours_fr ?? null,
      note_google: s.gbp_rating ?? null,
      avis_google: s.gbp_review_count ?? null,
      villes_de_depart: Object.values(CITY_SLUGS),
      paiement: 'Aucun paiement en ligne : contrat écrit signé à l’agence, acompte versé à l’agence, reçu officiel.',
    },
    offres_en_cours: offers,
    hotels_partenaires: (hotelsRes.data ?? []).map((h) => ({
      nom: h.name,
      ville: h.city === 'makkah' ? 'La Mecque' : 'Médine',
      distance_haram_m: h.distance_to_haram_m,
      etoiles: h.stars,
      petit_dejeuner: !!h.breakfast_included,
    })),
    faq_publiee: (faqsRes.data ?? []).map((f) => ({ q: f.question_fr, r: f.answer_fr, categorie: f.category })),
    equipe: (teamRes.data ?? []).map((m) => ({ nom: m.name, role: m.role_fr })),
  };

  const articles = articlesRes.data ?? [];
  const existingSlugs = new Set(articles.map((a) => a.slug));
  const publishedArticles = articles
    .filter((a) => a.is_published && a.published_at && new Date(a.published_at) <= new Date())
    .map((a) => ({ titre: a.title_fr, url: `/blog/${a.slug}` }));

  const allowedLinks = [
    '/', '/bab-makka', '/omra-pas-cher', '/hotels-omra', '/agence-omra-casablanca', '/contact',
    '/avis', '/agrement', '/a-propos', '/barometre-prix-omra', '/omra-ramadan', '/hajj',
    `/${GUIDE_PILLAR_SLUG}`, ...GUIDE_CHILD_SLUGS.map((c) => `/${GUIDE_PILLAR_SLUG}/${c}`), '/glossaire-omra',
    ...MONTH_SLUGS.map((m) => `/omra-${m}`),
    ...Object.keys(CITY_SLUGS).map((c) => `/omra-depuis-${c}`),
    ...publishedArticles.map((a) => a.url),
  ];

  return { facts, priceSet, existingSlugs, publishedArticles, allowedLinks };
}

/* ----------------------------------------------------------------- slot --- */

/** Next free 08:00 Casablanca (07:00 UTC) morning after the last scheduled post. */
export function nextMorningSlot(lastScheduledAt, now = new Date()) {
  const last = lastScheduledAt ? new Date(lastScheduledAt) : null;
  const base = last && last > now ? last : now;
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 1, 7, 0, 0)).toISOString();
}

/* ----------------------------------------------------------------- gate --- */

/**
 * Code-side quality gate. `problems` block a save until one retry; `flags`
 * always reach the reviewer. Both are honest about what was NOT checked: the
 * accuracy of prose is the human's job.
 */
export function qualityGate(draft, { ownerPath, existingSlugs, priceSet }) {
  const problems = [];
  const flags = [];

  if (!SLUG_RE.test(draft.slug) || draft.slug.length > 80) problems.push(`slug invalide : « ${draft.slug} »`);
  if (existingSlugs.has(draft.slug)) problems.push(`slug déjà utilisé : « ${draft.slug} »`);

  const n = words(draft.body_fr);
  if (n < 600) problems.push(`body_fr trop court : ${n} mots (minimum 800)`);
  else if (n < 800) flags.push(`body_fr un peu court : ${n} mots`);

  const h2 = (draft.body_fr.match(/^## /gm) ?? []).length;
  if (h2 < 3) problems.push(`seulement ${h2} section(s) « ## » (minimum 4)`);

  if (ownerPath && !draft.body_fr.includes(`](/fr${ownerPath}`)) {
    problems.push(`lien vers la page propriétaire ${ownerPath} manquant dans body_fr`);
  }
  for (const [lang, body] of [['ar', draft.body_ar], ['en', draft.body_en]]) {
    if (ownerPath && !body.includes(`](/${lang}${ownerPath}`)) flags.push(`lien propriétaire manquant dans body_${lang}`);
  }

  const faqIdx = draft.body_fr.search(/^##+ .*(questions fréquentes|faq)/im);
  const faqQs = faqIdx >= 0 ? (draft.body_fr.slice(faqIdx).match(/^### /gm) ?? []).length : 0;
  if (faqQs < 2) problems.push(`bloc « Questions fréquentes » absent ou avec ${faqQs} question(s) (minimum 3)`);

  for (const lang of ['fr', 'ar', 'en']) {
    const t = withBrand(draft[`seo_title_${lang}`]);
    if (t.length > 60) problems.push(`seo_title_${lang} trop long une fois la marque ajoutée : ${t.length} > 60`);
    const d = draft[`seo_description_${lang}`] ?? '';
    if (d.length > 155) flags.push(`seo_description_${lang} sera tronquée (${d.length} > 155)`);
  }

  if (/bab makkah/i.test(draft.body_fr + draft.body_en)) problems.push('graphie « Bab Makkah » interdite dans le texte');
  if (/\[À VÉRIFIER\]/i.test(draft.body_fr + draft.body_ar + draft.body_en)) {
    problems.push('marqueur [À VÉRIFIER] dans le corps — il doit rester dans needs_review');
  }
  if (/https?:\/\//i.test(draft.body_fr + draft.body_ar + draft.body_en)) flags.push('lien externe présent — à vérifier par le relecteur');

  // Every MAD amount must exist in the fact sheet. Unsourced ⇒ flagged, never
  // silently accepted (LAW §10).
  const amounts = [...draft.body_fr.matchAll(/(\d[\d\s. ]{2,})\s?(?:MAD|dirhams?|DH)\b/gi)]
    .map((m) => Number(m[1].replace(/[\s. ]/g, '')))
    .filter((v) => Number.isFinite(v) && v >= 100);
  const unsourced = [...new Set(amounts.filter((v) => !priceSet.has(v)))];
  if (unsourced.length) flags.push(`prix NON sourcés dans body_fr : ${unsourced.map((v) => `${nf.format(v)} MAD`).join(', ')}`);

  return { ok: problems.length === 0, problems, flags };
}

/* -------------------------------------------------------------- publish --- */

/**
 * The mechanical publish decision — owner decision 2026-09-04: no daily human
 * action. Publish ONLY when every condition holds; otherwise the article is
 * saved as a draft and the e-mail names the condition that failed. Never
 * loosen this to raise the publish rate: it is what stands in for the human.
 */
export function publishDecision({ settings, gate }) {
  const reasons = [];
  if (!settings?.blog_autopublish) reasons.push('publication automatique désactivée (Réglages → Blog automatique)');
  if (!settings?.blog_author_name?.trim()) reasons.push('aucun auteur configuré (Réglages → Blog automatique)');
  if (!gate.ok) reasons.push(`contrôle qualité : ${gate.problems.length} problème(s) bloquant(s)`);
  const hard = (gate.flags ?? []).filter((f) => /prix NON sourcés|lien externe|lien propriétaire manquant/i.test(f));
  if (hard.length) reasons.push(`signalements bloquants : ${hard.join(' ; ')}`);
  return { publish: reasons.length === 0, reasons };
}

/* --------------------------------------------------------------- sample --- */

/**
 * Two synthetic drafts for the dry-run mode (?dry=1&sample=1): one built to
 * PASS the gate and one built to FAIL it (unsourced price, banned spelling,
 * one section, no FAQ). Verifies the gate, the slot maths and the publish
 * decision with no API key and no DB write. Content is deliberately
 * meaningless — it never reaches the database.
 */
export function sampleDrafts({ ownerPath = '/bab-makka', sourcedPrice = 12900 } = {}) {
  const para = 'Cette phrase de démonstration sert uniquement à vérifier le contrôle qualité automatique du blog et ne contient aucune information réelle. ';
  const filler = (n) => Array.from({ length: n }, () => para).join('');
  const body = (lang) =>
    `${filler(4)}\n\n## Comment cela fonctionne\n\n${filler(8)}Voir [la page propriétaire](/${lang}${ownerPath}).\n\n## Ce qu'il faut prévoir\n\n${filler(8)}\n\n## Combien cela coûte\n\n${filler(6)}à partir de ${nf.format(sourcedPrice)} MAD.\n\n## Le déroulé\n\n${filler(8)}\n\n## Questions fréquentes\n\n### Première question ?\n\n${filler(3)}\n\n### Deuxième question ?\n\n${filler(3)}\n\n### Troisième question ?\n\n${filler(3)}\n`;
  const common = {
    title_fr: 'Titre de démonstration', title_ar: 'عنوان تجريبي', title_en: 'Sample title',
    excerpt_fr: 'Extrait de démonstration.', excerpt_ar: 'مقتطف تجريبي.', excerpt_en: 'Sample excerpt.',
    seo_title_fr: 'Titre SEO de démonstration', seo_title_ar: 'عنوان سيو تجريبي', seo_title_en: 'Sample SEO title',
    seo_description_fr: 'Description de démonstration servant à vérifier le contrôle automatique du blog, sans valeur éditoriale, entre cent vingt et cent cinquante caractères.',
    seo_description_ar: 'وصف تجريبي.', seo_description_en: 'Sample description.',
    category: 'omra', internal_links: [ownerPath], facts_used: ['prix minimal d’une offre en cours'], needs_review: [],
  };
  const pass = { ...common, slug: 'dry-run-pass', body_fr: body('fr'), body_ar: body('ar'), body_en: body('en') };
  const fail = {
    ...common,
    slug: 'Dry Run FAIL',
    body_fr: `${filler(3)}\n\n## Une seule section\n\n${filler(4)}Bab Makkah propose cela pour 9 999 MAD.\n`,
    body_ar: filler(2),
    body_en: filler(2),
  };
  return { pass, fail };
}

/* --------------------------------------------------------------- prompt --- */

function systemPrompt() {
  return `Tu es le rédacteur SEO / GEO / AEO de ${BRAND.parent}, agence de voyages marocaine de Casablanca titulaire d'une licence du ministère du Tourisme, et de son service premium Omra & Hajj « ${BRAND.lockup} ». Tu écris UN article de blog trilingue (fr = version principale, ar, en) destiné à être cité par Google et par les assistants IA (ChatGPT, Perplexity, Google AI Overviews, Copilot) sur les requêtes des pèlerins marocains et de la diaspora.

RÈGLES ABSOLUES
1. Aucun fait inventé. Tu n'utilises QUE les faits de la FICHE fournie (licence, adresse, téléphones, offres, prix, durées, compagnies, hôtels, distances, FAQ, équipe). Aucun prix, date, durée, distance, nombre, horaire, nom de compagnie, règle administrative, religieuse ou sanitaire qui n'y figure pas. Si un fait manquant serait utile, écris la phrase SANS le chiffre et ajoute une ligne dans needs_review commençant par « [À VÉRIFIER] ». Jamais de statistique, jamais « selon une étude ». N'écris jamais « [À VÉRIFIER] » dans le corps du texte.
2. Marque : « ${BRAND.service} » (sans h) est la graphie canonique ; « Bab Makkah » est interdit. L'entité est ${BRAND.parent} ; ${BRAND.service} n'est jamais présentée comme une agence indépendante.
3. Pas de superlatif invérifiable (« meilleure agence », « n°1 », « la moins chère »), pas de faux sentiment d'urgence, aucun nom de concurrent, aucun lien externe (le relecteur les ajoute), aucun conseil médical ou juridique affirmatif (renvoyer au médecin / à l'administration compétente).
4. Anti-cannibalisation : l'article SOUTIENT la page propriétaire indiquée dans le BRIEF. Il ne cible pas le mot-clé principal de cette page ; il possède SA propre famille de requêtes (celle du BRIEF) et renvoie vers la page propriétaire avec une ancre descriptive.
5. Ton : expert, chaleureux, concret, marocain (CIN, dirhams/MAD, Casablanca, aéroport Mohammed V, les villes de départ de la fiche). Pas d'auto-promotion lourde.

STRUCTURE (identique dans les trois langues)
- Premier paragraphe = chapeau « réponse d'abord » de 40 à 60 mots qui répond directement à la question de la requête, AVANT tout titre.
- 4 à 7 sections « ## » dont les titres sont formulés comme les questions ou phrases que les gens tapent réellement.
- Listes à puces, étapes numérotées et tableaux markdown dès qu'ils rendent l'information extractible.
- Une section « ## Questions fréquentes » avec exactement 3 sous-titres « ### » (une question chacun), chacun suivi d'une réponse de 40 à 60 mots, réponse directe en premier.
- Dernier paragraphe : inviter à écrire à l'agence sur WhatsApp (numéro de la fiche uniquement) et à consulter la page propriétaire.
- Liens internes en markdown vers des chemins RELATIFS préfixés par la langue : /fr/… dans body_fr, /ar/… dans body_ar, /en/… dans body_en. OBLIGATOIRE : un lien vers la page propriétaire. Facultatif : jusqu'à 3 liens parmi LIENS AUTORISÉS. Aucun autre lien.
- Longueur : body_fr 800 à 1200 mots. body_ar (arabe standard moderne, naturel pour un lecteur marocain, jamais une translittération) et body_en = adaptations fidèles, même structure, mêmes liens avec le préfixe de langue adapté.

SEO
- slug : kebab-case ASCII, 3 à 7 mots, sans année, sans « bab-makka » ni « wiki-tours », absent de SLUGS EXISTANTS.
- seo_title_* : au plus 48 caractères, SANS marque (le site ajoute « | ${BRAND.service} »), contient la requête.
- seo_description_* : 120 à 155 caractères, réponse + bénéfice, sans point d'exclamation.
- title_* (H1) : au plus 70 caractères, peut différer du seo_title.
- excerpt_* : une ou deux phrases, au plus 200 caractères.
- category : la plus juste parmi confiance / omra / hajj / hotels / guide.
- facts_used : les faits de la fiche réellement utilisés, en une ligne chacun.
- needs_review : tout ce que le relecteur humain doit vérifier ou compléter — chaque « [À VÉRIFIER] … », les images à ajouter, l'auteur à renseigner.`;
}

function userPrompt({ plan, facts, existingSlugs, publishedArticles, allowedLinks, today }) {
  return [
    `DATE DU JOUR : ${today}`,
    '',
    'BRIEF',
    `- Famille de requêtes que l'article possède : ${plan.query_family}`,
    `- Angle : ${plan.angle ?? '(libre, dans les règles)'}`,
    `- Catégorie suggérée : ${plan.category ?? '(à choisir)'}`,
    `- Page propriétaire à soutenir et à lier : ${plan.owner_path ?? '(aucune — lier /bab-makka)'}`,
    plan.season_month ? `- Mois visé : ${plan.season_month}` : null,
    plan.notes ? `- Notes du responsable : ${plan.notes}` : null,
    '',
    'FICHE (seuls faits autorisés) :',
    JSON.stringify(facts, null, 1),
    '',
    `SLUGS EXISTANTS (interdits) : ${[...existingSlugs].join(', ') || '(aucun)'}`,
    '',
    `ARTICLES DÉJÀ PUBLIÉS (ne pas refaire leur sujet) : ${publishedArticles.map((a) => `« ${a.titre} » ${a.url}`).join(' ; ') || '(aucun)'}`,
    '',
    `LIENS AUTORISÉS (chemins sans préfixe de langue — ajoute /fr, /ar ou /en) : ${allowedLinks.join(' ')}`,
    '',
    'Écris l\'article maintenant, en respectant chaque règle, et renvoie-le dans le format structuré demandé.',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/* ----------------------------------------------------------------- main --- */

/**
 * Draft one article for `plan`. Returns { ok, article, gate, usage } or
 * { ok: false, error, detail }. Inserts the draft (is_published = false).
 */
export async function draftArticle({ admin, plan, settings = null, now = new Date(), dryRun = false }) {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'no-api-key' };

  const today = now.toISOString().slice(0, 10);
  const sheet = await buildFactSheet(admin, { today });
  const client = new Anthropic({ maxRetries: 1, timeout: 280_000 });
  const system = [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }];
  const messages = [{ role: 'user', content: userPrompt({ plan, ...sheet, today }) }];

  let draft = null;
  let gate = null;
  let usage = { input: 0, output: 0 };

  // One generation, one correction pass on gate problems, then save with flags.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.parse({
      model: DRAFT_MODEL,
      max_tokens: 16000,
      system,
      messages,
      output_config: { format: zodOutputFormat(DraftSchema) },
    });
    usage.input += response.usage?.input_tokens ?? 0;
    usage.output += response.usage?.output_tokens ?? 0;

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'refusal', detail: response.stop_details?.explanation ?? null, usage };
    }
    if (response.stop_reason === 'max_tokens') return { ok: false, error: 'truncated', usage };
    if (!response.parsed_output) return { ok: false, error: 'parse', usage };

    draft = response.parsed_output;
    gate = qualityGate(draft, { ownerPath: plan.owner_path, existingSlugs: sheet.existingSlugs, priceSet: sheet.priceSet });
    if (gate.ok) break;

    messages.push(
      { role: 'assistant', content: JSON.stringify(draft) },
      {
        role: 'user',
        content: `Corrige ces problèmes et renvoie l'article complet dans le même format :\n- ${gate.problems.join('\n- ')}`,
      },
    );
  }

  // A draft that still fails after the retry is saved anyway — unpublished,
  // with the problems listed for the reviewer — rather than losing the day.
  let slug = draft.slug;
  if (sheet.existingSlugs.has(slug) || !SLUG_RE.test(slug)) {
    const base = (slug || plan.query_family).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'article';
    slug = base;
    for (let i = 2; sheet.existingSlugs.has(slug); i++) slug = `${base}-${i}`;
  }

  const { data: last } = await admin
    .from('articles')
    .select('published_at')
    .gt('published_at', now.toISOString())
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const slot = nextMorningSlot(last?.published_at ?? null, now);

  const row = {
    slug,
    title_fr: draft.title_fr,
    title_ar: draft.title_ar,
    title_en: draft.title_en,
    excerpt_fr: draft.excerpt_fr,
    excerpt_ar: draft.excerpt_ar,
    excerpt_en: draft.excerpt_en,
    body_fr: draft.body_fr,
    body_ar: draft.body_ar,
    body_en: draft.body_en,
    seo_title_fr: draft.seo_title_fr,
    seo_title_ar: draft.seo_title_ar,
    seo_title_en: draft.seo_title_en,
    seo_description_fr: clampDesc(draft.seo_description_fr),
    seo_description_ar: clampDesc(draft.seo_description_ar),
    seo_description_en: clampDesc(draft.seo_description_en),
    // zod 4 → JSON-schema conversion in the SDK emits enums as a description,
    // not a constraint, so the model is only softly held to these five values —
    // and articles.category carries a DB check. Validate here, fall back to
    // the plan's category, never let a stray value fail the insert.
    category: CATEGORIES.has(draft.category) ? draft.category : CATEGORIES.has(plan.category) ? plan.category : 'omra',
    // Reverse internal link: the owner page lists this article (RelatedArticles).
    supports_path: plan.owner_path ?? null,
    // E-E-A-T: a real, admin-configured person. Set on drafts too, so the
    // reviewer only has to change it, never remember it.
    author_name: settings?.blog_author_name?.trim() || null,
    reviewed_by: settings?.blog_reviewer_name?.trim() || null,
    published_at: slot,
  };
  const decision = publishDecision({ settings, gate });
  row.is_published = decision.publish;
  const fullGate = { ...gate, needs_review: draft.needs_review ?? [], facts_used: draft.facts_used ?? [] };

  if (dryRun) {
    const { body_fr, body_ar, body_en, ...meta } = row;
    return {
      ok: true,
      dryRun: true,
      row: meta,
      words: { fr: words(body_fr), ar: words(body_ar), en: words(body_en) },
      body_fr_preview: body_fr.slice(0, 1200),
      gate: fullGate,
      decision,
      usage,
    };
  }

  const { data: inserted, error } = await admin.from('articles').insert(row).select('id').single();
  if (error) return { ok: false, error: 'insert', detail: error.message, usage };

  return {
    ok: true,
    article: {
      id: inserted.id,
      slug,
      title_fr: draft.title_fr,
      published_at: slot,
      is_published: decision.publish,
      supports_path: row.supports_path,
    },
    gate: fullGate,
    decision,
    usage,
  };
}
