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

/** Show a real remaining-seats line ONLY when a number exists (LAWS §6). */
export function seatsLabel(offer) {
  return typeof offer?.seats_remaining === 'number' ? offer.seats_remaining : null;
}
