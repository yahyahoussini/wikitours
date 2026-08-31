import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl, parseOpeningHours } from '@/lib/seo';
import { pickLang, getDictionary } from '@/lib/i18n';
import { getSettings } from '@/lib/data/settings';
import { getPublishedOffers, computeMinPrice } from '@/lib/data/content';
import { CITY_SLUGS } from '@/lib/months';
import { warnCriticalSettingsOnce } from '@/lib/seo/health';
import JsonLd from '@/components/site/JsonLd';

/**
 * Sitewide organization entity (LAWS §1/§5): the parent company modeled as a
 * TravelAgency, with a stable @id other nodes reference. Everything factual
 * comes from settings and only renders when present (LAW §10) — address stays
 * out until the client designates THE one. aggregateRating is emitted only
 * from real Google values. Mounted once in the public layout.
 */
export default async function OrgJsonLd({ locale }) {
  const s = await getSettings();
  warnCriticalSettingsOnce(s);
  const t = getDictionary(locale);
  // GBP listing joins the social profiles: engines resolve them to ONE entity.
  const socials = [s?.facebook_url, s?.instagram_url, s?.tiktok_url, s?.youtube_url, s?.gbp_url].filter(Boolean);
  const phones = [s?.phone_1, s?.phone_2, s?.phone_3].filter(Boolean);
  const address = pickLang(s, 'address', locale);
  const hours = pickLang(s, 'opening_hours', locale);
  // Structured hours (from the FR source, locale-neutral) when parseable; the
  // raw prose is kept as a fallback so this can only improve the markup.
  const hoursSpec = parseOpeningHours(s?.opening_hours_fr);

  // priceRange from the REAL published offers (never typed by hand): the span
  // of per-offer minimum prices. Omitted when no priced offer exists.
  const offerPrices = (await getPublishedOffers())
    .map((o) => computeMinPrice(o.tiers) ?? o.starting_price)
    .filter((p) => typeof p === 'number' && p > 0);
  const nf = new Intl.NumberFormat('fr-MA');
  const priceRange = offerPrices.length
    ? `${nf.format(Math.min(...offerPrices))}–${nf.format(Math.max(...offerPrices))} MAD`
    : null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    '@id': `${SITE_URL}/#organization`,
    name: BRAND.parent,
    legalName: BRAND.parent,
    // Canonical service lockup + the "Makkah"/short variants, so an engine
    // resolves every spelling to this one entity (decision: Makka is canonical).
    alternateName: [BRAND.lockup, ...BRAND.alternates],
    // ONE canonical description (i18n brand.description), reused verbatim by
    // llms.txt. AI engines cross-reference the description they find on the
    // site, GBP, directories and socials — every divergent wording lowers
    // entity confidence, so this string is the single source to copy from.
    description: t.brand.description,
    // Topic scope, stated identically in every locale: helps an engine resolve
    // WHAT this entity is expert in, not just who it is.
    knowsAbout: ['Omra', 'Hajj', 'La Mecque', 'Médine', 'Pèlerinage islamique', 'Agence de voyages'],
    foundingDate: '2016',
    url: absoluteUrl(locale, ''),
    logo: `${SITE_URL}/brand/wikitours-logo.png`,
    image: `${SITE_URL}/brand/wikitours-logo.png`,
    ...(s?.license_number
      ? {
          identifier: s.license_number,
          // The licence is the core E-E-A-T signal in this niche — model it as a
          // real credential recognized by the ministry that issues it, not just
          // a loose identifier string.
          hasCredential: {
            '@type': 'EducationalOccupationalCredential',
            credentialCategory: 'license',
            identifier: s.license_number,
            recognizedBy: {
              '@type': 'GovernmentOrganization',
              name: 'Ministère du Tourisme — Royaume du Maroc',
            },
          },
        }
      : {}),
    ...(phones.length ? { telephone: phones[0] } : {}),
    ...(s?.email ? { email: s.email } : {}),
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address, addressLocality: 'Casablanca', addressCountry: 'MA' } } : {}),
    ...(s?.latitude != null && s?.longitude != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude } }
      : {}),
    ...(hoursSpec ? { openingHoursSpecification: hoursSpec } : hours ? { openingHours: hours } : {}),
    // The premises close in the evening and all day Sunday, but the WhatsApp
    // line is staffed 24/7 — a real differentiator in this market, and the
    // thing a searcher (or an answer engine) actually wants to know at 22h.
    // Modelled as its own ContactPoint so it never widens the opening hours of
    // the physical agency above.
    ...(s?.whatsapp_number
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              telephone: s.whatsapp_number,
              url: 'https://wa.me/' + String(s.whatsapp_number).replace(/[^0-9]/g, ''),
              availableLanguage: ['fr', 'ar', 'en'],
              hoursAvailable: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                opens: '00:00',
                closes: '23:59',
              },
            },
          ],
        }
      : {}),
    ...(socials.length ? { sameAs: socials } : {}),
    ...(s?.gbp_url ? { hasMap: s.gbp_url } : {}),
    ...(priceRange ? { priceRange } : {}),
    // Country + the whitelisted departure cities (the same 8 the /omra-depuis
    // pages serve — a stated, admin-approved service area, never invented).
    areaServed: [
      { '@type': 'Country', name: 'Maroc' },
      ...Object.values(CITY_SLUGS).map((name) => ({ '@type': 'City', name })),
    ],
    ...(s?.gbp_rating && s?.gbp_review_count > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.gbp_rating, reviewCount: s.gbp_review_count } }
      : {}),
  };

  return <JsonLd data={data} />;
}
