import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { getVoyages, getVoyageBySlug } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { renderMarkdown, markdownClass } from '@/lib/markdown';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import Icon from '@/components/site/Icon';
import JsonLd from '@/components/site/JsonLd';
import SmartGallery from '@/components/SmartGallery';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

const nf = new Intl.NumberFormat('fr-MA');

/** Prebuild every published voyage × locale; unknown slugs 404 on demand. */
export async function generateStaticParams() {
  const voyages = await getVoyages();
  return LOCALES.flatMap((locale) => voyages.map((v) => ({ locale, slug: v.slug })));
}

function formatDateRange(startISO, endISO, locale) {
  const loc = locale === 'ar' ? 'ar-MA' : `${locale}-MA`;
  const start = new Date(startISO);
  const end = new Date(endISO);
  const full = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = sameMonth
    ? new Intl.DateTimeFormat(loc, { day: 'numeric', timeZone: 'UTC' }).format(start)
    : new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(start);
  return `${startLabel} → ${full.format(end)}`;
}

const lines = (text) => (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const voyage = await getVoyageBySlug(slug);
  if (!voyage) notFound(); // metadata-phase 404: real status before streaming
  const title = pickLang(voyage, 'seo_title', locale) ?? pickLang(voyage, 'title', locale) ?? voyage.slug;
  return {
    // Template title — voyages are Wiki Tours parent surfaces ("— Wiki Tours
    // International" appended), never Bab Makka (BRAND LAW).
    title,
    description: clampDesc(
      pickLang(voyage, 'seo_description', locale) ?? pickLang(voyage, 'summary', locale) ?? '',
    ),
    alternates: hreflangAlternates(locale, `/voyage/${slug}`),
  };
}

/** Organized-trip detail (Wiki Tours surface — non-Omra by design). */
export default async function VoyagePage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [voyage, settings] = await Promise.all([getVoyageBySlug(slug), getSettings()]);
  if (!voyage) notFound();

  const t = getDictionary(locale);
  const title = pickLang(voyage, 'title', locale) ?? voyage.slug;
  const summary = pickLang(voyage, 'summary', locale);
  const description = pickLang(voyage, 'description', locale);
  const inclusionLines = lines(pickLang(voyage, 'inclusions', locale));
  const exclusionLines = lines(pickLang(voyage, 'exclusions', locale));
  const conditions = pickLang(voyage, 'conditions', locale);
  const whatsappHref = waLink(settings?.whatsapp_number, title);

  const keyFacts = [
    voyage.destination ? ['pin', voyage.destination] : null,
    voyage.date_start && voyage.date_end
      ? ['clock', formatDateRange(voyage.date_start, voyage.date_end, locale)]
      : null,
    voyage.duration_days && voyage.duration_nights
      ? ['clock', t.offer.duration.replace('{days}', voyage.duration_days).replace('{nights}', voyage.duration_nights)]
      : null,
    voyage.airline ? ['plane', voyage.airline] : null,
  ].filter(Boolean);

  // TouristTrip + Product; the priced Offer node only when price AND departure
  // date are both real (validThrough required on every Offer — LAW §10).
  const tripJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Product', 'TouristTrip'],
    name: title,
    ...(summary ? { description: summary } : {}),
    provider: { '@id': `${SITE_URL}/#organization` },
    ...(voyage.updated_at ? { dateModified: voyage.updated_at } : {}),
    ...(voyage.date_start ? { startDate: voyage.date_start } : {}),
    ...(voyage.date_end ? { endDate: voyage.date_end } : {}),
    ...(voyage.starting_price != null && voyage.date_start
      ? {
          offers: {
            '@type': 'Offer',
            price: voyage.starting_price,
            priceCurrency: 'MAD',
            availability: 'https://schema.org/InStock',
            url: absoluteUrl(locale, `/voyage/${voyage.slug}`),
            ...(voyage.created_at ? { validFrom: voyage.created_at.slice(0, 10) } : {}),
            validThrough: voyage.date_start,
          },
        }
      : {}),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(locale, '') },
      { '@type': 'ListItem', position: 2, name: t.voyages.title, item: absoluteUrl(locale, '/voyages') },
      { '@type': 'ListItem', position: 3, name: title },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <JsonLd data={tripJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <Breadcrumbs
        items={[
          { label: t.nav.home, href: `/${locale}` },
          { label: t.voyages.title, href: `/${locale}/voyages` },
          { label: title },
        ]}
      />

      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <h1 className="max-w-3xl text-3xl font-bold leading-tight text-bm-black sm:text-4xl">{title}</h1>

          {/* Gallery directly under the title (same pattern as offer pages) */}
          <div className="mt-4 overflow-hidden rounded-panel shadow-float empty:hidden">
            <SmartGallery
              entityType="voyages"
              entityId={voyage.id}
              locale={locale}
              aspect="16 / 9"
              sizes="(min-width: 1024px) 720px, 100vw"
            />
          </div>

          {summary ? (
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-bm-black/80" data-answer>
              {summary}
            </p>
          ) : null}

          {keyFacts.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {keyFacts.map(([icon, value]) => (
                <li
                  key={value}
                  className="flex items-center gap-1.5 rounded-full border border-bm-black/10 bg-wiki-blue/5 px-3.5 py-1.5 text-xs font-semibold text-bm-black/80"
                >
                  <Icon name={icon} className="size-3.5 text-wiki-blue" />
                  {value}
                </li>
              ))}
            </ul>
          ) : null}

          {description ? (
            <div
              className={`mt-8 max-w-prose text-bm-black/80 ${markdownClass}`}
              // Admin-authored markdown, HTML-escaped before parsing.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(description) }}
            />
          ) : null}

          {inclusionLines.length ? (
            <section className="mt-10 max-w-prose">
              <h2 className="text-xl font-bold text-bm-black">{t.offer.programmeTitle}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {inclusionLines.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 leading-relaxed text-bm-black/80">
                    <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-wiki-blue/10 text-wiki-blue">
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

          {conditions ? (
            <section className="mt-10 max-w-prose rounded-card border border-wiki-blue/20 bg-wiki-blue/5 p-5">
              <h2 className="text-xl font-bold text-bm-black">{t.offer.conditionsTitle}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-bm-black/70">{conditions}</p>
            </section>
          ) : null}

          <nav aria-label={t.pages.seeAlso} className="mt-12">
            <Link
              href={`/${locale}/voyages`}
              className="rounded-full border border-bm-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-bm-black/70 shadow-hairline transition hover:border-wiki-blue hover:text-bm-black"
            >
              ← {t.voyages.title}
            </Link>
          </nav>
        </div>

        {/* Booking card */}
        <aside id="reserver" className="mt-10 scroll-mt-28 lg:sticky lg:top-36 lg:mt-0 lg:self-start">
          <div className="rounded-panel border border-wiki-blue/25 bg-white p-6 shadow-float">
            <h2 className="text-lg font-bold">{t.voyages.askQuote}</h2>
            {voyage.starting_price != null ? (
              <p className="mt-1">
                <span className="text-xs text-bm-black/50">{t.offer.from} </span>
                <span className="text-2xl font-bold tabular-nums text-wiki-blue">{nf.format(voyage.starting_price)}</span>
                <span className="text-sm font-semibold text-wiki-blue"> {t.offer.currency}</span>
                <span className="text-xs text-bm-black/50"> / {t.voyages.priceNote}</span>
              </p>
            ) : null}
            <div className="mt-4">
              <LeadForm
                locale={locale}
                offerTitle={title}
                labels={t.form}
                whatsappNumber={settings?.whatsapp_number}
                source={`voyage_${voyage.slug}`}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-bm-black/60">🔒 {t.offer.reassurance}</p>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-wt="whatsapp_click"
                className="mt-3 inline-flex items-center gap-2 text-xs text-bm-black/60 underline-offset-4 hover:text-bm-black hover:underline"
              >
                {t.cta.whatsappAlt}
              </a>
            ) : null}
          </div>
        </aside>
      </div>
      <WhatsAppFloat locale={locale} />
    </main>
  );
}
