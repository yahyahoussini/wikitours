import Image from 'next/image';
import { getGallerySlides } from '@/lib/data/gallery';
import { getDictionary } from '@/lib/i18n';
import { BLUR_DATA_URL } from '@/lib/blur';
import Carousel from '@/components/Carousel';

/**
 * Public gallery for any record (server component — slides are in the served
 * HTML, LAWS §3). Nothing attached → renders nothing (LAWS §10). One image →
 * plain next/image. Two or more → direction-aware auto-carousel.
 *
 * Usage: <SmartGallery entityType="offers" entityId={offer.id} locale={locale} />
 */
export default async function SmartGallery({
  entityType,
  entityId,
  locale,
  variant = 'auto',
  aspect,
  sizes = '100vw',
  className = '',
}) {
  const slides = await getGallerySlides(entityType, entityId, locale);
  if (slides.length === 0) return null;

  const t = getDictionary(locale);

  if (slides.length === 1 && slides[0].kind === 'image') {
    const [slide] = slides;
    const aspectRatio =
      aspect ??
      (slide.width && slide.height ? `${slide.width} / ${slide.height}` : '16 / 10');
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
        <Image src={slide.src} alt={slide.alt} fill sizes={sizes} priority quality={65} placeholder="blur" blurDataURL={BLUR_DATA_URL} className="object-cover" />
      </div>
    );
  }

  return (
    <Carousel
      slides={slides}
      rtl={locale === 'ar'}
      variant={variant}
      aspect={aspect}
      sizes={sizes}
      className={className}
      labels={{
        prev: t.a11y.prevSlide,
        next: t.a11y.nextSlide,
        goTo: t.a11y.goToSlide,
      }}
    />
  );
}
