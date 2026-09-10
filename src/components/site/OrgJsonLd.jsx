import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl, parseOpeningHours, postalAddress, brandNode } from '@/lib/seo';
import { pickLang, getDictionary, FALLBACK_LOCALE } from '@/lib/i18n';
import { toE164 } from '@/lib/pixels';
import { getSettings } from '@/lib/data/settings';
import { getPublishedOffers, computeMinPrice } from '@/lib/data/content';
import { CITY_SLUGS, cityName } from '@/lib/months';
import { warnCriticalSettingsOnce } from '@/lib/seo/health';
import JsonLd from '@/components/site/JsonLd';

/** French Wikipedia entries for the departure cities — schema `sameAs`. */
const CITY_SAMEAS = {
  casablanca: 'https://fr.wikipedia.org/wiki/Casablanca',
  rabat: 'https://fr.wikipedia.org/wiki/Rabat',
  marrakech: 'https://fr.wikipedia.org/wiki/Marrakech',
  fes: 'https://fr.wikipedia.org/wiki/F%C3%A8s',
  tanger: 'https://fr.wikipedia.org/wiki/Tanger',
  agadir: 'https://fr.wikipedia.org/wiki/Agadir',
  meknes: 'https://fr.wikipedia.org/wiki/Mekn%C3%A8s',
  oujda: 'https://fr.wikipedia.org/wiki/Oujda',
};

/**
 * Sitewide organization entity (LAWS §1/§5): the parent company modeled as a
 * TravelAgency, with a stable @id other nodes reference. Everything factual
 * comes from settings and only renders when present (LAW §10).
 *
 * THIS IS THE ONLY BUSINESS NODE. TravelAgency is a LocalBusiness subtype, and
 * Wiki Tours is a single-location agency, so address / geo / hours / hasMap
 * live here and nowhere else. Do not add a second LocalBusiness for the office:
 * that duplicated the NAP under a per-locale @id and split one premises into
 * four entities Google had to reconcile. Pages ABOUT the office (the Casablanca
 * page) point at this node with WebPage.mainEntity instead.
 *
 * No aggregateRating is emitted here — see the note at the bottom. Mounted once
 * in the public layout.
 */
export default async function OrgJsonLd({ locale }) {
  const s = await getSettings();
  warnCriticalSettingsOnce(s);
  const t = getDictionary(locale);
  // BOTH social footprints, plus the GBP listing, on the ONE entity.
  //
  // This is the whole dual-brand problem in one array. The Bab Makka profiles
  // (web.facebook.com/babmakka.ma, instagram.com/babmakka.ma,
  // tiktok.com/@babmakka1) were absent, so the service line's entire social
  // presence hung off nothing: an engine crawling those accounts had no signal
  // tying them back to Wiki Tours International, and the two footprints stayed
  // separate entities. They are the SAME company — Bab Makka is alternateName,
  // never a second Organization — so every profile belongs on this node's
  // sameAs. Nothing is invented: unset fields simply drop out (LAW §10).
  const socials = [
    s?.facebook_url,
    s?.instagram_url,
    s?.tiktok_url,
    s?.youtube_url,
    s?.babmakka_facebook_url,
    s?.babmakka_instagram_url,
    s?.babmakka_tiktok_url,
    s?.babmakka_youtube_url,
    s?.gbp_url,
  ].filter(Boolean);
  const phones = [s?.phone_1, s?.phone_2, s?.phone_3].filter(Boolean);
  // Locale-neutral, FR-sourced — see postalAddress(). Never pickLang here.
  const address = postalAddress(s);
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
    alternateName: [BRAND.lockup, ...BRAND.alternates, ...BRAND.alternatesAr],
    // ONE canonical description (i18n brand.description), reused verbatim by
    // llms.txt. AI engines cross-reference the description they find on the
    // site, GBP, directories and socials — every divergent wording lowers
    // entity confidence, so this string is the single source to copy from.
    description: t.brand.description,
    // Topic scope, stated identically in every locale: helps an engine resolve
    // WHAT this entity is expert in, not just who it is.
    knowsAbout: ['Omra', 'Hajj', 'La Mecque', 'Médine', 'Pèlerinage islamique', 'Agence de voyages'],
    foundingDate: '2016',
    // ONE url for ONE @id. This used to follow the page locale, so the same
    // #organization advertised three different urls across fr/ar/en.
    url: absoluteUrl(FALLBACK_LOCALE, ''),
    // Stable Brand node — Product pages reference it by @id (see lib/seo.js).
    brand: brandNode(s),
    currenciesAccepted: 'MAD',
    knowsLanguage: ['fr', 'ar', 'en'],
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
    // E.164 (+212…): Google's LocalBusiness guidance wants an internationally
    // dialable number, and it must string-match the GBP listing. The admin's
    // display format (0634…) stays on the visible surfaces; the raw value is the
    // fallback only when toE164 cannot parse it.
    // ALL published numbers, not just the first — schema.org allows an array and
    // the agency publishes three. Emitting one left the other two unattached to
    // the entity, so a searcher who found them elsewhere had nothing to match.
    ...(phones.length
      ? { telephone: phones.length === 1 ? (toE164(phones[0]) ?? phones[0]) : phones.map((p) => toE164(p) ?? p) }
      : {}),
    ...(s?.email ? { email: s.email } : {}),
    ...(address ? { address } : {}),
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
              telephone: toE164(s.whatsapp_number) ?? s.whatsapp_number,
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
    // sameAs disambiguates the accented names ("Fès", "Meknès") for engines,
    // so "omra depuis fès" resolves to the city entity, not a string.
    // Names follow the page language (an Arabic page saying "Casablanca" in
    // Latin missed the query Arabic speakers actually type); `sameAs` stays the
    // French Wikipedia entry, which is what anchors the entity regardless of
    // the label, so the node still resolves to ONE city per locale.
    areaServed: [
      { '@type': 'Country', name: t.pages.countryName, sameAs: 'https://fr.wikipedia.org/wiki/Maroc' },
      ...Object.keys(CITY_SLUGS).map((slug) => ({
        '@type': 'City',
        name: cityName(slug, locale),
        ...(CITY_SAMEAS[slug] ? { sameAs: CITY_SAMEAS[slug] } : {}),
      })),
    ],
    // NO aggregateRating here, deliberately. Google treats a rating a business
    // publishes about ITSELF as self-serving: pages using LocalBusiness or any
    // Organization type are ineligible for the star review snippet, and the
    // markup is a documented "spammy structured markup" manual-action trigger
    // that can strip rich results across the whole domain. The Google score
    // stays VISIBLE on-page and in llms.txt (real, useful, safe) — it just must
    // not be marked up on this node. Product/TouristTrip is the sanctioned
    // exception: the per-offer aggregateRating in omra/[slug]/page.js stays.
  };

  return <JsonLd data={data} />;
}
