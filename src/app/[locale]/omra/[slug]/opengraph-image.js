import { ImageResponse } from 'next/og';
import { getDictionary, isLocale, pickLang, FALLBACK_LOCALE } from '@/lib/i18n';
import { getOfferBySlug, getCovers, computeMinPrice } from '@/lib/data/content';
import { publicMediaRenderUrl } from '@/lib/media';
import { OgCard, ogSize, ogContentType, ogAlt } from '@/lib/og';

/** Per-offer OG card: real cover, real title, real starting price. */
export const revalidate = false;
export const size = ogSize;
export const contentType = ogContentType;
export const alt = ogAlt;

const nf = new Intl.NumberFormat('fr-MA');

export default async function Image({ params }) {
  const { locale, slug } = await params;
  const loc = isLocale(locale) ? locale : FALLBACK_LOCALE;
  const t = getDictionary(loc);
  const offer = await getOfferBySlug(slug);

  if (!offer) {
    return new ImageResponse(<OgCard title={t.home.metaTitle} meta={t.brand.premiumService} />, ogSize);
  }

  const covers = await getCovers('offers', [offer.id]);
  const cover = covers.get(offer.id);
  const minPrice = computeMinPrice(offer.tiers);

  return new ImageResponse(
    <OgCard
      title={pickLang(offer, 'title', loc) ?? offer.slug}
      badge={offer.occasion ? pickLang(offer.occasion, 'name', loc) : null}
      meta={
        minPrice != null
          ? `${t.offer.from} ${nf.format(minPrice)} ${t.offer.currency} / ${t.offer.perPerson}`
          : null
      }
      cover={cover ? publicMediaRenderUrl(cover.path, { width: 1200, height: 630 }) : null}
    />,
    ogSize,
  );
}
