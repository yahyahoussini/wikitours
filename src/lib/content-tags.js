/**
 * Placeholder tags in article bodies — the RENDER-LIVE half of the content
 * architecture (generate-ahead, render-live, publish-by-time).
 *
 * Prose is markdown written ahead of time. Every VOLATILE fact — prices,
 * departures, availability, dates, hotel lists, the deposit policy, review
 * quotes, Hijri countdowns, calls to action — is never written into the prose;
 * the author places a tag and a SERVER component reads Supabase at request
 * time (src/components/content/ArticleBody.jsx maps tag → component).
 *
 * Two spellings of the same thing are accepted:
 *   <CommercialCTA intent="ramadan" />        {{live:cta intent=ramadan}}
 *   <CommercialCTA to="/omra-ramadan" />      {{live:cta to=/omra-ramadan}}
 *   <LiveDepartures filter="ramadan" />       {{live:departures filter=ramadan limit=4}}
 *   <PriceRange filter="month:10" />          {{live:price_range filter=month:10}}
 *   <HotelCard slug="anjum" />                {{live:hotel slug=anjum}}
 *   <HotelList city="makkah" />               {{live:hotels city=makkah}}
 *   <ReviewQuote id="<uuid>" />               {{live:review id=<uuid>}}
 *   <HijriCountdown event="ramadan_1448_start" />  {{live:countdown event=arafah_1448}}
 *   <PolicyFact key="deposit" />              {{live:policy key=passport_validity}}
 *   <DepositPolicy />                         {{live:deposit}}
 *   <HajjBridgeCTA />                         {{live:hajj_bridge}}
 *   <RamadanNightsTable />                    {{live:ramadan_nights}}
 *
 * The parser is deliberately strict and dependency-free: only tags whose name
 * is in TAGS are recognised, attributes are `name="value"` / `name=value`
 * pairs with values restricted to [A-Za-z0-9_.:/-], and everything else in the
 * body stays markdown (rendered HTML-escaped by src/lib/markdown.js). Nothing
 * from the body is ever injected as raw HTML. An unknown {{live:…}} tag renders
 * NOTHING (the renderer logs it); an unknown <Tag /> stays in the text. The
 * gate fails both.
 */

export const TAGS = Object.freeze({
  CommercialCTA: { attrs: ['to', 'intent'], required: [], oneOf: ['to', 'intent'] },
  LiveDepartures: { attrs: ['month', 'occasion', 'filter', 'limit'], required: [] },
  PriceRange: { attrs: ['filter', 'month', 'occasion'], required: [] },
  HotelCard: { attrs: ['slug'], required: ['slug'] },
  HotelList: { attrs: ['city', 'limit'], required: [] },
  ReviewQuote: { attrs: ['id'], required: ['id'] },
  HijriCountdown: { attrs: ['event'], required: ['event'] },
  PolicyFact: { attrs: ['key'], required: ['key'] },
  DepositPolicy: { attrs: [], required: [] },
  HajjBridgeCTA: { attrs: [], required: [] },
  RamadanNightsTable: { attrs: ['year'], required: [] },
});

/** {{live:<alias> …}} → tag name. */
export const LIVE_ALIASES = Object.freeze({
  cta: 'CommercialCTA', departures: 'LiveDepartures', price_range: 'PriceRange', price: 'PriceRange',
  hotel: 'HotelCard', hotels: 'HotelList', review: 'ReviewQuote', countdown: 'HijriCountdown', hijri: 'HijriCountdown',
  policy: 'PolicyFact', deposit: 'DepositPolicy', hajj_bridge: 'HajjBridgeCTA', ramadan_nights: 'RamadanNightsTable',
});

// Lander paths a <CommercialCTA to> may point at (locale-relative). Anything
// else is a broken or off-strategy CTA and fails the gate.
export const CTA_TARGET_RE = /^\/(bab-makka|hajj|omra-pas-cher|omra-5-etoiles|omra-ramadan|omra-[a-z]+|omra-depuis-[a-z]+|agence-omra-casablanca|hotels-omra|hotel\/[a-z0-9-]+)$/;
// Intents the resolver understands (src/lib/content-resolver.js).
export const CTA_INTENT_RE = /^(ramadan|hajj|pas_cher|premium|agency|guide|hotels|next|month:(?:[1-9]|1[0-2])|city:[a-z]+|occasion:[a-z0-9-]+)$/;
export const DEPARTURES_FILTER_RE = /^(ramadan|hajj|next|all|month:(?:[1-9]|1[0-2])|occasion:[a-z0-9-]+)$/;
export const POLICY_KEYS = Object.freeze(['deposit', 'payment', 'passport_validity', 'visa_included', 'children']);

// Run-1 event keys (src/lib/hijri.js HIJRI_EVENT_DEFS) plus the brief's dated
// vocabulary (`ramadan_1448_start`, `ramadan_1448_last10`, `arafah_1448`,
// `eid_al_fitr_1448`, `mawlid_1449` …). parseHijriEventTag is pure and lives
// here so the dependency-free gate can validate a tag without the calendar
// library; hijri.js re-exports it for the components.
export const HIJRI_EVENTS = Object.freeze(['muharram', 'ashura', 'mawlid', 'rajab', 'shaban', 'ramadan', 'ramadan-last10', 'laylat-al-qadr', 'eid-al-fitr', 'dhul-qada', 'dhul-hijja', 'arafat', 'eid-al-adha']);
const HIJRI_TAG_ALIASES = {
  ramadan_start: 'ramadan', ramadan: 'ramadan', ramadan_last10: 'ramadan-last10', ramadan_last_10: 'ramadan-last10',
  laylat_al_qadr: 'laylat-al-qadr', qadr: 'laylat-al-qadr', eid_al_fitr: 'eid-al-fitr', eid_fitr: 'eid-al-fitr',
  arafah: 'arafat', arafat: 'arafat', eid_al_adha: 'eid-al-adha', eid_adha: 'eid-al-adha',
  dhul_hijja: 'dhul-hijja', dhul_hijjah: 'dhul-hijja', dhul_qada: 'dhul-qada', dhul_qadah: 'dhul-qada',
  muharram: 'muharram', ashura: 'ashura', mawlid: 'mawlid', rajab: 'rajab', shaban: 'shaban', chaabane: 'shaban',
};
/** `ramadan` → { key: 'ramadan', hy: null } · `arafah_1448` → { key: 'arafat', hy: 1448 } · unknown → null. */
export function parseHijriEventTag(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (HIJRI_EVENTS.includes(raw)) return { key: raw, hy: null };
  const m = raw.toLowerCase().replace(/-/g, '_').match(/^([a-z_]+?)(?:_(1[45]\d{2}))?(?:_(start|last10|last_10))?$/);
  if (!m) return null;
  const [, name, year, variant] = m;
  const base = variant === 'last10' || variant === 'last_10' ? `${name}_last10` : name;
  const key = HIJRI_TAG_ALIASES[base] ?? HIJRI_TAG_ALIASES[name] ?? null;
  return key ? { key, hy: year ? Number(year) : null } : null;
}

const TAG_RE = /<([A-Z][A-Za-z]+)((?:\s+[a-z][a-z0-9-]*="[^"<>]*")*)\s*\/>|\{\{\s*live:([a-z_]+)((?:\s+[a-z][a-z0-9-]*=(?:"[^"}]*"|[^\s}]+))*)\s*\}\}/g;
const ATTR_RE = /([a-z][a-z0-9-]*)=(?:"([^"}<>]*)"|([^\s}"<>]+))/g;
const VALUE_RE = /^[A-Za-z0-9_.:/-]*$/;

function readAttrs(text) {
  const attrs = {};
  for (const a of String(text ?? '').matchAll(ATTR_RE)) attrs[a[1]] = a[2] ?? a[3] ?? '';
  return attrs;
}

/**
 * Split a body into segments: { type: 'markdown', text } and
 * { type: 'tag', name, attrs, raw }. An unknown <Tag /> is NOT recognised — it
 * stays in the markdown text (and the HTML escaper neutralises it). An unknown
 * {{live:x}} becomes { type: 'unknown', name, raw } so the renderer can drop it
 * and log it (brief: "unknown tag renders nothing + logs").
 */
export function parseContentTags(body) {
  const src = String(body ?? '');
  const out = [];
  let last = 0;
  for (const m of src.matchAll(TAG_RE)) {
    const [raw, xmlName, xmlAttrs, liveName, liveAttrs] = m;
    let name = xmlName ?? null;
    let attrText = xmlAttrs;
    let unknown = false;
    if (liveName) {
      name = LIVE_ALIASES[liveName] ?? null;
      attrText = liveAttrs;
      if (!name) unknown = true;
    } else if (!(name in TAGS)) {
      continue;
    }
    if (m.index > last) out.push({ type: 'markdown', text: src.slice(last, m.index) });
    out.push(unknown ? { type: 'unknown', name: liveName, raw } : { type: 'tag', name, attrs: readAttrs(attrText), raw });
    last = m.index + raw.length;
  }
  if (last < src.length) out.push({ type: 'markdown', text: src.slice(last) });
  return out;
}

/**
 * Every problem with the tags of a body, for the gate: unknown tag, unknown
 * or missing attribute, a value outside the allowed charset, a CTA to a
 * non-lander path or an unknown intent, an unknown Hijri event, a non-UUID
 * review id, an unknown policy key or departures filter. Returns [].
 */
export function validateContentTags(body) {
  const problems = [];
  const src = String(body ?? '');
  const check = (name, attrs, label) => {
    const spec = TAGS[name];
    for (const k of Object.keys(attrs)) {
      if (!spec.attrs.includes(k)) problems.push(`${label} : attribut inconnu « ${k} »`);
      else if (!VALUE_RE.test(attrs[k])) problems.push(`${label} ${k} : valeur non autorisée « ${attrs[k]} »`);
    }
    for (const k of spec.required) if (!attrs[k]) problems.push(`${label} : attribut « ${k} » requis`);
    if (spec.oneOf && !spec.oneOf.some((k) => attrs[k])) problems.push(`${label} : un des attributs « ${spec.oneOf.join(' » / « ')} » est requis`);
    if (name === 'CommercialCTA' && attrs.to && !CTA_TARGET_RE.test(attrs.to)) problems.push(`${label} to="${attrs.to}" : la cible doit être une page commerciale (locale-relative, ex. /omra-ramadan)`);
    if (name === 'CommercialCTA' && attrs.intent && !CTA_INTENT_RE.test(attrs.intent)) problems.push(`${label} intent="${attrs.intent}" : intention inconnue — ramadan, hajj, pas_cher, premium, agency, guide, hotels, next, month:n, city:x, occasion:x`);
    if (name === 'HijriCountdown' && attrs.event && VALUE_RE.test(attrs.event) && !parseHijriEventTag(attrs.event)) problems.push(`${label} event="${attrs.event}" : événement inconnu — ${HIJRI_EVENTS.join(', ')} ou ramadan_1448_start, arafah_1448…`);
    if (name === 'ReviewQuote' && attrs.id && !/^[0-9a-f-]{36}$/i.test(attrs.id)) problems.push(`${label} id="${attrs.id}" : id de témoignage invalide (uuid attendu)`);
    if ((name === 'LiveDepartures' || name === 'PriceRange') && attrs.month && !/^(?:[1-9]|1[0-2])$/.test(attrs.month)) problems.push(`${label} month="${attrs.month}" : mois 1–12 attendu`);
    if ((name === 'LiveDepartures' || name === 'PriceRange') && attrs.filter && !DEPARTURES_FILTER_RE.test(attrs.filter)) problems.push(`${label} filter="${attrs.filter}" : filtre inconnu — ramadan, hajj, next, all, month:n, occasion:x`);
    if (name === 'PolicyFact' && attrs.key && !POLICY_KEYS.includes(attrs.key)) problems.push(`${label} key="${attrs.key}" : clé inconnue — ${POLICY_KEYS.join(', ')}`);
    if (name === 'RamadanNightsTable' && attrs.year && !/^1[45]\d{2}$/.test(attrs.year)) problems.push(`${label} year="${attrs.year}" : année hégirienne attendue (ex. 1448)`);
  };
  for (const m of src.matchAll(/<([A-Z][A-Za-z]+)\b[^<>]*\/?>/g)) {
    const name = m[1];
    if (!(name in TAGS)) { problems.push(`balise inconnue <${name}> — balises autorisées : ${Object.keys(TAGS).join(', ')}`); continue; }
    if (!/\/>$/.test(m[0])) { problems.push(`<${name}> doit être auto-fermante (« /> »)`); continue; }
    check(name, readAttrs(m[0]), `<${name}>`);
  }
  for (const m of src.matchAll(/\{\{\s*live:([a-z_]+)([^}]*)\}\}/g)) {
    const name = LIVE_ALIASES[m[1]];
    if (!name) { problems.push(`balise inconnue {{live:${m[1]}}} — alias autorisés : ${Object.keys(LIVE_ALIASES).join(', ')}`); continue; }
    check(name, readAttrs(m[2]), `{{live:${m[1]}}}`);
  }
  return problems;
}

/** The tag segments of a body (both spellings), for the gate's structural rules. */
export function contentTagsOf(body) {
  return parseContentTags(body).filter((s) => s.type === 'tag');
}

/** The body with every tag removed — what the prose checks (words, language, facts) should see. */
export function stripContentTags(body) {
  return parseContentTags(body).filter((s) => s.type === 'markdown').map((s) => s.text).join('');
}

/** The Hijri events a body's countdowns show (both spellings), parsed: [{ key, hy }]. */
export function hijriEventsOf(body) {
  return contentTagsOf(body).filter((t) => t.name === 'HijriCountdown').map((t) => parseHijriEventTag(t.attrs.event)).filter(Boolean);
}

// ── {year:<tag>} — the one year a title may carry (owner decision 2026-10-28) ──
// A year written in clear in a title goes stale on 1 January, so the gate
// fails it (G5) and the build fails a past one. But « ramadan 2027 maroc » is
// the largest seasonal query family, and a post pinned to a dated Hijri event
// could not say its year. `{year:ramadan_1448_start}` in a title, seo_title,
// excerpt or seo_description renders as the Gregorian year of that event —
// the date <HijriCountdown event="ramadan_1448_start" /> shows — while that
// year has not passed in Africa/Casablanca, and disappears after
// (resolveYearTokens, src/lib/title-tokens.js). Never in a body: the body has
// the countdown. Parsing and validation live here, beside parseHijriEventTag,
// so the dependency-free gate can strip and check a token without the calendar.

/** The fields (× _fr / _ar / _en) that may carry a year token. */
export const YEAR_TOKEN_FIELDS = Object.freeze(['title', 'seo_title', 'excerpt', 'seo_description']);
/** A well-formed token; group 1 is the Hijri event tag. Global: use it with matchAll / replace, never .test(). */
export const YEAR_TOKEN_RE = /\{year:([A-Za-z0-9_-]+)\}/g;
/** What a valid token renders as, for every length rule: a four-digit year. */
export const YEAR_TOKEN_WIDTH = 4;
// Anything that LOOKS like a token, so a typo never reaches a page raw:
// doubled braces, spaces, capitals, `years`, a brace missing on either side,
// braces the wrong way round — what an editor types in a right-to-left field,
// where « { » is drawn as « } » — and the full-width ｛ ｝ ： of an Arabic or
// Asian keyboard. `year:` counts only when a brace touches it, so prose such
// as « this year: dates » is never cut; a brace that opens the NEXT token is
// never taken as this one's closing brace.
const BRACE = '[{}\\uFF5B\\uFF5D]';
const NOT_BRACE = '[^{}\\uFF5B\\uFF5D\\n]';
const TAG_CHAR = '[^{}\\uFF5B\\uFF5D\\s]';
const KEY = 'years?[^\\S\\n]*[:\\uFF1A]';
const CLOSE = `(?:${BRACE}(?![^\\S\\n]*${KEY}))+`;
const YEAR_TOKEN_ANY_SRC = [
  `${BRACE}+[^\\S\\n]*${KEY}${NOT_BRACE}{0,60}${CLOSE}`, // {year:x} · }year:x{ · ｛year:x｝ · {{ year : x }}
  `${BRACE}+[^\\S\\n]*${KEY}${TAG_CHAR}*`, // {year:x — no closing brace: up to the next space
  `(?<![\\p{L}\\p{N}_])${KEY}[^\\S\\n]*${TAG_CHAR}+[^\\S\\n]*${CLOSE}`, // year:x} · year:x{ — no opening brace
].join('|');
const YEAR_TOKEN_ANY_RE = new RegExp(YEAR_TOKEN_ANY_SRC, 'giu');
const YEAR_TOKEN_ANY_ONE_RE = new RegExp(YEAR_TOKEN_ANY_SRC, 'iu'); // stateless, for .test()
const YEAR_TOKEN_EXACT_RE = /^\{year:([A-Za-z0-9_-]+)\}$/;
// Removing a token must not leave a space the author never typed before these
// (or at the end of a line), nor after these (or at the start of one).
const AFTER_NO_SPACE_RE = /^(?:$|\r?\n|[,.;:!?…)\]»”’"'،؛؟%])/;
const BEFORE_NO_SPACE_RE = /(?:^|\n|[([«“‘])$/;
const BRACKET_PAIRS = { '(': ')', '[': ']' };

/** True when a text contains something that looks like a year token. The plain « year » search first: the readers run this over every body. */
export function hasYearToken(text) {
  return typeof text === 'string' && /year/i.test(text) && YEAR_TOKEN_ANY_ONE_RE.test(text);
}

/**
 * Every year token of a text, in order: [{ raw, index, tag, kind }], kind
 * `valid` (a tag parseHijriEventTag knows), `unknown` (well-formed, unknown
 * tag) or `malformed`.
 */
export function yearTokensOf(text) {
  if (!hasYearToken(text)) return [];
  const out = [];
  for (const m of text.matchAll(YEAR_TOKEN_ANY_RE)) {
    const exact = m[0].match(YEAR_TOKEN_EXACT_RE);
    out.push({ raw: m[0], index: m.index, tag: exact ? exact[1] : null, kind: !exact ? 'malformed' : parseHijriEventTag(exact[1]) ? 'valid' : 'unknown' });
  }
  return out;
}

/**
 * Replace each token by `replacer(token)`; a null / empty result REMOVES it
 * and tidies the text around it: the space before it goes when it was
 * followed by another space or by punctuation (« Ramadan {year:x}, dates » →
 * « Ramadan, dates »), a pair of brackets it was alone in goes with it, runs
 * of spaces collapse and the ends are trimmed. A text without a token comes
 * back untouched; a non-string comes back as it is. `keepLayout` (markdown):
 * only the token and the one space beside it go — no bracket, no collapse, no
 * trim, so indentation and line breaks stay byte for byte.
 */
export function replaceYearTokens(text, replacer, { keepLayout = false } = {}) {
  const tokens = yearTokensOf(text);
  if (!tokens.length) return text;
  let out = '';
  let last = 0;
  let removed = false;
  for (const tok of tokens) {
    out += text.slice(last, tok.index);
    let end = tok.index + tok.raw.length;
    const value = replacer(tok);
    if (value != null && value !== '') {
      out += String(value);
      last = end;
      continue;
    }
    removed = true;
    const open = keepLayout ? null : out.match(/[([][^\S\n]*$/);
    const close = keepLayout ? null : text.slice(end).match(/^[^\S\n]*[)\]]/);
    if (open && close && BRACKET_PAIRS[open[0][0]] === close[0].trim()) {
      out = out.slice(0, -open[0].length);
      end += close[0].length;
    }
    const rest = text.slice(end);
    const wsLeft = out.match(/[^\S\n]+$/)?.[0] ?? '';
    const wsRight = rest.match(/^[^\S\n]+/)?.[0] ?? '';
    if (wsLeft && (wsRight || AFTER_NO_SPACE_RE.test(rest))) out = out.slice(0, -wsLeft.length);
    else if (wsRight && BEFORE_NO_SPACE_RE.test(out)) end += wsRight.length;
    last = end;
  }
  out += text.slice(last);
  return removed && !keepLayout ? out.replace(/ {2,}/g, ' ').trim() : out;
}

/** What the prose rules (year, price, date, language, banned phrases) read: every token removed, as on a page once its year has passed. */
export function stripYearTokens(text) {
  return replaceYearTokens(text, () => null);
}

/**
 * A BODY with every year token removed — outside its content tags, whose
 * `{{live:…}}` braces are not tokens — and nothing else touched. Bodies never
 * carry a token (the gate fails one: the body has <HijriCountdown>), but the
 * admin saves without the gate, so the public readers pass every body through
 * this: a pasted token disappears instead of printing raw in the prose and the
 * FAQPage JSON-LD. Removed, never resolved.
 */
export function stripBodyYearTokens(body) {
  if (!hasYearToken(body)) return body;
  return parseContentTags(body).map((s) => (s.type === 'markdown' ? replaceYearTokens(s.text, () => null, { keepLayout: true }) : s.raw)).join('');
}

/** The year tokens of a body, outside its content tags — each one fails the gate. */
export function bodyYearTokensOf(body) {
  if (!hasYearToken(body)) return [];
  return parseContentTags(body).filter((s) => s.type === 'markdown').flatMap((s) => yearTokensOf(s.text));
}

/** What the length rules measure: a valid token counts YEAR_TOKEN_WIDTH characters (the year it renders), a broken one nothing. */
export function measureYearTokens(text) {
  return replaceYearTokens(text, (t) => (t.kind === 'valid' ? '0'.repeat(YEAR_TOKEN_WIDTH) : null));
}

/** The gate's view of one text: a French problem per malformed or unknown token, [] when every token is valid. */
export function validateYearTokens(text) {
  const problems = [];
  for (const t of yearTokensOf(text)) {
    if (t.kind === 'malformed') problems.push(`jeton d'année mal formé « ${t.raw} » — forme attendue {year:<événement hégirien>} sans espace, ex. {year:ramadan_1448_start}`);
    else if (t.kind === 'unknown') problems.push(`jeton d'année « ${t.raw} » : événement hégirien inconnu — ${HIJRI_EVENTS.join(', ')} ou daté : ramadan_1448_start, arafah_1448…`);
  }
  return problems;
}
