import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { withBrand } from '@/lib/titles';
import { getGlossaryTerms } from '@/lib/data/content';
import { GLOSSARY_MIN_TERMS } from '@/lib/guides';
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
  const terms = await getGlossaryTerms();
  return {
    title: { absolute: withBrand(t.glossary.title) },
    description: clampDesc(t.glossary.desc),
    alternates: hreflangAlternates(locale, '/glossaire-omra'),
    ...(terms.length >= GLOSSARY_MIN_TERMS ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function GlossaryPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const terms = await getGlossaryTerms();

  const url = absoluteUrl(locale, '/glossaire-omra');
  const definedTermSet = terms.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'DefinedTermSet',
        '@id': `${url}#glossaire`,
        name: t.glossary.title,
        inLanguage: locale,
        hasDefinedTerm: terms.map((term) => ({
          '@type': 'DefinedTerm',
          '@id': `${url}#${term.slug}`,
          name: pickLang(term, 'term', locale),
          description: pickLang(term, 'definition', locale),
          inDefinedTermSet: `${url}#glossaire`,
        })),
      }
    : null;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: t.glossary.title,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    description: t.glossary.lede,
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <JsonLd data={webPageJsonLd} />
      {definedTermSet ? <JsonLd data={definedTermSet} /> : null}
      <BrandLockup locale={locale} size="sm" />
      <BreadcrumbTrail
        className="mt-3"
        items={[{ label: t.nav.home, href: `/${locale}` }, { label: t.glossary.title }]}
      />

      <h1 className="mt-3 text-3xl font-bold text-bm-black sm:text-4xl">{t.glossary.title}</h1>
      <p data-answer className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{t.glossary.lede}</p>

      {terms.length ? (
        <dl className="mt-10 flex flex-col gap-6">
          {terms.map((term) => (
            <div key={term.id} id={term.slug} className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
              <dt className="text-lg font-bold text-bm-black">{pickLang(term, 'term', locale)}</dt>
              {/* Answer-first: the definition IS the first sentence, no preamble. */}
              <dd className="mt-2 text-sm leading-relaxed text-bm-black/70">
                {pickLang(term, 'definition', locale)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        /* Honest empty state — audit fails this page if indexable + empty. */
        <p data-guard="empty" className="mt-10 rounded-card border border-dashed border-bm-black/20 bg-bm-black/[0.02] p-6 text-sm text-bm-black/50">
          {t.glossary.empty}
        </p>
      )}

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
