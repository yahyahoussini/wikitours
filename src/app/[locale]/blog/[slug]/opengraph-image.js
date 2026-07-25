import { ImageResponse } from 'next/og';
import { getDictionary, isLocale, pickLang, FALLBACK_LOCALE } from '@/lib/i18n';
import { getArticleBySlug, getCovers } from '@/lib/data/content';
import { publicMediaRenderUrl } from '@/lib/media';
import { OgCard, ogSize, ogContentType, ogAlt } from '@/lib/og';

/** Per-article OG card: real cover, real title, category as the badge. */
export const revalidate = false;
export const size = ogSize;
export const contentType = ogContentType;
export const alt = ogAlt;

export default async function Image({ params }) {
  const { locale, slug } = await params;
  const loc = isLocale(locale) ? locale : FALLBACK_LOCALE;
  const t = getDictionary(loc);
  const article = await getArticleBySlug(slug);

  if (!article) {
    return new ImageResponse(<OgCard title={t.home.metaTitle} meta={t.brand.premiumService} />, ogSize);
  }

  const covers = await getCovers('articles', [article.id]);
  const cover = covers.get(article.id);

  return new ImageResponse(
    <OgCard
      title={pickLang(article, 'title', loc) ?? article.slug}
      badge={article.category}
      meta={pickLang(article, 'excerpt', loc)?.slice(0, 90) ?? null}
      cover={cover ? publicMediaRenderUrl(cover.path, { width: 1200, height: 630 }) : null}
    />,
    ogSize,
  );
}
