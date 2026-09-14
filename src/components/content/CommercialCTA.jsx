import { getDictionary, pickLang } from '@/lib/i18n';
import { getPublishedOffers, getOccasions } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { MONTH_SLUGS, CITY_SLUGS, monthName, cityName, targetYearFor, departuresInMonth } from '@/lib/months';
import CtaBlock from '@/components/CtaBlock';

const nf = new Intl.NumberFormat('fr-MA');

/**
 * <CommercialCTA to="/omra-ramadan" /> — the only way a post points at a
 * lander (hard constraint 4: posts link TO landers, never target their query).
 * The heading is the lander's descriptive anchor (t.clusters.anchors — the
 * audit rejects generic anchors), the line under it is LIVE: how many
 * departures are open for that target and the lowest per-person price, read
 * from the published offers at request time. No figure is ever invented; with
 * nothing open the block still links the lander and says so.
 */
export default async function CommercialCTA({ to, locale }) {
  const t = getDictionary(locale);
  const [offers, settings, occasions] = await Promise.all([getPublishedOffers(), getSettings(), getOccasions()]);

  // What the target is about → which offers count, and how it is named.
  const month = to.match(/^\/omra-([a-z]+)$/)?.[1];
  const monthIndex = month ? MONTH_SLUGS.indexOf(month) : -1;
  const city = to.match(/^\/omra-depuis-([a-z]+)$/)?.[1];
  const occasion = month && monthIndex < 0 ? occasions.find((o) => o.slug === month) : null;
  let label = t.clusters.anchors[to] ?? null;
  let scoped = offers;
  if (monthIndex >= 0) {
    scoped = departuresInMonth(offers, monthIndex);
    label = t.clusters.anchors.months.replace('{month}', monthName(monthIndex, locale)).replace('{year}', String(targetYearFor(monthIndex, { offers })));
  } else if (occasion) {
    scoped = offers.filter((o) => o.occasion?.slug === occasion.slug);
    label = t.clusters.anchors.occasions.replace('{name}', pickLang(occasion, 'name', locale) ?? occasion.name_fr);
  } else if (city && city in CITY_SLUGS) {
    label = t.clusters.anchors.cities.replace('{city}', cityName(city, locale));
  }
  if (!label) return null;

  const prices = scoped.map((o) => o.starting_price).filter((p) => typeof p === 'number' && p > 0);
  const n = scoped.length;
  const line = n === 0
    ? t.content.ctaNone
    : prices.length === 0
      ? t.content.ctaLiveNoPrice.replace('{n}', String(n))
      : (n === 1 ? t.content.ctaLiveOne : t.content.ctaLive).replace('{n}', String(n)).replace('{minPrice}', nf.format(Math.min(...prices)));
  // /hajj sells nothing: the button registers interest, like the page itself.
  const primaryLabel = to === '/hajj' ? t.cta.interest : label;

  return (
    <aside className="rounded-panel border border-bm-gold/40 bg-bm-gold/10 p-6" data-commercial-cta={to}>
      <p className="text-lg font-bold text-bm-black">{label}</p>
      <p className="mt-2 max-w-prose leading-relaxed text-bm-black/80">{line}</p>
      <div className="mt-4">
        <CtaBlock primaryLabel={primaryLabel} primaryHref={`/${locale}${to}`} whatsappHref={waLink(settings?.whatsapp_number)} whatsappLabel={t.cta.whatsappAlt} />
      </div>
    </aside>
  );
}
