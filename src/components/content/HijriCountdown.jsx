import { getDictionary } from '@/lib/i18n';
import { getHijriEvents } from '@/lib/data/content';
import { HIJRI_EVENT_DEFS, todayCasablanca, hijriTagDate, parseHijriEventTag } from '@/lib/hijri';

/**
 * <HijriCountdown event="ramadan" /> · <HijriCountdown event="ramadan_1448_start" />
 * · `arafah_1448` · `ramadan_1448_last10` · `eid_al_fitr_1448` … — a Hijri event
 * with its expected Gregorian date and the day count, in Africa/Casablanca.
 * A bare key means the NEXT occurrence; a dated key pins the Hijri year (a
 * post written for Ramadan 1448 keeps saying 1448 after it has passed, with
 * the past-tense line). The date comes from public.hijri_events (computed by
 * scripts/build-hijri-events.mjs, adjustable by the admin after the official
 * sighting); when the table has no row yet, the same computation runs here.
 * Every rendering carries the moon-sighting caveat (hard constraint 8).
 */
export default async function HijriCountdown({ event, locale }) {
  const t = getDictionary(locale);
  const parsed = parseHijriEventTag(event);
  if (!parsed) return null;
  const def = HIJRI_EVENT_DEFS.find((e) => e.key === parsed.key);
  if (!def) return null;
  // The one computation a title's {year:<tag>} token reads too (hijriTagDate),
  // so the year in the title and the date in this line cannot disagree.
  const next = hijriTagDate(event, { today: todayCasablanca(), rows: await getHijriEvents() });
  if (!next) return null;

  const label = def[`label_${locale}`] ?? def.label_fr;
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const date = fmt.format(new Date(`${next.gregorian_date}T12:00:00Z`));
  const line = next.days === 0
    ? t.content.hijriTodayLine.replace('{label}', label)
    : next.days < 0
      ? t.content.hijriPastLine.replace('{label}', label).replace('{date}', date)
      : t.content.hijriLine.replace('{label}', label).replace('{date}', date).replace('{days}', String(next.days));
  return (
    <p className="rounded-card border border-bm-gold/40 bg-bm-gold/10 px-5 py-4 leading-relaxed text-bm-black/85" data-hijri-countdown={event}>
      <strong>{line}</strong>
      <span className="block text-sm text-bm-black/60">({t.content.hijriCaveat}{next.confirmed ? '' : ` · ${t.content.nightsTolerance}`})</span>
    </p>
  );
}
