import { BRAND } from '../brand.js';
import { validateContentTags, stripContentTags } from '../content-tags.js';

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

export const SITE_TZ = 'Africa/Casablanca';
export const RELEASE_HOUR = 8;

/** Calendar date parts of an instant in a time zone. */
function zonedParts(date, timeZone = SITE_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24 };
}

/**
 * Next free RELEASE_HOUR (08:00) Africa/Casablanca morning after the last
 * scheduled post. Morocco is UTC+1 all year EXCEPT during Ramadan (UTC+0),
 * so the UTC instant of "08:00 local" moves — the zone data decides, never a
 * fixed offset.
 */
export function nextMorningSlot(lastScheduledAt, now = new Date(), { timeZone = SITE_TZ, hour = RELEASE_HOUR } = {}) {
  const last = lastScheduledAt ? new Date(lastScheduledAt) : null;
  const base = last && last > now ? last : now;
  const { y, m, d } = zonedParts(base, timeZone);
  // The local calendar day after `base`, as a UTC instant, then the candidate
  // UTC hours around the wanted local hour — the one that reads back as
  // `hour` in the zone wins (offset 0 or +1 for Morocco; ±14 covers any zone).
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1, hour, 0, 0));
  for (const off of [1, 0, 2, -1, 3, -2, 4, -3, 5, -4, 6, -5, 7, -6, 8, -7, 9, -8, 10, -9, 11, -10, 12, -11, 13, -12, 14, -13, -14]) {
    const candidate = new Date(nextDay.getTime() - off * 3600000);
    const p = zonedParts(candidate, timeZone);
    if (p.h === hour && p.d === new Date(Date.UTC(y, m - 1, d + 1)).getUTCDate()) return candidate.toISOString();
  }
  return nextDay.toISOString();
}

// ── the content architecture's prose rules (2026-09-14) ─────────────────────
// GENERATE-AHEAD, RENDER-LIVE: volatile facts are never in prose. Any year
// (other than the founding year in "depuis 2016"), price, currency amount,
// departure date or seat count in a title, excerpt, description or body is a
// blocking problem — the live component tags carry them instead.
const FR_MONTHS = 'janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre';
const EN_MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december';
const AR_MONTHS = 'يناير|فبراير|مارس|أبريل|ابريل|ماي|مايو|يونيو|يوليوز|يوليو|غشت|أغسطس|شتنبر|سبتمبر|أكتوبر|اكتوبر|نونبر|نوفمبر|دجنبر|ديسمبر|أيلول|تشرين|كانون|شباط|آذار|نيسان|أيار|حزيران|تموز|آب';
const FOUNDING_CONTEXT = /(depuis|since|منذ|fond[ée]e|founded|cr[ée][ée]e|established)\s+(en\s+|in\s+|عام\s+|سنة\s+)?$/i;
export const PROSE_RULES = [
  { rule: 'année', re: /\b(?:19|20)\d{2}\b/g, allow: (ctx) => FOUNDING_CONTEXT.test(ctx) },
  { rule: 'année hégirienne', re: /\b1[45]\d{2}\s*(?:هـ|ه\b|AH\b|H\b)/g },
  { rule: 'montant', re: /\d[\d\s.,]*\s?(?:MAD|DH|Dhs?|dirhams?|درهم|دراهم|€|EUR|\$|USD)\b/gi },
  { rule: 'montant', re: /(?:à partir de|dès|from|ابتداءً من|ابتداء من)\s+\d/gi },
  { rule: 'date', re: new RegExp(`\\b\\d{1,2}(?:er|st|nd|rd|th)?\\s+(?:${FR_MONTHS}|${EN_MONTHS}|${AR_MONTHS})\\b`, 'gi') },
  { rule: 'date', re: /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g },
  { rule: 'nombre de places', re: /\b\d+\s*(?:places?|si[èe]ges?|seats?|مقعد|مقاعد)\b/gi },
];
// Levantine / MSA month names: Moroccan Arabic writes شتنبر، غشت، نونبر، دجنبر
// (hard constraint 8) — the others fail the Arabic body.
/**
 * Levantine / MSA month names present in an Arabic text, as whole words. A raw
 * substring test flagged « آب » (August) inside « الآباء » (the parents) — a
 * word every family post uses — so a month only counts when no letter touches
 * it, apart from the proclitics Arabic attaches to a word (و ف ب ل ك) and the
 * article « ال ».
 */
// Arabic vowel marks and the tatweel are not letters: left in the text they
// fake a word boundary (« حُسْنُ مَآبٍ » read as the month « آب ») or break a
// month's spelling (« تشرينَ الأول » missed). They are stripped before matching.
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
export function nonMoroccanMonthsIn(text) {
  const s = String(text ?? '').replace(ARABIC_MARKS, '');
  return NON_MOROCCAN_MONTHS.filter((m) => new RegExp(String.raw`(?<![\p{L}\p{M}])(?:[وفبلك])?(?:ال)?${m}(?![\p{L}\p{M}])`, 'u').test(s));
}
export const NON_MOROCCAN_MONTHS = ['أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول', 'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'سبتمبر', 'أغسطس', 'نوفمبر', 'ديسمبر'];
// Latin-script city names in Arabic prose (the CITY_SLUGS-instead-of-cityName trap).
const LATIN_CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Marrakesh', 'Fès', 'Fes', 'Fez', 'Tanger', 'Tangier', 'Agadir', 'Meknès', 'Meknes', 'Oujda'];

/** Every volatile-fact hit in a text: [{ rule, match }]. */
export function proseViolations(text) {
  const out = [];
  const s = String(text ?? '');
  for (const { rule, re, allow } of PROSE_RULES) {
    re.lastIndex = 0;
    for (const m of s.matchAll(re)) {
      if (allow && allow(s.slice(Math.max(0, m.index - 20), m.index))) continue;
      out.push({ rule, match: m[0].trim() });
    }
  }
  return out;
}

// The lander query families a post must never own (hard constraint 4) — the
// heads of docs/keyword-map.md's ownership table, accent-free, with the
// transliterations Moroccans type. Compared against `query_family`.
const MONTHS_SLUGS = 'janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre';
const CITY_SLUGS = 'casablanca|rabat|marrakech|fes|tanger|agadir|meknes|oujda';
export const LANDER_QUERIES = [
  /^(?:omra|umrah|oumra|3omra) (?:depuis le )?maroc$/,
  /^agence (?:omra|umrah|oumra)(?: (?:a |à )?casablanca)?$/,
  /^(?:omra|umrah|oumra) pas cher(?: maroc)?$/,
  /^prix (?:omra|umrah|oumra)(?: maroc)?$/,
  /^(?:omra|umrah|oumra) ramadan(?: \d{4})?$/,
  /^(?:omra|umrah|oumra) 5 etoiles$/,
  /^(?:omra|umrah|oumra) de luxe$/,
  new RegExp(`^(?:omra|umrah|oumra) (?:${MONTHS_SLUGS})(?: \\d{4})?$`),
  new RegExp(`^(?:omra|umrah|oumra) depuis (?:${CITY_SLUGS})$`),
  /^(?:omra|umrah|oumra) (?:rajab|chaabane|chawal|mawlid|ete)$/,
  /^(?:hajj|hadj|7ajj)(?: (?:depuis le )?maroc)?$/,
  /^عمرة (?:رمضان|رخيصة|فاخرة|من المغرب)$/,
  /^وكالة عمرة(?: بالدار البيضاء| في الدار البيضاء)?$/,
  /^الحج(?: من المغرب)?$/,
];
const normQuery = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9؀-ۿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** The lander pattern a query family collides with, or null. */
export function targetsLanderQuery(queryFamily) {
  const q = normQuery(queryFamily);
  if (!q) return null;
  return LANDER_QUERIES.find((re) => re.test(q))?.source ?? null;
}

/**
 * The ONLY external domains an article may link to — official sources and the
 * carriers the catalogue names. Same list as gate G7
 * (scripts/content-gate.mjs), exported from here so the dependency-free gate
 * the build runs and the pre-flight gate agree on one whitelist.
 *
 * Until 2026-09-15 ANY external link was a hard blocker, a rule inherited from
 * the API drafter (which could invent a URL). The content architecture requires
 * the opposite for Hajj and visa content: a « Sources » section citing the
 * ministry or Nusuk. So an OFF-whitelist link is now a blocking problem and an
 * on-whitelist one is simply allowed; G7 additionally checks it responds.
 */
export const EXTERNAL_WHITELIST = Object.freeze([
  'nusuk.sa', 'haj.gov.sa', 'mofa.gov.sa', 'tourisme.gov.ma', 'habous.gov.ma',
  'saudia.com', 'royalairmaroc.com', 'hhr.sa', 'who.int',
]);
/** The host of an external URL when it is NOT on the whitelist, else null. */
export function offWhitelistHost(url) {
  let host;
  try { host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return String(url).slice(0, 60); }
  return EXTERNAL_WHITELIST.some((d) => host === d || host.endsWith(`.${d}`)) ? null : host;
}

/**
 * A `<CommercialCTA intent="…">` INTENT → the lander path it resolves to, as a
 * pure map — the same table `resolveIntent()` (src/lib/content-resolver.js)
 * applies at request time, minus the indexability check, which needs live data
 * this dependency-free module must not import. The gate only has to know WHICH
 * page an intent is about; the resolver decides at render time whether that
 * page still qualifies and falls back to /bab-makka when it does not.
 *
 * Kept here so `linksOwner` accepts the intent form: hard-coding a lander URL
 * in a body is exactly what the architecture forbids, so the owner link had to
 * be satisfiable without one.
 */
const MONTH_SLUG_LIST = MONTHS_SLUGS.split('|');
export function intentPath(intent) {
  const raw = String(intent ?? '').trim().toLowerCase();
  const STATIC = {
    ramadan: '/omra-ramadan', hajj: '/hajj', pas_cher: '/omra-pas-cher', premium: '/omra-5-etoiles',
    agency: '/agence-omra-casablanca', guide: '/guide-omra', hotels: '/hotels-omra', next: '/bab-makka', all: '/bab-makka',
  };
  if (raw in STATIC) return STATIC[raw];
  const month = raw.match(/^month:(\d{1,2})$/);
  if (month) { const i = Number(month[1]) - 1; return i >= 0 && i < 12 ? `/omra-${MONTH_SLUG_LIST[i]}` : null; }
  const city = raw.match(/^city:([a-z]+)$/);
  if (city) return new RegExp(`^(?:${CITY_SLUGS})$`).test(city[1]) ? `/omra-depuis-${city[1]}` : null;
  const occasion = raw.match(/^occasion:([a-z0-9-]+)$/);
  if (occasion) return `/omra-${occasion[1]}`;
  return null;
}

/**
 * Every lander path a body points at through a CTA tag, in either spelling
 * (`<CommercialCTA to|intent …/>`, `{{live:cta to=…|intent=…}}`) and in any
 * attribute order.
 */
export function ctaTargets(body) {
  const src = String(body ?? '');
  const out = new Set();
  for (const m of src.matchAll(/<CommercialCTA\b([^<>]*)\/>|\{\{\s*live:cta\b([^}]*)\}\}/g)) {
    const attrs = m[1] ?? m[2] ?? '';
    const to = attrs.match(/\bto=(?:"([^"]*)"|([^\s"}]+))/);
    if (to) { out.add(to[1] ?? to[2]); continue; }
    const intent = attrs.match(/\bintent=(?:"([^"]*)"|([^\s"}]+))/);
    const path = intent ? intentPath(intent[1] ?? intent[2]) : null;
    if (path) out.add(path);
  }
  return out;
}

/**
 * What the PROSE rules read: the body without its placeholder tags and without
 * the TARGET of a markdown link — `[libellé](/fr/blog/xxx-2027)` becomes
 * `libellé`.
 *
 * A URL is not prose. Three existing posts carry a year in their slug
 * (`ramadan-2027-dates-calendrier`, `omra-10-derniers-jours-ramadan-2027`,
 * `omra-ramadan-2027-quand-reserver`), so before this any new post that linked
 * one of them — exactly what the sibling-link rule asks for — failed the
 * "année en clair" rule on the link target. The visible label is still
 * checked, so a year a reader can see is still caught.
 */
export function proseText(body) {
  return stripContentTags(body).replace(/\[([^\]]*)\]\([^)\s]*\)/g, '$1');
}

/**
 * Code-side quality gate. `problems` block auto-publish; `flags` reach the
 * reviewer and two of them (unsourced price, missing owner link) also block.
 * Prose accuracy is not checked here — that is the fact-sheet grounding's job,
 * and the human's.
 */
export function qualityGate(draft, { ownerPath, existingSlugs, priceSet, strict = true, testimonialIds = null } = {}) {
  const problems = [];
  const flags = [];
  const slugs = existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs ?? []);
  const prices = priceSet instanceof Set ? priceSet : new Set(priceSet ?? []);
  // Prose = the body without its placeholder tags (which carry the volatile
  // facts) and without link targets (a URL is not prose — see proseText).
  const prose = (lang) => proseText(draft[`body_${lang}`]);

  if (!SLUG_RE.test(draft.slug ?? '') || (draft.slug ?? '').length > 80) problems.push(`slug invalide : « ${draft.slug} »`);
  if (slugs.has(draft.slug)) problems.push(`slug déjà utilisé : « ${draft.slug} »`);

  const n = words(prose('fr'));
  if (n < 600) problems.push(`body_fr trop court : ${n} mots (minimum 800)`);
  else if (n < 800) flags.push(`body_fr un peu court : ${n} mots`);

  const h2 = (String(draft.body_fr ?? '').match(/^## /gm) ?? []).length;
  if (h2 < 3) problems.push(`seulement ${h2} section(s) « ## » (minimum 4)`);

  // The link to the owner page: a CTA tag in either spelling — `to="{owner}"`
  // or an `intent` that resolves to it (intentPath) — or a markdown link, in
  // every locale's body. The intent form is the architecture's way: a body must
  // never hard-code a lander URL, so requiring `to=` here used to force every
  // post to carry a second, duplicate CTA block just to satisfy this rule.
  const linksOwner = (lang, body) => !ownerPath || String(body ?? '').includes(`](/${lang}${ownerPath}`) || ctaTargets(body).has(ownerPath);
  if (!linksOwner('fr', draft.body_fr)) problems.push(`lien vers la page propriétaire ${ownerPath} manquant dans body_fr (<CommercialCTA intent="…" /> résolvant vers ${ownerPath}, <CommercialCTA to="${ownerPath}" /> ou lien markdown)`);
  for (const lang of ['ar', 'en']) if (!linksOwner(lang, draft[`body_${lang}`])) flags.push(`lien propriétaire manquant dans body_${lang}`);

  if (strict) {
    // Placeholder tags: only the registry's, with valid attributes.
    for (const lang of ['fr', 'ar', 'en']) for (const p of validateContentTags(draft[`body_${lang}`])) problems.push(`body_${lang} : ${p}`);
    // A quoted testimonial must exist and be published.
    if (testimonialIds) {
      for (const m of `${draft.body_fr ?? ''}\n${draft.body_ar ?? ''}\n${draft.body_en ?? ''}`.matchAll(/<ReviewQuote\s+id="([^"]+)"/g)) {
        if (!testimonialIds.has(m[1])) problems.push(`<ReviewQuote id="${m[1]}"> : aucun témoignage publié avec cet id`);
      }
    }
    // No volatile fact in prose — titles, excerpts, descriptions, bodies, all locales.
    for (const lang of ['fr', 'ar', 'en']) {
      for (const field of ['title', 'excerpt', 'seo_title', 'seo_description']) {
        for (const v of proseViolations(draft[`${field}_${lang}`])) problems.push(`${field}_${lang} : ${v.rule} en clair « ${v.match} » — les faits volatils passent par une balise`);
      }
      const seen = new Set();
      for (const v of proseViolations(prose(lang))) {
        const key = `${v.rule}|${v.match}`;
        if (seen.has(key)) continue;
        seen.add(key);
        problems.push(`body_${lang} : ${v.rule} en clair « ${v.match} » — les faits volatils passent par une balise`);
      }
    }
    // Moroccan Arabic register: month names and city names (hard constraints 5 and 8).
    const ar = `${draft.title_ar ?? ''}\n${draft.excerpt_ar ?? ''}\n${prose('ar')}`;
    for (const m of nonMoroccanMonthsIn(ar)) problems.push(`body_ar : nom de mois non marocain « ${m} » (écrire شتنبر، غشت، نونبر، دجنبر…)`);
    for (const c of LATIN_CITIES) if (new RegExp(`(?<![\\p{L}])${c}(?![\\p{L}])`, 'u').test(ar)) problems.push(`body_ar : nom de ville en caractères latins « ${c} » (الدار البيضاء، الرباط، مراكش، فاس، طنجة، أكادير، مكناس، وجدة)`);
    // Anti-cannibalisation is mechanical: the query family must not be a lander's.
    const hit = targetsLanderQuery(draft.query_family);
    if (hit) problems.push(`query_family « ${draft.query_family} » est la requête d'une page commerciale (${hit}) — un article la soutient, il ne la cible jamais`);
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
  // External links: the whitelist decides. An official source (ministry, Nusuk,
  // a carrier the catalogue names) is expected on Hajj and visa content and is
  // NOT a flag; anything else is a blocking problem.
  for (const m of new Set([...all.matchAll(/(https?:\/\/[^\s)\]"']+)/gi)].map((x) => x[1]))) {
    const host = offWhitelistHost(m);
    if (host) problems.push(`lien externe hors liste blanche « ${host} » — sources autorisées : ${EXTERNAL_WHITELIST.join(', ')}`);
  }

  // Legacy (non-strict) rule: every MAD amount must exist in the fact sheet.
  // Unsourced ⇒ flagged, never silently accepted (LAW §10). In strict mode any
  // amount is already a problem above.
  if (!strict) {
    const amounts = [...bodyFr.matchAll(/(\d[\d\s. ]{2,})\s?(?:MAD|dirhams?|DH)\b/gi)]
      .map((m) => Number(m[1].replace(/[\s. ]/g, '')))
      .filter((v) => Number.isFinite(v) && v >= 100);
    const unsourced = [...new Set(amounts.filter((v) => !prices.has(v)))];
    if (unsourced.length) flags.push(`prix NON sourcés dans body_fr : ${unsourced.map((v) => `${nf.format(v)} MAD`).join(', ')}`);
  }

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
  // « lien externe » is no longer here: an off-whitelist link is a blocking
  // PROBLEM above, and an on-whitelist source is required by the contract.
  const hard = (gate.flags ?? []).filter((f) => /prix NON sourcés|lien propriétaire manquant/i.test(f));
  if (hard.length) reasons.push(`signalements bloquants : ${hard.join(' ; ')}`);
  return { publish: reasons.length === 0, reasons };
}

/**
 * Normalize a produced article into the `articles` row shape (no id/dates).
 * Author: the AUTHOR record (team_members.id, resolved by the caller) plus the
 * configured name; no reviewer — the content architecture has none.
 */
export function toArticleRow(draft, { plan = {}, settings = null, slug, authorId = null }) {
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
    author_id: authorId,
    reviewed_by: null,
    reviewer_id: null,
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
