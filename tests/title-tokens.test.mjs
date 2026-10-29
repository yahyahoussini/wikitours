import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveYearTokens, resolveArticleYearTokens, articleHasYearTokens, yearOfTag, yearTokensChanged, YEAR_TOKEN_COLUMNS } from '@/lib/title-tokens';
import { yearTokensOf, stripYearTokens, measureYearTokens, validateYearTokens, hasYearToken, stripBodyYearTokens, bodyYearTokensOf } from '@/lib/content-tags';
import { hijriTagDate, hijriToGregorian, nextHijriEvent, todayCasablanca } from '@/lib/hijri';
import { qualityGate, clampDescription, proseViolations, westernDigits, FOUNDING_CONTEXT, yearlessReadings } from '@/lib/server/article-gate';
import { refreshYearTokenPages } from '@/lib/server/year-token-refresh';

// {year:<tag>} — the one year a title may carry (owner decision 2026-10-28).
// Ramadan 1448 starts in February 2027 (Umm al-Qura), so ramadan_1448_start is 2027.
const T = 'Ramadan {year:ramadan_1448_start} au Maroc : dates et calendrier';
const BEFORE = new Date('2026-10-28T10:00:00Z');
const AFTER = new Date('2028-03-01T12:00:00Z');

describe('resolveYearTokens — the year while it lasts, nothing after', () => {
  test('a valid token becomes the Gregorian year of its event, in French and in Arabic (Western digits)', () => {
    assert.equal(resolveYearTokens(T, { now: BEFORE }), 'Ramadan 2027 au Maroc : dates et calendrier');
    assert.equal(resolveYearTokens('عمرة رمضان {year:ramadan_1448_start} من المغرب', { now: BEFORE }), 'عمرة رمضان 2027 من المغرب');
    // Through the whole of 2027 itself, too.
    assert.equal(resolveYearTokens(T, { now: new Date('2027-01-01T12:00:00Z') }), 'Ramadan 2027 au Maroc : dates et calendrier');
    assert.equal(resolveYearTokens(T, { now: new Date('2027-11-15T12:00:00Z') }), 'Ramadan 2027 au Maroc : dates et calendrier');
  });
  test('once that year has passed the token is removed and the text tidied, in French and in Arabic', () => {
    assert.equal(resolveYearTokens(T, { now: AFTER }), 'Ramadan au Maroc : dates et calendrier');
    assert.equal(resolveYearTokens('رمضان {year:ramadan_1448_start} بالمغرب: التواريخ والرزنامة', { now: AFTER }), 'رمضان بالمغرب: التواريخ والرزنامة');
  });
  test('the year turns at midnight in Africa/Casablanca, not in UTC — 31 December stays, 1 January drops', () => {
    // Instants that are 31 Dec / 1 Jan in Casablanca whether the zone data says UTC+0 (2026c) or UTC+1 (older).
    assert.equal(resolveYearTokens(T, { now: new Date('2027-12-31T22:30:00Z') }), 'Ramadan 2027 au Maroc : dates et calendrier');
    assert.equal(resolveYearTokens(T, { now: new Date('2028-01-01T00:30:00Z') }), 'Ramadan au Maroc : dates et calendrier');
    // 23:30 UTC is already 1 January under UTC+1: the resolver follows the Casablanca calendar date, whatever the zone data.
    const edge = new Date('2027-12-31T23:30:00Z');
    const expected = todayCasablanca(edge).startsWith('2028') ? 'Ramadan au Maroc : dates et calendrier' : 'Ramadan 2027 au Maroc : dates et calendrier';
    assert.equal(resolveYearTokens(T, { now: edge }), expected);
  });
  test('a bare tag is the next occurrence, like <HijriCountdown event="ramadan" />', () => {
    assert.equal(resolveYearTokens('Ramadan {year:ramadan}', { now: BEFORE }), 'Ramadan 2027');
    assert.equal(resolveYearTokens('Ramadan {year:ramadan}', { now: new Date('2027-03-01T12:00:00Z') }), 'Ramadan 2028');
    assert.equal(yearOfTag('ramadan', { now: new Date('2027-03-01T12:00:00Z') }), Number(nextHijriEvent('ramadan', '2027-03-01').gregorian_date.slice(0, 4)));
  });
  test('the admin-confirmed date (public.hijri_events) wins over the computation, as in the countdown', () => {
    const events = [{ event: 'ramadan', hijri_year: 1448, gregorian_date: '2028-01-02', is_confirmed: true }];
    assert.equal(resolveYearTokens('Ramadan {year:ramadan_1448_start}', { now: BEFORE, events }), 'Ramadan 2028');
    assert.equal(yearOfTag('ramadan_1448_start', { now: BEFORE }), 2027);
  });
  test('a malformed or unknown token is removed — never shown raw', () => {
    const broken = [
      'Ramadan {year:foo} au Maroc',
      'Ramadan {year:ramadan_2027} au Maroc',
      'Ramadan {year: ramadan_1448_start} au Maroc',
      'Ramadan { year:ramadan_1448_start } au Maroc',
      'Ramadan {YEAR:ramadan_1448_start} au Maroc',
      'Ramadan {years:ramadan_1448_start} au Maroc',
      'Ramadan {{year:ramadan_1448_start}} au Maroc',
      'Ramadan {year:ramadan_1448_start au Maroc',
      'Ramadan {year:} au Maroc',
    ];
    for (const s of broken) {
      const out = resolveYearTokens(s, { now: BEFORE });
      assert.equal(out, 'Ramadan au Maroc', s);
      assert.doesNotMatch(out, /\{|year/i, s);
    }
  });
  test('a brace missing on the left, braces the wrong way round (a right-to-left field) or full-width ones: removed and failed by the gate', () => {
    const broken = [
      ['متى يبدأ رمضان }year:ramadan_1448_start{ ومتى ينتهي؟', 'متى يبدأ رمضان ومتى ينتهي؟'],
      ['Ramadan year:ramadan_1448_start} au Maroc', 'Ramadan au Maroc'],
      ['Ramadan }year:ramadan_1448_start} au Maroc', 'Ramadan au Maroc'],
      ['Ramadan year:ramadan_1448_start{ au Maroc', 'Ramadan au Maroc'],
      ['Ramadan ｛year:ramadan_1448_start｝ au Maroc', 'Ramadan au Maroc'],
      ['Ramadan {year:ramadan_1448_start｝ au Maroc', 'Ramadan au Maroc'],
      ['Ramadan {year：ramadan_1448_start} au Maroc', 'Ramadan au Maroc'],
      ['رمضان ｛year：ramadan_1448_start｝ في المغرب', 'رمضان في المغرب'],
    ];
    for (const [s, want] of broken) {
      assert.equal(hasYearToken(s), true, s);
      assert.equal(resolveYearTokens(s, { now: BEFORE }), want, s);
      assert.match(validateYearTokens(s)[0] ?? '', /jeton d'année mal formé/, s);
    }
  });
  test('`year:` without a brace touching it is prose, never a token — and never eats the real token after it', () => {
    for (const s of ['This year: dates and calendar', 'Ramadan (year: 2027)', 'Omra {month} {year}', 'years: {{live:departures}}']) {
      assert.equal(hasYearToken(s), false, s);
      assert.equal(resolveYearTokens(s, { now: BEFORE }), s, s);
    }
    assert.equal(resolveYearTokens('Ramadan this year: dates {year:ramadan_1448_start}', { now: BEFORE }), 'Ramadan this year: dates 2027');
    assert.deepEqual(yearTokensOf('{year:ramadan_1448_start}{year:ramadan_1449_start}').map((t) => [t.raw, t.kind]), [['{year:ramadan_1448_start}', 'valid'], ['{year:ramadan_1449_start}', 'valid']]);
    assert.equal(resolveYearTokens('{year:ramadan_1448_start}/{year:ramadan_1449_start}', { now: BEFORE }), '2027/2028');
  });
  test('tidying: no space left before punctuation that had none, brackets that held only the token go, ends trimmed', () => {
    const past = (s) => resolveYearTokens(s, { now: AFTER });
    assert.equal(past('Ramadan {year:ramadan_1448_start}, dates'), 'Ramadan, dates');
    assert.equal(past('Ramadan {year:ramadan_1448_start}.'), 'Ramadan.');
    assert.equal(past('(Ramadan {year:ramadan_1448_start})'), '(Ramadan)');
    assert.equal(past('Dates du Ramadan ({year:ramadan_1448_start}) : calendrier'), 'Dates du Ramadan : calendrier');
    assert.equal(past('{year:ramadan_1448_start} : le calendrier'), ': le calendrier');
    assert.equal(past('Ramadan {year:ramadan_1448_start}'), 'Ramadan');
    assert.equal(past('{year:ramadan_1448_start} Ramadan'), 'Ramadan');
    // The space that WAS there before « : » survives — a non-breaking one included.
    assert.equal(past('Ramadan {year:ramadan_1448_start} : dates'), 'Ramadan : dates');
    const nbsp = String.fromCharCode(0xa0);
    assert.equal(past(`Ramadan {year:ramadan_1448_start}${nbsp}: dates`), `Ramadan${nbsp}: dates`);
    assert.equal(past('Ramadan  {year:ramadan_1448_start}  au Maroc'), 'Ramadan au Maroc');
    assert.equal(past('Ramadan {year:ramadan_1448_start} {year:ramadan_1448_start} au Maroc'), 'Ramadan au Maroc');
  });
  test('a text without a token comes back untouched; non-strings pass through', () => {
    assert.equal(resolveYearTokens('Omra  depuis le Maroc ', { now: BEFORE }), 'Omra  depuis le Maroc ');
    assert.equal(resolveYearTokens('Omra {month} {year}', { now: BEFORE }), 'Omra {month} {year}');
    assert.equal(resolveYearTokens(null), null);
    assert.equal(resolveYearTokens(undefined), undefined);
    assert.equal(resolveYearTokens(42), 42);
  });
  test('never throws: an invalid clock or an event the calendar cannot compute removes the token', () => {
    assert.equal(resolveYearTokens(T, { now: new Date('not a date') }), 'Ramadan au Maroc : dates et calendrier');
    // Umm al-Qura covers 1318–1500 AH; 1550 parses but cannot be computed.
    assert.equal(resolveYearTokens('Omra {year:ramadan_1550_start} au Maroc', { now: BEFORE }), 'Omra au Maroc');
    assert.equal(yearOfTag('ramadan_1550_start', { now: BEFORE }), null);
    assert.equal(resolveYearTokens(T, { now: BEFORE, events: 'not rows' }), 'Ramadan 2027 au Maroc : dates et calendrier');
  });
  test('never throws on null options either — they read as no options', () => {
    assert.match(resolveYearTokens(T, null), /^Ramadan (?:\d{4} )?au Maroc : dates et calendrier$/);
    assert.equal(yearOfTag('ramadan_1448_start', null), 2027);
    const out = resolveArticleYearTokens({ title_fr: T }, null);
    assert.doesNotMatch(out.title_fr, /\{|year/);
    // No token → never a change, whatever today is (the test must not depend on the clock).
    assert.equal(yearTokensChanged([{ title_fr: 'Omra' }], null), false);
  });
  test('a null clock is the current time, never the epoch — whose year would print the token forever', () => {
    // Ramadan 1440 began in 2019: past today, never past 1970.
    const past = 'Ramadan {year:ramadan_1440_start} : les dates';
    assert.equal(resolveYearTokens(past, { now: null }), 'Ramadan : les dates');
    assert.equal(resolveYearTokens(past, { now: null, events: null }), 'Ramadan : les dates');
    assert.equal(resolveArticleYearTokens({ title_fr: past }, { now: null }).title_fr, 'Ramadan : les dates');
    assert.equal(resolveYearTokens(T, { now: null }), resolveYearTokens(T, { now: new Date() }));
  });
  test('a pasted run of braces or of « year: » costs milliseconds, not seconds', () => {
    for (const s of [`${'{'.repeat(50000)}year`, 'year:'.repeat(40000), `${'}'.repeat(50000)} year:x`]) {
      const t0 = performance.now();
      hasYearToken(s);
      stripYearTokens(s);
      assert.ok(performance.now() - t0 < 1000, `${s.slice(0, 12)}… took ${Math.round(performance.now() - t0)} ms`);
    }
  });
});

describe('a token in a body — removed by the public readers, never resolved, never raw', () => {
  test('only the token and the space beside it go: indentation, double spaces and line breaks stay', () => {
    const body = 'Le Ramadan {year:ramadan_1448_start} commence.\n\n- point\n  - sous-point  avec deux espaces\n\n    bloc de code\nFin {year:ramadan_1448_start}\n{year:foo} Ligne';
    assert.equal(stripBodyYearTokens(body), 'Le Ramadan commence.\n\n- point\n  - sous-point  avec deux espaces\n\n    bloc de code\nFin\nLigne');
  });
  test('the braces of the {{live:…}} tags are not tokens, and are never touched', () => {
    const body = '{{live:countdown event=ramadan_1448_start}} Year: the start {{live:cta intent=ramadan}}\n\nOver the years: {{live:departures filter=ramadan}}';
    assert.equal(stripBodyYearTokens(body), body);
    assert.deepEqual(bodyYearTokensOf(body), []);
    const withToken = `${body}\n\nRamadan {year:ramadan_1448_start} <HijriCountdown event="ramadan_1448_start" />`;
    assert.deepEqual(bodyYearTokensOf(withToken).map((t) => t.raw), ['{year:ramadan_1448_start}']);
    assert.equal(stripBodyYearTokens(withToken), `${body}\n\nRamadan <HijriCountdown event="ramadan_1448_start" />`);
  });
  test('a text without a token, or not a string, comes back as it is', () => {
    assert.equal(stripBodyYearTokens('Corps  sans jeton '), 'Corps  sans jeton ');
    assert.equal(stripBodyYearTokens(null), null);
  });
});

describe('yearTokensChanged — the day the release cron revalidates the site', () => {
  const rows = [{ slug: 'a', title_fr: 'Omra' }, { slug: 'b', seo_title_fr: T }];
  test('true across the 1 January after the token year, false on any other day', () => {
    assert.equal(yearTokensChanged(rows, { now: new Date('2028-01-01T08:00:00Z'), since: new Date('2027-12-30T08:00:00Z') }), true);
    assert.equal(yearTokensChanged(rows, { now: new Date('2028-01-02T08:00:00Z'), since: new Date('2027-12-31T08:00:00Z') }), true, 'the next run sees it again (48 h window)');
    assert.equal(yearTokensChanged(rows, { now: new Date('2028-01-03T08:00:00Z'), since: new Date('2028-01-01T08:00:00Z') }), false);
    assert.equal(yearTokensChanged(rows, { now: new Date('2027-06-01T08:00:00Z'), since: new Date('2027-05-30T08:00:00Z') }), false);
  });
  test('a bare tag changes the day after its event, when its next occurrence moves to the next year', () => {
    const start = hijriToGregorian(1448, 9, 1); // 1 Ramadan 1448
    const after = new Date(Date.parse(`${start}T08:00:00Z`) + 2 * 86400000);
    assert.equal(yearTokensChanged([{ title_fr: 'Ramadan {year:ramadan}' }], { now: after, since: new Date(after.getTime() - 2 * 86400000) }), true);
  });
  test('rows without a token, or not rows at all: false', () => {
    assert.equal(yearTokensChanged([{ title_fr: 'Omra', body_fr: '{year:ramadan}' }], { now: new Date('2028-01-01T08:00:00Z'), since: new Date('2027-12-30T08:00:00Z') }), false, 'a body token is removed, it never changes');
    assert.equal(yearTokensChanged(null), false);
    assert.equal(yearTokensChanged('rows'), false);
  });
});

describe('hijriTagDate — the countdown computation the token reads', () => {
  test('a dated tag pins its Hijri year (Umm al-Qura), a stored row wins, a bare tag is the next occurrence', () => {
    const d = hijriTagDate('ramadan_1448_start', { today: '2026-10-28' });
    assert.equal(d.gregorian_date, hijriToGregorian(1448, 9, 1));
    assert.equal(d.confirmed, false);
    assert.equal(d.days, Math.round((Date.parse(d.gregorian_date) - Date.parse('2026-10-28')) / 86400000));
    const rows = [{ event: 'ramadan', hijri_year: 1448, gregorian_date: '2027-02-09', is_confirmed: true }];
    assert.deepEqual(hijriTagDate('ramadan_1448', { today: '2026-10-28', rows }), { gregorian_date: '2027-02-09', days: 104, confirmed: true });
    assert.deepEqual(hijriTagDate('ramadan', { today: '2027-03-01' }), nextHijriEvent('ramadan', '2027-03-01'));
    assert.equal(hijriTagDate('ramadan', { today: '2026-10-28', rows }).gregorian_date, '2027-02-09');
    assert.equal(hijriTagDate('foo'), null);
  });
  test('a Hijri year past the Umm al-Qura tables (1501–1599 parse, 1500 is the last) is null, never a crashed countdown', () => {
    assert.equal(hijriTagDate('ramadan_1501_start', { today: '2026-10-28' }), null);
    assert.equal(hijriTagDate('ramadan_1448_start', null).gregorian_date, hijriToGregorian(1448, 9, 1));
  });
});

describe('resolveArticleYearTokens — the row mapper of the public readers', () => {
  test('resolves the 12 title columns, removes a token from a body, never mutates the input row', () => {
    assert.equal(YEAR_TOKEN_COLUMNS.length, 12);
    const row = {
      slug: 'ramadan-2027-dates-calendrier',
      title_fr: T, title_ar: 'رمضان {year:ramadan_1448_start}: متى يبدأ؟', title_en: 'Ramadan {year:ramadan_1448_start} dates',
      seo_title_fr: 'Dates du Ramadan {year:ramadan_1448_start}', seo_title_ar: 'رمضان {year:ramadan_1448_start}', seo_title_en: 'Ramadan {year:ramadan_1448_start}',
      excerpt_fr: 'Le Ramadan {year:ramadan_1448_start} commence en février.', excerpt_ar: 'نص', excerpt_en: null,
      seo_description_fr: 'Calendrier du Ramadan {year:ramadan_1448_start}.', seo_description_ar: 'وصف {year:ramadan_1448_start}.', seo_description_en: 'Plain.',
      body_fr: 'Corps {year:ramadan_1448_start}',
    };
    const copy = structuredClone(row);
    const out = resolveArticleYearTokens(row, { now: BEFORE });
    assert.equal(out.title_fr, 'Ramadan 2027 au Maroc : dates et calendrier');
    assert.equal(out.title_ar, 'رمضان 2027: متى يبدأ؟');
    assert.equal(out.seo_title_fr, 'Dates du Ramadan 2027');
    assert.equal(out.excerpt_fr, 'Le Ramadan 2027 commence en février.');
    assert.equal(out.seo_description_ar, 'وصف 2027.');
    assert.equal(out.excerpt_en, null);
    assert.equal(out.seo_description_en, 'Plain.');
    assert.equal(out.body_fr, 'Corps', 'a body token is removed, never resolved — the gate refuses it, the admin does not');
    assert.deepEqual(row, copy, 'the input row is never mutated');
    const later = resolveArticleYearTokens(row, { now: AFTER });
    assert.equal(later.seo_title_fr, 'Dates du Ramadan');
    assert.equal(later.title_ar, 'رمضان: متى يبدأ؟');
    const plain = { title_fr: 'Omra', body_fr: 'Corps {{live:cta intent=ramadan}}' };
    assert.equal(resolveArticleYearTokens(plain, { now: BEFORE }), plain, 'nothing to resolve → the same object');
    assert.equal(articleHasYearTokens(plain), false);
    // Prose between two {{live:…}} tags borrows their braces but is no token: no Hijri query, no copy.
    const live = { title_fr: 'Omra', body_en: '{{live:countdown event=ramadan_1448_start}} Year: the start {{live:cta intent=ramadan}}' };
    assert.equal(articleHasYearTokens(live), false);
    assert.equal(resolveArticleYearTokens(live, { now: BEFORE }), live);
    assert.equal(articleHasYearTokens(row), true);
    const bodyOnly = { title_fr: 'Omra', body_ar: 'رمضان {year:ramadan} يبدأ' };
    assert.equal(articleHasYearTokens(bodyOnly), true, 'a body token alone still sends the row through the mapper');
    assert.equal(resolveArticleYearTokens(bodyOnly, { now: BEFORE }).body_ar, 'رمضان يبدأ');
    assert.equal(resolveArticleYearTokens(null), null);
  });
});

describe('the pure token helpers the dependency-free gate uses', () => {
  test('classify, strip and measure', () => {
    assert.deepEqual(yearTokensOf('a {year:ramadan_1448_start} b {year:foo} c {year: x}').map((t) => t.kind), ['valid', 'unknown', 'malformed']);
    assert.equal(hasYearToken('Omra {year}'), false);
    assert.equal(stripYearTokens(T), 'Ramadan au Maroc : dates et calendrier');
    assert.equal(measureYearTokens(T).length, T.length - '{year:ramadan_1448_start}'.length + 4);
    assert.deepEqual(validateYearTokens(T), []);
    assert.match(validateYearTokens('{year: ramadan}')[0], /jeton d'année mal formé « \{year: ramadan\} »/);
    assert.match(validateYearTokens('{year:ramadan_2027}')[0], /événement hégirien inconnu/);
  });
  test('what no token pattern reads but was meant as one fails too: a stray brace, a year key before a dated tag', () => {
    for (const s of ['{yaer:ramadan_1448_start}', '{year;ramadan_1448_start}', '{year=ramadan_1448_start}', '{year ramadan_1448_start}', '{an:ramadan_1448_start}', '{année:ramadan_1448_start}', '{}', 'year:ramadan_1448_start', '[year:ramadan_1448_start]', 'année=ramadan_1448']) {
      const p = validateYearTokens(`Dates du Ramadan ${s} : début, fin`);
      assert.equal(p.length, 1, s);
      assert.match(p[0], /accolade hors d'un jeton|jeton d'année mal formé/, s);
    }
    for (const s of ['This year: dates and calendar', 'Omra 2 fois par an : le calendrier', 'Ramadan (dates et calendrier)', T]) assert.deepEqual(validateYearTokens(s), [], s);
  });
  test('a token without a Hijri year fails: the next occurrence never disappears', () => {
    assert.match(validateYearTokens('Ramadan {year:ramadan} : les dates')[0], /sans année hégirienne/);
    assert.deepEqual(validateYearTokens('Ramadan {year:ramadan_1448} : les dates'), []);
  });
});

// The strict shared gate (src/lib/server/article-gate.mjs) — called directly, as tests/articles.test.mjs does.
const para = 'Cette phrase de démonstration sert uniquement à vérifier le contrôle qualité automatique du blog et ne contient aucune information réelle. ';
const filler = (n) => Array.from({ length: n }, () => para).join('');
const COUNTDOWN = '\n\n<HijriCountdown event="ramadan_1448_start" />';
const body = (extra = COUNTDOWN) =>
  `${filler(4)}\n\n## Comment cela fonctionne\n\n${filler(8)}\n\n<CommercialCTA to="/bab-makka" />\n\n## Ce qu'il faut prévoir\n\n${filler(8)}${extra}\n\n## Le déroulé\n\n${filler(8)}\n\n## Questions fréquentes\n\n### Première question ?\n\n${filler(3)}\n\n### Deuxième question ?\n\n${filler(3)}\n\n### Troisième question ?\n\n${filler(3)}\n`;
const draft = () => ({
  query_family: 'dates du ramadan debut fin calendrier', owner_path: '/bab-makka', category: 'omra', slug: 'test-article-annee',
  title_fr: 'Ramadan {year:ramadan_1448_start} : début, fin et ce qu’elles changent', title_ar: 'رمضان {year:ramadan_1448_start}: متى يبدأ ومتى ينتهي؟', title_en: 'Ramadan {year:ramadan_1448_start}: when it starts and ends',
  excerpt_fr: 'Extrait de démonstration.', excerpt_ar: 'مقتطف تجريبي.', excerpt_en: 'Sample excerpt.',
  seo_title_fr: T, seo_title_ar: 'تواريخ رمضان {year:ramadan_1448_start}: البداية والنهاية', seo_title_en: 'Ramadan {year:ramadan_1448_start} dates: start and end',
  seo_description_fr: 'Description de démonstration servant à vérifier le contrôle automatique du blog, sans valeur éditoriale, entre cent vingt et cent cinquante caractères.',
  seo_description_ar: 'وصف تجريبي.', seo_description_en: 'Sample description.',
  body_fr: body(), body_ar: body(), body_en: body(),
});
const gate = (d) => qualityGate(d, { ownerPath: d.owner_path, existingSlugs: [], priceSet: [] });

describe('qualityGate — a valid token is a live component, a year in clear still fails', () => {
  test('a token title whose event the body shows passes, and its length counts the token as 4 characters', () => {
    const d = draft();
    assert.ok(T.length > 60, 'the raw seo_title is over 60 characters…');
    assert.ok(measureYearTokens(T).length + ' | Bab Makka'.length <= 60, '…but renders under 60 with the brand');
    assert.deepEqual(gate(d).problems, []);
  });
  test('a literal year still fails — alone or beside a token', () => {
    const d = draft();
    d.seo_title_fr = 'Ramadan 2027 au Maroc : dates et calendrier';
    d.title_en = 'Ramadan {year:ramadan_1448_start} and Eid 2027';
    const p = gate(d).problems.join('\n');
    assert.match(p, /seo_title_fr : année en clair « 2027 »/);
    assert.match(p, /title_en : année en clair « 2027 »/);
  });
  test('a year in clear fails in any digit script and glued to a word — the founding year and digit runs stay allowed', () => {
    for (const s of ['رمضان ٢٠٢٧', 'رمضان ۲۰۲۷', 'Ramadan２０２７', 'Ramadan2027', 'Ramadan_2027', 'Ramadan 2027']) {
      assert.deepEqual(proseViolations(s).filter((v) => v.rule === 'année').length, 1, s);
    }
    assert.equal(proseViolations('رمضان ٢٠٢٧')[0].match, '٢٠٢٧', 'the match is reported as written');
    assert.equal(proseViolations('١٢٠٠٠ MAD').some((v) => v.rule === 'montant'), true, 'an amount in Arabic-Indic digits too');
    for (const s of ['Wiki Tours International, depuis 2016', 'منذ ٢٠١٦', 'licence ODV-25012', '+212522202345', '120265 pas']) {
      assert.deepEqual(proseViolations(s).filter((v) => v.rule === 'année'), [], s);
    }
    assert.equal(westernDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹ ０１２３４５６７８９'), '0123456789 0123456789 0123456789');
    const d = draft();
    d.title_ar = 'رمضان ٢٠٢٧: متى يبدأ ومتى ينتهي؟';
    assert.match(gate(d).problems.join('\n'), /title_ar : année en clair « ٢٠٢٧ »/);
    assert.ok(FOUNDING_CONTEXT.test('منذ عام ') && FOUNDING_CONTEXT.test('fondee en '), 'the founding words the build\'s seo-suite reads too');
  });
  test('an amount, a date or a seat count ending in an Arabic word (or € / $) fails — \\b never matched after it', () => {
    for (const [s, rule] of [['١٥٠٠٠ درهم', 'montant'], ['12 300 درهم للشخص', 'montant'], ['à 12 € par nuit', 'montant'], ['يبدأ يوم 8 فبراير', 'date'], ['8 مارس.', 'date'], ['بقي 5 مقاعد فقط', 'nombre de places'], ['le 8 février', 'date']]) {
      assert.ok(proseViolations(s).some((v) => v.rule === rule), `${s} → ${rule}`);
    }
    for (const s of ['في النصف الأول من فبراير', 'les 3 placements', 'رحلة 15 يوما', 'ODV-25012']) assert.deepEqual(proseViolations(s), [], s);
  });
  test('a malformed or unknown token fails with a French message naming the field', () => {
    const d = draft();
    d.seo_title_fr = 'Ramadan {year: ramadan_1448_start} au Maroc';
    d.excerpt_ar = 'رمضان {year:ramadan_2027} بالمغرب';
    const p = gate(d).problems.join('\n');
    assert.match(p, /seo_title_fr : jeton d'année mal formé « \{year: ramadan_1448_start\} »/);
    assert.match(p, /excerpt_ar : jeton d'année « \{year:ramadan_2027\} » : événement hégirien inconnu/);
  });
  test('a token whose event the body does not show fails; a token in a body fails', () => {
    const d = draft();
    d.title_fr = 'Ramadan {year:ramadan_1449_start} : les dates';
    d.body_en = body(`${COUNTDOWN} Ramadan {year:ramadan_1448_start}.`);
    const p = gate(d).problems.join('\n');
    assert.match(p, /title_fr : jeton « \{year:ramadan_1449_start\} » sans <HijriCountdown event="ramadan_1449_start" \/> dans body_fr/);
    assert.match(p, /body_en : jeton d'année « \{year:ramadan_1448_start\} » interdit dans le corps/);
  });
  test('a title longer than 60 once measured still fails; a field that is only a token is empty', () => {
    const d = draft();
    d.seo_title_fr = 'Ramadan {year:ramadan_1448_start} au Maroc : dates, calendrier, nuits et Aïd al-Fitr';
    d.title_ar = '{year:ramadan_1448_start}';
    const p = gate(d).problems.join('\n');
    assert.match(p, new RegExp(`seo_title_fr trop long une fois la marque ajoutée : ${measureYearTokens(d.seo_title_fr).length} > 60`));
    assert.match(p, /title_ar vide/);
  });
  test('clampDescription measures a token as 4 characters and never cuts one in half', () => {
    const fits = 'Le Ramadan {year:ramadan_1448_start} commence selon le calendrier Umm al-Qura, celui de La Mecque ; voici ce que ces dates changent pour une Omra depuis le Maroc.';
    assert.ok(fits.length > 155 && measureYearTokens(fits).length <= 155);
    assert.equal(clampDescription(fits), fits);
    const long = `${'mot '.repeat(36)}Ramadan {year:ramadan_1448_start} et encore des mots pour dépasser la limite.`;
    const cut = clampDescription(long);
    assert.ok(measureYearTokens(cut).length <= 155);
    assert.ok([...cut].every((c) => c.charCodeAt(0) < 0xe000 || c.charCodeAt(0) > 0xf8ff), 'no mask character left');
    assert.ok(!cut.includes('{year') || cut.includes('{year:ramadan_1448_start}'), cut);
    assert.equal(clampDescription('Courte description.'), 'Courte description.');
  });
  test('a token title that reads like another row\'s once the year is gone fails at insert time (the 1449 clone)', () => {
    const live = draft();
    const readings = new Map(yearlessReadings({ ...live, slug: 'ramadan-2027-dates' }).map((r) => [r, 'ramadan-2027-dates']));
    const clone = draft();
    for (const k of ['title_fr', 'title_ar', 'title_en', 'seo_title_fr', 'seo_title_ar', 'seo_title_en']) clone[k] = clone[k].replaceAll('ramadan_1448_start', 'ramadan_1449_start');
    clone.body_fr = body(COUNTDOWN.replace('1448', '1449'));
    clone.body_ar = clone.body_fr;
    clone.body_en = clone.body_fr;
    const p = qualityGate(clone, { ownerPath: clone.owner_path, existingSlugs: [], priceSet: [], existingReadings: readings }).problems.join('\n');
    assert.match(p, /title_fr : même texte que \/blog\/ramadan-2027-dates une fois l'année d'un jeton passée/);
    assert.match(p, /seo_title_en : même texte/);
    // Its own row is never a twin, and the check runs only when the caller passes the readings.
    assert.deepEqual(qualityGate({ ...live, slug: 'ramadan-2027-dates' }, { ownerPath: live.owner_path, existingSlugs: [], priceSet: [], existingReadings: readings }).problems, []);
    assert.deepEqual(gate(clone).problems, []);
    // Folded like G8: case, punctuation and Arabic vowel marks do not make two titles differ.
    assert.deepEqual(yearlessReadings({ title_ar: 'ماذا تغيّر تواريخه؟' }).slice(0, 1), yearlessReadings({ title_ar: 'ماذا تغير تواريخه' }).slice(0, 1));
  });
});

describe('refreshYearTokenPages — the site-wide revalidation the crons run', () => {
  const adminWith = (result) => ({ from: () => ({ select: () => ({ eq: async () => (result instanceof Error ? Promise.reject(result) : result) }) }) });
  const quiet = async (fn) => {
    const { error } = console;
    const logged = [];
    console.error = (...a) => logged.push(a.join(' '));
    try {
      return { value: await fn(), logged };
    } finally {
      console.error = error;
    }
  };
  test('revalidates the layout once when a token reads differently than two days before, nothing otherwise', async () => {
    const calls = [];
    const opts = { revalidate: (...a) => calls.push(a), events: async () => [] };
    const rows = { data: [{ slug: 'a', title_fr: 'Omra' }, { slug: 'b', seo_title_fr: T }] };
    // 00:30 UTC on 1 January is already 1 January in Casablanca under UTC+0 and UTC+1 alike.
    assert.equal(await refreshYearTokenPages(adminWith(rows), { ...opts, now: new Date('2028-01-01T00:30:00Z') }), true);
    assert.deepEqual(calls, [['/', 'layout']]);
    assert.equal(await refreshYearTokenPages(adminWith(rows), { ...opts, now: new Date('2027-06-01T08:00:00Z') }), false);
    assert.equal(calls.length, 1);
  });
  test('a failed check is "error" and logged — never mistaken for "nothing changed"', async () => {
    const opts = { revalidate: () => assert.fail('nothing may be revalidated'), events: async () => [], now: new Date('2028-01-01T08:00:00Z') };
    for (const admin of [adminWith({ data: null, error: { message: 'column missing' } }), adminWith(new Error('network')), { from: () => { throw new Error('no client'); } }]) {
      const { value, logged } = await quiet(() => refreshYearTokenPages(admin, opts));
      assert.equal(value, 'error');
      assert.equal(logged.length, 1);
    }
    const { value } = await quiet(() => refreshYearTokenPages(adminWith({ data: [{ title_fr: T }] }), { ...opts, events: async () => { throw new Error('hijri'); } }));
    assert.equal(value, 'error');
  });
});
