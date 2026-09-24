#!/usr/bin/env node
/**
 * scripts/schema-audit.mjs — the structured-data gate.
 *
 * Runs as npm `postbuild`, so a schema regression fails `next build` — on
 * Vercel and in CI alike — and on demand with `npm run schema:audit`. It reads
 * the PRERENDERED HTML in the build output (NEXT_DIST_DIR, default .next): no
 * server, no database, a few seconds. For a representative page of EVERY page
 * type in EVERY locale (every prerendered page with --all) it checks:
 *
 *   json      every <script type="application/ld+json"> parses; @context is schema.org
 *   types     every @type is a schema.org type, every property exists in the
 *             vocabulary AND is allowed on that type (domainIncludes across the
 *             type hierarchy). Vocabulary: scripts/schema-vocab.json, refreshed
 *             with --update-vocab.
 *   required  per-type fields — Offer: bare-number price, MAD, availability enum,
 *             validThrough, seller; TravelAgency: licence + address + sameAs;
 *             FAQPage: ≥1 Question with an answer; BreadcrumbList: positions 1..n; …
 *   ids       every { "@id": … } reference resolves to a node DEFINED on the same
 *             page (Google does not resolve @id across pages); exactly one
 *             #organization and one #website per page
 *   locale    localized copy in the markup is in the page's language — Arabic
 *             script on /ar and none on /fr and /en; French vs English by
 *             stopwords on longer fields
 *   rating    no aggregateRating on ANY node; no review on Product / Organization
 *   content   every piece of localized copy, every price and every distance in
 *             the markup is also in the rendered page — never markup-only content
 *   expect    the node types each page type must carry are present
 *
 * `--self-test` mutates real pages in memory (one deliberate breakage per
 * check) and proves each is caught with a specific message — run it after
 * editing this file. `--only=/fr/hotel/anjum` restricts to one page;
 * `--inventory` prints the node types found per page type (for EXPECT).
 *
 * Page typing and the build-output loader are shared with the SEO suite
 * (scripts/seo-suite.mjs, which runs this gate as its SCHEMA step):
 * scripts/lib/build-pages.mjs. A new page type is added THERE, then to EXPECT
 * below — scripts/README.md walks through it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
// Page typing + loading + text helpers are shared with scripts/seo-suite.mjs.
import { DIST, LOCALES, loadPages, representative, decode, norm, arabicShare, FR_WORDS, EN_WORDS, count } from './lib/build-pages.mjs';

const t0 = performance.now();
const ARGS = new Set(process.argv.slice(2));
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const VOCAB_URL = new URL('./schema-vocab.json', import.meta.url);

// ── vocabulary ──────────────────────────────────────────────────────────────
// Compact extraction of schema.org's JSON-LD release: type → parents,
// property → domainIncludes, enumeration member → its enumeration(s).
const VOCAB_SOURCES = [
  'https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/29.2/schemaorg-current-https.jsonld',
  'https://schema.org/version/latest/schemaorg-current-https.jsonld',
];
async function updateVocab() {
  let graph = null;
  let source = null;
  const from = flag('from'); // --from=<local schemaorg-current-https.jsonld> (offline)
  if (from) {
    graph = JSON.parse(readFileSync(from, 'utf8'))['@graph'];
    source = path.basename(from);
  }
  for (const url of graph ? [] : VOCAB_SOURCES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      graph = (await res.json())['@graph'];
      source = url;
      break;
    } catch (e) {
      console.error(`  ${url} → ${e.message}`);
    }
  }
  if (!graph) throw new Error('no vocabulary source reachable');
  const id = (x) => String(x?.['@id'] ?? x).replace(/^schema:/, '');
  const arr = (x) => (x == null ? [] : [].concat(x));
  const types = {};
  const props = {};
  const enums = {};
  for (const n of graph) {
    const t = arr(n['@type']).map(id);
    const name = id(n);
    if (t.includes('rdfs:Class')) types[name] = arr(n['rdfs:subClassOf']).map(id).filter((p) => !p.includes(':'));
    else if (t.includes('rdf:Property')) props[name] = arr(n['schema:domainIncludes']).map(id);
    else if (t.length && !name.includes(':')) enums[name] = t; // e.g. InStock → [ItemAvailability]
  }
  const out = { source, generated: new Date().toISOString().slice(0, 10), types, props, enums };
  writeFileSync(VOCAB_URL, JSON.stringify(out));
  console.log(`schema-vocab.json ← ${source}: ${Object.keys(types).length} types, ${Object.keys(props).length} properties, ${Object.keys(enums).length} enumeration members`);
}
if (ARGS.has('--update-vocab')) {
  await updateVocab();
  process.exit(0);
}
if (!existsSync(VOCAB_URL)) {
  console.error('scripts/schema-vocab.json is missing — run: node scripts/schema-audit.mjs --update-vocab');
  process.exit(2);
}
const VOCAB = JSON.parse(readFileSync(VOCAB_URL, 'utf8'));
const ancestorsMemo = new Map();
function ancestors(type) {
  if (ancestorsMemo.has(type)) return ancestorsMemo.get(type);
  const out = new Set([type]);
  for (const p of VOCAB.types[type] ?? []) for (const a of ancestors(p)) out.add(a);
  ancestorsMemo.set(type, out);
  return out;
}

// ── page typing ─────────────────────────────────────────────────────────────
// STATIC / DYNAMIC / pageType() live in scripts/lib/build-pages.mjs (shared).
// Node types every page of a type MUST carry (unconditional ones only — an
// ItemList that depends on published rows is not listed). '*' is every page.
// Data-dependent page types (no row published ⇒ not prerendered) are optional.
const EXPECT = {
  '*': ['TravelAgency', 'WebSite'],
  home: ['WebPage', 'FAQPage'],
  'bab-makka': ['WebPage'],
  'omra-pas-cher': ['WebPage', 'BreadcrumbList'],
  'hotels-omra': ['WebPage', 'ItemList', 'BreadcrumbList'],
  agence: ['WebPage', 'FAQPage'],
  contact: ['WebPage'],
  team: ['WebPage', 'BreadcrumbList'],
  presse: ['WebPage', 'BreadcrumbList'],
  barometre: ['WebPage', 'BreadcrumbList'],
  glossaire: ['WebPage', 'BreadcrumbList'],
  guide: ['WebPage', 'BreadcrumbList'],
  'guide-child': ['WebPage', 'BreadcrumbList'],
  month: ['WebPage', 'BreadcrumbList'],
  city: ['WebPage', 'BreadcrumbList'],
  occasion: ['WebPage', 'BreadcrumbList'],
  // WebPage is required so the speakable block cannot silently disappear:
  // until 2026-09-24 the departure pages carried no WebPage and therefore no
  // speakable, which made the priced pages the only ones an answer engine
  // could not read a marked answer from.
  offer: ['Product', 'TouristTrip', 'BreadcrumbList', 'WebPage'],
  article: ['BlogPosting', 'BreadcrumbList'],
  hotel: ['Hotel', 'BreadcrumbList'],
  voyage: ['TouristTrip', 'BreadcrumbList'],
  hajj: [], voyages: [], 'blog-index': [], avis: [], agrement: [], 'a-propos': [], legal: [], landing: [],
};
const OPTIONAL_TYPES = new Set(['landing', 'voyage', 'legal']); // legal: 404 until its admin row is filled

// ── helpers ─────────────────────────────────────────────────────────────────
const typesOf = (n) => [].concat(n?.['@type'] ?? []);
const isRef = (n) => n && typeof n === 'object' && !('@type' in n) && '@id' in n;
const has = (t, list) => typesOf(t).some((x) => list.includes(x));
function* walk(value, trail = '') {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* walk(value[i], `${trail}[${i}]`);
    return;
  }
  if (value && typeof value === 'object') {
    if ('@type' in value || '@id' in value) yield { node: value, trail };
    for (const [k, v] of Object.entries(value)) if (!k.startsWith('@')) yield* walk(v, trail ? `${trail}.${k}` : k);
  }
}
const label = (node, trail) => `${typesOf(node).join('+') || '@id-ref'}${trail ? ` @ ${trail}` : ''}`;
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

// Localized copy per type: [property, checkedForContent]. Labels that only
// exist in the markup (PropertyValue.name) are locale-checked but not
// content-checked; their values are. Proper nouns (hotel/brand/person names,
// addresses, airlines) are neither. Review text is mixed FR/AR/Darija by
// design (hard constraint 7) — content-checked, never language-checked.
const LOCALIZED = {
  WebPage: [['name', true], ['description', true]],
  Question: [['name', true]],
  Answer: [['text', true]],
  ItemList: [['name', true]],
  Product: [['name', true], ['description', true]],
  TouristTrip: [['name', true], ['description', true]],
  Hotel: [['description', true]],
  Person: [['jobTitle', true], ['description', true]], // role + bio, in the page's language and on the page
  PropertyValue: [['name', false]],
  LocationFeatureSpecification: [['name', false]], // the fact is the numeric value, checked below
  VideoObject: [['name', true], ['description', false]],
  BlogPosting: [['headline', true], ['description', true]],
  Article: [['headline', true], ['description', true]],
  DefinedTermSet: [['name', true]],
  DefinedTerm: [['name', true], ['description', true]],
  Dataset: [['name', true], ['description', true]],
  TravelAgency: [['description', false]],
};
// Content-checked but never language-checked: review text (mixed by design),
// people's names, and list items — breadcrumb and list names are mostly proper
// nouns ("Bab Makka", "Abraj Al Kiswah") that stay Latin on /ar. The FIRST
// breadcrumb is always the dictionary's "home" label, so that one IS checked.
const CONTENT_ONLY = { Review: ['reviewBody'], Person: ['name'], ListItem: ['name'] };
// LAW §10: placeholder copy never ships. A stub author profile, an unfilled
// [CONTENT NEEDED] block or an untranslated field reaching a page fails the build.
const PLACEHOLDER_MARKERS = ['[à compléter]', '[placeholder]', '[content needed]', '[translation needed]'];
const LAYOUT_IDS = /#(organization|website|brand)$/; // sitewide nodes from the layout — not page content

// ── checks ──────────────────────────────────────────────────────────────────
// Each check pushes { check, msg } into `out` for one page.
function runChecks(page) {
  const out = [];
  const F = (check, msg) => out.push({ check, msg });

  // json
  const blocks = [];
  page.scripts.forEach((raw, i) => {
    try {
      const b = JSON.parse(raw);
      if (b['@context'] !== 'https://schema.org') F('json', `block ${i + 1}: @context is ${JSON.stringify(b['@context'])}, expected "https://schema.org"`);
      blocks.push(...[].concat(b['@graph'] ?? b));
    } catch (e) {
      F('json', `block ${i + 1} is not valid JSON: ${e.message}`);
    }
  });
  if (!page.scripts.length) F('json', 'no application/ld+json block on the page');
  const nodes = [...walk(blocks)];

  // types
  for (const { node, trail } of nodes) {
    if (isRef(node)) continue;
    const types = typesOf(node);
    const closure = new Set();
    for (const t of types) {
      if (!VOCAB.types[t]) F('types', `unknown @type "${t}" at ${trail || 'top level'} — not a schema.org type`);
      else for (const a of ancestors(t)) closure.add(a);
    }
    if (!closure.size) continue;
    for (const key of Object.keys(node)) {
      if (key.startsWith('@')) continue;
      const domains = VOCAB.props[key];
      if (!domains) F('types', `unknown property "${key}" on ${label(node, trail)} — not in the schema.org vocabulary`);
      else if (domains.length && !domains.some((d) => closure.has(d)))
        F('types', `"${key}" is not a property of ${types.join('+')} (${trail || 'top level'}) — schema.org defines it on ${domains.slice(0, 3).join(', ')}${domains.length > 3 ? ', …' : ''}`);
    }
  }

  // required
  const REQ = {
    TravelAgency: (n) => [
      n.name ? null : 'name missing',
      n.url ? null : 'url missing',
      n.address?.streetAddress && n.address?.addressLocality && n.address?.addressCountry ? null : 'address needs streetAddress + addressLocality + addressCountry',
      [].concat(n.telephone ?? []).length ? null : 'telephone missing',
      Array.isArray(n.sameAs) && n.sameAs.length ? null : 'sameAs missing or empty',
      typeof n.hasCredential?.identifier === 'string' && n.hasCredential.identifier.trim() ? null : 'hasCredential.identifier (the licence) missing',
      n.identifier === n.hasCredential?.identifier ? null : 'identifier must equal hasCredential.identifier (one licence number)',
    ],
    WebSite: (n) => [n.url ? null : 'url missing', n.name ? null : 'name missing'],
    WebPage: (n) => [n.url ? null : 'url missing', n.name ? null : 'name missing', n.isPartOf?.['@id'] ? null : 'isPartOf → #website missing'],
    Offer: (n) => offerChecks(n, 'price'),
    AggregateOffer: (n) => [...offerChecks(n, 'lowPrice'), n.highPrice == null || isNumber(n.highPrice) ? null : `highPrice must be a bare number (got ${JSON.stringify(n.highPrice)})`],
    Product: (n) => [n.name ? null : 'name missing', n.offers ? null : 'offers missing — Google requires offers, review or aggregateRating, and ratings are forbidden here'],
    FAQPage: (n) => {
      const q = Array.isArray(n.mainEntity) ? n.mainEntity : [];
      return [
        q.length ? null : 'mainEntity is empty — a FAQPage needs at least one Question',
        ...q.map((x, i) => (has(x, ['Question']) && x.name && x.acceptedAnswer?.text ? null : `mainEntity[${i}] needs @type Question, name and acceptedAnswer.text`)),
      ];
    },
    BreadcrumbList: (n) => listChecks(n, true),
    ItemList: (n) => listChecks(n, false),
    Hotel: (n) => [n['@id'] ? null : '@id missing', n.name ? null : 'name missing', ['Makkah', 'Madinah'].includes(n.address?.addressLocality) ? null : `address.addressLocality must be Makkah or Madinah (got ${JSON.stringify(n.address?.addressLocality)})`],
    // A standalone trip (unpriced voyage) needs a name and its URL; a trip
    // listed on a hotel page must also point back at that hotel (itinerary).
    TouristTrip: (n, trail) => (has(n, ['Product']) ? [] : [n.name ? null : 'name missing', n.url ? null : 'url missing', !/itemListElement/.test(trail) || n.itinerary ? null : 'itinerary (→ the hotel @id) missing']),
    // author: a named Person/Organization node, or an @id reference (the ids
    // check proves it is defined on the page — e.g. #organization for the
    // articles signed with the agency's name).
    BlogPosting: (n) => [n.headline ? null : 'headline missing', n.author?.name || n.author?.['@id'] ? null : 'author missing (a named node or an @id reference)', n.datePublished ? null : 'datePublished missing', n.dateModified ? null : 'dateModified missing'],
    Article: (n) => [n.headline ? null : 'headline missing', n.author?.name || n.author?.['@id'] ? null : 'author missing (a named node or an @id reference)'],
    Review: (n) => [isNumber(n.reviewRating?.ratingValue) ? null : 'reviewRating.ratingValue missing', n.author?.name ? null : 'author.name missing'],
    Person: (n) => [n.name ? null : 'name missing'],
    VideoObject: (n) => [n.name ? null : 'name missing', n.thumbnailUrl ? null : 'thumbnailUrl missing', n.uploadDate ? null : 'uploadDate missing', n.contentUrl || n.embedUrl ? null : 'contentUrl or embedUrl missing'],
    Dataset: (n) => [n.name ? null : 'name missing', n.description ? null : 'description missing'],
    DefinedTerm: (n) => [n.name ? null : 'name missing', n.description ? null : 'description missing'],
    PropertyValue: (n) => [n.name ? null : 'name missing', n.value != null || n.minValue != null ? null : 'value (or minValue/maxValue) missing'],
    LocationFeatureSpecification: (n) => [n.name ? null : 'name missing', n.value != null ? null : 'value missing'],
    PostalAddress: (n) => [n.addressLocality ? null : 'addressLocality missing', n.addressCountry ? null : 'addressCountry missing'],
    Brand: (n) => [n.name ? null : 'name missing', n['@id'] ? null : '@id missing'],
  };
  function offerChecks(n, priceKey) {
    const avail = String(n.availability ?? '');
    const member = avail.replace('https://schema.org/', '');
    return [
      isNumber(n[priceKey]) ? null : `${priceKey} must be a bare number, no separator (got ${JSON.stringify(n[priceKey])})`,
      n.priceCurrency === 'MAD' ? null : `priceCurrency must be "MAD" (got ${JSON.stringify(n.priceCurrency)})`,
      avail.startsWith('https://schema.org/') && (VOCAB.enums[member] ?? []).includes('ItemAvailability') ? null : `availability must be a full https://schema.org/ ItemAvailability URL (got ${JSON.stringify(n.availability)})`,
      /^\d{4}-\d{2}-\d{2}/.test(String(n.validThrough ?? '')) ? null : `validThrough missing or not an ISO date (got ${JSON.stringify(n.validThrough)})`,
      n.seller?.['@id'] ? null : 'seller → @id missing',
    ];
  }
  function listChecks(n, breadcrumb) {
    const items = Array.isArray(n.itemListElement) ? n.itemListElement : [];
    const out = [items.length ? null : 'itemListElement is empty'];
    items.forEach((li, i) => {
      if (!has(li, ['ListItem'])) out.push(`itemListElement[${i}] is not a ListItem`);
      if (li.position !== i + 1) out.push(`itemListElement[${i}].position is ${JSON.stringify(li.position)}, expected ${i + 1} (positions must be 1..n in order)`);
      if (breadcrumb) {
        if (!li.name) out.push(`itemListElement[${i}].name missing`);
        if (i < items.length - 1 && !li.item) out.push(`itemListElement[${i}].item (URL) missing — every crumb but the last needs one`);
      } else if (!li.item && !li.url) out.push(`itemListElement[${i}] needs item or url`);
    });
    return out;
  }
  for (const { node, trail } of nodes) {
    if (isRef(node)) continue;
    for (const t of typesOf(node)) {
      for (const msg of (REQ[t]?.(node, trail) ?? []).filter(Boolean)) F('required', `${t}${trail ? ` @ ${trail}` : ''}: ${msg}`);
    }
  }

  // ids
  const defined = new Map();
  for (const { node } of nodes) if (!isRef(node) && node['@id']) defined.set(node['@id'], (defined.get(node['@id']) ?? 0) + 1);
  for (const { node, trail } of nodes) {
    if (isRef(node) && !defined.has(node['@id'])) F('ids', `@id "${node['@id']}" is referenced at ${trail} but no node on this page defines it`);
  }
  for (const frag of ['#organization', '#website']) {
    const n = [...defined.keys()].filter((id) => id.endsWith(`/${frag}`)).reduce((s, id) => s + defined.get(id), 0);
    if (n !== 1) F('ids', `expected exactly one ${frag} node on the page, found ${n}`);
  }

  // locale
  const localized = [];
  for (const { node, trail } of nodes) {
    if (isRef(node)) continue;
    for (const t of typesOf(node)) {
      for (const [prop] of LOCALIZED[t] ?? []) localized.push([t, prop, node[prop], trail]);
      if (t === 'BreadcrumbList' && node.itemListElement?.[0]?.name) localized.push(['BreadcrumbList', 'itemListElement[0].name', node.itemListElement[0].name, trail]);
    }
  }
  for (const [t, prop, v, trail] of localized) {
    if (typeof v !== 'string' || v.trim().length < 3) continue;
    const where = `${t}.${prop}${trail ? ` @ ${trail}` : ''}`;
    const snippet = JSON.stringify(v.slice(0, 60));
    const share = arabicShare(v);
    if (page.locale === 'ar') {
      if (share === 0) F('locale', `${where} carries no Arabic script on an Arabic page: ${snippet}`);
      else if (share < 0.35) F('locale', `${where} is mostly Latin on an Arabic page (${Math.round(share * 100)}% Arabic letters): ${snippet}`);
    } else if (share > 0.35) {
      F('locale', `${where} is mostly Arabic on a ${page.locale} page (${Math.round(share * 100)}% Arabic letters): ${snippet}`);
    } else if (v.split(/\s+/).length >= 8) {
      const fr = count(v, FR_WORDS);
      const en = count(v, EN_WORDS);
      if (page.locale === 'fr' && en >= 3 && en > fr * 2) F('locale', `${where} reads as English on a French page (${en} EN vs ${fr} FR stopwords): ${snippet}`);
      if (page.locale === 'en' && fr >= 3 && fr > en * 2) F('locale', `${where} reads as French on an English page (${fr} FR vs ${en} EN stopwords): ${snippet}`);
    }
  }

  // rating
  for (const { node, trail } of nodes) {
    if (isRef(node)) continue;
    if ('aggregateRating' in node) F('rating', `aggregateRating on ${label(node, trail)} — never on any node (hard constraint 6 / manual-action risk)`);
    if ('review' in node && has(node, ['Product', 'TouristTrip', 'Organization', 'LocalBusiness', 'TravelAgency']))
      F('rating', `review on ${label(node, trail)} — reviews never attach to Product or the business entity`);
  }

  // content — the rendered page must carry what the markup says
  if (page.html) {
    const text = norm(page.html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
    const meta = norm([...page.html.matchAll(/<meta[^>]+content="([^"]*)"/g)].map((m) => m[1]).join(' | '));
    const digits = text.replace(/(\d)[\s.,  ](?=\d)/g, '$1');
    for (const marker of PLACEHOLDER_MARKERS) {
      if (text.includes(marker)) F('placeholder', `placeholder text "${marker}" reached the page — a stub profile or unfilled copy is live`);
    }
    const needText = (t, prop, v, trail) => {
      const needle = norm(v).slice(0, 80);
      if (needle.length < 3) return;
      const ok = text.includes(needle) || (prop === 'description' && meta.includes(needle));
      if (!ok) F('content', `${t}.${prop}${trail ? ` @ ${trail}` : ''} is in the markup but not in the rendered page: ${JSON.stringify(v.slice(0, 60))}`);
    };
    const needNumber = (t, prop, v, trail) => {
      if (!digits.includes(String(v))) F('content', `${t}.${prop}${trail ? ` @ ${trail}` : ''} = ${v} is in the markup but not in the rendered page`);
    };
    for (const block of blocks) {
      if (LAYOUT_IDS.test(String(block['@id'] ?? ''))) continue; // layout nodes: same on every page
      for (const { node, trail } of walk(block)) {
        if (isRef(node)) continue;
        for (const t of typesOf(node)) {
          for (const [prop, checked] of LOCALIZED[t] ?? []) if (checked && typeof node[prop] === 'string') needText(t, prop, node[prop], trail);
          for (const prop of CONTENT_ONLY[t] ?? []) if (typeof node[prop] === 'string') needText(t, prop, node[prop], trail);
          if (t === 'Offer' && isNumber(node.price)) needNumber(t, 'price', node.price, trail);
          if (t === 'AggregateOffer') for (const k of ['lowPrice', 'highPrice']) if (isNumber(node[k])) needNumber(t, k, node[k], trail);
          if (t === 'PropertyValue' || t === 'LocationFeatureSpecification') {
            for (const k of ['value', 'minValue', 'maxValue']) {
              if (isNumber(node[k])) needNumber(t, k, node[k], trail);
              else if (typeof node[k] === 'string') for (const part of node[k].split(', ')) needText(t, k, part, trail);
            }
          }
        }
      }
    }
  }

  // expect
  const present = new Set(nodes.filter(({ node }) => !isRef(node)).flatMap(({ node }) => typesOf(node)));
  for (const t of [...EXPECT['*'], ...(EXPECT[page.type] ?? [])]) if (!present.has(t)) F('expect', `${page.type} page must carry a ${t} node — none found`);

  return out;
}

// ── self-test: one deliberate breakage per check, proven caught ─────────────
function selfTest(pages) {
  const pick = (type, locale = 'fr') => pages.find((p) => p.type === type && p.locale === locale);
  const edit = (p, fn) => ({ ...p, scripts: p.scripts.map(fn) });
  const first = (p, re) => p.scripts.findIndex((s) => re.test(s));
  const inBlock = (p, re, fn) => { const i = first(p, re); return { ...p, scripts: p.scripts.map((s, j) => (j === i ? fn(s) : s)) }; };
  const MUTATIONS = [
    ['json', 'truncated block', (p) => inBlock(p, /"Product"/, (s) => s.slice(0, -1)), 'not valid JSON'],
    ['json', 'wrong @context', (p) => inBlock(p, /"Product"/, (s) => s.replace('"@context":"https://schema.org"', '"@context":"http://schema.org"')), '@context is "http://schema.org"'],
    ['types', 'misspelt @type', (p) => inBlock(p, /"@type":"Hotel"/, (s) => s.replace('"@type":"Hotel"', '"@type":"Hotell"')), 'unknown @type "Hotell"', 'hotel'],
    ['types', 'invented property', (p) => inBlock(p, /"Product"/, (s) => s.replace('"name":', '"nam":')), 'unknown property "nam"'],
    ['types', 'property outside its domain', (p) => inBlock(p, /"Product"/, (s) => s.replace('"brand":', '"starRating":{"@type":"Rating","ratingValue":5},"brand":')), '"starRating" is not a property of Product+TouristTrip'],
    ['required', 'priceCurrency removed', (p) => inBlock(p, /"Product"/, (s) => s.replace('"priceCurrency":"MAD",', '')), 'priceCurrency must be "MAD"'],
    ['required', 'price with a thousands separator', (p) => inBlock(p, /"Product"/, (s) => s.replace(/"lowPrice":(\d+)/, (_, n) => `"lowPrice":"${n.slice(0, -3)} ${n.slice(-3)}"`)), 'lowPrice must be a bare number'],
    ['required', 'availability not a schema.org URL', (p) => inBlock(p, /"Product"/, (s) => s.replace('"availability":"https://schema.org/', '"availability":"')), 'availability must be a full https://schema.org/ ItemAvailability URL'],
    ['required', 'validThrough removed', (p) => inBlock(p, /"Product"/, (s) => s.replace(/"validThrough":"[^"]+",/, '')), 'validThrough missing'],
    ['required', 'FAQPage emptied', (p) => inBlock(p, /"FAQPage"/, (s) => s.replace(/"mainEntity":\[.*\]/, '"mainEntity":[]')), 'mainEntity is empty', 'home'],
    ['required', 'breadcrumb positions out of order', (p) => inBlock(p, /"BreadcrumbList"/, (s) => s.replace('"position":2', '"position":3')), 'position is 3, expected 2', 'city'],
    ['required', 'licence removed from the organization', (p) => inBlock(p, /"TravelAgency"/, (s) => s.replace(/"hasCredential":\{.*?"recognizedBy":\{[^}]*\}\},?/, '')), 'hasCredential.identifier (the licence) missing'],
    ['required', 'sameAs emptied', (p) => inBlock(p, /"TravelAgency"/, (s) => s.replace(/"sameAs":\[[^\]]*\]/g, '"sameAs":[]')), 'sameAs missing or empty'], // /g: the nested Brand has one too
    ['ids', 'seller points at an undefined @id', (p) => inBlock(p, /"Product"/, (s) => s.replace('"seller":{"@id":"', '"seller":{"@id":"https://nowhere.example/')), 'no node on this page defines it'],
    ['ids', 'WebSite node removed', (p) => ({ ...p, scripts: p.scripts.filter((s) => !/"@type":"WebSite"/.test(s)) }), 'expected exactly one #website node on the page, found 0'],
    ['locale', 'French copy on the Arabic page', (p) => inBlock(p, /"WebPage"/, (s) => s.replace(/"description":"[^"]*"/, '"description":"Omra depuis le Maroc avec une agence agréée à Casablanca"')), 'carries no Arabic script on an Arabic page', 'city', 'ar'],
    ['locale', 'French copy on the English page', (p) => inBlock(p, /"WebPage"/, (s) => s.replace(/"description":"[^"]*"/, '"description":"Une Omra depuis le Maroc avec une agence agréée à Casablanca, des hôtels proches du Haram et des prix réels pour votre départ"')), 'reads as French on an English page', 'city', 'en'],
    ['rating', 'aggregateRating injected on Product', (p) => inBlock(p, /"Product"/, (s) => s.replace('"brand":', '"aggregateRating":{"@type":"AggregateRating","ratingValue":4.8,"reviewCount":139},"brand":')), 'aggregateRating on Product+TouristTrip'],
    // The visible FAQ is the <details> list; drop it and keep the FAQPage markup.
    ['content', 'visible FAQ removed from the page but kept in the markup', (p) => ({ ...p, html: p.html.replace(/<details[\s\S]*?<\/details>/g, '') }), 'Answer.text', 'home'],
    ['content', 'schema price changed away from the visible price', (p) => inBlock(p, /"Product"/, (s) => s.replace(/"lowPrice":(\d+)/, (_, n) => `"lowPrice":${Number(n) + 1}`)), 'is in the markup but not in the rendered page'],
    ['expect', 'Product node removed from a departure page', (p) => ({ ...p, scripts: p.scripts.filter((s) => !/"Product"/.test(s)) }), 'offer page must carry a Product node'],
    ['placeholder', 'a stub author profile reaches the page', (p) => ({ ...p, html: p.html.replace('<h1', '<p>[À COMPLÉTER] bio</p><h1') }), 'placeholder text "[à compléter]" reached the page', 'home'],
  ];
  let undetected = 0;
  console.log(`\nself-test — ${MUTATIONS.length} deliberate breakages, each must produce its specific failure\n`);
  for (const [check, title, mutate, expected, type = 'offer', locale = 'fr'] of MUTATIONS) {
    const page = pick(type, locale);
    if (!page) { console.log(`  – ${check.padEnd(8)} ${title}: no ${type}/${locale} page in this build, skipped`); continue; }
    const mutated = mutate(page);
    const baseline = new Set(runChecks(page).map((f) => `${f.check}|${f.msg}`));
    const fresh = runChecks(mutated).filter((f) => !baseline.has(`${f.check}|${f.msg}`));
    const hit = fresh.find((f) => f.check === check && f.msg.includes(expected));
    if (hit) console.log(`  ✓ ${check.padEnd(8)} ${title}\n      → ${page.route}: ${hit.msg}`);
    else {
      undetected++;
      console.log(`  ✗ ${check.padEnd(8)} ${title}: NOT DETECTED (expected "${expected}"; got ${fresh.length ? fresh.map((f) => `${f.check}: ${f.msg}`).join(' | ') : 'nothing new'})`);
    }
  }
  console.log(`\n${MUTATIONS.length - undetected}/${MUTATIONS.length} breakages caught`);
  return undetected === 0;
}

// ── main ────────────────────────────────────────────────────────────────────
const loaded = loadPages();
const skipped = loaded.filter((p) => p.status !== 200);
const all = loaded.filter((p) => p.status === 200);
const only = flag('only');
let pages = ARGS.has('--all') || process.env.SCHEMA_AUDIT_ALL === '1' ? all : representative(all);
if (only) pages = all.filter((p) => p.route === only);
const types = new Set(all.map((p) => p.type));

if (ARGS.has('--inventory')) {
  for (const type of [...types].sort()) {
    const byLocale = LOCALES.map((l) => { const p = representative(all).find((x) => x.type === type && x.locale === l); return p ? new Set([...walk(p.scripts.map((s) => JSON.parse(s)))].filter(({ node }) => !isRef(node)).flatMap(({ node }) => typesOf(node))) : null; });
    const common = byLocale.filter(Boolean).reduce((a, b) => new Set([...a].filter((x) => b.has(x))));
    console.log(`${String(type).padEnd(14)} ${[...common].sort().join(', ')}`);
  }
  process.exit(0);
}

if (ARGS.has('--self-test')) {
  process.exit(selfTest(pages) ? 0 : 1);
}

console.log(`schema-audit → ${DIST} (${pages.length} pages: ${types.size} page types × ${LOCALES.length} locales${only ? `, --only ${only}` : ARGS.has('--all') ? ', --all' : ''})`);
if (skipped.length) console.log(`  skipped ${skipped.length} prerendered 404s (no row yet): ${skipped.map((p) => p.route).join(', ')}`);
console.log('');
const failures = [];
let passed = 0;
for (const page of pages) {
  if (page.type == null) { failures.push({ page, check: 'expect', msg: 'unclassified route — add it to STATIC/DYNAMIC in scripts/lib/build-pages.mjs so its page type is covered (scripts/README.md)' }); continue; }
  if (!page.html) { failures.push({ page, check: 'json', msg: 'prerendered HTML missing' }); continue; }
  const f = runChecks(page);
  if (f.length) failures.push(...f.map((x) => ({ page, ...x })));
  else passed++;
  console.log(`  ${f.length ? '✗' : '✓'} ${page.route.padEnd(52)} ${String(page.type).padEnd(14)}${f.length ? ` ${f.length} failure${f.length > 1 ? 's' : ''}` : ''}`);
}
// coverage: every page type in every locale (data-dependent types excepted; not with --only)
for (const type of only ? [] : Object.keys(EXPECT).filter((t) => t !== '*' && !OPTIONAL_TYPES.has(t))) {
  for (const l of LOCALES) if (!all.some((p) => p.type === type && p.locale === l)) failures.push({ page: { route: `${l}/(${type})` }, check: 'expect', msg: `no prerendered ${type} page for locale ${l}` });
}
if (failures.length) {
  console.log(`\nFAILURES (${failures.length})`);
  for (const f of failures) console.log(`  ✗ ${f.page.route} · ${f.check} · ${f.msg}`);
}
const secs = ((performance.now() - t0) / 1000).toFixed(1);
console.log(`\n${pages.length} pages · ${passed} pass · ${pages.length - passed} fail · ${failures.length} failure${failures.length === 1 ? '' : 's'} · ${secs}s`);
process.exit(failures.length ? 1 : 0);
