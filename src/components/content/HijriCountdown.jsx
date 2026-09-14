import { getDictionary } from '@/lib/i18n';
import { getHijriEvents } from '@/lib/data/content';
import { HIJRI_EVENT_DEFS, nextHijriEvent, todayCasablanca } from '@/lib/hijri';

/**
 * <HijriCountdown event="ramadan" /> — the next occurrence of a Hijri event
 * with the day count, in Africa/Casablanca. The date comes from
 * public.hijri_events (computed with @umalqura/core by
 * scripts/build-hijri-events.mjs, adjustable by the admin after the official
 * sighting); when the table has no row yet, the same computation runs here.
 * Every rendering carries the moon-sighting caveat (hard constraint 8).
 */
export default async function HijriCountdown({ event, locale }) {
  const t = getDictionary(locale);
  const def = HIJRI_EVENT_DEFS.find((e) => e.key === event);
  if (!def) return null;
  const today = todayCasablanca();
  const rows = await getHijriEvents();
  const stored = rows
    .filter((r) => r.event === event && r.gregorian_date >= today)
    .sort((a, b) => a.gregorian_date.localeCompare(b.gregorian_date))[0];
  const next = stored
    ? { gregorian_date: stored.gregorian_date, days: Math.round((Date.parse(stored.gregorian_date) - Date.parse(today)) / 86400000), confirmed: stored.is_confirmed }
    : nextHijriEvent(event, today);
  if (!next) return null;

  const label = def[`label_${locale}`] ?? def.label_fr;
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const date = fmt.format(new Date(`${next.gregorian_date}T12:00:00Z`));
  const line = next.days === 0
    ? t.content.hijriTodayLine.replace('{label}', label)
    : t.content.hijriLine.replace('{label}', label).replace('{date}', date).replace('{days}', String(next.days));
  return (
    <p className="rounded-card border border-bm-gold/40 bg-bm-gold/10 px-5 py-4 leading-relaxed text-bm-black/85" data-hijri-countdown={event}>
      <strong>{line}</strong>
      <span className="block text-sm text-bm-black/60">({t.content.hijriCaveat})</span>
    </p>
  );
}
