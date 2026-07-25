import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';
import { hreflangAlternates, clampDesc } from '@/lib/seo';
import { getSettings } from '@/lib/data/settings';
import { getGallerySlides } from '@/lib/data/gallery';
import { SETTINGS_HERO_ENTITY_ID } from '@/lib/entities';
import BrandLockup from '@/components/site/BrandLockup';
import Icon from '@/components/site/Icon';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import HeroSlideshow from '@/components/site/HeroSlideshow';

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.hajjPage.title, description: clampDesc(t.hajjPage.body), alternates: hreflangAlternates(locale, '/hajj') };
}

/**
 * Hajj: interest-only until the agrément is confirmed (LAWS §6) — no
 * packages, prices or dates exist yet, so nothing here may imply otherwise.
 * The guarantee strip reuses the SAME real, sitewide guarantee copy used on
 * the homepage (licence, no online payment, written contract, support) —
 * true statements about how the agency operates, not Hajj-specific claims.
 */
export default async function HajjPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [settings, slides] = await Promise.all([
    getSettings(),
    getGallerySlides('settings_hero', SETTINGS_HERO_ENTITY_ID, locale),
  ]);
  const images = slides.filter((s) => s.kind === 'image');

  const guarantees = [
    [t.home.guaranteeLicense, 'shield'],
    [t.home.guaranteeNoOnlinePayment, 'lock'],
    [t.home.guaranteeContract, 'check'],
    [t.home.guaranteeSupport, 'headset'],
  ];

  return (
    <div className="bg-bm-black text-white">
      {/* Photo band — same treatment as the homepage hero (scrim + text
          shadow) so Hajj reads as a first-class, equally premium surface. */}
      <section className="px-3 pt-3">
        <div className="relative mx-auto min-h-[45vh] max-w-6xl overflow-hidden rounded-panel bg-bm-black shadow-float sm:min-h-[52vh]">
          {images.length ? (
            <HeroSlideshow slides={images} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-bm-black via-bm-black-soft to-[#20303a]" aria-hidden="true" />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[85%] bg-gradient-to-t from-bm-black/65 via-bm-black/20 to-transparent"
          />
          <div className="relative flex min-h-[45vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center sm:min-h-[52vh]">
            <BrandLockup locale={locale} size="md" className="text-shadow-photo" />
            <h1 className="max-w-2xl text-3xl font-bold leading-tight text-shadow-photo sm:text-4xl">
              {t.hajjPage.title}
            </h1>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-14">
        <p className="max-w-prose text-lg leading-relaxed text-white/85">{t.hajjPage.body}</p>

        {/* Trust strip — dark variant of the same sitewide guarantee copy. */}
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {guarantees.map(([label, icon]) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-card border border-white/10 bg-white/[0.04] px-4 py-3.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bm-gold/15 text-bm-gold">
                <Icon name={icon} className="size-4" />
              </span>
              <span className="text-sm font-semibold text-white/85">{label}</span>
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-panel border border-bm-gold/25 bg-bm-black-soft p-6 sm:p-8">
          <h2 className="text-xl font-bold text-bm-gold-light">{t.hajjPage.interestCta}</h2>
          <div className="mt-5">
            <LeadForm locale={locale} labels={t.form} dark source="hajj_interest" whatsappNumber={settings?.whatsapp_number} />
          </div>
        </section>
      </main>
      <WhatsAppFloat locale={locale} />
    </div>
  );
}
