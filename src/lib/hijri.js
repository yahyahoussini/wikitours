import umalquraModule from '@umalqura/core';
import { parseHijriEventTag } from './content-tags.js';

// The package is CommonJS (`module.exports.default = umalqura`); under ESM the
// callable sits on `.default` — resolve it once so both loaders work.
const umalqura = typeof umalquraModule === 'function' ? umalquraModule : umalquraModule.default;

/**
 * Hijri dates — Umm al-Qura calendar via @umalqura/core (zero dependency, MIT).
 *
 * Two uses:
 *   - `hijriEventsFor(hy)` computes the Gregorian date of every event the
 *     content system references (hard constraint 8). scripts/build-hijri-events.mjs
 *     writes them into public.hijri_events, where the admin can adjust a date
 *     once the moon sighting is announced (`is_confirmed`). The countdown
 *     component reads the table and falls back to this computation.
 *   - `hijriToday()` for the current Hijri date in Africa/Casablanca.
 *
 * Every rendered date carries the moon-sighting caveat (fr: « sous réserve de
 * l'observation de la lune » · ar: « حسب رؤية الهلال ») — the dictionaries hold
 * the three strings under `content.hijriCaveat`. Computed dates may move by
 * TOLERANCE_DAYS once the sighting is announced.
 *
 * Month numbers: 1 Muharram … 7 Rajab, 8 Sha'ban, 9 Ramadan, 10 Shawwal,
 * 11 Dhu al-Qa'dah, 12 Dhu al-Hijjah.
 */
export const TOLERANCE_DAYS = 2;

export const HIJRI_EVENT_DEFS = Object.freeze([
  { key: 'muharram', hm: 1, hd: 1, label_fr: 'Nouvel an hégirien (1er Muharram)', label_ar: 'رأس السنة الهجرية (فاتح محرم)', label_en: 'Hijri new year (1 Muharram)' },
  { key: 'ashura', hm: 1, hd: 10, label_fr: 'Achoura', label_ar: 'عاشوراء', label_en: 'Ashura' },
  { key: 'mawlid', hm: 3, hd: 12, label_fr: 'Mawlid', label_ar: 'المولد النبوي', label_en: 'Mawlid' },
  { key: 'rajab', hm: 7, hd: 1, label_fr: 'Début de Rajab', label_ar: 'بداية رجب', label_en: 'Start of Rajab' },
  { key: 'shaban', hm: 8, hd: 1, label_fr: 'Début de Chaâbane', label_ar: 'بداية شعبان', label_en: "Start of Sha'ban" },
  { key: 'ramadan', hm: 9, hd: 1, label_fr: 'Début du Ramadan', label_ar: 'بداية رمضان', label_en: 'Start of Ramadan' },
  { key: 'ramadan-last10', hm: 9, hd: 21, label_fr: 'Les dix derniers jours du Ramadan (21 Ramadan)', label_ar: 'العشر الأواخر من رمضان (21 رمضان)', label_en: 'The last ten days of Ramadan (21 Ramadan)' },
  { key: 'laylat-al-qadr', hm: 9, hd: 27, label_fr: 'Laylat al-Qadr (27 Ramadan)', label_ar: 'ليلة القدر (27 رمضان)', label_en: 'Laylat al-Qadr (27 Ramadan)' },
  { key: 'eid-al-fitr', hm: 10, hd: 1, label_fr: 'Aïd al-Fitr', label_ar: 'عيد الفطر', label_en: 'Eid al-Fitr' },
  { key: 'dhul-qada', hm: 11, hd: 1, label_fr: 'Début de Dhou al-Qi`da', label_ar: 'بداية ذي القعدة', label_en: "Start of Dhu al-Qa'dah" },
  { key: 'dhul-hijja', hm: 12, hd: 1, label_fr: 'Début de Dhou al-Hijja', label_ar: 'بداية ذي الحجة', label_en: 'Start of Dhu al-Hijjah' },
  { key: 'arafat', hm: 12, hd: 9, label_fr: 'Jour de Arafat', label_ar: 'يوم عرفة', label_en: 'Day of Arafah' },
  { key: 'eid-al-adha', hm: 12, hd: 10, label_fr: 'Aïd al-Adha', label_ar: 'عيد الأضحى', label_en: 'Eid al-Adha' },
]);
export const HIJRI_EVENT_KEYS = Object.freeze(HIJRI_EVENT_DEFS.map((e) => e.key));

const pad = (n) => String(n).padStart(2, '0');
// The library works in the process's LOCAL calendar (it builds `new Date(y, m, d)`
// and reads getFullYear/getMonth/getDate), so both directions use local
// components — a calendar date is a calendar date whatever the machine's zone.
/** Gregorian calendar date (YYYY-MM-DD) of a Hijri date, Umm al-Qura. */
export function hijriToGregorian(hy, hm, hd) {
  const d = umalqura(hy, hm, hd).date;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** { hy, hm, hd } of a calendar date (YYYY-MM-DD). */
export function gregorianToHijri(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const h = umalqura(new Date(y, m - 1, d, 12));
  return { hy: h.hy, hm: h.hm, hd: h.hd };
}

/** Today's calendar date in Africa/Casablanca (Morocco suspends DST in Ramadan — the zone handles it). */
export function todayCasablanca(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function hijriToday(now = new Date()) {
  return gregorianToHijri(todayCasablanca(now));
}

/** Every event of one Hijri year, with its computed Gregorian date. */
export function hijriEventsFor(hy) {
  return HIJRI_EVENT_DEFS.map((e) => ({ event: e.key, hijri_year: hy, hijri_month: e.hm, hijri_day: e.hd, gregorian_date: hijriToGregorian(hy, e.hm, e.hd), tolerance_days: TOLERANCE_DAYS, label_fr: e.label_fr, label_ar: e.label_ar, label_en: e.label_en }));
}

/** The next occurrence of an event on or after `fromDate` (YYYY-MM-DD), searching this Hijri year and the next two. */
export function nextHijriEvent(key, fromDate = todayCasablanca()) {
  const def = HIJRI_EVENT_DEFS.find((e) => e.key === key);
  if (!def) return null;
  const { hy } = gregorianToHijri(fromDate);
  for (const y of [hy - 1, hy, hy + 1, hy + 2]) {
    const date = hijriToGregorian(y, def.hm, def.hd);
    if (date >= fromDate) return { event: key, hijri_year: y, gregorian_date: date, days: Math.round((Date.parse(date) - Date.parse(fromDate)) / 86400000) };
  }
  return null;
}

// The brief's tag vocabulary (`ramadan_1448_start`, `arafah_1448` …) → event
// key + pinned year. Pure, defined beside the tag registry so the
// dependency-free gate validates it; re-exported here for the components.
export { parseHijriEventTag };

/**
 * The last ten nights of a Ramadan: night N (21…30) is the night BEFORE day N
 * — the evening of Gregorian date(N − 1). Odd nights flagged (Laylat al-Qadr
 * is sought among them). `startDate` (the stored, possibly confirmed
 * 1 Ramadan) overrides the computation when given.
 */
export function ramadanLastTenNights(hy, startDate = null) {
  const first = startDate ?? hijriToGregorian(hy, 9, 1);
  const t0 = Date.parse(`${first}T12:00:00Z`);
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const nights = [];
  for (let n = 21; n <= 30; n++) {
    nights.push({ night: n, evening_of: iso(t0 + (n - 2) * 86400000), day_date: iso(t0 + (n - 1) * 86400000), odd: n % 2 === 1 });
  }
  return nights;
}
