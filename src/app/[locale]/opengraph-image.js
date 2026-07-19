import { ImageResponse } from 'next/og';
import { getDictionary, isLocale, FALLBACK_LOCALE } from '@/lib/i18n';
import { OgCard, ogSize, ogContentType, ogAlt } from '@/lib/og';

/** Site-wide OG card. Nested routes with their own opengraph-image override it. */
export const revalidate = 3600; // Satori render is CPU-heavy; cache it, don't re-render per scrape
export const size = ogSize;
export const contentType = ogContentType;
export const alt = ogAlt;

export default async function Image({ params }) {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : FALLBACK_LOCALE);
  return new ImageResponse(
    <OgCard title={t.home.metaTitle} meta={t.brand.premiumService} />,
    ogSize,
  );
}
