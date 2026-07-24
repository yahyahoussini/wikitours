import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { SITE_URL, hreflangAlternates, clampDesc } from '@/lib/seo';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { getPublishedOffers, getTestimonials, getFaqs } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { SETTINGS_OFFICE_ENTITY_ID } from '@/lib/entities';
import BrandLockup from '@/components/site/BrandLockup';
import SectionBridge from '@/components/site/SectionBridge';
import JsonLd from '@/components/site/JsonLd';
import SmartGallery from '@/components/SmartGallery';
import { GuaranteesStrip, MonthsLinks } from '@/components/site/HomeSections';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

const nf = new Intl.NumberFormat('fr-MA');

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.agency.title, description: clampDesc(t.agency.metaDescription), alternates: hreflangAlternates(locale, '/agence-omra-casablanca') };
}

/* /agence-omra-casablanca — the LocalBusiness landing: identity answer-first,
   office gallery, NAP + hours, 3 nearest real departures (dark band with the
   lockup), Casablanca testimonials, trust stack, link hub, TravelAgency
   JSON-LD. Every figure computed from the DB. */
export default async function AgencyCasablancaPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const [settings, offers, testimonials] = await Promise.all([
    getSettings(),
    getPublishedOffers(),
    getTestimonials(),
  ]);

  const whatsappHref = waLink(settings?.whatsapp_number);
  const phones = [settings?.phone_1, settings?.phone_2, settings?.phone_3].filter(Boolean);
  const address = pickLang(settings, 'address', locale);
  const hours = pickLang(settings, 'opening_hours', locale);

  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  // 3 nearest open departures, straight from the DB.
  const departures = offers
    .filter((o) => o.status !== 'full' && o.date_start)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
    .slice(0, 3);

  // Casablanca testimonials only (text kind) — FR/EN spelling or Arabic.
  const casaTexts = testimonials.filter(
    (x) => x.kind === 'text' && /casa|البيضاء/i.test(x.author_city ?? ''),
  );

  // LocalBusiness = the physical Casablanca office (distinct from the sitewide
  // TravelAgency org). Geo + address stay out until the client sets them (LAW §10).
  const socials = [settings?.facebook_url, settings?.instagram_url, settings?.tiktok_url, settings?.youtube_url].filter(Boolean);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/${locale}/agence-omra-casablanca#office`,
    name: `${BRAND.parent} — Casablanca`,
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    url: `${SITE_URL}/${locale}/agence-omra-casablanca`,
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address, addressLocality: 'Casablanca', addressCountry: 'MA' } } : {}),
    ...(settings?.latitude != null && settings?.longitude != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: settings.latitude, longitude: settings.longitude } }
      : {}),
    ...(phones[0] ? { telephone: phones[0] } : {}),
    ...(settings?.email ? { email: settings.email } : {}),
    ...(hours ? { openingHours: hours } : {}),
    ...(settings?.gbp_rating && settings?.gbp_review_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: settings.gbp_rating,
            reviewCount: settings.gbp_review_count,
          },
        }
      : {}),
    ...(socials.length ? { sameAs: socials } : {}),
  };

  // Local/process Q&A owning the "agence omra casablanca" family (criteria live
  // in the choisir-agence article, per-city logistics in the ville-* pages).
  const agencyFaqs = await getFaqs('agence');
  const faqJsonLd = agencyFaqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: agencyFaqs.map((f) => ({
          '@type': 'Question',
          name: pickLang(f, 'question', locale),
          acceptedAnswer: { '@type': 'Answer', text: pickLang(f, 'answer', locale) },
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={jsonLd} />
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      <main>
        {/* Identity answer-first block */}
        <div className="mx-auto max-w-5xl px-6 pt-10">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-bm-black sm:text-4xl">
            {t.agency.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{t.agency.identity}</p>
          {settings?.license_number ? (
            <p className="mt-3 text-sm text-bm-black/50">
              {t.footer.licenseLabel} : <span className="font-semibold tabular-nums">{settings.license_number}</span>
              {' · '}
              <Link href={`/${locale}/agrement`} className="text-wiki-blue underline-offset-4 hover:underline">
                {t.pages.agrementTitle}
              </Link>
            </p>
          ) : null}
        </div>

        {/* Office gallery (admin-managed: settings_office) + NAP */}
        <section className="mx-auto grid max-w-5xl items-start gap-8 px-6 py-10 lg:grid-cols-[3fr_2fr]">
          <SmartGallery
            entityType="settings_office"
            entityId={SETTINGS_OFFICE_ENTITY_ID}
            locale={locale}
            aspect="16 / 10"
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="rounded-panel shadow-lift"
          />
          <div className="flex flex-col gap-5 rounded-panel border border-bm-black/5 bg-white p-6 shadow-hairline">
            <h2 className="text-xl font-bold text-bm-black">{t.agency.officeTitle}</h2>
            {address ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-bm-black/50">{t.pages.addressTitle}</h3>
                <p className="mt-1 leading-relaxed text-bm-black/80">{address}</p>
              </div>
            ) : null}
            {hours ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-bm-black/50">{t.pages.hoursTitle}</h3>
                <p className="mt-1 whitespace-pre-line leading-relaxed text-bm-black/80">{hours}</p>
              </div>
            ) : null}
            {phones.length ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-bm-black/50">{t.pages.phonesTitle}</h3>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {phones.map((phone) => (
                    <li key={phone}>
                      <a
                        href={`tel:${String(phone).replace(/[^+\d]/g, '')}`}
                        className="font-semibold tabular-nums text-bm-black hover:text-wiki-blue"
                        dir="ltr"
                      >
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-wt="whatsapp_click"
                data-wt-label="agency"
                className="inline-block w-fit rounded-full bg-wiki-blue px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
              >
                {t.cta.whatsappFloatLabel}
              </a>
            ) : null}
          </div>
        </section>

        {/* 3 nearest departures — Bab Makkah surface with the lockup */}
        {departures.length ? (
          <>
            <SectionBridge from="light" to="dark" />
            <section className="bg-bm-black text-white">
              <div className="mx-auto max-w-5xl px-6 py-14">
                <BrandLockup locale={locale} size="sm" />
                <h2 className="mt-3 text-2xl font-bold">{t.pages.nextDepartures}</h2>
                <ul className="mt-6 flex flex-col gap-3">
                  {departures.map((offer) => (
                    <li key={offer.id}>
                      <Link
                        href={`/${locale}/omra/${offer.slug}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-white/5 px-5 py-4 transition hover:border-bm-gold/50"
                      >
                        <div>
                          <p className="text-sm text-bm-gold-light">{dateFmt.format(new Date(offer.date_start))}</p>
                          <p className="mt-0.5 font-bold">{pickLang(offer, 'title', locale)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          {offer.starting_price != null ? (
                            <p className="text-sm">
                              <span className="text-white/50">{t.offer.from} </span>
                              <span className="bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text font-bold tabular-nums text-transparent">
                                {nf.format(offer.starting_price)}
                              </span>
                              <span className="text-xs font-semibold text-bm-gold"> {t.offer.currency}</span>
                            </p>
                          ) : null}
                          <span className="text-sm font-semibold text-bm-gold">{t.cta.details} →</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/${locale}/bab-makka`}
                  className="mt-5 inline-block text-sm font-semibold text-bm-gold underline-offset-4 hover:underline"
                >
                  {t.cta.seeAllOffers} →
                </Link>
              </div>
            </section>
            <SectionBridge from="dark" to="light" />
          </>
        ) : null}

        {/* Casablanca testimonials */}
        {casaTexts.length ? (
          <section className="mx-auto max-w-5xl px-6 py-10">
            <h2 className="text-2xl font-bold text-bm-black">{t.agency.testimonialsTitle}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {casaTexts.slice(0, 6).map((item) => (
                <figure key={item.id} className="rounded-card bg-white p-5 shadow-hairline">
                  {item.rating ? (
                    <p className="text-sm tracking-widest text-bm-gold">{'★'.repeat(item.rating)}</p>
                  ) : null}
                  <blockquote className="mt-2 text-sm leading-relaxed text-bm-black/80">
                    {pickLang(item, 'content', locale)}
                  </blockquote>
                  <figcaption className="mt-3 text-xs font-semibold text-bm-black/50">
                    {item.author_name}
                    {item.author_city ? ` · ${item.author_city}` : ''}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* Agency Q&A — mirrors faqJsonLd above (same rows, same order) */}
        {agencyFaqs.length ? (
          <section className="mx-auto max-w-5xl px-6 py-8">
            <h2 className="text-2xl font-bold text-bm-black">{t.offer.faqTitle}</h2>
            <div className="mt-4 flex max-w-prose flex-col gap-3">
              {agencyFaqs.map((faq, i) => (
                <details
                  key={faq.id}
                  open={i === 0}
                  className="group rounded-card border border-bm-black/10 bg-white px-5 py-4 shadow-hairline"
                >
                  <summary className="cursor-pointer list-none font-semibold marker:content-none">
                    {pickLang(faq, 'question', locale)}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-bm-black/70">
                    {pickLang(faq, 'answer', locale)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* Trust stack */}
        <GuaranteesStrip locale={locale} license={settings?.license_number} />

        {/* Lazy map */}
        {address ? (
          <section className="mx-auto max-w-5xl px-6 py-6">
            <h2 className="text-xl font-bold text-bm-black">{t.pages.findUs}</h2>
            <div className="mt-4 overflow-hidden rounded-panel shadow-hairline">
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                title={t.pages.findUs}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full border-0"
              />
            </div>
          </section>
        ) : null}

        {/* Link hub */}
        <MonthsLinks locale={locale} />
      </main>
      <WhatsAppFloat locale={locale} />
    </>
  );
}
