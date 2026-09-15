import { getDictionary, pickLang } from '@/lib/i18n';
import { getPublishedOffers, getOccasions, getMonthPages, getCityPages, getGuidePages } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { MONTH_SLUGS, CITY_SLUGS, monthName, cityName, targetYearFor, departuresInMonth } from '@/lib/months';
import { resolveIntent, offersForScope } from '@/lib/content-resolver';
import CtaBlock from '@/components/CtaBlock';

const nf = new Intl.NumberFormat('fr-MA');

/**
 * <CommercialCTA intent="ramadan" /> · <CommercialCTA to="/omra-ramadan" /> —
 * the only way a post points at a lander (hard constraint 4: posts link TO
 * landers, never target their query).
 *
 * `intent` goes through the RESOLVER (src/lib/content-resolver.js): the best
 * existing, indexable lander at request time — a noindex month, an
 * unpublished occasion or a gone page falls back to the Omra hub, so the link
 * is never dead and never points at a page that should not rank. `to` is the
 * run-1 form (a literal lander path) and is kept for the files already written.
 *
 * The heading is the lander's descriptive anchor (t.clusters.anchors — the
 * audit rejects generic anchors); the line under it is LIVE: how many
 * departures are open for that target and the lowest per-person price, read
 * from the published offers. No figure is ever invented; with nothing open
 * the block still links the lander and says so.
 */
export default async function CommercialCTA({ to, intent, locale }) {
  const t = getDictionary(locale);
  const [offers, settings, occasions, monthPages, cityPages, guidePages] = await Promise.all([
    getPublishedOffers(), getSettings(), getOccasions(), getMonthPages(), getCityPages(), getGuidePages(),
  ]);

  let target = to ?? null;
  let scoped = offers;
  let label = null;
  if (!target && intent) {
    const r = resolveIntent(intent, { offers, occasions, monthPages, cityPages, guidePages });
    target = r.path;
    scoped = offersForScope(offers, r.scope);
  }
  if (!target) return null;

  // What the target is about → which offers count, and how it is named.
  const month = target.match(/^\/omra-([a-z0-9-]+)$/)?.[1];
  const monthIndex = month ? MONTH_SLUGS.indexOf(month) : -1;
  const city = target.match(/^\/omra-depuis-([a-z]+)$/)?.[1];
  const occasion = month && monthIndex < 0 ? occasions.find((o) => o.slug === month) : null;
  label = t.clusters.anchors[target] ?? null;
  if (monthIndex >= 0) {
    if (to) scoped = departuresInMonth(offers, monthIndex);
    label = t.clusters.anchors.months.replace('{month}', monthName(monthIndex, locale)).replace('{year}', String(targetYearFor(monthIndex, { offers })));
  } else if (occasion) {
    if (to) scoped = offers.filter((o) => o.occasion?.slug === occasion.slug);
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
  const primaryLabel = target === '/hajj' ? t.cta.interest : label;

  return (
    <aside className="rounded-panel border border-bm-gold/40 bg-bm-gold/10 p-6" data-commercial-cta={target} data-intent={intent ?? undefined}>
      <p className="text-lg font-bold text-bm-black">{label}</p>
      <p className="mt-2 max-w-prose leading-relaxed text-bm-black/80">{line}</p>
      <div className="mt-4">
        <CtaBlock primaryLabel={primaryLabel} primaryHref={`/${locale}${target}`} whatsappHref={waLink(settings?.whatsapp_number)} whatsappLabel={t.cta.whatsappAlt} />
      </div>
    </aside>
  );
}
