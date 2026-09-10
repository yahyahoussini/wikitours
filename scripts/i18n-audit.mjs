#!/usr/bin/env node
/**
 * i18n-audit — finds strings that are not really translated.
 *
 *   npm run i18n:audit            print the report
 *   npm run i18n:audit -- --write rewrite docs/i18n-audit.md
 *
 * Three checks, matching the three ways a string escapes translation here:
 *
 *  1. DICTIONARY / latin-in-arabic  — an `ar` value carrying Latin words. This
 *     is what made the Arabic footer read "عمرة انطلاقاً من Casablanca".
 *  2. DICTIONARY / en-equals-fr     — an `en` value byte-identical to `fr`.
 *     Often legitimate ("Blog", "VIP"); flagged for review, never auto-fixed.
 *  3. DICTIONARY / missing key      — a key absent from ar or en, so
 *     getDictionary() silently serves the French one.
 *  4. SOURCE / hardcoded literal    — user-visible text written straight into
 *     JSX instead of a dictionary key, which no dictionary check can ever see.
 *     This is where `Omra Ramadan`, `aria-label="Chargement"` and `<h2>FAQ</h2>`
 *     were hiding.
 *
 * Exit code is always 0: this is a report, not a gate. Fixing an entry usually
 * needs a human decision about the wording, and a wrong Arabic translation is
 * worse than an obviously untranslated one.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const LOCALES = ['fr', 'ar', 'en'];
const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'docs', 'i18n-audit.md');

/**
 * Legitimately non-translated tokens. Proper nouns, the licence, currency and
 * platform names. Everything here is allowed to appear in Latin script inside
 * an Arabic string.
 */
const ALLOW = [
  // brand + parent
  'Wiki Tours', 'WIKI TOURS', 'Wiki Tours International', 'Bab Makka', 'Bab Makkah',
  // airline + partner hotels (proper nouns, per the brief)
  'Saudia', 'Anjum', 'Abraj Al Kiswah', 'Makarem Madinah', 'Swiss International',
  'Taj Park', 'Emaar Grand', 'Dhiafat Al Rajaa', 'Jayden Medina', 'Al Boraq',
  // platforms / networks
  'WhatsApp', 'Google', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Nusuk',
  // codes, units, tiers
  'ODV-25012', 'MAD', 'VIP', 'ISO', 'SEO', 'URL', 'CIN',
  // transliterations that are the accepted Latin form even in ar copy
  'Labbayk Allahumma labbayk',
  // deliberate authoring markers — never shipped as visible text (CLAUDE.md)
  '[CONTENT NEEDED]', '[TRANSLATION NEEDED]',
];
const ALLOW_RE = new RegExp(ALLOW.map((s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')).join('|'), 'g');

/**
 * Human verdicts on check 2 (`en` identical to `fr`). Most are words that are
 * genuinely the same in both languages; recorded here so a regenerated report
 * keeps the judgement instead of re-raising 26 settled questions. Anything NOT
 * listed here is unreviewed and needs a human.
 */
const EN_FR_VERDICT = {
  'nav.hajj': 'same word', 'nav.destinations': 'same word', 'nav.blog': 'same word',
  'nav.contact': 'same word', 'brand.byParent': 'brand lockup', 'home.selectorOccasion': 'same word',
  'a11y.sections': 'same word', 'articleCategory.omra': 'proper noun', 'articleCategory.hajj': 'proper noun',
  'articleCategory.guide': 'same word', 'offer.datesLabel': 'same word', 'offer.conditionsTitle': 'same word',
  'offer.tier.premium': 'same word', 'offer.roomShort.double': 'same word', 'offer.roomShort.triple': 'same word',
  'offer.roomShort.quad': 'same word', 'offer.roomShort.quint': 'same word',
  'offer.subnav.conditions': 'same word', 'cityPage.seoTitleQualifierShort': 'proper noun (airport)',
  'cities.casablanca': 'same exonym', 'cities.rabat': 'same exonym', 'cities.agadir': 'same exonym',
  'cities.oujda': 'same exonym', 'pages.contactTitle': 'same word',
  'pages.ramadanShort': 'deliberate — set to the English form on purpose',
  'offer.subnav.programme': 'REVIEW — British "Programme" vs American "Program"',
};

const LATIN_WORD = /[A-Za-zÀ-ÿ]{2,}/;
const ARABIC = /[؀-ۿ]/;

/** Flatten a nested dictionary to dotted paths → string leaves. */
function leaves(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);
    else if (Array.isArray(v)) {
      // A string item is a leaf. Recursing into it would iterate its
      // CHARACTERS and invent thousands of phantom keys.
      v.forEach((item, i) =>
        typeof item === 'string' ? out.set(`${key}[${i}]`, item) : leaves(item, `${key}[${i}]`, out),
      );
    } else if (v && typeof v === 'object') leaves(v, key, out);
  }
  return out;
}

/** Strip allowlisted tokens, URLs, digits and placeholders before judging. */
function residue(s) {
  return s
    .replace(ALLOW_RE, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\{[a-zA-Z_]+\}/g, ' ')
    .replace(/[+\d][\d\s().-]{5,}/g, ' ')
    .replace(/[0-9]/g, ' ');
}

async function walk(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (/\.(jsx?|mjs)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

async function main() {
  const dict = {};
  for (const l of LOCALES) dict[l] = leaves(JSON.parse(await readFile(path.join(ROOT, 'src', 'i18n', `${l}.json`), 'utf8')));

  // --- 1. Latin script inside Arabic values -------------------------------
  const latinInArabic = [];
  for (const [k, v] of dict.ar) {
    const r = residue(v);
    if (LATIN_WORD.test(r)) latinInArabic.push({ key: k, value: v, offending: (r.match(/[A-Za-zÀ-ÿ]{2,}/g) ?? []).join(', ') });
  }

  // --- 2. en identical to fr ----------------------------------------------
  const enEqualsFr = [];
  for (const [k, v] of dict.en) if (dict.fr.get(k) === v && LATIN_WORD.test(residue(v))) enEqualsFr.push({ key: k, value: v });

  // --- 3. missing keys (silent French fallback) ---------------------------
  const missing = [];
  for (const [k] of dict.fr) for (const l of ['ar', 'en']) if (!dict[l].has(k)) missing.push({ key: k, locale: l });

  // --- 4. hardcoded literals in source ------------------------------------
  const files = await walk(path.join(ROOT, 'src'));
  const hardcoded = [];
  const ATTR = /\b(aria-label|title|placeholder|alt)=("([^"{}]{2,})")/g;
  const TEXT = />([A-Za-zÀ-ÿ][^<>{}\n]{2,})</g;
  // Not user-visible site copy:
  //  - src/i18n/*        the dictionaries themselves
  //  - **/admin/**       the dashboard is French-only by design (owner-facing)
  //  - lib/server/marketing.js  transactional e-mail to the owner, likewise FR
  const SKIP_FILE = (p) => p.startsWith('src/i18n/') || p.includes('/admin/') || p === 'src/lib/server/marketing.js';
  // `placeholder="blur"` is the next/image prop, not a form placeholder.
  const NOT_COPY = new Set(['blur', 'empty']);
  for (const f of files) {
    if (SKIP_FILE(rel(f))) continue;
    const src = await readFile(f, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments
      for (const m of line.matchAll(ATTR)) {
        const val = m[3].trim();
        if (!val || NOT_COPY.has(val) || !LATIN_WORD.test(residue(val))) continue;
        hardcoded.push({ file: rel(f), line: i + 1, kind: m[1], value: val });
      }
      for (const m of line.matchAll(TEXT)) {
        const val = m[1].trim();
        if (!val || val.length < 3 || !LATIN_WORD.test(residue(val))) continue;
        if (/^(https?|www\.)/.test(val)) continue;
        hardcoded.push({ file: rel(f), line: i + 1, kind: 'jsx-text', value: val });
      }
    });
  }

  const md = [];
  md.push('# i18n audit — untranslated strings');
  md.push('');
  md.push('Generated by `npm run i18n:audit -- --write` (`scripts/i18n-audit.mjs`). Re-run it');
  md.push('after touching `src/i18n/*.json` or adding user-visible copy.');
  md.push('');
  md.push('This is a **report, not a gate** — it always exits 0. Several entries below are');
  md.push('legitimate (proper nouns, words that are genuinely identical in French and');
  md.push('English). A wrong Arabic translation is worse than an obviously untranslated');
  md.push('string, so anything ambiguous is listed for human review rather than guessed.');
  md.push('');
  md.push(`Allowlisted as legitimately non-translated: ${ALLOW.map((a) => `\`${a}\``).join(', ')}.`);
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push('| Check | Count |');
  md.push('|---|---|');
  md.push(`| Latin script inside an \`ar\` dictionary value | ${latinInArabic.length} |`);
  md.push(`| \`en\` value byte-identical to \`fr\` | ${enEqualsFr.length} |`);
  md.push(`| Key missing from \`ar\` or \`en\` (silent French fallback) | ${missing.length} |`);
  md.push(`| Hardcoded user-visible literal in source | ${hardcoded.length} |`);
  md.push('');

  md.push('## 1. Latin script inside an `ar` value');
  md.push('');
  md.push(latinInArabic.length ? '| Key | Value | Latin residue |\n|---|---|---|' : '_None._');
  for (const r of latinInArabic) md.push(`| \`${r.key}\` | ${r.value} | ${r.offending} |`);
  md.push('');

  md.push('## 2. `en` identical to `fr` — review, often legitimate');
  md.push('');
  const unreviewed = enEqualsFr.filter((r) => !EN_FR_VERDICT[r.key]);
  md.push(
    unreviewed.length
      ? `**${unreviewed.length} unreviewed** — a human should decide on these.`
      : 'All reviewed; no action outstanding beyond the rows marked REVIEW.',
  );
  md.push('');
  md.push(enEqualsFr.length ? '| Key | Value | Verdict |\n|---|---|---|' : '_None._');
  for (const r of enEqualsFr) md.push(`| \`${r.key}\` | ${r.value} | ${EN_FR_VERDICT[r.key] ?? '**unreviewed**'} |`);
  md.push('');

  md.push('## 3. Missing keys (silent French fallback)');
  md.push('');
  md.push(missing.length ? '| Key | Missing in |\n|---|---|' : '_None — fr / ar / en are at full key parity._');
  for (const r of missing) md.push(`| \`${r.key}\` | ${r.locale} |`);
  md.push('');

  md.push('## 4. Hardcoded user-visible literals in source');
  md.push('');
  md.push('These never reach a dictionary, so no locale can override them. `jsx-text` is');
  md.push('rendered copy; the rest are attributes read by screen readers.');
  md.push('');
  md.push(hardcoded.length ? '| File | Line | Kind | Literal |\n|---|---|---|---|' : '_None._');
  for (const r of hardcoded) md.push(`| \`${r.file}\` | ${r.line} | ${r.kind} | ${r.value.replace(/\|/g, '\\|')} |`);
  md.push('');

  const text = md.join('\n');
  if (WRITE) {
    await writeFile(OUT, text, 'utf8');
    console.log(`wrote ${rel(OUT)}`);
  } else {
    console.log(text);
  }
  console.log(
    `\nlatin-in-ar ${latinInArabic.length} · en=fr ${enEqualsFr.length} · missing ${missing.length} · hardcoded ${hardcoded.length}`,
  );
}

main().catch((e) => {
  console.error('[i18n-audit]', e?.message ?? e);
  process.exitCode = 1;
});
