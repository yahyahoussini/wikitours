import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { hreflangAlternates, clampDesc } from '@/lib/seo';
import { routeTitle } from '@/lib/titles';
import {
  getOfferBySlug,
  getPublishedOffers,
  getTeam,
  getTestimonials,
  getFaqs,
  getCovers,
  computeMinPrice,
} from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { getGallerySlides } from '@/lib/data/gallery';
import { publicMediaUrl } from '@/lib/media';
import { toOfferCard } from '@/lib/offer-card';
import { waLink } from '@/lib/whatsapp';
import { OMRA_YEAR, monthPagePath, monthName } from '@/lib/months';
import { offerAvailability, isOfferPast, seatsLabel } from '@/lib/offers';
import BrandLockup from '@/components/site/BrandLockup';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import OfferSubnav from '@/components/site/OfferSubnav';
import TierAndRoomSelector from '@/components/site/TierAndRoomSelector';
import ChooseGammeButton from '@/components/site/ChooseGammeButton';
import Icon from '@/components/site/Icon';
import JsonLd from '@/components/site/JsonLd';
import { OfferCard } from '@/components/site/PackagesSection';
import SmartGallery from '@/components/SmartGallery';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import WhatsAppIcon from '@/components/WhatsAppIcon';

export const revalidate = false;

/** Prebuild every published offer × locale — the first crawl of a new offer
 *  would otherwise block on a full cold render. Empty when the DB is not
 *  configured at build time, which simply falls back to on-demand ISR. */
export async function generateStaticParams() {
  const offers = await getPublishedOffers();
  return LOCALES.flatMap((locale) => offers.map((o) => ({ locale, slug: o.slug })));
}

const nf = new Intl.NumberFormat('fr-MA');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wikitours.ma';
const ROOM_KEYS = ['double', 'triple', 'quad', 'quint'];
const TIER_LABELS = ['economique', 'confort', 'premium', 'vip'];

function fmtDate(value, locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
}

/** All (tierLabel, roomKey, price) tuples across published tiers. */
function allPrices(tiers) {
  const out = [];
  for (const tier of tiers) {
    for (const key of ROOM_KEYS) {
      if (tier[`price_${key}`] != null) out.push({ tier: tier.label, room: key, price: tier[`price_${key}`] });
    }
  }
  return out;
}

/** Default tier = first published. Default room = cheapest in that tier. */
function defaults(tiers) {
  const first = tiers[0] ?? null;
  if (!first) return { tierLabel: null, roomKey: null, minPrice: null };
  const rooms = ROOM_KEYS.map((k) => ({ key: k, price: first[`price_${k}`] })).filter((r) => r.price != null);
  const min = rooms.length ? rooms.reduce((a, b) => (a.price < b.price ? a : b)) : null;
  return { tierLabel: first.label, roomKey: min?.key ?? null, minPrice: min?.price ?? null };
}

/**
 * Answer-first intro (LAWS §5). Uses cheapest across ALL tiers.
 */
function computedIntro(offer, t, locale, tiers) {
  if (!offer.date_start || !offer.date_end) return null;

  const occasionName = offer.occasion ? pickLang(offer.occasion, 'name', locale) : null;
  const year = new Date(offer.date_start).getUTCFullYear();
  const name = occasionName ? `${occasionName} ${year}` : pickLang(offer, 'title', locale) ?? String(year);
  const lockup = locale === 'ar' ? BRAND.lockupAr : BRAND.lockup;

  let lead = t.offer.introLead
    .replace('{name}', name)
    .replace('{lockup}', lockup)
    .replace('{start}', fmtDate(offer.date_start, locale))
    .replace('{end}', fmtDate(offer.date_end, locale));
  if (offer.duration_days && offer.duration_nights) {
    lead += ` (${t.offer.duration.replace('{days}', offer.duration_days).replace('{nights}', offer.duration_nights)})`;
  }

  const fragments = [lead];
  if (offer.airline && !offer.land_only) {
    fragments.push(t.offer.introFlight.replace('{airline}', offer.airline));
  }
  if (tiers[0]?.hotel_makkah?.distance_to_haram_m != null) {
    fragments.push(
      t.offer.introHotel
        .replace('{hotel}', tiers[0].hotel_makkah.name)
        .replace('{m}', tiers[0].hotel_makkah.distance_to_haram_m),
    );
  }

  const minPrice = computeMinPrice(tiers) ?? offer.starting_price ?? null;
  const priceStr = minPrice != null
    ? t.offer.introPrice
        .replace('{price}', nf.format(minPrice))
        .replace('{room}', t.offer.priceInRoom.replace('{room}', t.offer.roomShort[ROOM_KEYS[0]]))
    : null;

  return `${fragments.join(locale === 'ar' ? '، ' : ', ')}${priceStr ? ` — ${priceStr}` : ''}.`;
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const offer = await getOfferBySlug(slug);
  // notFound() HERE (metadata resolves before streaming starts) so unknown
  // slugs return a real 404 status — thrown from the page body it happens
  // after the loading.js boundary already committed a 200 (soft 404).
  if (!offer) notFound();
  const t = getDictionary(locale);
  const occasionName = offer.occasion ? pickLang(offer.occasion, 'name', locale) : '';
  const minPrice = computeMinPrice(offer.tiers) ?? offer.starting_price ?? null;
  const priceFmt = minPrice != null ? nf.format(minPrice) : nf.format(0);
  const templated = routeTitle('offer', locale, { occasion: occasionName, tier: '', price: priceFmt });
  const year = offer.date_start ? new Date(offer.date_start).getUTCFullYear() : '';
  const fallbackDesc = `Omra ${occasionName} ${year} dès ${priceFmt} MAD/pers.${
    offer.duration_days ? `, ${offer.duration_days} jours` : ''
  } depuis le Maroc — ${BRAND.lockup}.`.replace(/\s+/g, ' ').trim();
  return {
    title: { absolute: pickLang(offer, 'seo_title', locale) ?? templated },
    description: clampDesc(pickLang(offer, 'seo_description', locale) ?? pickLang(offer, 'summary', locale) ?? fallbackDesc),
    alternates: hreflangAlternates(locale, `/omra/${slug}`),
  };
}

export default async function OfferPage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  // Only the SEO-critical data is awaited here so the shell (H1, intro, prices,
  // gammes, JSON-LD, booking form) streams to the browser fast. The below-the-
  // fold sections (encadrants, FAQ, similar offers) fetch their own data inside
  // Suspense boundaries and stream in after — see the *Section components below.
  const [offer, settings, team, allTestimonials] = await Promise.all([
    getOfferBySlug(slug),
    getSettings(),
    getTeam(),
    getTestimonials(),
  ]);
  if (!offer) notFound();

  // Cover feeds Product.image — Google needs an image for Product rich results.
  const offerCovers = await getCovers('offers', [offer.id]);
  const coverPath = offerCovers.get(offer.id)?.path;
  const coverUrl = coverPath ? publicMediaUrl(coverPath) : null;

  const t = getDictionary(locale);
  const title = pickLang(offer, 'title', locale);
  const summary = pickLang(offer, 'summary', locale);
  const inclusions = pickLang(offer, 'inclusions', locale);
  const exclusions = pickLang(offer, 'exclusions', locale);
  const conditions = pickLang(offer, 'conditions', locale);
  const whatsappHref = waLink(settings?.whatsapp_number, title ? `${t.cta.reserve} — ${title}` : undefined);

  const tiers = offer.tiers ?? [];
  const { tierLabel: defaultTier, roomKey: defaultRoom, minPrice: tierMinPrice } = defaults(tiers);
  // Single-tier offers (priced by starting_price, no gammes) still advertise a
  // price — in the visible UI and the Offer JSON-LD (audit needs Offer + price).
  const minPrice = tierMinPrice ?? offer.starting_price ?? null;
  const intro = computedIntro(offer, t, locale, tiers);
  // Highlight one gamme when there's a choice: prefer "confort", else the middle.
  const recommendedLabel = tiers.length > 1
    ? tiers.find((tr) => tr.label === 'confort')?.label ?? tiers[Math.floor(tiers.length / 2)]?.label
    : null;

  const inclusionLines = (inclusions ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  const exclusionLines = (exclusions ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

  // TEAM (responsable is used in the booking card; encadrant faces stream below)
  const responsable = team.find((m) => (m.role_fr ?? '').toLowerCase().includes('responsable'));
  const encadrants = team.filter((m) => (m.role_fr ?? '').toLowerCase().includes('encadrant'));

  // Testimonials (kept in the shell — the subnav needs to know if there are any)
  const textTestimonials = allTestimonials.filter((x) => x.kind === 'text');
  const forThisOffer = textTestimonials.filter((x) => x.offer_id === offer.id);
  const testimonials = (forThisOffer.length ? forThisOffer : textTestimonials).slice(0, 4);

  // Key-facts bar
  const keyFacts = [
    offer.date_start && offer.date_end
      ? ['calendar', `${fmtDate(offer.date_start, locale)} → ${fmtDate(offer.date_end, locale)}`]
      : ['calendar', t.offer.alacarte],
    offer.duration_days && offer.duration_nights
      ? ['clock', t.offer.duration.replace('{days}', offer.duration_days).replace('{nights}', offer.duration_nights)]
      : null,
    offer.land_only ? ['plane', t.offer.landOnly] : offer.airline ? ['plane', offer.airline] : null,
    ['dot', t.offer.status[offer.status]],
  ].filter(Boolean);

  // Hubs this offer belongs to. The month hub is only linked when the offer's
  // year matches OMRA_YEAR — monthPagePath always points at the current year,
  // so a 2027 departure must not link to the 2026 hub.
  const offerMonth = offer.date_start ? new Date(offer.date_start) : null;
  const hubLinks = [
    offerMonth && offerMonth.getUTCFullYear() === OMRA_YEAR
      ? {
          href: `/${locale}${monthPagePath(offerMonth.getUTCMonth())}`,
          label: `Omra ${monthName(offerMonth.getUTCMonth(), locale)} ${OMRA_YEAR}`,
        }
      : null,
    offer.occasion?.slug
      ? {
          href: `/${locale}/omra-${offer.occasion.slug}`,
          label: `Omra ${pickLang(offer.occasion, 'name', locale)}`,
        }
      : null,
  ].filter(Boolean);

  // Mirrors the on-page order: prices + booking come before the programme.
  const subnavItems = [
    { id: 'apercu', label: t.offer.subnav.overview },
    tiers.length ? { id: 'prix', label: t.offer.subnav.prices } : null,
    { id: 'reserver', label: t.offer.subnav.reserve },
    inclusionLines.length ? { id: 'programme', label: t.offer.subnav.programme } : null,
    { id: 'conditions', label: t.offer.subnav.conditions },
    testimonials.length ? { id: 'avis', label: t.offer.subnav.reviews } : null,
  ].filter(Boolean);

  const cardT = {
    ...t.offer,
    reserve: t.cta.reserve,
    whatsappAlt: t.cta.whatsappAlt,
    details: t.cta.details,
  };

  // Product JSON-LD. Every (gamme × room) price feeds an AggregateOffer so the
  // markup advertises the real range instead of a lone minimum.
  const allPrices = tiers.flatMap((tier) =>
    ROOM_KEYS.map((room) => tier[`price_${room}`]).filter((p) => typeof p === 'number' && p > 0),
  );
  const offerUrl = `${SITE_URL}/${locale}/omra/${offer.slug}`;
  // Only testimonials genuinely attached to THIS offer may rate it (LAWS §6).
  const offerReviews = forThisOffer.filter((x) => typeof x.rating === 'number' && x.rating > 0);
  const priceNode =
    allPrices.length > 1
      ? {
          '@type': 'AggregateOffer',
          lowPrice: Math.min(...allPrices),
          highPrice: Math.max(...allPrices),
          offerCount: allPrices.length,
        }
      : minPrice != null
        ? { '@type': 'Offer', price: minPrice }
        : null;

  // Bab Makka's own social profiles join the Brand node (LAW §10: only when
  // set) so engines resolve the brand accounts to this entity too.
  const babSocials = [
    settings?.babmakka_facebook_url,
    settings?.babmakka_instagram_url,
    settings?.babmakka_tiktok_url,
    settings?.babmakka_youtube_url,
  ].filter(Boolean);

  const productJsonLd = {
    '@context': 'https://schema.org',
    // Product drives the price rich result; TouristTrip is the accurate entity.
    '@type': ['Product', 'TouristTrip'],
    name: title ?? offer.slug,
    ...(intro || summary ? { description: intro ?? summary } : {}),
    ...(coverUrl ? { image: coverUrl } : {}),
    brand: {
      '@type': 'Brand',
      name: BRAND.lockup,
      alternateName: BRAND.alternates,
      ...(babSocials.length ? { sameAs: babSocials } : {}),
    },
    provider: { '@id': `${SITE_URL}/#organization` },
    // Freshness: AI search + Google favour recently-updated entities.
    ...(offer.updated_at ? { dateModified: offer.updated_at } : {}),
    ...(offer.date_start ? { startDate: offer.date_start } : {}),
    ...(offer.date_end ? { endDate: offer.date_end } : {}),
    ...(priceNode
      ? {
          offers: {
            ...priceNode,
            priceCurrency: 'MAD',
            // Computed from seats + status + date (never the raw status alone),
            // so it flips to SoldOut automatically at 0 seats or once departed.
            availability: offerAvailability(offer),
            url: offerUrl,
            seller: { '@id': `${SITE_URL}/#organization` },
            ...(offer.created_at ? { validFrom: offer.created_at.slice(0, 10) } : {}),
            ...(offer.date_start
              ? { validThrough: offer.date_start, priceValidUntil: offer.date_start, availabilityEnds: offer.date_start }
              // À la carte (no fixed departure): a rolling price-validity horizon
              // — keeps the price fresh for engines and never reads as "stale".
              : { priceValidUntil: `${new Date().getUTCFullYear() + 1}-12-31` }),
          },
        }
      : {}),
    ...(offerReviews.length
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(
              (offerReviews.reduce((sum, r) => sum + r.rating, 0) / offerReviews.length).toFixed(1),
            ),
            reviewCount: offerReviews.length,
            bestRating: 5,
          },
          review: offerReviews.slice(0, 5).map((r) => ({
            '@type': 'Review',
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            ...(r.author_name ? { author: { '@type': 'Person', name: r.author_name } } : {}),
            ...(pickLang(r, 'content', locale) ? { reviewBody: pickLang(r, 'content', locale) } : {}),
          })),
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.nav.home, item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: BRAND.service, item: `${SITE_URL}/${locale}/bab-makka` },
      { '@type': 'ListItem', position: 3, name: title ?? offer.slug },
    ],
  };

  /** Price line: one span per (tier × room), CSS shows the matching combination. */
  const tierRoomPriceSpans = (sizeClasses) =>
    tiers.flatMap((tier) =>
      ROOM_KEYS.map((room) => {
        const price = tier[`price_${room}`];
        if (price == null) return null;
        return (
          <span key={`${tier.label}-${room}`} className="tier-price" data-tier={tier.label} data-room={room}>
            <span className={`bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text font-bold tabular-nums text-transparent ${sizeClasses}`}>
              {nf.format(price)}
            </span>
            <span className="text-sm font-semibold text-bm-gold"> {t.offer.currency}</span>
            <span className="text-xs text-bm-black/50">
              {' · '}{t.offer.selectedRoom.replace('{room}', t.offer.roomShort[room])}
            </span>
          </span>
        );
      }),
    );

  return (
    <div id="offer-root" data-selected-tier={defaultTier ?? ''} data-selected-room={defaultRoom ?? ''} className="bg-wiki-white text-bm-black">
      <div className="scroll-progress" data-progress aria-hidden="true" suppressHydrationWarning />
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <span data-wt-view={`offers:${offer.id}`} hidden />

      <main className="mx-auto max-w-6xl px-6 pb-28 pt-6 lg:pb-16">
        <BrandLockup locale={locale} size="sm" />

        {/* Visible counterpart of the BreadcrumbList JSON-LD above. */}
        <Breadcrumbs
          className="mt-3"
          items={[
            { label: t.nav.home, href: `/${locale}` },
            { label: BRAND.service, href: `/${locale}/bab-makka` },
            { label: title ?? offer.slug },
          ]}
        />

        {/* Departed-state (60-day grace before the cron 301s to the month hub).
            Still 200/indexable; schema availability is already SoldOut. */}
        {isOfferPast(offer) ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-panel border border-bm-gold/40 bg-bm-gold/10 px-5 py-3 text-sm font-semibold text-bm-black">
            <span>⏳ {t.offer.departed}</span>
            {hubLinks.map((hub) => (
              <Link key={hub.href} href={hub.href} className="text-bm-gold underline-offset-4 hover:underline">
                {hub.label} →
              </Link>
            ))}
          </div>
        ) : null}

        <OfferSubnav items={subnavItems} />

        {/* Phone: flex column ordered [aperçu…gammes] → booking card → [conditions…]
            (the form must come before the conditions). lg: 2-col grid, booking
            card sticky in the right column spanning both content rows. */}
        <div className="mt-6 flex flex-col lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
          <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
            {/* HERO */}
            <section id="apercu" className="scroll-mt-28">
              <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
                {title}
              </h1>

              {/* Gallery directly under the title */}
              <div className="mt-4 overflow-hidden rounded-panel shadow-float empty:hidden">
                <SmartGallery
                  entityType="offers"
                  entityId={offer.id}
                  locale={locale}
                  aspect="16 / 9"
                  sizes="(min-width: 1024px) 720px, 100vw"
                />
              </div>

              {intro ? (
                <p className="mt-3 max-w-prose text-lg leading-relaxed text-bm-black/80">{intro}</p>
              ) : summary ? (
                <p className="mt-3 max-w-prose text-lg leading-relaxed text-bm-black/80">{summary}</p>
              ) : null}
              {intro && summary ? (
                <p className="mt-2 max-w-prose leading-relaxed text-bm-black/60">{summary}</p>
              ) : null}

              {/* KEY-FACTS BAR */}
              <ul className="mt-5 flex flex-wrap gap-2">
                {keyFacts.map(([icon, value]) => (
                  <li
                    key={value}
                    className="flex items-center gap-1.5 rounded-full border border-bm-black/10 bg-bm-gold/5 px-3.5 py-1.5 text-xs font-semibold text-bm-black/80"
                  >
                    <Icon name={icon} className="size-3.5 text-bm-gold" />
                    {value}
                  </li>
                ))}
              </ul>

            </section>

            {/* GAMMES — comparison cards (all visible; the booking card auto-prices the chosen one) */}
            {tiers.length ? (
              <section id="prix" className="mt-12 scroll-mt-28">
                <h2 className="text-xl font-bold text-bm-black">{t.offer.gammesTitle}</h2>
                {tiers.length > 1 ? (
                  <p className="mt-1 text-sm text-bm-black/60">{t.offer.gammesSubtitle}</p>
                ) : null}
                <div className={`mt-6 grid gap-4 ${tiers.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'max-w-md'}`}>
                  {tiers.map((tier) => {
                    const rooms = ROOM_KEYS
                      .map((k) => ({ key: k, price: tier[`price_${k}`] }))
                      .filter((r) => r.price != null);
                    if (!rooms.length && !tier.hotel_makkah && !tier.hotel_madinah) return null;
                    const cheapest = rooms.length ? rooms.reduce((a, b) => (a.price < b.price ? a : b)) : null;
                    const recommended = tier.label === recommendedLabel;
                    const hotels = [
                      tier.hotel_makkah ? { city: t.offer.makkah, hotel: tier.hotel_makkah, nights: tier.nights_makkah, showDistance: true } : null,
                      tier.hotel_madinah ? { city: t.offer.madinah, hotel: tier.hotel_madinah, nights: tier.nights_madinah, showDistance: false } : null,
                    ].filter(Boolean);
                    return (
                      <article
                        key={tier.label}
                        data-tier={tier.label}
                        className={`gamme-card relative flex flex-col rounded-panel border bg-white p-5 ${recommended ? 'border-bm-gold/50' : 'border-bm-black/10'}`}
                      >
                        {recommended ? (
                          <span className="absolute -top-3 start-5 rounded-full bg-bm-gold px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-bm-black">
                            {t.offer.recommended}
                          </span>
                        ) : null}

                        {!tier._legacy ? (
                          <h3 className="text-lg font-bold text-bm-gold">
                            {t.offer.tier?.[tier.label] ?? tier.label}
                          </h3>
                        ) : null}

                        {hotels.length ? (
                          <ul className={`flex flex-col gap-2.5 border-b border-bm-black/10 pb-3 ${tier._legacy ? '' : 'mt-3'}`}>
                            {hotels.map(({ city, hotel, nights, showDistance }) => {
                              const dist = showDistance ? tier.distance_to_haram_m ?? hotel.distance_to_haram_m : null;
                              const meta = [
                                dist != null ? t.offer.distanceToHaram.replace('{m}', dist) : null,
                                nights ? t.offer.nightsCount.replace('{n}', nights) : null,
                              ]
                                .filter(Boolean)
                                .join(' · ');
                              return (
                                <li key={hotel.id}>
                                  <p className="text-xs uppercase tracking-wide text-bm-black/45">{city}</p>
                                  <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                                    <Link href={`/${locale}/hotel/${hotel.slug}`} className="hover:text-bm-gold">
                                      {hotel.name}
                                    </Link>
                                    {hotel.stars ? (
                                      <span className="text-sm text-bm-gold">{'★'.repeat(hotel.stars)}</span>
                                    ) : null}
                                  </p>
                                  {meta ? <p className="text-xs text-bm-black/55">{meta}</p> : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}

                        {tier.breakfast_included ? (
                          <p className="mt-2 text-xs font-medium text-bm-gold">✓ {t.offer.breakfastIncluded}</p>
                        ) : null}

                        {rooms.length ? (
                          <ul className="mt-3 flex flex-1 flex-col gap-1">
                            {rooms.map(({ key, price }) => (
                              <li
                                key={key}
                                data-room-line={key}
                                className="flex items-center justify-between gap-3 rounded-ctrl px-2.5 py-2 text-sm transition"
                              >
                                <span className="text-bm-black/70">{t.offer.room[key]}</span>
                                <span className="whitespace-nowrap">
                                  <span className="bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text font-bold tabular-nums text-transparent">
                                    {nf.format(price)}
                                  </span>
                                  <span className="ms-1 text-xs text-bm-black/45">{t.offer.currency}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {cheapest ? (
                          <ChooseGammeButton
                            tier={tier.label}
                            rooms={rooms.map((r) => r.key)}
                            defaultRoom={cheapest.key}
                            chooseLabel={t.offer.chooseThisGamme}
                            selectedLabel={t.offer.selectedGamme}
                          />
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-bm-black/45">{t.offer.pricesTitle} · {t.offer.currency}</p>
              </section>
            ) : null}
          </div>

          <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
            {/* PROGRAMME — after the prices + booking form (phone reading order) */}
            {inclusionLines.length ? (
              <section id="programme" className="mt-12 max-w-prose scroll-mt-28 lg:mt-0">
                <h2 className="text-xl font-bold text-bm-black">{t.offer.programmeTitle}</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {inclusionLines.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 leading-relaxed text-bm-black/80">
                      <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-bm-gold/15 text-bm-gold">
                        <Icon name="check" className="size-3" />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                {exclusionLines.length ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-bm-black/50">{t.offer.notIncludedTitle}</h3>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {exclusionLines.map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-sm leading-relaxed text-bm-black/55">
                          <span aria-hidden="true" className="mt-0.5">—</span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* CONDITIONS */}
            <section id="conditions" className="mt-12 max-w-prose scroll-mt-28 rounded-card border border-bm-gold/25 bg-bm-gold/5 p-5">
              <h2 className="text-xl font-bold text-bm-black">{t.offer.conditionsTitle}</h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm font-semibold text-bm-black/80">
                <li className="flex items-start gap-2.5">
                  <Icon name="dot" className="mt-1 size-2.5 shrink-0 text-bm-gold" />
                  {t.offer.condPassport}
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="dot" className="mt-1 size-2.5 shrink-0 text-bm-gold" />
                  {t.offer.depositLine}
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="dot" className="mt-1 size-2.5 shrink-0 text-bm-gold" />
                  {t.offer.condPhoto}
                </li>
              </ul>
              {conditions ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-bm-black/70">{conditions}</p>
              ) : null}
            </section>

            {/* Reciprocal links — the month and occasion hubs link down to this
                offer, so link back up: it closes the cluster loop and passes
                authority both ways instead of one. */}
            {hubLinks.length ? (
              <nav aria-label={t.pages.seeAlso} className="mt-12 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-bm-black/40">
                  {t.pages.seeAlso}
                </span>
                {hubLinks.map((hub) => (
                  <Link
                    key={hub.href}
                    href={hub.href}
                    className="rounded-full border border-bm-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-bm-black/70 shadow-hairline transition hover:border-bm-gold hover:text-bm-black"
                  >
                    {hub.label}
                  </Link>
                ))}
              </nav>
            ) : null}

            {encadrants.length > 0 ? (
              <Suspense fallback={null}>
                <EncadrantsSection encadrants={encadrants} locale={locale} title={t.team.encadrantsTitle} />
              </Suspense>
            ) : null}

            {/* AVIS */}
            {testimonials.length > 0 ? (
              <section id="avis" className="mt-12 scroll-mt-28">
                <h2 className="text-xl font-bold text-bm-black">{t.offer.testimonialsTitle}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {testimonials.map((item) => (
                    <figure key={item.id} className="rounded-card border border-bm-black/10 bg-white p-4">
                      {item.rating ? <p className="text-sm tracking-widest text-bm-gold">{'★'.repeat(item.rating)}</p> : null}
                      <blockquote className="mt-2 text-sm text-bm-black/80">{pickLang(item, 'content', locale)}</blockquote>
                      <figcaption className="mt-2 text-xs text-bm-black/60">
                        {item.author_name}{item.author_city ? ` · ${item.author_city}` : ''}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            {/* FAQ — streamed */}
            <Suspense fallback={null}>
              <OfferFaqsSection locale={locale} faqTitle={t.home.faqTitle} />
            </Suspense>

            {/* SIMILAR — streamed */}
            <Suspense fallback={null}>
              <SimilarOffersSection
                offer={offer}
                locale={locale}
                cardT={cardT}
                whatsappHref={whatsappHref}
                similarTitle={t.offer.similarTitle}
              />
            </Suspense>
          </div>

          {/* STICKY BOOKING CARD */}
          <aside
            id="reserver"
            className="order-2 mt-10 scroll-mt-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:sticky lg:top-36 lg:self-start"
          >
            <div className="rounded-panel border border-bm-gold/25 bg-white p-6 shadow-float">
              <h2 className="text-lg font-bold">{t.offer.bookingTitle}</h2>
              {/* Real scarcity — shown ONLY when a seat count is set, bound to
                  the DB. No countdowns / urgency copy not backed by data. */}
              {seatsLabel(offer) != null && !isOfferPast(offer) ? (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {t.offer.seatsLeft.replace('{n}', seatsLabel(offer))}
                </p>
              ) : null}
              {tiers.length ? (
                <p className="mt-1 text-2xl">{tierRoomPriceSpans('text-2xl')}</p>
              ) : minPrice != null ? (
                <p className="mt-1">
                  <span className="text-xs text-bm-black/50">{t.offer.from} </span>
                  <span className="bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text text-2xl font-bold tabular-nums text-transparent">
                    {nf.format(minPrice)}
                  </span>
                  <span className="text-sm font-semibold text-bm-gold"> {t.offer.currency}</span>
                  <span className="text-xs text-bm-black/50"> / {t.offer.perPerson}</span>
                </p>
              ) : null}

              {/* TIER + ROOM SELECTOR */}
              {tiers.length ? (
                <div className="mt-4">
                  <TierAndRoomSelector
                    tiers={tiers}
                    t={t.offer}
                    defaultTier={defaultTier}
                    defaultRoom={defaultRoom}
                  />
                </div>
              ) : null}

              {responsable ? (
                <p className="mt-3 rounded-ctrl bg-bm-gold/5 px-3 py-2 text-xs text-bm-black/70">
                  {t.offer.bookingArrivesTo.replace('{name}', responsable.name)}
                </p>
              ) : null}
              <div className="mt-4">
                <LeadForm
                  locale={locale}
                  offerId={offer.id}
                  offerTitle={title}
                  offerPrice={minPrice != null ? `${nf.format(minPrice)} ${t.offer.currency}` : null}
                  whatsappNumber={settings?.whatsapp_number}
                  labels={t.form}
                  magnetic
                  source="offer_page"
                  defaultRoomType={defaultRoom}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-bm-black/60">🔒 {t.offer.reassurance}</p>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wt="whatsapp_click"
                  data-wt-offer={offer.id}
                  className="mt-3 inline-flex items-center gap-2 text-xs text-bm-black/60 underline-offset-4 hover:text-bm-black hover:underline"
                >
                  <WhatsAppIcon className="size-3.5" />
                  {t.cta.whatsappAlt}
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      {/* MOBILE STICKY BAR */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bm-black/10 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          {tiers.length ? (
            <p className="min-w-0 truncate text-sm">{tierRoomPriceSpans('text-base')}</p>
          ) : minPrice != null ? (
            <p className="text-sm">
              <span className="text-bm-black/50">{t.offer.from} </span>
              <span className="font-bold tabular-nums text-bm-gold">{nf.format(minPrice)} {t.offer.currency}</span>
            </p>
          ) : <span />}
          <a
            href="#reserver"
            data-wt="cta_click"
            data-wt-label="sticky_mobile"
            data-wt-offer={offer.id}
            className="shrink-0 rounded-full bg-wiki-blue px-6 py-2.5 text-sm font-semibold text-white shadow-lift"
          >
            {t.cta.reserveShort}
          </a>
        </div>
      </div>

      {/* Lifted above the mobile sticky reserve bar so it never covers the CTA */}
      <WhatsAppFloat locale={locale} offsetClass="bottom-[86px] lg:bottom-6" />
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Streamed below-the-fold sections. Each fetches its own data inside a       */
/* Suspense boundary so it never blocks the SEO-critical shell above.         */
/* ------------------------------------------------------------------------- */

async function EncadrantsSection({ encadrants, locale, title }) {
  // Faces fetched in parallel (was a sequential await loop that blocked render).
  const faceEntries = await Promise.all(
    encadrants.map(async (member) => {
      const slides = await getGallerySlides('team_members', member.id, locale);
      return [member.id, slides.find((s) => s.kind === 'image') ?? null];
    }),
  );
  const faceMap = new Map(faceEntries);
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-bm-black">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-5">
        {encadrants.map((member) => {
          const face = faceMap.get(member.id);
          return (
            <figure key={member.id} className="flex items-center gap-3">
              {face ? (
                <img src={face.src} alt={member.name} width={56} height={56} className="size-14 rounded-full object-cover" />
              ) : null}
              <figcaption>
                <p className="font-bold">{member.name}</p>
                <p className="text-xs text-bm-black/60">{pickLang(member, 'role', locale)}</p>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

async function OfferFaqsSection({ locale, faqTitle }) {
  const omraFaqs = await getFaqs('omra');
  if (!omraFaqs.length) return null;
  return (
    <section className="mt-12 max-w-prose">
      <h2 className="text-xl font-bold text-bm-black">{faqTitle}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {omraFaqs.slice(0, 4).map((faq, i) => (
          <details key={faq.id} open={i === 0} className="group rounded-card border border-bm-black/10 bg-white px-5 py-4">
            <summary className="cursor-pointer list-none font-semibold marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {pickLang(faq, 'question', locale)}
                <span className="text-bm-gold transition group-open:rotate-45">
                  <Icon name="plus" className="size-4" />
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-bm-black/70">{pickLang(faq, 'answer', locale)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

async function SimilarOffersSection({ offer, locale, cardT, whatsappHref, similarTitle }) {
  if (!offer.occasion) return null;
  const allOffers = await getPublishedOffers();
  const similar = allOffers
    .filter((o) => o.id !== offer.id && o.occasion?.slug === offer.occasion.slug)
    .slice(0, 3);
  if (!similar.length) return null;
  const similarCovers = await getCovers('offers', similar.map((o) => o.id));
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-bm-black">{similarTitle}</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {similar.map((o) => (
          <OfferCard
            key={o.id}
            compact
            offer={toOfferCard(o, similarCovers.get(o.id), locale)}
            locale={locale}
            t={cardT}
            whatsappHref={whatsappHref}
          />
        ))}
      </div>
    </section>
  );
}
