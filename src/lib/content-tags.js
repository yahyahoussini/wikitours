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
