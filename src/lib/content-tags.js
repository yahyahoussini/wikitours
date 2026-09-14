/**
 * Placeholder tags in article bodies — the RENDER-LIVE half of the content
 * architecture (generate-ahead, render-live, publish-by-time).
 *
 * Prose is markdown written ahead of time. Every VOLATILE fact — prices,
 * departures, availability, dates, hotel lists, the deposit policy, review
 * quotes, Hijri countdowns, calls to action — is never written into the prose;
 * the author places a self-closing tag and a SERVER component reads Supabase at
 * request time (src/components/content/ArticleBody.jsx maps tag → component).
 *
 *   <CommercialCTA to="/omra-ramadan" />      live figures + button to a lander
 *   <LiveDepartures month="10" />             the open departures of a month
 *   <LiveDepartures occasion="ramadan" />     … or of an occasion
 *   <ReviewQuote id="<uuid>" />               one published testimonial, verbatim
 *   <HijriCountdown event="ramadan" />        days to a Hijri event, moon caveat
 *   <DepositPolicy />                         the no-online-payment policy
 *   <HotelList city="makkah" />               partner hotels of a city
 *
 * The parser is deliberately strict and dependency-free: only self-closing
 * tags whose name is in TAGS are recognised, attributes are `name="value"`
 * pairs with values restricted to [A-Za-z0-9_./-], and everything else in the
 * body stays markdown (rendered HTML-escaped by src/lib/markdown.js). Nothing
 * from the body is ever injected as raw HTML. The article gate
 * (src/lib/server/article-gate.mjs) fails an unknown tag or a bad attribute.
 */

export const TAGS = Object.freeze({
  CommercialCTA: { attrs: ['to'], required: ['to'] },
  LiveDepartures: { attrs: ['month', 'occasion', 'limit'], required: [] },
  ReviewQuote: { attrs: ['id'], required: ['id'] },
  HijriCountdown: { attrs: ['event'], required: ['event'] },
  DepositPolicy: { attrs: [], required: [] },
  HotelList: { attrs: ['city', 'limit'], required: [] },
});

// Lander paths a <CommercialCTA to> may point at (locale-relative). Anything
// else is a broken or off-strategy CTA and fails the gate.
export const CTA_TARGET_RE = /^\/(bab-makka|hajj|omra-pas-cher|omra-5-etoiles|omra-ramadan|omra-[a-z]+|omra-depuis-[a-z]+|agence-omra-casablanca|hotels-omra|hotel\/[a-z0-9-]+)$/;

export const HIJRI_EVENTS = Object.freeze(['ramadan', 'laylat-al-qadr', 'eid-al-fitr', 'dhul-hijja', 'arafat', 'eid-al-adha', 'ashura', 'mawlid']);

const TAG_RE = /<([A-Z][A-Za-z]+)((?:\s+[a-z][a-z0-9-]*="[^"<>]*")*)\s*\/>/g;
const ATTR_RE = /([a-z][a-z0-9-]*)="([^"<>]*)"/g;
const VALUE_RE = /^[A-Za-z0-9_./-]*$/;

/**
 * Split a body into segments: { type: 'markdown', text } and
 * { type: 'tag', name, attrs, raw }. Unknown tag names are NOT recognised —
 * they stay in the markdown text (and the HTML escaper neutralises them), so a
 * typo can never render as a component; the gate reports it instead.
 */
export function parseContentTags(body) {
  const src = String(body ?? '');
  const out = [];
  let last = 0;
  for (const m of src.matchAll(TAG_RE)) {
    const [raw, name, attrText] = m;
    if (!(name in TAGS)) continue;
    const attrs = {};
    for (const a of attrText.matchAll(ATTR_RE)) attrs[a[1]] = a[2];
    if (m.index > last) out.push({ type: 'markdown', text: src.slice(last, m.index) });
    out.push({ type: 'tag', name, attrs, raw });
    last = m.index + raw.length;
  }
  if (last < src.length) out.push({ type: 'markdown', text: src.slice(last) });
  return out;
}

/**
 * Every problem with the tags of a body, for the gate: unknown tag, unknown
 * or missing attribute, a value outside the allowed charset, a CTA to a
 * non-lander path, an unknown Hijri event, a non-UUID review id. Returns [].
 */
export function validateContentTags(body) {
  const problems = [];
  const src = String(body ?? '');
  for (const m of src.matchAll(/<([A-Z][A-Za-z]+)\b[^<>]*\/?>/g)) {
    const name = m[1];
    if (!(name in TAGS)) { problems.push(`balise inconnue <${name}> — balises autorisées : ${Object.keys(TAGS).join(', ')}`); continue; }
    if (!/\/>$/.test(m[0])) { problems.push(`<${name}> doit être auto-fermante (« /> »)`); continue; }
    const spec = TAGS[name];
    const attrs = {};
    for (const a of m[0].matchAll(ATTR_RE)) attrs[a[1]] = a[2];
    for (const k of Object.keys(attrs)) {
      if (!spec.attrs.includes(k)) problems.push(`<${name}> : attribut inconnu « ${k} »`);
      else if (!VALUE_RE.test(attrs[k])) problems.push(`<${name} ${k}> : valeur non autorisée « ${attrs[k]} »`);
    }
    for (const k of spec.required) if (!attrs[k]) problems.push(`<${name}> : attribut « ${k} » requis`);
    if (name === 'CommercialCTA' && attrs.to && !CTA_TARGET_RE.test(attrs.to)) problems.push(`<CommercialCTA to="${attrs.to}"> : la cible doit être une page commerciale (locale-relative, ex. /omra-ramadan)`);
    if (name === 'HijriCountdown' && attrs.event && !HIJRI_EVENTS.includes(attrs.event)) problems.push(`<HijriCountdown event="${attrs.event}"> : événement inconnu — ${HIJRI_EVENTS.join(', ')}`);
    if (name === 'ReviewQuote' && attrs.id && !/^[0-9a-f-]{36}$/i.test(attrs.id)) problems.push(`<ReviewQuote id="${attrs.id}"> : id de témoignage invalide (uuid attendu)`);
    if (name === 'LiveDepartures' && attrs.month && !/^(?:[1-9]|1[0-2])$/.test(attrs.month)) problems.push(`<LiveDepartures month="${attrs.month}"> : mois 1–12 attendu`);
  }
  return problems;
}

/** The body with every tag removed — what the prose checks (words, language, facts) should see. */
export function stripContentTags(body) {
  return parseContentTags(body).filter((s) => s.type === 'markdown').map((s) => s.text).join('');
}
