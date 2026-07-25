import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { hreflangAlternates, clampDesc } from '@/lib/seo';
import { withBrand } from '@/lib/titles';
import { getGuidePages, getFaqs } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { GUIDE_CHILD_SLUGS, guideIndexable } from '@/lib/guides';
import GuideSection from '@/components/site/GuideSection';

export const revalidate = false;

/** Fixed chapter whitelist — anything else 404s (no open-ended surface). */
export function generateStaticParams() {
  return LOCALES.flatMap((locale) => GUIDE_CHILD_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  if (!GUIDE_CHILD_SLUGS.includes(slug)) notFound(); // metadata-phase 404
  const t = getDictionary(locale);
  const row = (await getGuidePages()).get(slug) ?? null;
  return {
    title: { absolute: withBrand(pickLang(row, 'title', locale) ?? t.guide.chapterTitles[slug]) },
    description: clampDesc(pickLang(row, 'summary', locale) ?? t.guide.pillarDesc),
    alternates: hreflangAlternates(locale, `/guide-omra/${slug}`),
    ...(guideIndexable(row) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function GuideChapterPage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !GUIDE_CHILD_SLUGS.includes(slug)) notFound();
  const t = getDictionary(locale);

  const [pages, faqs, settings] = await Promise.all([
    getGuidePages(),
    getFaqs(`guide-${slug}`),
    getSettings(),
  ]);
  const row = pages.get(slug) ?? null;
  const heading = pickLang(row, 'title', locale) ?? t.guide.chapterTitles[slug];
  const pillarLabel = pickLang(pages.get('guide-omra'), 'title', locale) ?? t.guide.backToPillar;

  // Sibling chapters keep the cluster fully interlinked (children ↔ children).
  const chapterLinks = GUIDE_CHILD_SLUGS.filter((s) => s !== slug).map((s) => ({
    href: `/${locale}/guide-omra/${s}`,
    label: pickLang(pages.get(s), 'title', locale) ?? t.guide.chapterTitles[s],
  }));

  return (
    <GuideSection
      locale={locale}
      t={t}
      path={`/guide-omra/${slug}`}
      heading={heading}
      row={row}
      faqs={faqs}
      chapterLinks={chapterLinks}
      breadcrumbs={[
        { label: t.nav.home, href: `/${locale}` },
        { label: pillarLabel, href: `/${locale}/guide-omra` },
        { label: heading },
      ]}
      whatsappHref={waLink(settings?.whatsapp_number)}
    />
  );
}
