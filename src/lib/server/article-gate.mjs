import { BRAND } from '../brand.js';

/**
 * The blog quality gate and publish decision — DEPENDENCY-FREE on purpose.
 *
 * Two producers feed the same gate:
 *   - the API drafter (article-drafter.js, runs inside Next, costs API tokens,
 *     dormant unless ANTHROPIC_API_KEY is set), and
 *   - the $0 path: a weekly cloud routine on the owner's Claude subscription
 *     writes JSON files into content/articles/, and scripts/ingest-articles.mjs
 *     runs THIS module at build time (plain Node, no "@/" aliases) to validate,
 *     schedule and insert them.
 * Keep this file free of "@/" imports and of anything that only resolves under
 * Next — brand.js is imported relatively because it has no imports of its own.
 */

export const CATEGORIES = new Set(['confiance', 'omra', 'hajj', 'hotels', 'guide']);
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
const nf = new Intl.NumberFormat('fr-MA');

// Mirrors lib/titles.js withBrand(): the site appends " | Bab Makka" unless the
// title already carries a brand token, and only while the result stays ≤ 60.
const BRAND_TOKENS = ['bab makka', 'bab makkah', 'باب مكة', 'wiki tours', 'ويكي تورز'];
export function brandedTitle(title, service = BRAND.service, max = 60) {
  if (!title) return title;
  const low = title.toLowerCase();
  if (BRAND_TOKENS.some((tok) => low.includes(tok))) return title;
  const suffixed = `${title} | ${service}`;
  return suffixed.length <= max ? suffixed : title;
}

/** ≤ n characters at a word boundary, with an ellipsis (same contract as lib/seo clampDesc). */
export function clampDescription(s, n = 155) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const i = cut.lastIndexOf(' ');
  return `${(i > 40 ? cut.slice(0, i) : cut).trim()}…`;
}

/** Next free 08:00 Casablanca (07:00 UTC) morning after the last scheduled post. */
export function nextMorningSlot(lastScheduledAt, now = new Date()) {
  const last = lastScheduledAt ? new Date(lastScheduledAt) : null;
  const base = last && last > now ? last : now;
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 1, 7, 0, 0)).toISOString();
}

/**
 * Code-side quality gate. `problems` block auto-publish; `flags` reach the
 * reviewer and three of them (unsourced price, external link, missing owner
 * link) also block. Prose accuracy is not checked here — that is the
 * fact-sheet grounding's job, and the human's.
 */
export function qualityGate(draft, { ownerPath, existingSlugs, priceSet }) {
  const problems = [];
  const flags = [];
  const slugs = existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs ?? []);
  const prices = priceSet instanceof Set ? priceSet : new Set(priceSet ?? []);

  if (!SLUG_RE.test(draft.slug ?? '') || (draft.slug ?? '').length > 80) problems.push(`slug invalide : « ${draft.slug} »`);
  if (slugs.has(draft.slug)) problems.push(`slug déjà utilisé : « ${draft.slug} »`);

  const n = words(draft.body_fr);
  if (n < 600) problems.push(`body_fr trop court : ${n} mots (minimum 800)`);
  else if (n < 800) flags.push(`body_fr un peu court : ${n} mots`);

  const h2 = (String(draft.body_fr ?? '').match(/^## /gm) ?? []).length;
  if (h2 < 3) problems.push(`seulement ${h2} section(s) « ## » (minimum 4)`);

  if (ownerPath && !String(draft.body_fr ?? '').includes(`](/fr${ownerPath}`)) {
    problems.push(`lien vers la page propriétaire ${ownerPath} manquant dans body_fr`);
  }
  for (const [lang, body] of [['ar', draft.body_ar], ['en', draft.body_en]]) {
    if (ownerPath && !String(body ?? '').includes(`](/${lang}${ownerPath}`)) flags.push(`lien propriétaire manquant dans body_${lang}`);
  }

  const bodyFr = String(draft.body_fr ?? '');
  const faqIdx = bodyFr.search(/^##+ .*(questions fréquentes|faq)/im);
  const faqQs = faqIdx >= 0 ? (bodyFr.slice(faqIdx).match(/^### /gm) ?? []).length : 0;
  if (faqQs < 2) problems.push(`bloc « Questions fréquentes » absent ou avec ${faqQs} question(s) (minimum 3)`);

  for (const lang of ['fr', 'ar', 'en']) {
    const t = brandedTitle(draft[`seo_title_${lang}`] ?? '');
    if (t.length > 60) problems.push(`seo_title_${lang} trop long une fois la marque ajoutée : ${t.length} > 60`);
    const d = draft[`seo_description_${lang}`] ?? '';
    if (d.length > 155) flags.push(`seo_description_${lang} sera tronquée (${d.length} > 155)`);
    for (const k of ['title', 'excerpt', 'body', 'seo_title', 'seo_description']) {
      if (!String(draft[`${k}_${lang}`] ?? '').trim()) problems.push(`${k}_${lang} vide`);
    }
  }

  const all = `${draft.body_fr ?? ''}\n${draft.body_ar ?? ''}\n${draft.body_en ?? ''}`;
  if (/bab makkah/i.test(`${draft.body_fr ?? ''}\n${draft.body_en ?? ''}`)) problems.push('graphie « Bab Makkah » interdite dans le texte');
  if (/\[À VÉRIFIER\]/i.test(all)) problems.push('marqueur [À VÉRIFIER] dans le corps — il doit rester dans needs_review');
  if (/https?:\/\//i.test(all)) flags.push('lien externe présent — à vérifier par le relecteur');

  // Every MAD amount must exist in the fact sheet. Unsourced ⇒ flagged, never
  // silently accepted (LAW §10).
  const amounts = [...bodyFr.matchAll(/(\d[\d\s. ]{2,})\s?(?:MAD|dirhams?|DH)\b/gi)]
    .map((m) => Number(m[1].replace(/[\s. ]/g, '')))
    .filter((v) => Number.isFinite(v) && v >= 100);
  const unsourced = [...new Set(amounts.filter((v) => !prices.has(v)))];
  if (unsourced.length) flags.push(`prix NON sourcés dans body_fr : ${unsourced.map((v) => `${nf.format(v)} MAD`).join(', ')}`);

  return { ok: problems.length === 0, problems, flags };
}

/**
 * The mechanical publish decision — owner decision 2026-09-04: no daily human
 * action. Publish ONLY when every condition holds; otherwise draft + reason.
 * Never loosen this to raise the publish rate: it stands in for the human.
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

/** Normalize a produced article into the `articles` row shape (no id/dates). */
export function toArticleRow(draft, { plan = {}, settings = null, slug }) {
  return {
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
    seo_description_fr: clampDescription(draft.seo_description_fr),
    seo_description_ar: clampDescription(draft.seo_description_ar),
    seo_description_en: clampDescription(draft.seo_description_en),
    // Enums are only softly held by the model; the DB has a check constraint.
    category: CATEGORIES.has(draft.category) ? draft.category : CATEGORIES.has(plan.category) ? plan.category : 'omra',
    supports_path: draft.owner_path ?? plan.owner_path ?? null,
    author_name: settings?.blog_author_name?.trim() || null,
    reviewed_by: settings?.blog_reviewer_name?.trim() || null,
  };
}

/** Make a slug unique against `existing`, deriving one from `fallback` if invalid. */
export function uniqueSlug(candidate, existing, fallback = 'article') {
  const slugs = existing instanceof Set ? existing : new Set(existing ?? []);
  let slug = candidate;
  if (!slug || !SLUG_RE.test(slug) || slugs.has(slug)) {
    const base = String(slug || fallback).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'article';
    slug = base;
    for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`;
  }
  return slug;
}

/**
 * Two synthetic drafts for the dry-run mode: one built to PASS the gate and
 * one built to FAIL it. Content is deliberately meaningless.
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
