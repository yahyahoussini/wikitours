import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl } from '@/lib/seo';
import { pickLang } from '@/lib/i18n';
import { getSettings } from '@/lib/data/settings';
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
  const socials = [s?.facebook_url, s?.instagram_url, s?.tiktok_url, s?.youtube_url].filter(Boolean);
  const phones = [s?.phone_1, s?.phone_2, s?.phone_3].filter(Boolean);
  const address = pickLang(s, 'address', locale);
  const hours = pickLang(s, 'opening_hours', locale);

  const data = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    '@id': `${SITE_URL}/#organization`,
    name: BRAND.parent,
    legalName: BRAND.parent,
    alternateName: BRAND.lockup,
    foundingDate: '2016',
    url: absoluteUrl(locale, ''),
    logo: `${SITE_URL}/brand/wikitours-logo.png`,
    image: `${SITE_URL}/brand/wikitours-logo.png`,
    ...(s?.license_number ? { taxID: undefined, identifier: s.license_number } : {}),
    ...(phones.length ? { telephone: phones[0] } : {}),
    ...(s?.email ? { email: s.email } : {}),
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address, addressLocality: 'Casablanca', addressCountry: 'MA' } } : {}),
    ...(hours ? { openingHours: hours } : {}),
    ...(socials.length ? { sameAs: socials } : {}),
    areaServed: 'MA',
    ...(s?.gbp_rating && s?.gbp_review_count > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.gbp_rating, reviewCount: s.gbp_review_count } }
      : {}),
  };

  return <JsonLd data={data} />;
}
