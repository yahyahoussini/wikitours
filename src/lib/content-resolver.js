import { MONTH_SLUGS, CITY_SLUGS, monthLanderIndexable, cityPageIndexable, departuresInMonth } from '@/lib/months';
import { guideIndexable, GUIDE_PILLAR_SLUG } from '@/lib/guides';

/**
 * The commercial-intent RESOLVER — pure. An article names an INTENT
 * (`<CommercialCTA intent="ramadan" />`, `commercial_intent` in the calendar —
 * never a URL); at request time the resolver maps it to the best EXISTING,
 * INDEXABLE lander, using the same predicates the pages, the sitemap and the
 * footer use (monthLanderIndexable, cityPageIndexable, guideIndexable). A
 * lander that is noindex, unpublished or gone falls back to the Omra hub, so a
 * post never sends a reader — or a crawler — to a page that should not rank.
 *
 * Hub URLs are evergreen (rulebook: the year lives in the title, never the
 * path — /omra-ramadan-2027 301s to /omra-ramadan), so the resolver never
 * returns a dated path.
 *
 * Returns { path, kind, scope } — `scope` is the offer filter the live
 * figures use (month index, occasion slug, or null for all).
 */
export function resolveIntent(intent, { offers = [], occasions = [], monthPages = new Map(), cityPages = new Map(), guidePages = new Map(), today = new Date() } = {}) {
  const raw = String(intent ?? '').trim().toLowerCase();
  const fallback = { path: '/bab-makka', kind: 'pillar', scope: null, fallback: true, intent: raw };
  if (!raw) return fallback;
  const occasionPublished = (slug) => occasions.some((o) => o.slug === slug && o.is_published !== false);
  const done = (path, kind, scope = null) => ({ path, kind, scope, fallback: false, intent: raw });

  if (raw === 'ramadan') return occasionPublished('ramadan') ? done('/omra-ramadan', 'occasion', { occasion: 'ramadan' }) : fallback;
  if (raw === 'hajj') return done('/hajj', 'hajj');
  if (raw === 'pas_cher') return offers.length ? done('/omra-pas-cher', 'hub') : fallback;
  if (raw === 'premium') return occasionPublished('5-etoiles') ? done('/omra-5-etoiles', 'occasion', { occasion: '5-etoiles' }) : fallback;
  if (raw === 'agency') return done('/agence-omra-casablanca', 'local');
  if (raw === 'hotels') return done('/hotels-omra', 'hub');
  if (raw === 'next' || raw === 'all') return fallback.path ? done('/bab-makka', 'pillar') : fallback;
  if (raw === 'guide') return guideIndexable(guidePages.get(GUIDE_PILLAR_SLUG)) ? done('/guide-omra', 'guide') : fallback;

  const month = raw.match(/^month:(\d{1,2})$/);
  if (month) {
    const i = Number(month[1]) - 1;
    if (i < 0 || i > 11) return fallback;
    const ok = monthLanderIndexable(i, { offers, monthPage: monthPages.get(MONTH_SLUGS[i]) ?? null, today });
    return ok ? done(`/omra-${MONTH_SLUGS[i]}`, 'month', { month: i }) : { ...fallback, scope: { month: i } };
  }
  const city = raw.match(/^city:([a-z]+)$/);
  if (city) {
    const slug = city[1];
    if (!(slug in CITY_SLUGS)) return fallback;
    return cityPageIndexable(cityPages.get(slug)) ? done(`/omra-depuis-${slug}`, 'city', null) : fallback;
  }
  const occasion = raw.match(/^occasion:([a-z0-9-]+)$/);
  if (occasion) return occasionPublished(occasion[1]) ? done(`/omra-${occasion[1]}`, 'occasion', { occasion: occasion[1] }) : fallback;
  return fallback;
}

/** The offers an intent's live figures count (month → that month's departures, occasion → its departures, else all). */
export function offersForScope(offers, scope, { today = new Date() } = {}) {
  if (!scope) return offers ?? [];
  if (typeof scope.month === 'number') return departuresInMonth(offers ?? [], scope.month, { today });
  if (scope.occasion) return (offers ?? []).filter((o) => o.occasion?.slug === scope.occasion);
  return offers ?? [];
}

/** The offers a `filter` names: ramadan | hajj | next | all | month:n | occasion:x. */
export function offersForFilter(offers, filter, { today = new Date() } = {}) {
  const f = String(filter ?? 'all').trim().toLowerCase();
  if (f === 'ramadan') return (offers ?? []).filter((o) => o.occasion?.slug === 'ramadan');
  if (f === 'hajj') return []; // the agency sells no Hajj package online (the /hajj page registers interest)
  if (f === 'next') return (offers ?? []).slice(0, 1);
  const month = f.match(/^month:(\d{1,2})$/);
  if (month) return departuresInMonth(offers ?? [], Number(month[1]) - 1, { today });
  const occasion = f.match(/^occasion:([a-z0-9-]+)$/);
  if (occasion) return (offers ?? []).filter((o) => o.occasion?.slug === occasion[1]);
  return offers ?? [];
}
