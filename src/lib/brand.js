/**
 * BRAND LAW — single source of truth for the brand hierarchy.
 * Wiki Tours is the parent company; Bab Makkah is its premium Omra & Hajj
 * service and is never presented as independent. Use this constant in UI,
 * schema.org JSON-LD, OG tags, footers and emails — never hardcode the names.
 */
export const BRAND = Object.freeze({
  parent: 'Wiki Tours International',
  service: 'Bab Makkah',
  lockup: 'Bab Makkah by Wiki Tours',
  lockupAr: 'باب مكة من ويكي تورز',
});

/** Canonical Latin spelling is "Bab Makkah"; "Bab Makka" is only ever a redirect/secondary keyword. */
export const SERVICE_SPELLING_SECONDARY = 'Bab Makka';
