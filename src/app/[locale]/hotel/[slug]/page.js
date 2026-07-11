import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { getHotelBySlug } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import BrandLockup from '@/components/site/BrandLockup';
import SmartGallery from '@/components/SmartGallery';
import CtaBlock from '@/components/CtaBlock';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const hotel = await getHotelBySlug(slug);
  if (!hotel) return {};
  return {
    title: pickLang(hotel, 'seo_title', locale) ?? hotel.name,
    description: pickLang(hotel, 'seo_description', locale) ?? pickLang(hotel, 'description', locale),
  };
}

export default async function HotelPage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const [hotel, settings] = await Promise.all([getHotelBySlug(slug), getSettings()]);
  if (!hotel) notFound();

  const t = getDictionary(locale);
  const description = pickLang(hotel, 'description', locale);
  const cityLabel = hotel.city === 'makkah' ? t.offer.makkah : t.offer.madinah;
  const whatsappHref = waLink(settings?.whatsapp_number);

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <BrandLockup locale={locale} size="sm" />

      <h1 className="mt-3 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">
        {hotel.name}
        {hotel.stars ? <span className="ms-3 text-bm-gold">{'★'.repeat(hotel.stars)}</span> : null}
      </h1>

      {/* Answer-first crawlable facts (LAWS §5) */}
      <p className="mt-2 text-lg text-bm-black/70">
        {cityLabel}
        {hotel.distance_to_haram_m != null
          ? ` · ${t.offer.distanceToHaram.replace('{m}', hotel.distance_to_haram_m)}`
          : ''}
        {hotel.breakfast_included ? ` · ${t.offer.breakfastIncluded}` : ''}
      </p>

      <div className="mt-8 overflow-hidden rounded-panel shadow-lift">
        <SmartGallery
          entityType="hotels"
          entityId={hotel.id}
          locale={locale}
          aspect="16 / 9"
          sizes="(min-width: 1024px) 896px, 100vw"
        />
      </div>

      {description ? (
        <p className="mt-8 max-w-prose whitespace-pre-line text-lg leading-relaxed text-bm-black/80">
          {description}
        </p>
      ) : null}

      {whatsappHref ? (
        <div className="mt-10">
          <CtaBlock
            primaryLabel={t.cta.reserve}
            primaryHref={whatsappHref}
            whatsappHref={whatsappHref}
            whatsappLabel={t.cta.whatsappAlt}
          />
        </div>
      ) : null}

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
