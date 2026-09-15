import { getDictionary } from '@/lib/i18n';
import { getHijriEvents } from '@/lib/data/content';
import { ramadanLastTenNights, gregorianToHijri, todayCasablanca, hijriToGregorian } from '@/lib/hijri';

/**
 * <RamadanNightsTable /> · <RamadanNightsTable year="1448" /> — the last ten
 * nights of the next (or the named) Ramadan with their computed Gregorian
 * evenings, odd nights flagged. 1 Ramadan comes from public.hijri_events when
 * the admin has confirmed it after the sighting, else from the Umm al-Qura
 * computation (src/lib/hijri.js). Always rendered with the moon-sighting
 * caveat and the ±2-day tolerance — the dates are expectations, never a
 * promise, and they are never written in the prose.
 */
export default async function RamadanNightsTable({ year, locale }) {
  const t = getDictionary(locale);
  const today = todayCasablanca();
  let hy = year ? Number(year) : gregorianToHijri(today).hy;
  if (!year && hijriToGregorian(hy, 9, 30) < today) hy += 1; // this year's Ramadan is over → next one
  const rows = await getHijriEvents();
  const stored = rows.find((r) => r.event === 'ramadan' && Number(r.hijri_year) === hy);
  const nights = ramadanLastTenNights(hy, stored?.gregorian_date ?? null);
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const date = (iso) => fmt.format(new Date(`${iso}T12:00:00Z`));
  return (
    <section data-ramadan-nights={hy}>
      <h3 className="text-xl font-bold text-bm-black">{t.content.nightsTitle.replace('{year}', String(hy))}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs uppercase tracking-wide text-bm-black/50">
              <th className="py-2 pe-4 text-start">{t.content.nightsNight}</th>
              <th className="py-2 pe-4 text-start">{t.content.nightsEvening}</th>
              <th className="py-2 text-start">{t.content.nightsNote}</th>
            </tr>
          </thead>
          <tbody>
            {nights.map((n) => (
              <tr key={n.night} className={`border-t border-bm-black/10 ${n.odd ? 'bg-bm-gold/10 font-semibold' : ''}`}>
                <td className="py-2 pe-4 whitespace-nowrap">{t.content.nightsRow.replace('{n}', String(n.night))}</td>
                <td className="py-2 pe-4">{date(n.evening_of)}</td>
                <td className="py-2 text-bm-black/70">{n.odd ? t.content.nightsOdd : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-bm-black/60">
        {stored?.is_confirmed ? t.content.nightsConfirmed : t.content.nightsTolerance} ({t.content.hijriCaveat})
      </p>
    </section>
  );
}
