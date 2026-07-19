/**
 * Guide cluster (/guide-omra + chapters): fixed slug whitelist + the
 * noindex-until-filled guard (same law as city pages). Content rows live in
 * guide_pages (admin-authored, LAWS §4/§6) — a missing or empty row renders an
 * honest "en préparation" state, never invented copy.
 */

export const GUIDE_PILLAR_SLUG = 'guide-omra';

export const GUIDE_CHILD_SLUGS = [
  'documents-visa',
  'femme-mahram',
  'budget',
  'rituels',
  'checklist',
  'meilleure-periode',
];

/**
 * Indexable ⇔ the admin flipped the switch AND the fr/ar content is really
 * there (parity law — en falls back to fr via pickLang like the rest of the
 * site). Anything less stays crawlable but noindex (anti-thin-content).
 */
export function guideIndexable(row) {
  return Boolean(
    row?.is_published &&
      row?.is_indexable &&
      row?.summary_fr &&
      row?.body_fr &&
      row?.summary_ar &&
      row?.body_ar,
  );
}

/** /glossaire-omra indexes only with a real glossary behind it. */
export const GLOSSARY_MIN_TERMS = 8;
