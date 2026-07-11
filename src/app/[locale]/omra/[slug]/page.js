import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { routeTitle } from '@/lib/titles';
import {
  getOfferBySlug,
  getPublishedOffers,
  getTeam,
  getTestimonials,
  getFaqs,
  getCovers,
} from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { getGallerySlides } from '@/lib/data/gallery';
import { publicMediaUrl } from '@/lib/media';
import { waLink } from '@/lib/whatsapp';
import BrandLockup from '@/components/site/BrandLockup';
import OfferSubnav from '@/components/site/OfferSubnav';
import RoomSelector from '@/components/site/RoomSelector';
import Icon from '@/components/site/Icon';
import JsonLd from '@/components/site/JsonLd';
import { OfferCard } from '@/components/site/PackagesSection';
import SmartGallery from '@/components/SmartGallery';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import WhatsAppIcon from '@/components/WhatsAppIcon';

export const revalidate = 60;

const nf = new Intl.NumberFormat('fr-MA');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wikitours.ma';
const ROOM_KEYS = ['double', 'triple', 'quad', 'quint'];
const AVAILABILITY = {
  open: 'https://schema.org/InStock',
  few_left: 'https://schema.org/LimitedAvailability',
  full: 'https://schema.org/SoldOut',
};

function fmtDate(value, locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
}

/** Non-null rooms as [key, price], cheapest first kept in table order. */
function offerRooms(offer) {
  return ROOM_KEYS.map((key) => [key, offer[`price_${key}`]]).filter(([, p]) => p != null);
}

/**
 * The computed answer-first sentence (LAWS §5 — the extraction target).
 * Every figure comes from the DB; missing pieces drop their fragment.
 */
function computedIntro(offer, t, locale, rooms) {
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
  if (offer.hotel_makkah && offer.hotel_makkah.distance_to_haram_m != null) {
    fragments.push(
      t.offer.introHotel
        .replace('{hotel}', offer.hotel_makkah.name)
        .replace('{m}', offer.hotel_makkah.distance_to_haram_m),
    );
  }

  const minRoom = rooms.length ? rooms.reduce((min, r) => (r[1] < min[1] ? r : min)) : null;
  const priceStr = minRoom
    ? t.offer.introPrice
        .replace('{price}', nf.format(minRoom[1]))
        .replace('{room}', t.offer.priceInRoom.replace('{room}', t.offer.roomShort[minRoom[0]]))
    : null;

  return `${fragments.join(locale === 'ar' ? '، ' : ', ')}${priceStr ? ` — ${priceStr}` : ''}.`;
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const offer = await getOfferBySlug(slug);
  if (!offer) return {};
  const t = getDictionary(locale);
  // Template: "Omra {occasion} {année} : {tier} dès {prix} MAD | Bab Makkah…"
  const occasionName = offer.occasion ? pickLang(offer.occasion, 'name', locale) : '';
  const tierLabel = offer.tier_label ? (t.offer.tier?.[offer.tier_label] ?? '') : '';
  const rooms = ['double', 'triple', 'quad', 'quint'].map((k) => offer[`price_${k}`]).filter((p) => p != null);
  const minPrice = rooms.length ? nf.format(Math.min(...rooms)) : nf.format(offer.starting_price ?? 0);
  const templated = routeTitle('offer', locale, { occasion: occasionName, tier: tierLabel, price: minPrice });
  const year = offer.date_start ? new Date(offer.date_start).getUTCFullYear() : '';
  const fallbackDesc = `Omra ${occasionName} ${year} : ${tierLabel} dès ${minPrice} MAD/pers.${
    offer.duration_days ? `, ${offer.duration_days} jours` : ''
  } depuis le Maroc — ${BRAND.lockup}.`.replace(/\s+/g, ' ').trim();
  return {
    title: { absolute: pickLang(offer, 'seo_title', locale) ?? templated },
    description: pickLang(offer, 'seo_description', locale) ?? pickLang(offer, 'summary', locale) ?? fallbackDesc,
    alternates: hreflangAlternates(locale, `/omra/${slug}`),
  };
}

export default async function OfferPage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const [offer, settings, team, allTestimonials, omraFaqs, allOffers] = await Promise.all([
    getOfferBySlug(slug),
    getSettings(),
    getTeam(),
    getTestimonials(),
    getFaqs('omra'),
    getPublishedOffers(),
  ]);
  if (!offer) notFound();

  const t = getDictionary(locale);
  const title = pickLang(offer, 'title', locale);
  const summary = pickLang(offer, 'summary', locale);
  const inclusions = pickLang(offer, 'inclusions', locale);
  const exclusions = pickLang(offer, 'exclusions', locale);
  const conditions = pickLang(offer, 'conditions', locale);
  const whatsappHref = waLink(settings?.whatsapp_number, title ? `${t.cta.reserve} — ${title}` : undefined);

  const rooms = offerRooms(offer);
  const minRoom = rooms.length ? rooms.reduce((min, r) => (r[1] < min[1] ? r : min)) : null;
  const defaultRoom = minRoom?.[0] ?? null;
  const minPrice = minRoom?.[1] ?? offer.starting_price;
  const intro = computedIntro(offer, t, locale, rooms);

  const inclusionLines = (inclusions ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  const exclusionLines = (exclusions ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

  const hotels = [
    offer.hotel_makkah ? { cityLabel: t.offer.makkah, hotel: offer.hotel_makkah } : null,
    offer.hotel_madinah ? { cityLabel: t.offer.madinah, hotel: offer.hotel_madinah } : null,
  ].filter(Boolean);

  // TEAM RENDERING RULE: named human behind the booking card + encadrants.
  const responsable = team.find((m) => (m.role_fr ?? '').toLowerCase().includes('responsable'));
  const encadrants = team.filter((m) => (m.role_fr ?? '').toLowerCase().includes('encadrant'));
  const encadrantFaces = new Map();
  for (const member of encadrants) {
    const slides = await getGallerySlides('team_members', member.id, locale);
    const face = slides.find((s) => s.kind === 'image');
    if (face) encadrantFaces.set(member.id, face);
  }

  // Testimonials for this offer, else the latest text ones.
  const textTestimonials = allTestimonials.filter((x) => x.kind === 'text');
  const forThisOffer = textTestimonials.filter((x) => x.offer_id === offer.id);
  const testimonials = (forThisOffer.length ? forThisOffer : textTestimonials).slice(0, 4);

  // Similar offers: same occasion, other programmes (other tiers/dates).
  const similar = offer.occasion
    ? allOffers.filter((o) => o.id !== offer.id && o.occasion?.slug === offer.occasion.slug).slice(0, 3)
    : [];
  const similarCovers = await getCovers('offers', similar.map((o) => o.id));

  // Key-facts bar — everything at a glance (5 chips), lucide icons only.
  const keyFacts = [
    offer.date_start && offer.date_end
      ? ['calendar', `${fmtDate(offer.date_start, locale)} → ${fmtDate(offer.date_end, locale)}`]
      : null,
    offer.duration_days && offer.duration_nights
      ? ['clock', t.offer.duration.replace('{days}', offer.duration_days).replace('{nights}', offer.duration_nights)]
      : null,
    offer.land_only ? ['plane', t.offer.landOnly] : offer.airline ? ['plane', offer.airline] : null,
    offer.hotel_makkah?.distance_to_haram_m != null
      ? ['pin', t.offer.distanceToHaram.replace('{m}', offer.hotel_makkah.distance_to_haram_m)]
      : null,
    ['dot', t.offer.status[offer.status]],
  ].filter(Boolean);

  const subnavItems = [
    { id: 'apercu', label: t.offer.subnav.overview },
    inclusionLines.length ? { id: 'programme', label: t.offer.subnav.programme } : null,
    rooms.length ? { id: 'prix', label: t.offer.subnav.prices } : null,
    hotels.length ? { id: 'hotels', label: t.offer.subnav.hotels } : null,
    { id: 'conditions', label: t.offer.subnav.conditions },
    testimonials.length ? { id: 'avis', label: t.offer.subnav.reviews } : null,
    { id: 'reserver', label: t.offer.subnav.reserve },
  ].filter(Boolean);

  const cardT = {
    ...t.offer,
    reserve: t.cta.reserve,
    whatsappAlt: t.cta.whatsappAlt,
    details: t.cta.details,
  };

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title ?? offer.slug,
    ...(intro || summary ? { description: intro ?? summary } : {}),
    brand: { '@type': 'Brand', name: BRAND.lockup },
    ...(minPrice != null
      ? {
          offers: {
            '@type': 'Offer',
            price: minPrice,
            priceCurrency: 'MAD',
            availability: AVAILABILITY[offer.status],
            url: `${SITE_URL}/${locale}/omra/${offer.slug}`,
            seller: { '@id': `${SITE_URL}/#organization` },
            ...(offer.created_at ? { validFrom: offer.created_at.slice(0, 10) } : {}),
            // Booking closes at departure — price valid until then.
            ...(offer.date_start ? { validThrough: offer.date_start, priceValidUntil: offer.date_start } : {}),
          },
        }
      : {}),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.nav.home, item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: BRAND.service, item: `${SITE_URL}/${locale}/bab-makkah` },
      { '@type': 'ListItem', position: 3, name: title ?? offer.slug },
    ],
  };

  /** Booking price line: one span per room, CSS shows the selected one. */
  const roomPriceSpans = (sizeClasses) =>
    rooms.map(([room, price]) => (
      <span key={room} data-room-price={room}>
        <span className={`bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text font-bold tabular-nums text-transparent ${sizeClasses}`}>
          {nf.format(price)}
        </span>
        <span className="text-sm font-semibold text-bm-gold"> {t.offer.currency}</span>
        <span className="text-xs text-white/50">
          {' '}· {t.offer.selectedRoom.replace('{room}', t.offer.roomShort[room])}
        </span>
      </span>
    ));

  return (
    <div id="offer-root" data-selected-room={defaultRoom ?? undefined} className="bg-bm-black text-white">
      <div className="scroll-progress" data-progress aria-hidden="true" />
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <span data-wt-view={`offers:${offer.id}`} hidden />

      <main className="mx-auto max-w-6xl px-6 pb-28 pt-6 lg:pb-16">
        <BrandLockup locale={locale} size="sm" />

        {/* Sticky anchor sub-nav (scrollspy) */}
        <OfferSubnav items={subnavItems} />

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            {/* a+b — HERO: H1, computed answer-first intro, key facts, gallery */}
            <section id="apercu" className="scroll-mt-28">
              <h1 className="flex max-w-3xl flex-wrap items-center gap-3 text-3xl font-bold leading-tight sm:text-4xl">
                {title}
                {offer.tier_label && t.offer.tier?.[offer.tier_label] ? (
                  <span className="rounded-full border border-bm-gold/50 px-2.5 py-1 align-middle text-xs font-bold uppercase tracking-widest text-bm-gold">
                    {t.offer.tier[offer.tier_label]}
                  </span>
                ) : null}
              </h1>

              {/* Answer-first crawlable facts (LAWS §5 — the extraction target) */}
              {intro ? (
                <p className="mt-3 max-w-prose text-lg leading-relaxed text-white/85">{intro}</p>
              ) : summary ? (
                <p className="mt-3 max-w-prose text-lg leading-relaxed text-white/85">{summary}</p>
              ) : null}
              {intro && summary ? (
                <p className="mt-2 max-w-prose leading-relaxed text-white/65">{summary}</p>
              ) : null}

              {/* KEY-FACTS BAR */}
              <ul className="mt-5 flex flex-wrap gap-2">
                {keyFacts.map(([icon, value]) => (
                  <li
                    key={value}
                    className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/85"
                  >
                    <Icon name={icon} className="size-3.5 text-bm-gold" />
                    {value}
                  </li>
                ))}
              </ul>

              <div className="mt-6 overflow-hidden rounded-panel shadow-float empty:hidden">
                <SmartGallery
                  entityType="offers"
                  entityId={offer.id}
                  locale={locale}
                  aspect="16 / 9"
                  sizes="(min-width: 1024px) 720px, 100vw"
                />
              </div>
            </section>

            {/* d1 — Programme & inclus (icon checklist) */}
            {inclusionLines.length ? (
              <section id="programme" className="mt-12 max-w-prose scroll-mt-28">
                <h2 className="text-xl font-bold text-bm-gold-light">{t.offer.programmeTitle}</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {inclusionLines.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 leading-relaxed text-white/85">
                      <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-bm-gold/15 text-bm-gold">
                        <Icon name="check" className="size-3" />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>

                {/* The honesty block nobody in the market has */}
                {exclusionLines.length ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
                      {t.offer.notIncludedTitle}
                    </h3>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {exclusionLines.map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/55">
                          <span aria-hidden="true" className="mt-0.5">—</span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* d2 — PRIX: per-room, per-person, availability, selected row gold */}
            {rooms.length ? (
              <section id="prix" className="mt-12 scroll-mt-28">
                <h2 className="text-xl font-bold text-bm-gold-light">{t.offer.pricesTitle}</h2>
                <table className="mt-4 w-full max-w-xl text-start text-sm">
                  <thead>
                    <tr className="border-b border-white/15 text-xs uppercase tracking-wide text-white/45">
                      <th scope="col" className="py-2 text-start font-semibold">{t.offer.roomColumn}</th>
                      <th scope="col" className="py-2 text-end font-semibold">{t.offer.priceColumn}</th>
                      <th scope="col" className="py-2 text-end font-semibold">{t.offer.availability}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(([room, price]) => (
                      <tr key={room} data-room-row={room} className="border-b border-white/10 transition last:border-0">
                        <th scope="row" className="py-3 ps-2 text-start font-medium text-white/80">
                          {t.offer.room[room]}
                        </th>
                        <td className="py-3 text-end">
                          <span className="bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text text-lg font-bold tabular-nums text-transparent">
                            {nf.format(price)}
                          </span>
                          <span className="ms-1 text-xs text-white/50">{t.offer.currency} / {t.offer.perPerson}</span>
                        </td>
                        <td className="py-3 pe-2 text-end text-xs font-semibold text-white/60">
                          {t.offer.status[offer.status]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}

            {/* d3 — HÔTELS */}
            {hotels.length ? (
              <section id="hotels" className="mt-12 scroll-mt-28">
                <h2 className="text-xl font-bold text-bm-gold-light">{t.offer.hotelsTitle}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {hotels.map(({ cityLabel, hotel }) => (
                    <article key={hotel.id} className="overflow-hidden rounded-card border border-white/10 bg-bm-black-soft">
                      <SmartGallery entityType="hotels" entityId={hotel.id} locale={locale} aspect="16 / 9" sizes="(min-width: 640px) 45vw, 100vw" />
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-wide text-bm-gold">{cityLabel}</p>
                        <h3 className="mt-1 flex items-center gap-2 font-bold">
                          {hotel.logo_path ? (
                            // eslint-disable-next-line @next/next/no-img-element -- tiny brand mark
                            <img src={publicMediaUrl(hotel.logo_path)} alt="" className="h-5 w-auto rounded-[4px] bg-white/90 px-1 py-0.5" />
                          ) : null}
                          <Link href={`/${locale}/hotel/${hotel.slug}`} className="hover:text-bm-gold-light">
                            {hotel.name}
                          </Link>
                          {hotel.stars ? (
                            <span className="text-sm font-normal tracking-widest text-bm-gold">{'★'.repeat(hotel.stars)}</span>
                          ) : null}
                        </h3>
                        <p className="mt-1 text-sm text-white/60">
                          {hotel.distance_to_haram_m != null ? t.offer.distanceToHaram.replace('{m}', hotel.distance_to_haram_m) : null}
                          {hotel.distance_to_haram_m != null && hotel.breakfast_included ? ' · ' : ''}
                          {hotel.breakfast_included ? t.offer.breakfastIncluded : null}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {/* d4 — CONDITIONS: visually distinct, it's the filter */}
            <section id="conditions" className="mt-12 max-w-prose scroll-mt-28 rounded-card border border-bm-gold/25 bg-bm-gold/5 p-5">
              <h2 className="text-xl font-bold text-bm-gold-light">{t.offer.conditionsTitle}</h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm font-semibold text-white/90">
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
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">{conditions}</p>
              ) : null}
            </section>

            {encadrants.length > 0 ? (
              <section className="mt-12">
                <h2 className="text-xl font-bold text-bm-gold-light">{t.team.encadrantsTitle}</h2>
                <div className="mt-4 flex flex-wrap gap-5">
                  {encadrants.map((member) => {
                    const face = encadrantFaces.get(member.id);
                    return (
                      <figure key={member.id} className="flex items-center gap-3">
                        {face ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small avatar
                          <img src={face.src} alt={member.name} className="size-14 rounded-full object-cover" />
                        ) : null}
                        <figcaption>
                          <p className="font-bold">{member.name}</p>
                          <p className="text-xs text-white/60">{pickLang(member, 'role', locale)}</p>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* d5 — AVIS: this offer's testimonials, else the latest */}
            {testimonials.length > 0 ? (
              <section id="avis" className="mt-12 scroll-mt-28">
                <h2 className="text-xl font-bold text-bm-gold-light">{t.offer.testimonialsTitle}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {testimonials.map((item) => (
                    <figure key={item.id} className="rounded-card border border-white/10 bg-bm-black-soft p-4">
                      {item.rating ? <p className="text-sm tracking-widest text-bm-gold">{'★'.repeat(item.rating)}</p> : null}
                      <blockquote className="mt-2 text-sm text-white/80">{pickLang(item, 'content', locale)}</blockquote>
                      <figcaption className="mt-2 text-xs text-white/50">
                        {item.author_name}{item.author_city ? ` · ${item.author_city}` : ''}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            {/* d6 — FAQ (crawlable details/summary) */}
            {omraFaqs.length ? (
              <section className="mt-12 max-w-prose">
                <h2 className="text-xl font-bold text-bm-gold-light">{t.home.faqTitle}</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {omraFaqs.slice(0, 4).map((faq, i) => (
                    <details key={faq.id} open={i === 0} className="group rounded-card border border-white/10 bg-bm-black-soft px-5 py-4">
                      <summary className="cursor-pointer list-none font-semibold marker:content-none">
                        <span className="flex items-center justify-between gap-4">
                          {pickLang(faq, 'question', locale)}
                          <span className="text-bm-gold transition group-open:rotate-45">
                            <Icon name="plus" className="size-4" />
                          </span>
                        </span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-white/70">{pickLang(faq, 'answer', locale)}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {/* d7 — SIMILAR OFFERS (same occasion, other tiers) */}
            {similar.length ? (
              <section className="mt-12">
                <h2 className="text-xl font-bold text-bm-gold-light">{t.offer.similarTitle}</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {similar.map((o) => (
                    <OfferCard
                      key={o.id}
                      compact
                      offer={{
                        ...o,
                        cover: similarCovers.get(o.id)
                          ? { src: publicMediaUrl(similarCovers.get(o.id).path), alt: pickLang(similarCovers.get(o.id), 'alt', locale) }
                          : null,
                      }}
                      locale={locale}
                      t={cardT}
                      whatsappHref={whatsappHref}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* e — Sticky booking card: selected room price, 3-field form, named human */}
          <aside id="reserver" className="scroll-mt-28 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-panel border border-bm-gold/25 bg-bm-black-soft p-6 shadow-float">
              <h2 className="text-lg font-bold">{t.offer.bookingTitle}</h2>
              {rooms.length ? (
                <p className="mt-1 text-2xl">{roomPriceSpans('text-2xl')}</p>
              ) : offer.starting_price != null ? (
                <p className="mt-1">
                  <span className="text-xs text-white/50">{t.offer.from} </span>
                  <span className="bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text text-2xl font-bold tabular-nums text-transparent">
                    {nf.format(offer.starting_price)}
                  </span>
                  <span className="text-sm font-semibold text-bm-gold"> {t.offer.currency}</span>
                  <span className="text-xs text-white/50"> / {t.offer.perPerson}</span>
                </p>
              ) : null}

              {/* c — ROOM-TYPE SELECTOR (enriches the lead invisibly) */}
              {rooms.length >= 2 ? (
                <div className="mt-4">
                  <RoomSelector
                    rooms={rooms.map(([key]) => ({ key, label: t.offer.roomShort[key] }))}
                    defaultRoom={defaultRoom}
                    label={t.offer.chooseRoom}
                  />
                </div>
              ) : null}

              {responsable ? (
                <p className="mt-3 rounded-ctrl bg-white/5 px-3 py-2 text-xs text-white/70">
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
                  dark
                  magnetic
                  source="offer_page"
                  defaultRoomType={defaultRoom}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-bm-gold-light/90">🔒 {t.offer.reassurance}</p>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wt="whatsapp_click"
                  data-wt-offer={offer.id}
                  className="mt-3 inline-flex items-center gap-2 text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
                >
                  <WhatsAppIcon className="size-3.5" />
                  {t.cta.whatsappAlt}
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile sticky bottom bar: selected room price + CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bm-black/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          {rooms.length ? (
            <p className="min-w-0 truncate text-sm">{roomPriceSpans('text-base')}</p>
          ) : offer.starting_price != null ? (
            <p className="text-sm">
              <span className="text-white/50">{t.offer.from} </span>
              <span className="font-bold tabular-nums text-bm-gold-light">{nf.format(offer.starting_price)} {t.offer.currency}</span>
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

      <WhatsAppFloat locale={locale} />
    </div>
  );
}
