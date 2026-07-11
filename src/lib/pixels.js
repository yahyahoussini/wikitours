/**
 * Client-side pixel firing for lead success. The same event_id goes to the
 * server (CAPI / TikTok Events API) so the platforms dedup browser+server.
 * Every call is defensive: pixels may be absent (not configured, consent
 * declined, blocked) and that must never break the form.
 */

/** "06 12 34 56 78" → "+212612345678" (Moroccan) or E.164 passthrough. */
export function toE164(phone) {
  const cleaned = String(phone ?? '').replace(/[\s.\-()]/g, '');
  if (/^0[5-7]\d{8}$/.test(cleaned)) return `+212${cleaned.slice(1)}`;
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  return null;
}

export function fireLeadPixels({ eventId, phone }) {
  const phoneE164 = toE164(phone);

  try {
    window.fbq?.('track', 'Lead', {}, { eventID: eventId });
  } catch { /* never blocks */ }

  try {
    window.ttq?.track?.('SubmitForm', { event_id: eventId });
  } catch { /* never blocks */ }

  try {
    const mkt = window.__wtMkt;
    if (window.gtag && mkt?.ads && mkt?.label) {
      // Enhanced conversions: Google hashes user_data itself.
      if (phoneE164) window.gtag('set', 'user_data', { phone_number: phoneE164 });
      window.gtag('event', 'conversion', {
        send_to: `${mkt.ads}/${mkt.label}`,
        transaction_id: eventId,
      });
    }
  } catch { /* never blocks */ }
}
