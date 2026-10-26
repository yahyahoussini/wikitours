/**
 * The name of an offer's airline in the page's language.
 *
 * The admin field is free text, and three spellings of the same carrier exist
 * ("Saudia", "Saudia Airlines", "Saudia Airlines (الخطوط السعودية)"). Printed raw,
 * the Arabic departure pages read « طيران Saudia » and the French cards carried
 * Arabic in brackets. A known carrier resolves to the dictionary's name
 * (offer.airlineNames.<key>); anything else is shown as typed.
 */
const CARRIERS = [{ key: 'saudia', match: /saudi|سعودي/i }];

export function airlineName(raw, t) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const carrier = CARRIERS.find((c) => c.match.test(value));
  return (carrier && t?.offer?.airlineNames?.[carrier.key]) || value;
}
