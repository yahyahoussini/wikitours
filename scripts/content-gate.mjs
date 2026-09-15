#!/usr/bin/env node
/**
 * content-gate.mjs — the content system's gate (brief B5, rules G1–G16).
 *
 *   node --env-file=.env.local --import ./tests/register.mjs scripts/content-gate.mjs [files…] [options]
 *
 *   files          content/articles/*.json drafts (default: every file whose slug
 *                  is not in the articles table yet)
 *   --slug=a,b     gate ROWS of the articles table instead of files (post-ingest)
 *   --existing[=x] gate EVERY existing row — the drift re-gate. x is `all`
 *                  (default), `scheduled` or `published`. A rule added after a
 *                  row was written otherwise never reaches it. A failing
 *                  SCHEDULED row exits 1 (it has not gone out yet); a failing
 *                  PUBLISHED one is listed as backlog and exits 0.
 *   --format=x     override the format (else draft.format, else the calendar
 *                  slot's length_target, else data/content-formats.json default)
 *   --require-build  G6 (link status), G13 (emitted schema) and G16 (rendered
 *                  body) need the isolated build (NEXT_DIST_DIR=.next-audit):
 *                  without it they report `pending`; with this flag pending = fail
 *   --offline      G7 does not fetch external URLs (whitelist only)
 *   --threshold=n  G15 similarity threshold (default: content_ops_settings, else 0.85)
 *   --out=dir      JSON reports (default docs/content-system/gate-reports)
 *   --quiet        one line per post
 *
 * Output: one JSON per post ({ slug, ok, checks: { G1: { ok, details } … } })
 * and a summary; exit 1 when any post fails. The prose rules themselves live
 * in src/lib/server/article-gate.mjs (shared with the ingest, dependency-
 * free); this script adds the structural, linking, language, schema, similarity
 * and rendering rules on top. A wrong rule is fixed HERE, never in the post.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { qualityGate, proseViolations, targetsLanderQuery, brandedTitle, words, EXTERNAL_WHITELIST, offWhitelistHost, proseText } from '@/lib/server/article-gate';
import { validateContentTags, stripContentTags, contentTagsOf, CTA_TARGET_RE } from '@/lib/content-tags';
import { extractFaq } from '@/lib/article-schema';
import { CLUSTERS, clusterOfArticle } from '@/lib/clusters';
import { BRAND } from '@/lib/brand';

// ── options ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;
const flag = (name) => argv.includes(`--${name}`);
const FILES = argv.filter((a) => !a.startsWith('--'));
const SLUGS = opt('slug')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;
const EXISTING = opt('existing') ?? (flag('existing') ? 'all' : null);
const REQUIRE_BUILD = flag('require-build');
const OFFLINE = flag('offline');
const QUIET = flag('quiet');
const OUT = opt('out') ?? 'docs/content-system/gate-reports';
const DIST = process.env.NEXT_DIST_DIR || '.next-audit';
const APP = path.join(DIST, 'server', 'app');
const LOCALES = ['fr', 'ar', 'en'];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

const readJson = (p, fallback = null) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const facts = readJson('data/allowed-facts.json', { entity: [], faq: [], glossary: [], official: [], policies: [], durations: [], airlines: [], hotels: [], hijri: [], logistics: [] });
const banned = readJson('data/banned-phrases.json', { fr: [], ar: [], en: [] });
const formats = readJson('data/content-formats.json', { formats: {}, default: 'explainer' });
const registry = readJson('data/lander-registry.json', { landers: [] });
const calendar = readJson('data/content-calendar.json', { slots: [] });

// ── helpers ─────────────────────────────────────────────────────────────────
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
// The prose rules (G1, G2, G3, G5, G9, G10, G11, G15) read the body without
// its tags AND without link targets — a URL is not prose (see proseText).
const prose = (draft, lang) => proseText(draft[`body_${lang}`]);
const wordCount = (s) => words(String(s ?? '').replace(/[#*_>|\-]+/g, ' '));
const h2s = (body) => [...String(body ?? '').matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
const isQuestion = (h) => /[?؟]\s*$/.test(h) || /^(comment|pourquoi|quand|combien|quel|quelle|quels|quelles|est-ce|faut-il|peut-on|que |où|qu'|doit-on|how|when|why|what|which|can|should|is |are |do |does |where|كيف|متى|شنو|واش|هل|لماذا|علاش|ما |كم|أين|فين|ماذا|من )/i.test(h);
const digitsOf = (s) => [...String(s ?? '').matchAll(/(?<![\p{L}\d])(\d[\d\s.,]*\d|\d)(?![\d\p{L}])/gu)].map((m) => m[1].replace(/[\s.,]/g, ''));
const factNumbers = (() => {
  const nums = new Set();
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'number') nums.add(String(v));
    else if (typeof v === 'string') for (const d of digitsOf(v)) nums.add(d);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(facts);
  return nums;
})();

/** Prerendered page of a locale route, or null. */
function builtPage(route) {
  const f = path.join(APP, `${route}.html`);
  if (!existsSync(f)) return null;
  const html = readFileSync(f, 'utf8');
  const metaFile = `${f.slice(0, -5)}.meta`;
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  return { html, status: meta.status ?? 200, noindex: /<meta name="robots" content="[^"]*noindex/.test(html) };
}
const hasBuild = existsSync(path.join(DIST, 'prerender-manifest.json'));
// A scheduled row has no prerendered page in a NORMAL build — that is
// publish-by-time working, not a defect — so the rules that read the rendered
// page (G13, G16) can only judge it in a CONTENT_PREVIEW_SCHEDULED build.
// Detected from the output itself rather than the shell, because the build
// that matters is the one on disk. Set in loadContext().
let previewBuild = false;
const pending = (why) => ({ ok: REQUIRE_BUILD ? false : null, pending: true, details: [why] });

const jaccard = (a, b) => {
  const sh = (s) => { const w = norm(s).split(' ').filter(Boolean); const set = new Set(); for (let i = 0; i + 2 < w.length; i++) set.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`); return set; };
  const A = sh(a); const B = sh(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
};

// ── load what the rules compare against ─────────────────────────────────────
async function loadContext() {
  // `refreshable` = a slug already in the table whose slot has NOT passed. A
  // post corrected after a review, before it goes live, is the same post being
  // improved — not a duplicate — so G8 and the shared gate must not fail it on
  // its own slug. A slug whose slot HAS passed is a live URL and stays a
  // genuine collision.
  const ctx = { existing: [], existingSlugs: new Set(), refreshable: new Set(), testimonialIds: null, threshold: Number(opt('threshold')) || 0.85, hotels: [], airlines: [] };
  if (!sb) return ctx;
  const now = new Date().toISOString();
  const [{ data: rows }, { data: tm }, { data: settings }, { data: hotels }, { data: offers }] = await Promise.all([
    sb.from('articles').select('slug, title_fr, title_ar, title_en, body_fr, body_ar, body_en, is_published, published_at, category, supports_path'),
    sb.from('testimonials').select('id').eq('is_published', true),
    sb.from('content_ops_settings').select('similarity_threshold').eq('id', 1).maybeSingle(),
    sb.from('hotels').select('name').eq('is_published', true),
    sb.from('offers').select('airline').eq('is_published', true),
  ]);
  ctx.existing = rows ?? [];
  ctx.existingSlugs = new Set(ctx.existing.map((r) => r.slug));
  ctx.refreshable = new Set(ctx.existing.filter((r) => r.published_at && r.published_at > now).map((r) => r.slug));
  previewBuild = hasBuild && ctx.existing.some((r) => r.is_published && r.published_at > now && builtPage(`/fr/blog/${r.slug}`));
  ctx.testimonialIds = new Set((tm ?? []).map((t) => t.id));
  if (!opt('threshold') && settings?.similarity_threshold) ctx.threshold = Number(settings.similarity_threshold);
  ctx.hotels = (hotels ?? []).map((h) => h.name);
  ctx.airlines = [...new Set((offers ?? []).map((o) => o.airline).filter(Boolean))];
  return ctx;
}

// ── the rules ────────────────────────────────────────────────────────────────
function G1(draft, fmt) {
  const spec = formats.formats[fmt] ?? formats.formats[formats.default];
  const details = [];
  for (const l of LOCALES) {
    const n = wordCount(prose(draft, l));
    const [lo, hi] = spec[l];
    if (n < lo || n > hi) details.push(`body_${l} : ${n} mots, attendu ${lo}–${hi} (format ${fmt})`);
  }
  return { ok: !details.length, details, format: fmt };
}
function G2(draft) {
  const details = [];
  for (const l of LOCALES) {
    const n = wordCount(draft[`excerpt_${l}`]);
    if (n < 40 || n > 55) details.push(`excerpt_${l} (bloc réponse d'abord) : ${n} mots, attendu 40–55`);
  }
  return { ok: !details.length, details };
}
function G3(draft, fmt) {
  const spec = formats.formats[fmt] ?? formats.formats[formats.default];
  const details = [];
  for (const l of LOCALES) {
    const hs = h2s(stripContentTags(draft[`body_${l}`]));
    const q = hs.filter(isQuestion).length;
    if (q < (spec.h2_min ?? 4)) details.push(`body_${l} : ${q} H2 en forme de question sur ${hs.length}, minimum ${spec.h2_min ?? 4}`);
  }
  return { ok: !details.length, details };
}
// The FAQ answer window. The brief says 30–90, but scripts/seo-audit.js has
// failed a FAQPage answer outside 25–75 since before this system existed, and
// it runs against production in CI — so a post the content gate passed at 85
// words would break the build the day its slot arrived. A gate must never pass
// what a later gate fails: the ceiling is the stricter one.
const [FAQ_MIN, FAQ_MAX] = formats.faq_answer_words ?? [30, 75];
function G4(draft) {
  const details = [];
  for (const l of LOCALES) {
    const faq = extractFaq(draft[`body_${l}`]);
    if (faq.length < 5 || faq.length > 6) details.push(`body_${l} : FAQ de ${faq.length} question(s), attendu 5–6`);
    faq.forEach((it, i) => { const n = wordCount(it.answer); if (n < FAQ_MIN || n > FAQ_MAX) details.push(`body_${l} : réponse FAQ ${i + 1} de ${n} mots, attendu ${FAQ_MIN}–${FAQ_MAX} (scripts/seo-audit.js échoue au-delà de 75 sur la production)`); });
  }
  return { ok: !details.length, details };
}
function G5(draft) {
  const details = [];
  const extra = [
    { rule: 'places disponibles', re: /\b(places?|si[èe]ges?|seats?)\s+(disponibles?|restantes?|available|left)\b|أماكن\s+(متوفرة|متاحة|متبقية)/gi },
    { rule: 'distance hôtel', re: /\b\d[\d\s]*\s?(?:m|mètres?|metres?|meters?|km|kilom[èe]tres?)\b(?=[^.\n]{0,60}(?:haram|حرم|hôtel|hotel|فندق|mosqu|masjid|مسجد))|(?:\d+\s?(?:متر|كلم|كم)\b)/gi },
  ];
  for (const l of LOCALES) {
    for (const f of ['title', 'excerpt', 'seo_title', 'seo_description']) {
      for (const v of proseViolations(draft[`${f}_${l}`])) details.push(`${f}_${l} : ${v.rule} en clair « ${v.match} »`);
      for (const { rule, re } of extra) for (const m of String(draft[`${f}_${l}`] ?? '').matchAll(re)) details.push(`${f}_${l} : ${rule} en clair « ${m[0].trim()} »`);
    }
    const p = prose(draft, l);
    const seen = new Set();
    for (const v of proseViolations(p)) { const k = `${v.rule}|${v.match}`; if (!seen.has(k)) { seen.add(k); details.push(`body_${l} : ${v.rule} en clair « ${v.match} »`); } }
    for (const { rule, re } of extra) for (const m of p.matchAll(re)) { const k = `${rule}|${m[0]}`; if (!seen.has(k)) { seen.add(k); details.push(`body_${l} : ${rule} en clair « ${m[0].trim()} »`); } }
    // Stable numbers must exist in allowed-facts (1–10 are structural counts —
    // « 3 gammes », « 5 piliers » — and stay free; list markers are markdown).
    const body = p.replace(/^\s*\d+\.\s+/gm, ' ').replace(/^#{1,4}\s.*$/gm, ' ');
    for (const d of new Set(digitsOf(body))) {
      const n = Number(d);
      if (!Number.isFinite(n) || n <= 10) continue;
      if (!factNumbers.has(d)) details.push(`body_${l} : nombre « ${d} » absent de data/allowed-facts.json`);
    }
  }
  return { ok: !details.length, details };
}
function G6(draft, ctx) {
  const details = [];
  // The calendar is the plan: each slot names its cluster and the sibling pages
  // it should link. G6 used to re-derive the cluster from owner_path + category
  // and ignore both, so 66 of 165 planned slots could not reach two siblings —
  // every slot owned by /bab-makka resolves to cluster A, whose pages are all
  // commercial landers a post may not link by hand, and the city guides resolved
  // to the Ramadan cluster. The planned cluster and the planned sibling_paths now
  // count; the derived cluster remains the fallback for a draft with no slot.
  // The bar does not move: still ≥ 2 siblings, still no hand-linked lander.
  const planned = calendar.slots?.find((s) => draft.slot_index != null && s.slot_index === Number(draft.slot_index))
    ?? calendar.slots?.find((s) => s.slug && s.slug === draft.slug) ?? null;
  const cluster = CLUSTERS.find((c) => c.id === (draft.cluster ?? planned?.cluster))
    ?? clusterOfArticle({ slug: draft.slug, supports_path: draft.owner_path ?? null, category: draft.category });
  const pillar = draft.owner_path ?? cluster?.pillar ?? null;
  const landerPaths = new Set(registry.landers.filter((l) => ['home', 'pillar', 'hub', 'local', 'hajj', 'month', 'occasion', 'city'].includes(l.kind)).map((l) => l.path));
  const plannedSiblings = (planned?.sibling_paths ?? []).filter((p) => !landerPaths.has(p));
  for (const l of LOCALES) {
    const body = String(draft[`body_${l}`] ?? '');
    const links = [...body.matchAll(/\]\((\/[a-z]{2}\/[^)\s]+|\/[^)\s]+)\)/g)].map((m) => m[1]);
    const ctas = contentTagsOf(body).filter((t) => t.name === 'CommercialCTA' || t.name === 'HajjBridgeCTA');
    const total = links.length + ctas.length;
    if (total < 4) details.push(`body_${l} : ${total} lien(s) interne(s) (liens markdown + CTA), minimum 4`);
    // The pillar: a CTA (intent or to) or a markdown link.
    const pillarLinked = ctas.some((t) => t.attrs.to === pillar || t.attrs.intent) || links.some((h) => h.replace(/^\/[a-z]{2}/, '') === pillar);
    if (!pillarLinked) details.push(`body_${l} : aucun lien vers le pilier ${pillar} (<CommercialCTA> ou lien markdown)`);
    // ≥ 2 siblings: posts of the same cluster or the cluster's pages.
    const siblingPaths = new Set([...(cluster?.pages ?? []), ...(cluster?.articles ?? []).map((s) => `/blog/${s}`), ...plannedSiblings]);
    const siblings = links.map((h) => h.replace(/^\/[a-z]{2}/, '')).filter((h) => siblingPaths.has(h) || (h.startsWith('/blog/') && ctx.existing.some((r) => r.slug === h.slice(6) && clusterOfArticle(r)?.id === cluster?.id)));
    if (new Set(siblings).size < 2) details.push(`body_${l} : ${new Set(siblings).size} lien(s) vers des pages sœurs du dossier ${cluster?.id ?? '?'}, minimum 2`);
    for (const h of links) {
      const rel = h.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
      if (!/^\/[a-z]{2}(\/|$)/.test(h)) details.push(`body_${l} : lien sans préfixe de langue « ${h} »`);
      else if (!h.startsWith(`/${l}/`) && h !== `/${l}`) details.push(`body_${l} : lien vers une autre langue « ${h} »`);
      if (/\/$/.test(rel) && rel !== '/') details.push(`body_${l} : lien avec barre oblique finale « ${h} »`);
      if (/^\/omra-[a-z]+-\d{4}$/.test(rel)) details.push(`body_${l} : lien vers une URL de mois datée (301) « ${h} »`);
      if (landerPaths.has(rel)) details.push(`body_${l} : lien en dur vers la page commerciale « ${rel} » — utiliser <CommercialCTA intent="…" />`);
      if (rel.startsWith('/blog/') && !ctx.existingSlugs.has(rel.slice(6)) && !calendar.slots?.some((s) => s.slug === rel.slice(6))) details.push(`body_${l} : lien vers un article inexistant « ${h} »`);
      if (hasBuild) {
        const page = builtPage(h);
        // A sibling post that is scheduled — so not built yet — but goes live no
        // later than this one is not a broken link: by the time a reader can
        // reach this page, it answers 200. Series parts link their previous part
        // all the time; without this every series failed until a rebuild.
        const target = !page && rel.startsWith('/blog/') ? ctx.existing.find((r) => r.slug === rel.slice(6)) : null;
        const ownRelease = draft.published_at ?? planned?.publish_at ?? null;
        const liveFirst = Boolean(target?.is_published && ownRelease && target.published_at && Date.parse(target.published_at) <= Date.parse(ownRelease));
        if (!page && liveFirst) { /* live before this post is — fine */ }
        else if (!page) details.push(`body_${l} : « ${h} » n'est pas une page construite (404 ou redirection)`);
        else if (page.status !== 200) details.push(`body_${l} : « ${h} » répond ${page.status}`);
        else if (page.noindex) details.push(`body_${l} : « ${h} » est noindex`);
      }
    }
  }
  const out = { ok: !details.length, details };
  if (!hasBuild) { out.pending = true; out.details.push('statut des liens non vérifié : pas de build isolé (NEXT_DIST_DIR)'); if (REQUIRE_BUILD) out.ok = false; }
  return out;
}
async function G7(draft) {
  const details = [];
  const warnings = [];
  const seen = new Set();
  for (const l of LOCALES) {
    for (const m of String(draft[`body_${l}`] ?? '').matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
      const u = m[1];
      if (seen.has(u)) continue;
      seen.add(u);
      const off = offWhitelistHost(u);
      if (off) { details.push(`body_${l} : domaine hors liste blanche « ${off} » — autorisés : ${EXTERNAL_WHITELIST.join(', ')}`); continue; }
      if (OFFLINE) continue;
      try {
        const res = await fetch(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 (content-gate wikitours.ma)' } });
        if (res.status !== 200) details.push(`body_${l} : « ${u} » répond ${res.status}`);
      } catch (e) {
        // A whitelisted ministry site whose certificate chain this machine
        // cannot verify (habous.gov.ma does that) is not a dead link: warn,
        // do not fail — the owner checks it in a browser.
        warnings.push(`body_${l} : « ${u} » injoignable d'ici (${e.cause?.code ?? e.name}) — vérifier dans un navigateur`);
      }
    }
  }
  return { ok: !details.length, details, warnings };
}
function G8(draft, ctx, allDrafts) {
  const details = [];
  const q = norm(draft.query_family);
  const qa = norm(draft.query_family_ar);
  const hit = targetsLanderQuery(draft.query_family);
  if (hit) details.push(`query_family « ${draft.query_family} » est une requête de page commerciale (${hit})`);
  if (qa && targetsLanderQuery(draft.query_family_ar)) details.push(`query_family_ar « ${draft.query_family_ar} » est une requête de page commerciale`);
  for (const l of registry.landers) {
    for (const loc of LOCALES) {
      const h1 = norm(l[loc]?.h1);
      if (h1 && (h1 === q || (qa && h1 === qa))) details.push(`query_family égale au H1 de ${l.path} (${loc})`);
    }
  }
  for (const r of ctx.existing) {
    if (r.slug === draft.slug) continue; // never compare a post against its own row
    for (const loc of LOCALES) {
      const t = norm(r[`title_${loc}`]);
      if (t && (t === q || (qa && t === qa))) details.push(`query_family égale au titre de l'article existant /blog/${r.slug}`);
    }
  }
  for (const s of calendar.slots ?? []) {
    if (s.slug === draft.slug || s.slot_index === draft.slot_index) continue;
    if (s.status === 'scheduled' && (norm(s.primary_query_fr) === q || (qa && norm(s.primary_query_ar) === qa))) details.push(`query_family égale à la requête du créneau ${s.slot_index} déjà programmé`);
  }
  for (const d of allDrafts) if (d !== draft && d.slug === draft.slug) details.push(`slug « ${draft.slug} » présent deux fois dans le lot`);
  // A slug already in the table is a collision UNLESS this is the same post
  // being corrected before its slot (see ctx.refreshable).
  if (ctx.existingSlugs.has(draft.slug) && !draft.__row && !ctx.refreshable.has(draft.slug)) details.push(`slug « ${draft.slug} » déjà dans la table articles`);
  return { ok: !details.length, details };
}
function G9(draft, ctx) {
  const details = [];
  const properNouns = ['Nusuk', 'WhatsApp', 'ONCF', 'Al Boraq', 'CTM', 'Supratours', 'Saudia', 'Royal Air Maroc', 'RAM', 'eSIM', 'SIM', 'Bab Makka', 'Wiki Tours International', 'Wiki Tours', 'Zamzam', 'Maqam', 'Tawakkalna', 'Umm al-Qura', 'CIN', 'PDF', 'QR', 'Al Haramain', 'Haramain', ...ctx.hotels, ...ctx.airlines];
  const stripNouns = (s) => properNouns.reduce((acc, n) => acc.split(n).join(' '), s);
  // AR: ≥ 95 % Arabic letters once the proper-noun whitelist is removed; Latin cities and non-Moroccan months are already failed by the shared gate.
  const ar = stripNouns(`${draft.title_ar ?? ''}\n${draft.excerpt_ar ?? ''}\n${prose(draft, 'ar')}`.replace(/\]\([^)]*\)/g, ''));
  const arLetters = (ar.match(/[؀-ۿ]/g) ?? []).length;
  const latinLetters = (ar.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  const share = arLetters / Math.max(1, arLetters + latinLetters);
  if (share < 0.95) details.push(`body_ar : ${Math.round(share * 100)} % de lettres arabes hors noms propres, minimum 95 %`);
  // EN: French leakage.
  const en = prose(draft, 'en').replace(/\]\([^)]*\)/g, '');
  const enWords = norm(en).split(' ').filter(Boolean).length;
  const frHits = (en.match(/\b(le|la|les|des|du|une|et|est|pour|avec|dès|nos|vos|votre|notre|sur|dans|par|cette|qui|que|chez|aussi|mais|très)\b/gi) ?? []).length;
  if (enWords && frHits / enWords > 0.02) details.push(`body_en : ${frHits} mots-outils français pour ${enWords} mots (fuite de français)`);
  for (const m of en.matchAll(/\b(la Mecque|Médine|pèlerin|séjour|départ|réserver|agence)\b/gi)) { details.push(`body_en : mot français « ${m[0]} »`); break; }
  // FR: Arabic script beyond the religious terms.
  const fr = prose(draft, 'fr');
  const arabicRuns = [...fr.matchAll(/[؀-ۿ][؀-ۿ\s]{0,40}/g)].map((m) => m[0].trim()).filter(Boolean);
  const allowedAr = /^(الله|صلى الله عليه وسلم|ﷺ|رضي الله عنه|لبيك|لبيك اللهم لبيك|بسم الله|إن شاء الله|ما شاء الله|الحمد لله|سبحان الله|الله أكبر|دعاء|عمرة|حج|إحرام|طواف|سعي|ميقات|تلبية|زمزم|روضة|حرم|رمضان|ليلة القدر|العشر الأواخر|عيد|قرعة|تكبير|تهليل|أذكار|ذكر|صلاة|تراويح|اعتكاف|إفطار|سحور|فجر|مغرب|عشاء|ظهر|عصر|جمعة|مسجد|الكعبة|الصفا|المروة|منى|عرفة|مزدلفة|جمرات|هدي|بدل|رخصة|نية|سنة|واجب|ركن|فدية|مخيط|ملتزم|الحجر الأسود|الملتزم|مقام إبراهيم|حطيم|حجر إسماعيل|طواف الإفاضة|طواف الوداع|تحلل)+$/u;
  for (const run of arabicRuns) if (!allowedAr.test(run.replace(/[،,.:؛]/g, '').trim())) { details.push(`body_fr : arabe hors termes religieux « ${run} »`); break; }
  return { ok: !details.length, details, arabicShare: Math.round(share * 1000) / 10 };
}
function G10(draft) {
  const details = [];
  for (const l of LOCALES) {
    const text = norm(`${draft[`title_${l}`]}\n${draft[`excerpt_${l}`]}\n${draft[`seo_title_${l}`]}\n${draft[`seo_description_${l}`]}\n${prose(draft, l)}`);
    for (const phrase of banned[l] ?? []) {
      const p = norm(phrase);
      if (p && new RegExp(`(?<![\\p{L}\\p{N}])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(text)) details.push(`${l} : expression interdite « ${phrase} »`);
    }
  }
  return { ok: !details.length, details };
}
function G11(draft) {
  const details = [];
  const QUOTE_RE = /[«“"](?:[^«»“”"\n]{1,400})[»”"]/g;
  for (const l of LOCALES) {
    const p = prose(draft, l);
    for (const m of p.matchAll(QUOTE_RE)) {
      const inner = m[0].slice(1, -1);
      if (wordCount(inner) < 6) continue; // a quoted term (« ihram »), not a quotation
      // A hadith / Qur'an quotation is allowed when the paragraph names its source.
      const start = p.lastIndexOf('\n\n', m.index);
      const paragraph = p.slice(start < 0 ? 0 : start, p.indexOf('\n\n', m.index) < 0 ? p.length : p.indexOf('\n\n', m.index));
      if (/(bukhari|boukhari|muslim|mouslim|tirmidhi|abou daoud|abu dawud|nasa[iï]|ibn majah|malik|muwatta|coran|qur'?an|sourate|surah|البخاري|مسلم|الترمذي|أبو داود|النسائي|ابن ماجه|مالك|القرآن|سورة|صحيح|رواه|متفق عليه)/i.test(paragraph)) continue;
      details.push(`body_${l} : citation hors <ReviewQuote> « ${inner.slice(0, 60)}… »`);
    }
  }
  return { ok: !details.length, details };
}
function G12(draft) {
  const details = [];
  for (const l of LOCALES) {
    const t = brandedTitle(draft[`seo_title_${l}`] ?? '', l === 'ar' ? BRAND.serviceAr ?? BRAND.service : BRAND.service);
    if (t.length < 45 || t.length > 60) details.push(`seo_title_${l} avec marque : ${t.length} caractères, attendu 45–60 (« ${t} »)`);
    if (!/bab makka|باب مكة|wiki tours|ويكي تورز/i.test(t)) details.push(`seo_title_${l} : marque absente une fois composé (« ${t} »)`);
    const d = String(draft[`seo_description_${l}`] ?? '').trim();
    if (d.length < 120 || d.length > 155) details.push(`seo_description_${l} : ${d.length} caractères, attendu 120–155`);
    if (/…$|\.\.\.$/.test(d) || !/[.!?؟،。]$/.test(d)) details.push(`seo_description_${l} : ne se termine pas par une ponctuation de phrase (coupure)`);
    const h1 = String(draft[`title_${l}`] ?? '');
    if (h1.length > 70) details.push(`title_${l} (H1) : ${h1.length} caractères, maximum 70`);
  }
  return { ok: !details.length, details };
}
function G13(draft, ctx) {
  const details = [];
  const faq = extractFaq(draft.body_fr);
  if (faq.length < 5) details.push(`FAQPage : ${faq.length} question(s) extraites de body_fr, minimum 5`);
  for (const l of LOCALES) if (!String(draft[`title_${l}`] ?? '').trim()) details.push(`BlogPosting.headline (${l}) vide`);
  if (!draft.published_at && !draft.__row) details.push('BlogPosting.datePublished : attribué à l\'ingestion (créneau) — vérifié après build');
  if (draft.__row && !draft.published_at) details.push('BlogPosting.datePublished absent sur la ligne');
  // The author @id resolves to the /equipe Person only when the profile is renderable; else the organisation — both valid targets.
  if (draft.__row && !draft.author_id && !draft.author_name) details.push('BlogPosting.author : ni author_id ni author_name');
  if (hasBuild && draft.__row && !(draft.__state === 'scheduled' && !previewBuild)) {
    for (const l of LOCALES) {
      const page = builtPage(`/${l}/blog/${draft.slug}`);
      if (!page) { details.push(`/${l}/blog/${draft.slug} non construite`); continue; }
      const scripts = [...page.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
      const types = scripts.filter(Boolean).flatMap((s) => (Array.isArray(s['@type']) ? s['@type'] : [s['@type']]));
      for (const need of ['BlogPosting', 'FAQPage', 'BreadcrumbList']) if (!types.includes(need)) details.push(`/${l} : nœud ${need} absent`);
      const post = scripts.find((s) => s?.['@type'] === 'BlogPosting');
      if (post && !post.speakable) details.push(`/${l} : BlogPosting.speakable absent`);
      if (post && post.publisher?.['@id'] !== 'https://wikitours.ma/#organization') details.push(`/${l} : publisher @id ≠ https://wikitours.ma/#organization`);
      const authorId = post?.author?.['@id'];
      if (post && authorId && authorId !== 'https://wikitours.ma/#organization' && !page.html.includes(`"@id":"${authorId}"`)) details.push(`/${l} : author @id ${authorId} non résolu sur la page`);
      if (post && !post.author) details.push(`/${l} : BlogPosting.author absent`);
    }
  }
  const out = { ok: !details.filter((d) => !/attribué à l'ingestion/.test(d)).length, details };
  if (!hasBuild || !draft.__row || (draft.__state === 'scheduled' && !previewBuild)) {
    out.pending = true;
    out.details.push(draft.__state === 'scheduled' ? 'ligne programmée absente d\'un build normal (publish-by-time) : rejouer avec CONTENT_PREVIEW_SCHEDULED=1' : 'nœuds émis non vérifiés : pas de build de la page (ingérer puis construire)');
    if (REQUIRE_BUILD) out.ok = false;
  }
  return out;
}
function G14(draft) {
  const slot = draft.slot ?? draft.track ?? 'omra';
  if (slot !== 'ramadan' && slot !== 'hajj') return { ok: true, details: [`créneau ${slot} : règle non applicable`] };
  const details = [];
  for (const l of LOCALES) {
    const tags = contentTagsOf(draft[`body_${l}`]);
    if (!tags.some((t) => t.name === 'HijriCountdown' || t.name === 'RamadanNightsTable')) details.push(`body_${l} : créneau ${slot} sans composant hégirien (<HijriCountdown> ou <RamadanNightsTable>) — le composant porte la réserve « selon l'observation de la lune »`);
    if (slot === 'hajj' && !tags.some((t) => t.name === 'HajjBridgeCTA')) details.push(`body_${l} : créneau hajj sans <HajjBridgeCTA />`);
  }
  return { ok: !details.length, details };
}
function G15(draft, ctx) {
  const details = [];
  const closest = {};
  for (const l of LOCALES) {
    let best = { slug: null, score: 0 };
    for (const r of ctx.existing) {
      if (r.slug === draft.slug) continue;
      const s = jaccard(prose(draft, l), stripContentTags(r[`body_${l}`]));
      if (s > best.score) best = { slug: r.slug, score: s };
    }
    closest[l] = { slug: best.slug, score: Math.round(best.score * 1000) / 1000 };
    if (best.score >= ctx.threshold) details.push(`body_${l} : similarité ${best.score.toFixed(2)} ≥ ${ctx.threshold} avec /blog/${best.slug}`);
  }
  return { ok: !details.length, details, closest, method: 'n-gram Jaccard (3-grammes de mots) — ni gte-small ni transformers.js disponibles' };
}
function G16(draft) {
  if (!hasBuild || !draft.__row) return pending('rendu non vérifié : ingérer puis construire (NEXT_DIST_DIR=.next-audit CONTENT_PREVIEW_SCHEDULED=1)');
  if (draft.__state === 'scheduled' && !previewBuild) return pending('ligne programmée absente d\'un build normal (publish-by-time) : rejouer avec CONTENT_PREVIEW_SCHEDULED=1');
  const details = [];
  const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const MARKERS = { CommercialCTA: 'data-commercial-cta', LiveDepartures: 'data-live-departures', PriceRange: 'data-price-range', HotelCard: 'data-hotel-card', HotelList: 'data-hotel-list', ReviewQuote: 'data-review-quote', HijriCountdown: 'data-hijri-countdown', PolicyFact: 'data-policy-fact', DepositPolicy: 'data-deposit-policy', HajjBridgeCTA: 'data-hajj-bridge', RamadanNightsTable: 'data-ramadan-nights' };
  for (const l of LOCALES) {
    const page = builtPage(`/${l}/blog/${draft.slug}`);
    if (!page) { details.push(`/${l}/blog/${draft.slug} non construite`); continue; }
    const text = norm(textOf(page.html));
    const paragraphs = prose(draft, l).split(/\n{2,}/).map((p) => p.replace(/^#{1,4}\s+/, '').replace(/[*_\[\]()]/g, ' ').trim()).filter((p) => wordCount(p) >= 8);
    const missing = paragraphs.filter((p) => !text.includes(norm(p).split(' ').slice(0, 8).join(' ')));
    if (missing.length > Math.ceil(paragraphs.length * 0.05)) details.push(`/${l} : ${missing.length}/${paragraphs.length} paragraphes absents du HTML rendu sans JavaScript`);
    for (const t of contentTagsOf(draft[`body_${l}`])) {
      const marker = MARKERS[t.name];
      // PriceRange / ReviewQuote / HotelCard render NOTHING on purpose when their data is absent — a missing marker there is data, not a defect.
      if (marker && !page.html.includes(marker) && !['PriceRange', 'ReviewQuote', 'HotelCard'].includes(t.name)) details.push(`/${l} : composant ${t.name} non rendu (${marker} absent)`);
    }
    if (!page.html.includes('data-data-basis')) details.push(`/${l} : ligne « base des données » absente`);
  }
  return { ok: !details.length, details };
}

// ── run ──────────────────────────────────────────────────────────────────────
async function main() {
  const ctx = await loadContext();
  let drafts = [];
  // --existing: the DRIFT re-gate. Rows already in `articles` were never
  // re-checked, so every rule added after a row was written had no reach over
  // it — which is how two live posts kept 43 prices and 18 dates in prose that
  // the gate has forbidden since 2026-09-14, and how two others kept a link
  // into a noindex lander. A rule is only worth what it covers.
  let selected = SLUGS;
  const rowState = new Map();
  if (EXISTING) {
    if (!sb) { console.error('no Supabase env'); process.exit(2); }
    const stamp = new Date().toISOString();
    const { data } = await sb.from('articles').select('slug, is_published, published_at');
    const stateOf = (r) => (!r.is_published ? 'withdrawn' : r.published_at > stamp ? 'scheduled' : 'published');
    const wanted = EXISTING === 'all' ? ['published', 'scheduled'] : EXISTING.split(',').map((s) => s.trim());
    for (const r of data ?? []) if (wanted.includes(stateOf(r))) rowState.set(r.slug, stateOf(r));
    selected = [...rowState.keys()];
    console.log(`[content-gate] drift re-gate over ${selected.length} existing row(s) — ${wanted.join(' + ')}`);
  }
  if (selected) {
    if (!sb) { console.error('no Supabase env'); process.exit(2); }
    const { data } = await sb.from('articles').select('*').in('slug', selected);
    // Every loaded row knows its state, whichever flag loaded it — otherwise
    // `--slug` judged a scheduled row by rules `--existing` correctly defers.
    const stamp = new Date().toISOString();
    const stateOfRow = (r) => (!r.is_published ? 'withdrawn' : r.published_at > stamp ? 'scheduled' : 'published');
    drafts = (data ?? []).map((r) => ({ ...r, __row: true, __state: rowState.get(r.slug) ?? stateOfRow(r), owner_path: r.supports_path, query_family: r.query_family ?? calendar.slots?.find((s) => s.slug === r.slug)?.primary_query_fr ?? null, query_family_ar: calendar.slots?.find((s) => s.slug === r.slug)?.primary_query_ar ?? null, slot: calendar.slots?.find((s) => s.slug === r.slug)?.track ?? null, format: calendar.slots?.find((s) => s.slug === r.slug)?.length_target ?? null }));
    for (const s of selected) if (!drafts.some((d) => d.slug === s)) console.error(`row not found: ${s}`);
  } else {
    const files = FILES.length ? FILES : readdirSync('content/articles').filter((f) => f.endsWith('.json')).map((f) => path.join('content/articles', f));
    for (const f of files) {
      const d = JSON.parse(readFileSync(f, 'utf8'));
      d.__file = f;
      if (!FILES.length && ctx.existingSlugs.has(d.slug)) continue; // already ingested on an earlier build
      drafts.push(d);
    }
  }
  if (!drafts.length) { console.log('[content-gate] nothing to check'); return; }
  mkdirSync(OUT, { recursive: true });

  let failures = 0;
  let blocking = 0;
  const backlog = [];
  for (const draft of drafts) {
    const fmt = opt('format') ?? draft.format ?? draft.length_target ?? calendar.slots?.find((s) => s.slug === draft.slug)?.length_target ?? formats.default;
    const checks = {
      G1: G1(draft, fmt), G2: G2(draft), G3: G3(draft, fmt), G4: G4(draft), G5: G5(draft), G6: G6(draft, ctx), G7: await G7(draft), G8: G8(draft, ctx, drafts),
      G9: G9(draft, ctx), G10: G10(draft), G11: G11(draft), G12: G12(draft), G13: G13(draft, ctx), G14: G14(draft), G15: G15(draft, ctx), G16: G16(draft),
    };
    // The shared strict gate (tags, prose rules, month/city register, owner link) as G0.
    // The shared gate's duplicate-slug check gets the same exemption: a post
    // corrected before its slot is not competing with itself.
    const otherSlugs = draft.__row || ctx.refreshable.has(draft.slug)
      ? new Set([...ctx.existingSlugs].filter((s) => s !== draft.slug))
      : ctx.existingSlugs;
    const shared = qualityGate(draft, { ownerPath: draft.owner_path ?? null, existingSlugs: otherSlugs, strict: true, testimonialIds: ctx.testimonialIds });
    const tagProblems = LOCALES.flatMap((l) => validateContentTags(draft[`body_${l}`]).map((p) => `body_${l} : ${p}`));
    checks.G0 = { ok: shared.ok && !tagProblems.length, details: [...shared.problems, ...tagProblems], flags: shared.flags };
    const failed = Object.entries(checks).filter(([, c]) => c.ok === false).map(([k]) => k);
    const pendingRules = Object.entries(checks).filter(([, c]) => c.pending && c.ok !== false).map(([k]) => k);
    const ok = !failed.length;
    if (!ok) { failures++; if (EXISTING && draft.__state === 'published') backlog.push(draft.slug); else blocking++; }
    const report = { slug: draft.slug, file: draft.__file ?? null, row: Boolean(draft.__row), state: draft.__state ?? null, format: fmt, checked_at: new Date().toISOString(), ok, failed, pending: pendingRules, words: Object.fromEntries(LOCALES.map((l) => [l, wordCount(prose(draft, l))])), checks };
    writeFileSync(path.join(OUT, `${draft.slug}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[content-gate] ${ok ? 'PASS' : 'FAIL'} ${draft.slug} · ${fmt} · fr ${report.words.fr} / ar ${report.words.ar} / en ${report.words.en}${failed.length ? ` · failed ${failed.join(', ')}` : ''}${pendingRules.length ? ` · pending ${pendingRules.join(', ')}` : ''}`);
    if (!QUIET) for (const k of failed) for (const d of checks[k].details) console.log(`    ${k}: ${d}`);
  }
  console.log(`[content-gate] ${drafts.length} post(s) · ${drafts.length - failures} pass · ${failures} fail · reports in ${OUT}`);
  // An ALREADY PUBLISHED row that fails is history, not a decision anyone can
  // still take: it is reported as backlog and does not fail the run, because a
  // permanently red gate is the pressure that gets gates loosened, and the
  // rulebook forbids loosening this one. A scheduled row has not gone out yet,
  // so it still blocks.
  if (backlog.length) console.log(`[content-gate] backlog — ${backlog.length} PUBLISHED row(s) below the current bar, not blocking: ${backlog.join(', ')}`);
  process.exit(blocking ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
