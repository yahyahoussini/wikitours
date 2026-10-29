import { getDictionary, isLocale, pickLang, FALLBACK_LOCALE } from '@/lib/i18n';
import { getArticleBySlug, getCovers } from '@/lib/data/content';
import { publicMediaRenderUrl } from '@/lib/media';
import { ogResponse, ogSize, ogContentType, ogAlt } from '@/lib/og';

/** Per-article OG card: real cover, real title, category as the badge. */
export const revalidate = false;
export const size = ogSize;
export const contentType = ogContentType;
export const alt = ogAlt;
// Not next/og's default `immutable, max-age=31536000`: the card's URL (a hash
// of this file) stays the same when the title changes — an admin edit, a post
// not yet released, a {year:…} token's year ending — so no browser or proxy
// may keep a card for a year.
const headers = { 'cache-control': 'public, max-age=86400, no-transform' };

export default async function Image({ params }) {
  const { locale, slug } = await params;
  const loc = isLocale(locale) ? locale : FALLBACK_LOCALE;
  const t = getDictionary(loc);
  const article = await getArticleBySlug(slug);

  if (!article) {
    return ogResponse({ locale: loc, title: t.home.metaTitle, meta: t.brand.premiumService }, { headers });
  }

  const covers = await getCovers('articles', [article.id]);
  const cover = covers.get(article.id);

  return ogResponse({
    locale: loc,
    title: pickLang(article, 'title', loc) ?? article.slug,
    badge: article.category,
    meta: pickLang(article, 'excerpt', loc)?.slice(0, 90) ?? null,
    cover: cover ? publicMediaRenderUrl(cover.path, { width: 1200, height: 630 }) : null,
  }, { headers });
}
