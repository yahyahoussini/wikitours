import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates } from '@/lib/seo';
import { getSettings } from '@/lib/data/settings';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import JsonLd from '@/components/site/JsonLd';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const settings = await getSettings();
  return {
    title: t.pages.pressTitle,
    description: t.pages.pressLede,
    alternates: hreflangAlternates(locale, '/presse'),
    // Nothing to show until a press link exists — noindex the empty shell.
    ...(settings?.press_url ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * /presse — media coverage (E-E-A-T). The press link is admin-entered
 * (`settings.press_url`, single source, LAW §4). Additional outlets/quotes are
 * [CONTENT NEEDED] until the client supplies them — never invented.
 */
export default async function PressPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const settings = await getSettings();
  const pressUrl = settings?.press_url || null;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(locale, '/presse')}#webpage`,
    url: absoluteUrl(locale, '/presse'),
    name: t.pages.pressTitle,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <JsonLd data={webPageJsonLd} />
      <BrandLockup locale={locale} size="sm" />
      <BreadcrumbTrail
        className="mt-3"
        items={[
          { label: t.nav.home, href: `/${locale}` },
          { label: t.pages.pressTitle },
        ]}
      />

      <h1 className="mt-3 text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.pressTitle}</h1>
      <p className="mt-4 text-lg leading-relaxed text-bm-black/70">{t.pages.pressLede}</p>

      <div className="mt-8 flex flex-col gap-4">
        {pressUrl ? (
          <a
            href={pressUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-panel border border-bm-black/10 bg-white p-6 shadow-hairline transition hover:shadow-lift"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-wiki-blue">
              {new URL(pressUrl).hostname.replace(/^www\./, '')}
            </p>
            <p className="mt-2 font-bold text-bm-black group-hover:text-wiki-blue">{BRAND.lockup}</p>
            <p className="mt-2 text-sm font-semibold text-bm-gold">{t.pages.pressVisit} →</p>
          </a>
        ) : (
          <p className="rounded-card border border-dashed border-bm-black/20 bg-bm-black/[0.02] p-6 text-sm text-bm-black/50">
            {t.pages.pressEmpty}
          </p>
        )}

        {/* [CONTENT NEEDED] — additional outlets / quotes / dates supplied by the
            client go here as <article> cards. Never fabricate coverage. */}
      </div>

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
