import { getDictionary, isLocale, FALLBACK_LOCALE } from '@/lib/i18n';
import { ogResponse, ogSize, ogContentType, ogAlt } from '@/lib/og';

/** Site-wide OG card. Nested routes with their own opengraph-image override it. */
export const revalidate = false;
export const size = ogSize;
export const contentType = ogContentType;
export const alt = ogAlt;

export default async function Image({ params }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : FALLBACK_LOCALE;
  const t = getDictionary(loc);
  return ogResponse({ locale: loc, title: t.home.metaTitle, meta: t.brand.premiumService });
}
