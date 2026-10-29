import { YEAR_TOKEN_FIELDS, hasYearToken, replaceYearTokens, stripYearTokens, stripBodyYearTokens } from './content-tags.js';
import { hijriTagDate, todayCasablanca } from './hijri.js';

/**
 * {year:<tag>} in an article's title / seo_title / excerpt / seo_description
 * → the Gregorian year of that Hijri event, or nothing once that year is past.
 *
 * Titles never carry a year in clear (gate G5, and the build fails a past
 * year in a rendered title), so they never go stale. A post pinned to a dated
 * event — « Ramadan {year:ramadan_1448_start} au Maroc » — still says its
 * year: the page computes it from the same date its <HijriCountdown> shows
 * (hijriTagDate, src/lib/hijri.js, Umm al-Qura or the admin-confirmed row),
 * prints it while the current year in Africa/Casablanca is not past it, and
 * drops it after, so the title reads « Ramadan au Maroc » from 1 January on.
 * Years are written in Western digits in every locale, as the Arabic titles
 * of this site already do (« عمرة رمضان 2027 من المغرب »).
 *
 * Public reads resolve (src/lib/data/content.js getArticles / getArticleBySlug,
 * so every page, card, OG image, JSON-LD node and llms.txt line gets resolved
 * text); the admin reads raw rows and keeps the token. A token in a BODY is
 * removed by the same readers, never resolved (the gate fails it). The daily
 * release cron revalidates the site the day a token's reading changes
 * (yearTokensChanged). Parsing, validation and the gate's stripping are in
 * src/lib/content-tags.js (dependency-free).
 */
export { YEAR_TOKEN_RE, YEAR_TOKEN_FIELDS, YEAR_TOKEN_WIDTH, hasYearToken, yearTokensOf, stripYearTokens, measureYearTokens, validateYearTokens } from './content-tags.js';

/** The 12 article columns a token may sit in. */
export const YEAR_TOKEN_COLUMNS = Object.freeze(YEAR_TOKEN_FIELDS.flatMap((f) => ['fr', 'ar', 'en'].map((l) => `${f}_${l}`)));
// Where a token may NOT sit, but an editor could paste one through the admin.
const BODY_COLUMNS = Object.freeze(['body_fr', 'body_ar', 'body_en']);

// The options of every reader below, read inside its try: `null` is no options, never a TypeError.
function optionsOf(opts) {
  const { now = new Date(), events = [] } = opts ?? {};
  return { now, events };
}

// The year of the date a tag points at, from Casablanca's `today` (YYYY-MM-DD).
function yearFrom(tag, today, events) {
  try {
    const date = hijriTagDate(tag, { today, rows: events });
    const y = Number(String(date?.gregorian_date ?? '').slice(0, 4));
    return Number.isInteger(y) && y > 0 ? y : null;
  } catch {
    return null;
  }
}

/** The Gregorian year of the date a tag points at (as <HijriCountdown> computes it), or null. Never throws. */
export function yearOfTag(tag, opts) {
  try {
    const { now, events } = optionsOf(opts);
    return yearFrom(tag, todayCasablanca(now), events);
  } catch {
    return null;
  }
}

/**
 * Resolve every year token of a text. `now` is injectable for tests; `events`
 * are public.hijri_events rows (the admin-confirmed dates), as the countdown
 * reads them. A valid token whose year is this year or later (Casablanca)
 * becomes that year; a past one, an unknown or a malformed token is removed
 * and the text tidied. Never throws: if anything fails, every token goes.
 */
export function resolveYearTokens(text, opts) {
  if (!hasYearToken(text)) return text;
  try {
    const { now, events } = optionsOf(opts);
    const today = todayCasablanca(now);
    const thisYear = Number(today.slice(0, 4));
    return replaceYearTokens(text, (t) => {
      if (t.kind !== 'valid') return null;
      const y = yearFrom(t.tag, today, events);
      return y != null && thisYear <= y ? String(y) : null;
    });
  } catch {
    try {
      return stripYearTokens(text);
    } catch {
      return text
        .replace(/[{}｛｝]+[^\S\n]*years?[^\S\n]*[:：][^{}｛｝\s]*[{}｛｝]*|(?<![\p{L}\p{N}_])years?[^\S\n]*[:：][^\S\n]*[^{}｛｝\s]+[^\S\n]*[{}｛｝]+/giu, '')
        .replace(/ {2,}/g, ' ')
        .trim();
    }
  }
}

/**
 * An article row with its 12 token columns resolved and any token in a body
 * removed (stripBodyYearTokens — removed, never resolved); every other column
 * untouched. Returns the same object when there is nothing to do, a shallow
 * copy otherwise — the input is never mutated. Never throws.
 */
export function resolveArticleYearTokens(row, opts) {
  if (!row || typeof row !== 'object') return row;
  let now;
  let events;
  try {
    ({ now, events } = optionsOf(opts));
  } catch {
    now = new Date();
    events = [];
  }
  let out = row;
  for (const col of YEAR_TOKEN_COLUMNS) {
    if (!hasYearToken(row[col])) continue;
    if (out === row) out = { ...row };
    // One `now` for the whole row: a title and its description never straddle midnight.
    out[col] = resolveYearTokens(row[col], { now, events });
  }
  for (const col of BODY_COLUMNS) {
    if (!hasYearToken(row[col])) continue;
    if (out === row) out = { ...row };
    try {
      out[col] = stripBodyYearTokens(row[col]);
    } catch {
      out[col] = row[col];
    }
  }
  return out;
}

/** True when a row holds a token anywhere a reader shows it (the 12 title columns or a body) — the readers map the row only then. */
export function articleHasYearTokens(row) {
  return Boolean(row) && [...YEAR_TOKEN_COLUMNS, ...BODY_COLUMNS].some((col) => hasYearToken(row[col]));
}

/**
 * True when a title token of these rows reads differently at `now` than at
 * `since` (default: a day earlier) — the day every cached page showing it went
 * stale: its year just ended, or a bare tag's next occurrence moved on. Pages
 * rendered with revalidate = false (the share cards, some listings) would keep
 * the old reading until a deploy; the daily release cron revalidates the site
 * on it (src/app/api/cron/publish-articles/route.js). Never throws.
 */
export function yearTokensChanged(rows, opts) {
  try {
    const { now, events } = optionsOf(opts);
    const since = opts?.since ?? new Date(now.getTime() - 86400000);
    return (Array.isArray(rows) ? rows : []).some((row) => Boolean(row) && YEAR_TOKEN_COLUMNS.some((col) => hasYearToken(row[col]) && resolveYearTokens(row[col], { now, events }) !== resolveYearTokens(row[col], { now: since, events })));
  } catch {
    return false;
  }
}
