import { getDictionary } from '@/lib/i18n';

/**
 * Authored meta descriptions, per page type, per locale.
 *
 * Replaces `clampDesc(<body copy>)`, which sliced the first paragraph at 155
 * characters and appended "…". That shipped snippets ending mid-sentence
 * ("…à une trentaine de kilomètres au sud…") on 24 of 78 measured URLs, and
 * left 54 of 78 under 150 — no CTA, no price, no differentiator.
 *
 * Two rules, both mechanical:
 *  1. NEVER truncate. compose() drops a whole trailing clause instead, so a
 *     description always ends on a full sentence.
 *  2. Ceiling is 155, not the 160 a brief might ask for: scripts/seo-audit.js
 *     FAILS the build above 155 (line 145), and it decodes HTML entities first,
 *     so `&#x27;` counts as one character, not six.
 *
 * The site's two real differentiators — no online payment, and a WhatsApp reply
 * in under 5 minutes — live here as reusable clauses so every commercial page
 * can carry at least one of price / licence / no-online-payment.
 */
export const DESC_MAX = 155;
export const DESC_TARGET_MIN = 150;

const fill = (tpl, vars) =>
  Object.entries(vars ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v ?? '')), String(tpl ?? ''));

/**
 * Join clauses most-important-first, dropping whole trailing clauses until it
 * fits. Returns the longest prefix within `max` — never a cut word, never an
 * ellipsis. A single clause longer than max is returned as-is (the caller
 * authored it too long; the audit will say so rather than us hiding it).
 */
export function compose(clauses, max = DESC_MAX) {
  const parts = (clauses ?? [])
    .flat()
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean);
  for (let n = parts.length; n > 0; n -= 1) {
    const joined = parts.slice(0, n).join(' ');
    if (joined.length <= max) return joined;
  }
  return parts[0] ?? '';
}

/**
 * Prefer the admin's own seo_description — the admin controls everything
 * (LAWS §4) — but only while it actually fits. Several stored values run past
 * 155, which the SEO audit fails outright; the old code "fixed" that by
 * clamping them to 155 with an ellipsis, which is the exact defect this module
 * removes. So an oversized admin string yields to the authored template rather
 * than being cut mid-sentence. Shortening it in /admin puts it straight back.
 */
export function authoredOr(adminText, fallback, { extra = [], max = DESC_MAX } = {}) {
  const s = String(adminText ?? '').trim();
  if (!s || s.length > max) return fallback;
  // The admin's words are kept VERBATIM and first; a differentiator clause is
  // appended only when it fits, so every commercial page carries price, licence
  // or no-online-payment without anyone's copy being rewritten or cut.
  return compose([s, ...extra], max);
}

/** The shared trust clauses, in the page's own language. */
export function trustClauses(locale, { license = null } = {}) {
  const m = getDictionary(locale).meta;
  return {
    licence: license ? fill(m.trustLicence, { license }) : m.trustLicenceNoNumber,
    noPayment: m.trustNoPayment,
    whatsapp: m.trustWhatsapp,
  };
}

/**
 * Build a description for a page type.
 *   type   key under `meta` in the dictionaries
 *   vars   interpolation values for that template
 *   extra  ordered clauses appended after the lead (already localized)
 */
export function pageDescription(locale, type, { vars = {}, extra = [], max = DESC_MAX } = {}) {
  const m = getDictionary(locale).meta;
  return compose([fill(m[type], vars), ...extra], max);
}
