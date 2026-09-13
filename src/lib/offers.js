/**
 * Offer lifecycle helpers — the single source for "is this departure past?" and
 * the schema.org availability, so the visible state and the JSON-LD can never
 * disagree (which is exactly what the seo-audit stale-offer detector catches).
 */

const LOW_SEATS = 5; // seats_remaining at/below this reads as "few left"

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** True once the trip's end date has passed. */
export function isOfferPast(offer, today = todayISO()) {
  return Boolean(offer?.date_end && offer.date_end < today);
}


/**
 * True once the DEPARTURE date has passed. Bookability ends at departure — you
 * cannot join a flight that already left — which is also what `validThrough`
 * advertises on the Offer node. Distinct from isOfferPast(), which asks whether
 * the whole trip (incl. the return) is over.
 */
export function hasDeparted(offer, today = todayISO()) {
  return Boolean(offer?.date_start && offer.date_start < today);
}

/**
 * schema.org availability, computed from data (never the raw status alone):
 *   SoldOut               → status=full OR seats_remaining=0 OR departed
 *   LimitedAvailability   → status=few_left OR seats_remaining ≤ 5
 *   InStock               → otherwise
 * seats_remaining, when set, overrides the enum.
 */
export function offerAvailability(offer, today = todayISO()) {
  const seats = offer?.seats_remaining;
  if (offer?.status === 'full' || seats === 0 || hasDeparted(offer, today)) {
    return 'https://schema.org/SoldOut';
  }
  if (offer?.status === 'few_left' || (typeof seats === 'number' && seats <= LOW_SEATS)) {
    return 'https://schema.org/LimitedAvailability';
  }
  return 'https://schema.org/InStock';
}

/**
 * The status the PAGE should show, derived from the same inputs as
 * offerAvailability() — so the visible badge and the JSON-LD can never disagree,
 * which is the invariant this module exists to hold. Rendering the raw
 * `offer.status` enum instead is what breaks it: a row with status='open' and
 * seats_remaining=0 reads "Places disponibles" while the markup says SoldOut.
 *
 * Returns a key of t.offer.status ('open' | 'few_left' | 'full'), or 'departed'
 * for a departure that has already left — callers give that its own treatment
 * (t.offer.departed), because "Complet" would misdescribe it.
 */
export function visibleStatusKey(offer, today = todayISO()) {
  if (hasDeparted(offer, today)) return 'departed';
  const seats = offer?.seats_remaining;
  if (offer?.status === 'full' || seats === 0) return 'full';
  if (offer?.status === 'few_left' || (typeof seats === 'number' && seats <= LOW_SEATS)) return 'few_left';
  return 'open';
}

/** Show a real remaining-seats line ONLY when a number exists (LAWS §6). */
export function seatsLabel(offer) {
  return typeof offer?.seats_remaining === 'number' ? offer.seats_remaining : null;
}

/** Whole UTC days from an ISO date to `today` (negative when in the future). */
export function daysSince(dateISO, today = todayISO()) {
  const [y1, m1, d1] = String(dateISO).slice(0, 10).split('-').map(Number);
  const [y2, m2, d2] = String(today).slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** A departure is archived for this many days after its RETURN date, then retired. */
export const ARCHIVE_DAYS = 90;

/**
 * Departure lifecycle, from the RETURN date (date_end) alone — never a flag:
 *   live      future or in progress (date_end ≥ today, or no dates)
 *             → index, follow · self-canonical · in the sitemap
 *   archived  returned 1..90 days ago
 *             → noindex, follow · self-canonical · "archived" banner
 *   retired   returned > 90 days ago
 *             → 301 to the month lander (middleware; page backstop) —
 *               retiredRedirectPath() in src/lib/months.js picks the target
 * The transitions are exact: the return day itself is still live; day 90 is
 * still archived; day 91 is retired (tests/offers.test.mjs).
 */
export function offerLifecycle(offer, today = todayISO()) {
  if (!offer?.date_end || offer.date_end >= today) return 'live';
  return daysSince(offer.date_end, today) <= ARCHIVE_DAYS ? 'archived' : 'retired';
}

/** Only live departures are indexable — the sitemap and robots meta share this. */
export function offerIndexable(offer, today = todayISO()) {
  return offerLifecycle(offer, today) === 'live';
}
