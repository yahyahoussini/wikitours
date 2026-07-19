import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { hreflangAlternates, clampDesc } from '@/lib/seo';
import { withBrand } from '@/lib/titles';
import { getGuidePages, getFaqs } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { GUIDE_PILLAR_SLUG, GUIDE_CHILD_SLUGS, guideIndexable } from '@/lib/guides';
import GuideSection from '@/components/site/GuideSection';

export const revalidate = 60;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const row = (await getGuidePages()).get(GUIDE_PILLAR_SLUG) ?? null;
  return {
    title: { absolute: withBrand(pickLang(row, 'title', locale) ?? t.guide.pillarTitle) },
    description: clampDesc(pickLang(row, 'summary', locale) ?? t.guide.pillarDesc),
    alternates: hreflangAlternates(locale, '/guide-omra'),
    // noindex-until-filled (same law as city pages): admin toggle + real fr/ar
    // content, otherwise crawlable but out of the index.
    ...(guideIndexable(row) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function GuidePillarPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [pages, faqs, settings] = await Promise.all([
    getGuidePages(),
    getFaqs(`guide-${GUIDE_PILLAR_SLUG}`),
    getSettings(),
  ]);
  const row = pages.get(GUIDE_PILLAR_SLUG) ?? null;
  const heading = pickLang(row, 'title', locale) ?? t.guide.pillarTitle;

  const chapterLinks = GUIDE_CHILD_SLUGS.map((slug) => ({
    href: `/${locale}/guide-omra/${slug}`,
    label: pickLang(pages.get(slug), 'title', locale) ?? t.guide.chapterTitles[slug],
  }));

  return (
    <GuideSection
      locale={locale}
      t={t}
      path="/guide-omra"
      heading={heading}
      row={row}
      faqs={faqs}
      chapterLinks={chapterLinks}
      breadcrumbs={[{ label: t.nav.home, href: `/${locale}` }, { label: heading }]}
      whatsappHref={waLink(settings?.whatsapp_number)}
    />
  );
}
