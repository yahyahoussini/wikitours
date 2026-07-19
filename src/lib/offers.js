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
 * schema.org availability, computed from data (never the raw status alone):
 *   SoldOut               → status=full OR seats_remaining=0 OR departed
 *   LimitedAvailability   → status=few_left OR seats_remaining ≤ 5
 *   InStock               → otherwise
 * seats_remaining, when set, overrides the enum.
 */
export function offerAvailability(offer, today = todayISO()) {
  const seats = offer?.seats_remaining;
  if (offer?.status === 'full' || seats === 0 || isOfferPast(offer, today)) {
    return 'https://schema.org/SoldOut';
  }
  if (offer?.status === 'few_left' || (typeof seats === 'number' && seats <= LOW_SEATS)) {
    return 'https://schema.org/LimitedAvailability';
  }
  return 'https://schema.org/InStock';
}

/** Show a real remaining-seats line ONLY when a number exists (LAWS §6). */
export function seatsLabel(offer) {
  return typeof offer?.seats_remaining === 'number' ? offer.seats_remaining : null;
}
