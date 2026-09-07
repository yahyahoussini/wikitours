import { createHash } from 'node:crypto';

/** Morocco-first E.164 normalization, then SHA-256 (ad platforms' format). */
export function normalizePhone(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) digits = `212${digits.slice(1)}`;
  return digits ? `+${digits}` : null;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

// CSV injection: Excel/Sheets evaluate any cell whose text starts with = + - @
// (or a leading tab/CR) as a formula, and full_name / city / utm_* / gclid reach
// this file verbatim from the UNAUTHENTICATED public lead form. Quoting does not
// help — the parser strips the quotes and the formula still runs on open. Prefix
// a single quote so the spreadsheet imports the value as literal text. Pure
// numbers are exempt so value_mad keeps its numeric type.
const RISKY_PREFIX = /^[=+\-@\t\r]/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

function csvCell(value) {
  const raw = value == null ? '' : String(value);
  const s = RISKY_PREFIX.test(raw) && !NUMERIC.test(raw) ? `'${raw}` : raw;
  // \r included: toCsv joins rows with \r\n, so an unquoted bare \r inside a
  // value silently splits the row.
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Builds {filename, rows} for the three lead export formats. */
export function buildLeadsExport(fmt, leads) {
  if (fmt === 'oci') {
    // Google Ads Offline Conversion Import / Enhanced Conversions for Leads.
    return {
      filename: 'google-ads-oci.csv',
      rows: [
        ['Parameters:TimeZone=Africa/Casablanca'],
        ['Google Click ID', 'Phone Number', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency'],
        ...leads
          .filter((l) => l.gclid && l.status === 'paid_deposit')
          .map((l) => {
            const phone = normalizePhone(l.phone);
            return [
              l.gclid,
              phone ? sha256(phone) : '',
              'lead_paid_deposit',
              new Date(l.updated_at ?? l.created_at).toISOString().replace('T', ' ').slice(0, 19) + '+00:00',
              l.value_mad ?? '',
              'MAD',
            ];
          }),
      ],
    };
  }

  if (fmt === 'meta') {
    // Meta Offline Conversions.
    return {
      filename: 'meta-offline.csv',
      rows: [
        ['event_name', 'event_time', 'phone', 'value', 'currency'],
        ...leads
          .filter((l) => l.status === 'paid_deposit')
          .map((l) => {
            const phone = normalizePhone(l.phone);
            return [
              'PaidDeposit',
              Math.floor(new Date(l.updated_at ?? l.created_at).getTime() / 1000),
              phone ? sha256(phone) : '',
              l.value_mad ?? '',
              'MAD',
            ];
          }),
      ],
    };
  }

  return {
    filename: 'leads.csv',
    rows: [
      ['created_at', 'full_name', 'phone', 'city', 'offer_title', 'room_type', 'status', 'value_mad', 'assigned_to',
       'locale', 'source', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid',
       'geo_city', 'region', 'country', 'device'],
      ...leads.map((l) => [
        l.created_at, l.full_name, l.phone, l.city, l.offer_title, l.room_type, l.status, l.value_mad, l.assigned_to,
        l.locale, l.source, l.utm_source, l.utm_medium, l.utm_campaign, l.gclid, l.fbclid,
        l.geo_city, l.region, l.country, l.device,
      ]),
    ],
  };
}
