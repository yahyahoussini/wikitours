/**
 * Client identity for the CRM: the last 9 digits of the phone number (the
 * Moroccan national significant number). Matches the same person across
 * formatting variants — "06 12 34 56 78", "0612345678", "+212612345678" all
 * produce the same key. Profiles are derived from this key; no table needed.
 */
export function phoneKey(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.slice(-9);
}
