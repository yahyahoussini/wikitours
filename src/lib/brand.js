/**
 * BRAND LAW — single source of truth for the brand hierarchy.
 * Wiki Tours is the parent company; Bab Makkah is its premium Omra & Hajj
 * service and is never presented as independent. Use this constant in UI,
 * schema.org JSON-LD, OG tags, footers and emails — never hardcode the names.
 */
export const BRAND = Object.freeze({
  parent: 'Wiki Tours International',
  // Canonical spelling is "Bab Makka" (no h) — it matches the domain, the
  // Google Business Profile, press coverage and reviews. Entity/NAP consistency
  // requires ONE name, so this is the one users see and the one in schema
  // `name`. "Bab Makkah" survives only as an `alternateName` (see `alternates`).
  service: 'Bab Makka',
  lockup: 'Bab Makka by Wiki Tours International',
  lockupAr: 'باب مكة من ويكي تورز',
  // Alternate spellings/forms emitted as schema `alternateName` so engines still
  // resolve the "Makkah" and shorter variants to this one entity.
  alternates: ['Bab Makkah by Wiki Tours International', 'Bab Makkah', 'Bab Makka by Wiki Tours'],
});

/** Secondary Latin spelling kept for redirects / keyword coverage only. */
export const SERVICE_SPELLING_SECONDARY = 'Bab Makkah';
