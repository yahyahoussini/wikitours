import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, LOCALES } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { withBrand } from '@/lib/titles';
import { getPublishedOffers } from '@/lib/data/content';
import { computePeriods } from '@/lib/barometer';
import { monthName } from '@/lib/months';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import JsonLd from '@/components/site/JsonLd';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const { periods } = computePeriods(await getPublishedOffers());
  return {
    title: { absolute: withBrand(t.barometer.title) },
    description: clampDesc(t.barometer.desc),
    alternates: hreflangAlternates(locale, '/barometre-prix-omra'),
    // Render guard: no qualifying period ⇒ noindex (never thin/empty stats).
    ...(periods.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function PriceBarometerPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const nf = new Intl.NumberFormat('fr-MA');
  const { periods, lastChanged, totalOffers } = computePeriods(await getPublishedOffers());

  const url = absoluteUrl(locale, '/barometre-prix-omra');
  const maxAvg = Math.max(...periods.map((p) => p.avg), 1);
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' });

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: t.barometer.title,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    description: t.barometer.lede,
    ...(lastChanged ? { dateModified: lastChanged } : {}),
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
  };

  // Original data → a real Dataset entity (quotable by answer engines).
  const datasetJsonLd = periods.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        '@id': `${url}#dataset`,
        name: t.barometer.title,
        description: t.barometer.note,
        inLanguage: locale,
        creator: { '@id': `${SITE_URL}/#organization` },
        ...(lastChanged ? { dateModified: lastChanged } : {}),
      }
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <JsonLd data={webPageJsonLd} />
      {datasetJsonLd ? <JsonLd data={datasetJsonLd} /> : null}
      <BrandLockup locale={locale} size="sm" />
      <BreadcrumbTrail
        className="mt-3"
        items={[{ label: t.nav.home, href: `/${locale}` }, { label: t.barometer.title }]}
      />

      <h1 className="mt-3 text-3xl font-bold text-bm-black sm:text-4xl">{t.barometer.title}</h1>
      <p data-answer className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{t.barometer.lede}</p>

      {periods.length ? (
        <>
          {lastChanged ? (
            <p className="mt-2 text-sm text-bm-black/50">
              {t.pages.updatedOn}{' '}
              <time dateTime={lastChanged}>{dateFmt.format(new Date(lastChanged))}</time>
              {' · '}
              {t.barometer.basedOn.replace('{n}', String(totalOffers))}
            </p>
          ) : null}

          {/* Bar chart — pure CSS, avg price per departure month. */}
          <div className="mt-8 flex flex-col gap-2" role="img" aria-label={t.barometer.title}>
            {periods.map((p) => (
              <div key={p.key} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-bm-black/60">
                  {monthName(p.monthIndex, locale)} {p.year}
                </span>
                <div className="h-4 flex-1 rounded-sm bg-bm-black/5">
                  <div
                    className="h-full rounded-sm bg-bm-gold"
                    style={{ width: `${Math.max(4, Math.round((p.avg / maxAvg) * 100))}%` }}
                  />
                </div>
                <span className="w-24 text-end tabular-nums text-bm-black/70">{nf.format(p.avg)}</span>
              </div>
            ))}
          </div>

          <table className="mt-8 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-bm-black/15 text-start text-xs font-semibold uppercase tracking-wide text-bm-black/50">
                <th className="py-2 text-start">{t.barometer.colMonth}</th>
                <th className="py-2 text-end">{t.barometer.colOffers}</th>
                <th className="py-2 text-end">{t.barometer.colMin}</th>
                <th className="py-2 text-end">{t.barometer.colAvg}</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.key} className="border-b border-bm-black/5">
                  <td className="py-2 font-medium">
                    {monthName(p.monthIndex, locale)} {p.year}
                  </td>
                  <td className="py-2 text-end tabular-nums">{p.count}</td>
                  <td className="py-2 text-end tabular-nums">{nf.format(p.min)} MAD</td>
                  <td className="py-2 text-end tabular-nums">{nf.format(p.avg)} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 text-xs text-bm-black/50">{t.barometer.note}</p>
        </>
      ) : (
        /* Honest empty state (guard) — never estimated figures. */
        <div data-guard="empty" className="mt-10 rounded-card border border-dashed border-bm-black/20 bg-bm-black/[0.02] p-6">
          <p className="text-sm text-bm-black/60">{t.barometer.empty}</p>
          <Link
            href={`/${locale}/bab-makka`}
            className="mt-3 inline-block text-sm font-semibold text-bm-gold-deep underline-offset-4 hover:underline"
          >
            {t.guide.seeDepartures} →
          </Link>
        </div>
      )}

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
