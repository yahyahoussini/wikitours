import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { getPublishedOffers, getOfferHistory, getOccasions, getCovers, getCityPage, getMonthPage, getFaqs } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { toOfferCard } from '@/lib/offer-card';
import { waLink } from '@/lib/whatsapp';
import { MONTH_SLUGS, parseMonthSlug, monthPagePath, monthName, targetYearFor, departuresInMonth, monthLanderIndexable, CITY_SLUGS, cityName, cityPageIndexable } from '@/lib/months';
import { pastDeparturesInMonth, historicPriceRange, lastSeasonDepartures, hijriOverlap } from '@/lib/month-stats';
import { cityTitle, cityDescription, cityYear, cityMinPrice } from '@/lib/city-seo';
import { lastModifiedOf } from '@/lib/freshness';
import { pageDescription, trustClauses, authoredOr } from '@/lib/page-seo';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc, SPEAKABLE } from '@/lib/seo';
import { routeTitle, withBrand } from '@/lib/titles';
import { OCCASION_BRIDGES } from '@/lib/clusters';
import RelatedArticles from '@/components/site/RelatedArticles';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import JsonLd from '@/components/site/JsonLd';
import OffersPriceTable from '@/components/site/OffersPriceTable';
import PackagesSection from '@/components/site/PackagesSection';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

// Date-sensitive surface. Availability, validThrough and the "has this departed?"
// branch are all computed from today's date AT RENDER TIME, so revalidate=false
// froze them: a departure could pass and the cached HTML would keep advertising
// InStock with a validThrough already in the past, until an admin happened to
// edit something. Hourly ISR lets the passage of time correct itself. On-demand
// invalidation from admin writes (revalidateForTable) still applies on top, and
// regeneration only costs an ISR write when the page is actually requested.
// ISR window (2026-09-21): 6 h, not 1 h. Vercel free-plan ISR writes were
// at 178k/200k because ~258 prerendered pages each regenerated hourly
// (24 x 258 = ~186k/month). Every source behind this page already calls
// revalidateForTable() on an admin write (src/lib/revalidate.js), so the
// timer only has to catch what changes with the CLOCK: the departure
// lifecycle (live -> archived -> retired) and the month-lander year
// rollover, both of which move at day boundaries. The publish-by-time
// listings (home, /blog, sitemap, llms.txt) stay at 3600.
export const revalidate = 21600;

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

/**
 * An occasion's H1 / fallback title in the page's language — « Omra {name} »,
 * « عمرة {name} », « {name} Umrah » (dictionary `occasionPage.heading`). The
 * year is appended only when the name does not already carry one: the
 * template used to read « Omra Spécial Septembre 2026 2026 » and, on /ar,
 * « Omra رمضان » with a Latin word on the Arabic page.
 */
function occasionHeading(t, name, year) {
  const base = (t.occasionPage?.heading ?? 'Omra {name}').replace('{name}', name ?? '');
  return year && !/\b(?:19|20)\d{2}\b/.test(String(name ?? '')) ? `${base} ${year}` : base;
}

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
    // Only the slug travels — the display name is locale-dependent and is
    // resolved with cityName(slug, locale) at each use site.
    return { kind: 'city', citySlug: cityMatch[1] };
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
    // The YEAR is the rollover/data year (targetYearFor, src/lib/months.js):
    // rendering /omra-janvier in September says "janvier 2027". No constant.
    // INDEXABILITY is the ONE predicate (monthLanderIndexable), shared with
    // app/sitemap.js, the footer and MonthsLinks: a departure this cycle OR
    // the authored evergreen blocks (fr+ar, toggle on) index the page; a
    // never-sold month never does. Hard constraint 10 — content first,
    // noindex removal second — is that function. Everything is request-cached.
    const [offers, monthPage, settings] = await Promise.all([
      getPublishedOffers(),
      getMonthPage(MONTH_SLUGS[resolved.monthIndex]),
      getSettings(),
    ]);
    const year = targetYearFor(resolved.monthIndex, { offers });
    const hasDepartures = departuresInMonth(offers, resolved.monthIndex).length > 0;
    const indexable = monthLanderIndexable(resolved.monthIndex, { offers, monthPage });
    // Authored per locale (the old string was a hardcoded FRENCH template on
    // every locale). Three states: departures open, evergreen, empty.
    const trust = trustClauses(locale, { license: settings?.license_number ?? null });
    const description = pageDescription(locale, hasDepartures ? 'month' : indexable ? 'monthEvergreen' : 'monthEmpty', {
      vars: { month, year },
      extra: hasDepartures ? [trust.licence, trust.noPayment] : [trust.licence, trust.whatsapp],
    });
    return {
      title: { absolute: routeTitle('month', locale, { month, year }) },
      description,
      alternates,
      ...(indexable ? {} : { robots: { index: false, follow: true } }),
    };
  }
  if (resolved.kind === 'city') {
    // Authored templates (src/lib/city-seo.js) — NOT sliced from body copy, so
    // nothing truncates mid-sentence with an ellipsis. The year comes from the
    // next real departure and the price floor from live offers (both omitted or
    // rolled forward rather than printed stale); the licence comes from
    // settings, never a hardcoded number. absolute → no template suffix.
    // Anti-doorway guard: noindex until the admin fills the unique local
    // content AND flips the city_pages toggle (Phase 4 A2 §12).
    const [cityRow, offers, settings] = await Promise.all([
      getCityPage(resolved.citySlug),
      getPublishedOffers(),
      getSettings(),
    ]);
    const title = cityTitle(resolved.citySlug, locale, cityYear(offers));
    const description = cityDescription(resolved.citySlug, locale, {
      minPrice: cityMinPrice(offers),
      license: settings?.license_number ?? null,
    });
    return {
      title: { absolute: title },
      description,
      // Same treatment for the social card, absolute so the layout's
      // "%s — Wiki Tours International" template never re-wraps it.
      openGraph: {
        title: { absolute: title },
        description,
        url: absoluteUrl(locale, `/${flat}`),
        siteName: BRAND.lockup,
        locale,
        type: 'website',
      },
      alternates,
      ...(cityPageIndexable(cityRow) ? {} : { robots: { index: false, follow: true } }),
    };
  }
  // Data-driven year from the occasion's real departures (evergreen URL, year
  // in the title only). getPublishedOffers is request-cached.
  const occOffers = (await getPublishedOffers()).filter((o) => o.occasion?.slug === resolved.occasion.slug);
  const occYear = occasionYearOf(occOffers);
  const occName = pickLang(resolved.occasion, 'name', locale);
  const occTrust = trustClauses(locale, { license: (await getSettings())?.license_number ?? null });
  return {
    title: {
      absolute: withBrand(
        pickLang(resolved.occasion, 'seo_title', locale) ?? occasionHeading(getDictionary(locale), occName, occYear),
      ),
    },
    // An admin-authored seo_description always wins (LAWS §4 — admin controls
    // everything). The template is the FALLBACK, replacing what used to be a
    // clampDesc() slice of the body paragraph.
    description: authoredOr(
      pickLang(resolved.occasion, 'seo_description', locale),
      pageDescription(locale, 'occasion', {
        vars: { name: occName },
        extra: [occTrust.licence, occTrust.noPayment],
      }),
      { extra: [occTrust.noPayment], locale },
    ),
    alternates,
  };
}

/**
 * The evergreen body of a month lander — what makes /omra-{mois} worth
 * indexing when no departure is open. Order (owner spec): prices observed →
 * last season's departures → Hijri calendar → weather & crowds → who it suits
 * → when to book → the month FAQ (rendered by the page) → the notification
 * form. The first three derive from real departures (src/lib/month-stats.js)
 * or the Umm al-Qura calendar; the next three are authored per month in the
 * admin (month_pages) and read through pickLang. A block with no data is
 * omitted — never a placeholder (LAW §10).
 */
function MonthEvergreen({ ctx, t, locale }) {
  const { month, year, monthPage, historic, lastSeason, hijri } = ctx;
  const fill = (s) => s.replace('{month}', month).replace('{year}', String(year));
  const shortDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const weather = pickLang(monthPage, 'weather', locale);
  const crowds = pickLang(monthPage, 'crowds', locale);
  const suits = pickLang(monthPage, 'suits', locale);
  const leadTime = pickLang(monthPage, 'lead_time', locale);
  const hijriLine = [
    (hijri.sameMonth ? t.months.hijriSame : t.months.hijriSpan).replace('{hijriA}', hijri.first).replace('{hijriB}', hijri.last),
    hijri.ramadan ? t.months.hijriRamadan : null,
    hijri.hajj ? t.months.hijriHajj : null,
    hijri.mawlid ? t.months.hijriMawlid : null,
    hijri.muharram ? t.months.hijriMuharram : null,
  ]
    .filter(Boolean)
    .map(fill)
    .join(' ');
  const h2 = 'text-2xl font-bold';
  const body = 'mt-3 max-w-prose whitespace-pre-line leading-relaxed text-white/75';
  const th = 'px-4 py-3 text-start';
  return (
    <div data-month-evergreen className="max-w-3xl">
      {historic ? (
        <section className="mt-12">
          <h2 className={h2}>{fill(t.months.historicTitle)}</h2>
          <p className={body}>
            {fill(t.months.historicLine)
              .replace('{n}', historic.count)
              .replace('{years}', historic.years.join(', '))
              .replace('{min}', nf.format(historic.min))
              .replace('{max}', nf.format(historic.max))}
          </p>
        </section>
      ) : null}

      {lastSeason ? (
        <section className="mt-12">
          <h2 className={h2}>{t.months.lastSeasonTitle.replace('{month}', month).replace('{year}', String(lastSeason.year))}</h2>
          <p className={body}>{t.months.lastSeasonIntro.replace('{month}', month).replace('{year}', String(lastSeason.year))}</p>
          <div className="mt-4 overflow-x-auto rounded-panel border border-white/10">
            <table className="w-full min-w-[36rem] border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wide text-white/50">
                  <th scope="col" className={th}>{t.offer.datesLabel}</th>
                  <th scope="col" className={th}>{t.months.colDuration}</th>
                  <th scope="col" className={th}>{t.offer.airlineLabel}</th>
                  <th scope="col" className={th}>{t.pages.colHotel}</th>
                  <th scope="col" className={th}>{t.offer.from}</th>
                </tr>
              </thead>
              <tbody>
                {lastSeason.departures.map((d) => (
                  <tr key={d.slug} className="border-b border-white/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3">
                      {shortDate.format(new Date(d.date_start))}
                      {d.date_end ? ` → ${shortDate.format(new Date(d.date_end))}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {d.duration_days
                        ? t.offer.duration.replace('{days}', d.duration_days).replace('{nights}', d.duration_nights ?? d.duration_days - 1)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{d.airline ?? '—'}</td>
                    <td className="px-4 py-3">{d.hotels.join(', ') || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{d.from != null ? `${nf.format(d.from)} ${t.offer.currency}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className={h2}>{t.months.hijriTitle}</h2>
        <p className={body}>{hijriLine}</p>
      </section>

      {weather || crowds ? (
        <section className="mt-12">
          <h2 className={h2}>{fill(t.months.weatherTitle)}</h2>
          {weather ? <p className={body}>{weather}</p> : null}
          {crowds ? <p className={body}>{crowds}</p> : null}
        </section>
      ) : null}
      {suits ? (
        <section className="mt-12">
          <h2 className={h2}>{fill(t.months.suitsTitle)}</h2>
          <p className={body}>{suits}</p>
        </section>
      ) : null}
      {leadTime ? (
        <section className="mt-12">
          <h2 className={h2}>{fill(t.months.leadTimeTitle)}</h2>
          <p className={body}>{leadTime}</p>
        </section>
      ) : null}
    </div>
  );
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
  let monthCtx = null;
  let bridges = [];

  if (resolved.kind === 'month') {
    const m = resolved.monthIndex;
    const [history, monthPage, monthFaqs] = await Promise.all([
      getOfferHistory(),
      getMonthPage(MONTH_SLUGS[m]),
      getFaqs(`mois-${MONTH_SLUGS[m]}`),
    ]);
    // Year = rollover + published departures (never a constant); the listed
    // departures are that year's; indexability is the shared predicate.
    const year = targetYearFor(m, { offers });
    const month = monthName(m, locale);
    const fill = (s) => s.replace('{month}', month).replace('{year}', String(year));
    matching = departuresInMonth(offers, m);
    const indexable = monthLanderIndexable(m, { offers, monthPage });
    heading = fill(t.months.pageTitle);
    const minPrice = Math.min(...matching.map((o) => o.starting_price).filter((p) => p != null));
    answer = matching.length
      ? fill(t.months.answerWithOffers)
          .replace('{n}', matching.length)
          .replace('{min}', Number.isFinite(minPrice) ? nf.format(minPrice) : '—')
      : indexable
        ? fill(t.months.evergreenLede)
        : fill(t.months.emptyTitle);
    // The evergreen blocks (MonthEvergreen): derived from real departures —
    // prices observed, last season — and the computed Hijri overlap; the rest
    // authored per month in the admin. Nothing here is a placeholder.
    monthCtx = {
      month,
      year,
      monthPage,
      indexable,
      historic: historicPriceRange(pastDeparturesInMonth(history, m)),
      lastSeason: lastSeasonDepartures(history, m, year),
      hijri: hijriOverlap(m, year, locale),
      faqs: monthFaqs.map((f) => ({ q: pickLang(f, 'question', locale), a: pickLang(f, 'answer', locale) })),
    };
  } else if (resolved.kind === 'occasion') {
    matching = offers.filter((o) => o.occasion?.slug === resolved.occasion.slug);
    const occasionName = pickLang(resolved.occasion, 'name', locale);
    // Year comes from the real departures (Ramadan 2027 is not the calendar
    // year), so the H1/title carry it while the URL stays evergreen.
    const occasionYear = occasionYearOf(matching);
    heading = occasionHeading(t, occasionName, occasionYear);
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
    // Bridged occasions (OCCASION_BRIDGES): their live programmes are listed
    // below this hub's own. Only a published occasion with live offers
    // qualifies, so the section never links to a hidden or empty hub.
    const bridgedSlugs = OCCASION_BRIDGES[resolved.occasion.slug] ?? [];
    if (bridgedSlugs.length) {
      const occasions = await getOccasions();
      bridges = bridgedSlugs
        .map((slug) => occasions.find((o) => o.slug === slug && o.is_published !== false))
        .filter(Boolean)
        .map((occasion) => ({ occasion, offers: offers.filter((o) => o.occasion?.slug === occasion.slug) }))
        .filter((b) => b.offers.length > 0);
    }
  } else {
    heading = t.cityPage.title.replace('{city}', cityName(resolved.citySlug, locale));
    // Unique local intro when the admin wrote it; the generic line otherwise
    // (and the page stays noindex — see generateMetadata).
    answer = pickLang(cityRow, 'intro', locale) ?? t.cityPage.answer;
    alertSource = `city_${resolved.citySlug}`;
  }

  const cityLogistics = resolved.kind === 'city' ? pickLang(cityRow, 'logistics', locale) : null;

  // Freshness (visible + schema): latest change among the offers shown. Shared
  // with app/sitemap.js so the "Mis à jour le" line on this page and the
  // <lastmod> for this URL are literally the same expression — they used to be
  // computed here and simply omitted there.
  const updated = lastModifiedOf(matching);
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' });

  const covers = await getCovers('offers', [...matching, ...bridges.flatMap((b) => b.offers)].map((o) => o.id));

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
    speakable: SPEAKABLE,
  };

  // FAQ block: occasion hubs carry the generically-true Omra FAQ; city pages
  // their own DB category (ville-{slug}); month landers theirs (mois-{slug},
  // admin-authored, month-specific — never the home set). Normalized to {q, a}.
  const faq =
    resolved.kind === 'occasion'
      ? t.pages.pasCherFaq
      : monthCtx?.faqs.length
        ? monthCtx.faqs
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
            <BreadcrumbTrail locale={locale}
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
            {/* Reciprocal link to the agency entity page. Distinct intent — this
                page is departure logistics, that one is who/where/licence — so
                they link to each other instead of competing. */}
            {resolved.kind === 'city' && resolved.citySlug === 'casablanca' ? (
              <p className="mt-3 max-w-2xl text-sm text-white/60">
                {t.cityPage.agencyLead}{' '}
                <Link
                  href={`/${locale}/agence-omra-casablanca`}
                  className="font-semibold text-bm-gold underline-offset-4 hover:underline"
                >
                  {t.cityPage.agencyLink}
                </Link>
              </p>
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
        {/* Anti-doorway guard hook: present while a city page lacks its unique
            content or a month lander lacks a departure AND its authored blocks —
            the audit fails if this coexists with indexability. */}
        {(resolved.kind === 'city' && !cityPageIndexable(cityRow)) || (monthCtx && !monthCtx.indexable) ? (
          <span data-guard="empty" hidden />
        ) : null}

        {cityLogistics ? (
          <section className="mt-8 max-w-2xl rounded-panel border border-white/10 bg-bm-black-soft p-6">
            <h2 className="text-xl font-bold">{t.cityPage.logisticsTitle.replace('{city}', cityName(resolved.citySlug, locale))}</h2>
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
        ) : monthCtx ? null : (
          /* Honest empty state + alert micro-form (occasion hubs / city pages;
             month landers render their evergreen body and the form last) */
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

        {bridges.map(({ occasion, offers: bridged }) => {
          const name = pickLang(occasion, 'name', locale);
          const lead = t.occasionPage.bridgeLead?.[occasion.slug];
          return (
            <section key={occasion.slug} data-occasion-bridge={occasion.slug} className="mt-14">
              <h2 className="text-2xl font-bold">{t.occasionPage.bridgeTitle.replace('{name}', name)}</h2>
              {lead ? <p className="mt-3 max-w-2xl leading-relaxed text-white/75">{lead}</p> : null}
              <div className="mt-6">
                <PackagesSection
                  offers={bridged.map((offer) => toOfferCard(offer, covers.get(offer.id), locale))}
                  occasions={[]}
                  locale={locale}
                  t={cardT}
                  whatsappHref={whatsappHref}
                />
              </div>
              <Link
                href={`/${locale}/omra-${occasion.slug}`}
                className="mt-4 inline-block text-sm font-semibold text-bm-gold underline-offset-4 hover:underline"
              >
                {t.occasionPage.heading.replace('{name}', name)} →
              </Link>
            </section>
          );
        })}

        {monthCtx ? <MonthEvergreen ctx={monthCtx} t={t} locale={locale} /> : null}

        {/* AEO: seasonal (occasion) hubs also carry an extractable price table. */}
        {resolved.kind === 'occasion' ? (
          <OffersPriceTable offers={matching} locale={locale} t={t} dark />
        ) : null}

        {faq ? (
          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-bold">{monthCtx ? t.months.faqTitle.replace('{month}', monthCtx.month) : t.home.faqTitle}</h2>
            <div className="mt-4 flex flex-col gap-3">
              {faq.map((f) => (
                <details key={f.q} className="group rounded-card border border-white/10 bg-bm-black-soft px-5 py-4">
                  <summary className="cursor-pointer list-none font-semibold marker:content-none">{f.q}</summary>
                  <p data-faq-answer className="mt-3 text-sm leading-relaxed text-white/70">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
        {/* Month landers: the notification form comes LAST — after the
            substance and the FAQ (owner spec), never instead of them. */}
        {monthCtx ? (
          <section className="mt-12 max-w-md rounded-panel border border-bm-gold/25 bg-bm-black-soft p-6">
            <h2 className="text-lg font-bold">{t.months.alertTitle.replace('{month}', monthCtx.month).replace('{year}', String(monthCtx.year))}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{t.months.alertPrompt}</p>
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
        ) : null}

        {/* Reverse internal link: the blog cluster that supports this hub. */}
        <RelatedArticles path={`/${flat}`} locale={locale} />
      </main>
      <WhatsAppFloat locale={locale} />
    </div>
  );
}
