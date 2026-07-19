/**
 * Server-side guard for the settings that materially drive SEO / E-E-A-T /
 * entity output. When empty, the site silently ships schema without address,
 * geo, rating, or `sameAs`, hides the licence, and can't be verified in Search
 * Console — all invisible from the page itself. This surfaces it (admin banner,
 * a once-per-instance prod log, and GET /api/health/seo).
 */
const CRITICAL_KEYS = [
  'license_number',
  'address_fr',
  'gbp_rating',
  'gbp_review_count',
  'latitude',
  'longitude',
  'verification_metas',
];
const PHONE_KEYS = ['phone_1', 'whatsapp_number'];
const SOCIAL_KEYS = ['facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url'];

const empty = (v) => v === '' || v === null || v === undefined;

/** { ok, missing[] } — missing lists human-readable keys, never any values. */
export function criticalSettingsHealth(settings) {
  const missing = CRITICAL_KEYS.filter((k) => empty(settings?.[k]));
  if (PHONE_KEYS.every((k) => empty(settings?.[k]))) missing.push('phone (phone_1 / whatsapp_number)');
  if (SOCIAL_KEYS.every((k) => empty(settings?.[k]))) missing.push('sameAs (social links)');
  return { ok: missing.length === 0, missing };
}

let warned = false;
/** Log ONCE per server instance, production only, when criticals are missing. */
export function warnCriticalSettingsOnce(settings) {
  if (warned || process.env.NODE_ENV !== 'production') return;
  warned = true;
  const { ok, missing } = criticalSettingsHealth(settings);
  if (!ok) console.warn('[seo-health] missing critical settings:', missing.join(', '));
}
