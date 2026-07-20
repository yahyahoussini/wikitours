import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { getPublishedOffers, getOccasions, getCovers, getCityPage, getFaqs } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { toOfferCard } from '@/lib/offer-card';
import { waLink } from '@/lib/whatsapp';
import { OMRA_YEAR, MONTH_SLUGS, parseMonthSlug, monthPagePath, monthName, CITY_SLUGS, cityPageIndexable } from '@/lib/months';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { routeTitle, withBrand } from '@/lib/titles';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import JsonLd from '@/components/site/JsonLd';
import OffersPriceTable from '@/components/site/OffersPriceTable';
import PackagesSection from '@/components/site/PackagesSection';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

/** Prebuild the whole programmatic surface (12 months + DB occasions + 8
 *  cities) × locale. Unknown slugs still resolve on-demand and 404. */
export async function generateStaticParams() {
  const occasions = await getOccasions();
  const slugs = [
    ...MONTH_SLUGS.map((m) => `omra-${m}`),
    ...occasions.map((o) => `omra-${o.slug}`),
    ...Object.keys(CITY_SLUGS).map((c) => `omra-depuis-${c}`),
  ];
  return LOCALES.flatMap((locale) => slugs.map((flat) => ({ locale, flat })));
}

const nf = new Intl.NumberFormat('fr-MA');

/** Earliest departure year among matching offers (data-driven page year), or null. */
function occasionYearOf(offers) {
  const years = offers.map((o) => o.date_start && new Date(o.date_start).getUTCFullYear()).filter(Boolean);
  return years.length ? Math.min(...years) : null;
}

/**
 * One dynamic segment for the flat landing URLs:
 *   /omra-{mois}-{year}   (12 months, ONE year constant, auto-308 rollover)
 *   /omra-{occasion}      (DB occasions incl. Hijri — indexed even when empty)
 *   /omra-depuis-{ville}  (8-city whitelist)
 * Anything else → 404.
 */
async function resolveFlat(flat) {
  const month = parseMonthSlug(flat);
  if (month) return { kind: 'month', ...month };

  const cityMatch = flat.match(/^omra-depuis-([a-z]+)$/);
  if (cityMatch && CITY_SLUGS[cityMatch[1]]) {
    return { kind: 'city', citySlug: cityMatch[1], cityName: CITY_SLUGS[cityMatch[1]] };
  }

  const occMatch = flat.match(/^omra-([a-z0-9-]+)$/);
  if (occMatch) {
    const occasions = await getOccasions();
    const occasion = occasions.find((o) => o.slug === occMatch[1]);
    if (occasion) return { kind: 'occasion', occasion };
  }
  return null;
}

export async function generateMetadata({ params }) {
  const { locale, flat } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const resolved = await resolveFlat(flat);
  if (!resolved) notFound(); // metadata-phase 404: real status before streaming
  const alternates = hreflangAlternates(locale, `/${flat}`);
  if (resolved.kind === 'month') {
    const month = monthName(resolved.monthIndex, locale);
    // A month with no departure has nothing to rank. Keep it crawlable
    // (follow) but out of the index until it has offers — 12 near-empty
    // templated hubs otherwise read as doorway/thin content and can drag the
    // whole programmatic surface down. It re-enters the index by itself the
    // moment an offer lands in that month (and the sitemap agrees — see
    // app/sitemap.js). getPublishedOffers is request-cached.
    const offers = await getPublishedOffers();
    const hasOffers = offers.some(
      (o) =>
        o.date_start &&
        new Date(o.date_start).getUTCMonth() === resolved.monthIndex &&
        new Date(o.date_start).getUTCFullYear() === OMRA_YEAR,
    );
    return {
      title: { absolute: routeTitle('month', locale, { month }) },
      description: clampDesc(`Omra ${month} ${OMRA_YEAR} depuis le Maroc — dates, hôtels et prix. ${t.brand.premiumService}`),
      alternates,
      ...(hasOffers ? {} : { robots: { index: false, follow: true } }),
    };
  }
  if (resolved.kind === 'city') {
    // absolute → no " — Wiki Tours International" template suffix (keeps ≤60).
    // Anti-doorway guard: noindex until the admin fills the unique local
    // content AND flips the city_pages toggle (Phase 4 A2 §12).
    const cityRow = await getCityPage(resolved.citySlug);
    return {
      title: { absolute: t.cityPage.title.replace('{city}', resolved.cityName) },
      description: clampDesc(pickLang(cityRow, 'intro', locale) ?? t.cityPage.answer),
      alternates,
      ...(cityPageIndexable(cityRow) ? {} : { robots: { index: false, follow: true } }),
    };
  }
  // Data-driven year from the occasion's real departures (evergreen URL, year
  // in the title only). getPublishedOffers is request-cached.
  const occOffers = (await getPublishedOffers()).filter((o) => o.occasion?.slug === resolved.occasion.slug);
  const occYear = occasionYearOf(occOffers);
  const occName = pickLang(resolved.occasion, 'name', locale);
  return {
    title: {
      absolute: withBrand(
        pickLang(resolved.occasion, 'seo_title', locale) ?? `Omra ${occName}${occYear ? ` ${occYear}` : ''}`,
      ),
    },
    description: clampDesc(
      pickLang(resolved.occasion, 'seo_description', locale) ?? pickLang(resolved.occasion, 'description', locale),
    ),
    alternates,
  };
}

export default async function FlatLandingPage({ params }) {
  const { locale, flat } = await params;
  if (!isLocale(locale)) notFound();

  const resolved = await resolveFlat(flat);
  if (!resolved) notFound();

  // Legacy dated month URL (/omra-juillet-2026) → 301 to the evergreen hub
  // (/omra-juillet). Year is content, never URL.
  if (resolved.kind === 'month' && resolved.legacy) {
    permanentRedirect(`/${locale}${monthPagePath(resolved.monthIndex)}`);
  }

  const t = getDictionary(locale);
  const [offers, settings] = await Promise.all([getPublishedOffers(), getSettings()]);
  const whatsappHref = waLink(settings?.whatsapp_number);

  // City pages carry admin-authored unique content + their own FAQ category.
  const cityRow = resolved.kind === 'city' ? await getCityPage(resolved.citySlug) : null;
  const cityFaqs = resolved.kind === 'city' ? await getFaqs(`ville-${resolved.citySlug}`) : [];

  let matching = offers;
  let heading;
  let answer = null;
  let alertSource = `landing_${flat}`;

  if (resolved.kind === 'month') {
    const month = monthName(resolved.monthIndex, locale);
    matching = offers.filter(
      (o) => o.date_start && new Date(o.date_start).getUTCMonth() === resolved.monthIndex &&
        new Date(o.date_start).getUTCFullYear() === OMRA_YEAR,
    );
    heading = t.months.pageTitle.replace('{month}', month).replace('{year}', String(OMRA_YEAR));
    const minPrice = Math.min(...matching.map((o) => o.starting_price).filter((p) => p != null));
    answer = matching.length
      ? t.months.answerWithOffers
          .replace('{n}', matching.length)
          .replace('{month}', month)
          .replace('{year}', String(OMRA_YEAR))
          .replace('{min}', Number.isFinite(minPrice) ? nf.format(minPrice) : '—')
      : t.months.emptyTitle.replace('{month}', month).replace('{year}', String(OMRA_YEAR));
  } else if (resolved.kind === 'occasion') {
    matching = offers.filter((o) => o.occasion?.slug === resolved.occasion.slug);
    const occasionName = pickLang(resolved.occasion, 'name', locale);
    // Year comes from the real departures (Ramadan 2027 ≠ OMRA_YEAR), so the
    // H1/title carry the year while the URL stays evergreen (/omra-ramadan).
    const occasionYear = occasionYearOf(matching);
    heading = occasionYear ? `Omra ${occasionName} ${occasionYear}` : `Omra ${occasionName}`;
    // Answer-first (LAWS §5): admin description if any, else a computed line
    // when offers match, else the honest empty state — never a blank lede.
    const minPrice = Math.min(...matching.map((o) => o.starting_price).filter((p) => p != null));
    answer = pickLang(resolved.occasion, 'description', locale) ??
      (matching.length === 0
        ? t.occasionPage.empty
        : t.occasionPage.answerWithOffers
            .replace('{n}', matching.length)
            .replace('{occasion}', occasionName)
            .replace('{min}', Number.isFinite(minPrice) ? nf.format(minPrice) : '—'));
  } else {
    heading = t.cityPage.title.replace('{city}', resolved.cityName);
    // Unique local intro when the admin wrote it; the generic line otherwise
    // (and the page stays noindex — see generateMetadata).
    answer = pickLang(cityRow, 'intro', locale) ?? t.cityPage.answer;
    alertSource = `city_${resolved.citySlug}`;
  }

  const cityLogistics = resolved.kind === 'city' ? pickLang(cityRow, 'logistics', locale) : null;

  // Freshness (visible + schema): latest change among the offers shown.
  const updated = matching.reduce(
    (max, o) => (o.updated_at && (!max || o.updated_at > max) ? o.updated_at : max),
    null,
  );
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' });

  const covers = await getCovers('offers', matching.map((o) => o.id));

  const cardT = {
    ...t.offer,
    reserve: t.cta.reserve,
    whatsappAlt: t.cta.whatsappAlt,
    details: t.cta.details,
    filterAll: t.archive.filterAll,
    monthAll: t.home.selectorMonth,
  };

  // WebPage + speakable: the computed lede IS the answer these hub URLs rank
  // for ("Omra en ramadan 2026 ?"), so mark it extractable.
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(locale, `/${flat}`)}#webpage`,
    url: absoluteUrl(locale, `/${flat}`),
    name: heading,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    ...(answer ? { description: answer } : {}),
    ...(updated ? { dateModified: updated } : {}),
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
  };

  // FAQ block: occasion hubs carry the generically-true Omra FAQ; city pages
  // carry their own DB category (ville-{slug}, admin-authored, [ADMIN DATA]
  // until seeded). Normalized to {q, a}.
  const faq =
    resolved.kind === 'occasion'
      ? t.pages.pasCherFaq
      : cityFaqs.length
        ? cityFaqs.map((f) => ({ q: pickLang(f, 'question', locale), a: pickLang(f, 'answer', locale) }))
        : null;
  const faqJsonLd = faq
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }
    : null;

  return (
    <div className="bg-bm-black text-white">
      <JsonLd data={webPageJsonLd} />
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      {/* Premium header band — a soft gold-lit dark panel with the dotted map
          canvas, so the H1/answer sit on a crafted surface instead of bare
          black (matches the elevated Hajj/offer treatment). */}
      <section className="px-3 pt-3">
        <div className="map-canvas-dark relative mx-auto max-w-6xl overflow-hidden rounded-panel border border-white/10 bg-bm-black-soft px-6 py-10 shadow-float sm:px-10 sm:py-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-bm-gold/10 blur-3xl" />
          <div className="relative">
            <BrandLockup locale={locale} size="sm" />
            <BreadcrumbTrail
              dark
              className="mt-3"
              items={[
                { label: t.nav.home, href: `/${locale}` },
                { label: BRAND.service, href: `/${locale}/bab-makka` },
                { label: heading },
              ]}
            />
            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{heading}</h1>
            {answer ? (
              <p data-answer className="mt-3 max-w-2xl text-lg leading-relaxed text-white/80">{answer}</p>
            ) : null}
            {updated ? (
              <p className="mt-2 text-sm text-white/50">
                {t.pages.seasonalUpdated} <time dateTime={updated}>{dateFmt.format(new Date(updated))}</time>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        {/* Anti-doorway guard hook: present only while the city page lacks its
            unique content — the audit fails if this coexists with indexability. */}
        {resolved.kind === 'city' && !cityPageIndexable(cityRow) ? <span data-guard="empty" hidden /> : null}

        {cityLogistics ? (
          <section className="mt-8 max-w-2xl rounded-panel border border-white/10 bg-bm-black-soft p-6">
            <h2 className="text-xl font-bold">{t.cityPage.logisticsTitle.replace('{city}', resolved.cityName)}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">{cityLogistics}</p>
          </section>
        ) : null}

        {matching.length > 0 ? (
          <div className="mt-8">
            <PackagesSection
              offers={matching.map((offer) => toOfferCard(offer, covers.get(offer.id), locale))}
              occasions={[]}
              locale={locale}
              t={cardT}
              whatsappHref={whatsappHref}
            />
          </div>
        ) : (
          /* Honest empty state + alert micro-form */
          <section className="mt-8 max-w-md rounded-panel border border-bm-gold/25 bg-bm-black-soft p-6">
            <p className="text-sm leading-relaxed text-white/75">{t.months.alertPrompt}</p>
            <div className="mt-4">
              <LeadForm locale={locale} labels={t.form} dark source={alertSource} whatsappNumber={settings?.whatsapp_number} />
            </div>
            <Link
              href={`/${locale}/bab-makka`}
              className="mt-4 inline-block text-sm font-semibold text-bm-gold underline-offset-4 hover:underline"
            >
              {t.months.browseAll} →
            </Link>
          </section>
        )}

        {/* AEO: seasonal (occasion) hubs also carry an extractable price table. */}
        {resolved.kind === 'occasion' ? (
          <OffersPriceTable offers={matching} locale={locale} t={t} dark />
        ) : null}

        {faq ? (
          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-bold">FAQ</h2>
            <div className="mt-4 flex flex-col gap-3">
              {faq.map((f) => (
                <details key={f.q} className="group rounded-card border border-white/10 bg-bm-black-soft px-5 py-4">
                  <summary className="cursor-pointer list-none font-semibold marker:content-none">{f.q}</summary>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <WhatsAppFloat locale={locale} />
    </div>
  );
}
