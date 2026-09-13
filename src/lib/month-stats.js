/**
 * The DATA-DERIVED blocks of a month lander, as pure functions over published
 * offers (past and future — getOfferHistory) so they are unit-testable and
 * never invent a figure: every number here is a real departure's. A block
 * with no data returns null and the page omits it (LAW §10).
 */

const ROOM_PRICE_KEYS = ['price_double', 'price_triple', 'price_quad', 'price_quint'];

/** Every per-person price an offer advertised — its gammes, or the legacy row prices. */
export function offerPrices(offer) {
  const tiers = offer?.tiers?.length ? offer.tiers : [offer ?? {}];
  const prices = tiers.flatMap((t) => ROOM_PRICE_KEYS.map((k) => t?.[k])).filter((p) => typeof p === 'number' && p > 0);
  if (!prices.length && typeof offer?.starting_price === 'number' && offer.starting_price > 0) prices.push(offer.starting_price);
  return prices;
}

const monthOf = (offer) => (offer?.date_start ? new Date(offer.date_start).getUTCMonth() : null);
const yearOf = (offer) => (offer?.date_start ? new Date(offer.date_start).getUTCFullYear() : null);

/** Departures of that month that have already left (any year). */
export function pastDeparturesInMonth(offers, monthIndex, today = new Date()) {
  const todayISO = today.toISOString().slice(0, 10);
  return (offers ?? []).filter((o) => monthOf(o) === monthIndex && o.date_start < todayISO);
}

/** "Prix observés": the per-person range across the given departures. */
export function historicPriceRange(offers) {
  const prices = (offers ?? []).flatMap(offerPrices);
  if (!prices.length) return null;
  const years = [...new Set((offers ?? []).map(yearOf).filter(Boolean))].sort();
  return { min: Math.min(...prices), max: Math.max(...prices), count: offers.length, years };
}

/**
 * "Last season": the most recent PAST year (before targetYear) that had
 * departures in this month, with what was sold — dates, duration, airline,
 * Makkah hotel, cheapest price. Null when this month has no history yet.
 */
export function lastSeasonDepartures(offers, monthIndex, targetYear) {
  const past = (offers ?? []).filter((o) => monthOf(o) === monthIndex && yearOf(o) < targetYear);
  if (!past.length) return null;
  const year = Math.max(...past.map(yearOf));
  const departures = past
    .filter((o) => yearOf(o) === year)
    .sort((a, b) => (a.date_start < b.date_start ? -1 : 1))
    .map((o) => ({
      slug: o.slug,
      date_start: o.date_start,
      date_end: o.date_end ?? null,
      duration_days: o.duration_days ?? null,
      duration_nights: o.duration_nights ?? null,
      airline: o.land_only ? null : (o.airline ?? null),
      hotels: [...new Set((o.tiers ?? []).map((t) => t.hotel_makkah?.name).filter(Boolean))],
      from: offerPrices(o).length ? Math.min(...offerPrices(o)) : null,
    }));
  return { year, departures };
}

const HIJRI_LOCALE = { fr: 'fr-MA', ar: 'ar-MA', en: 'en' };
function hijriParts(date, locale) {
  const parts = new Intl.DateTimeFormat(`${HIJRI_LOCALE[locale] ?? 'en'}-u-ca-islamic-umalqura`, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date);
  const numeric = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: 'UTC' }).formatToParts(date);
  return {
    label: parts.map((p) => p.value).join('').trim(),
    month: Number(numeric.find((p) => p.type === 'month')?.value),
  };
}

/**
 * Which Hijri month(s) a Gregorian month spans, from the Umm al-Qura calendar
 * ICU ships — computed, never typed in. `months` holds the Hijri month
 * numbers touched (1 = Muharram … 9 = Ramadan … 12 = Dhu al-Hijja), so the
 * page can state calendar facts: Ramadan, the Hajj month, Mawlid's month.
 */
export function hijriOverlap(monthIndex, year, locale) {
  const first = hijriParts(new Date(Date.UTC(year, monthIndex, 1)), locale);
  const last = hijriParts(new Date(Date.UTC(year, monthIndex + 1, 0)), locale);
  const months = first.month === last.month ? [first.month] : [first.month, last.month];
  return {
    first: first.label,
    last: last.label,
    sameMonth: first.month === last.month,
    months,
    ramadan: months.includes(9),
    hajj: months.includes(12),
    mawlid: months.includes(3),
    muharram: months.includes(1),
  };
}

/** Words in the evergreen sections — the report's substance count, not a gate. */
export function wordCount(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
}
