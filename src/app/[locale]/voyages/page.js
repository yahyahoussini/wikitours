import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { getServices } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import BrandLockup from '@/components/site/BrandLockup';
import SmartGallery from '@/components/SmartGallery';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

const SECTIONS = ['individuels', 'groupes', 'incentive'];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.voyages.title, description: t.voyages.intro, alternates: hreflangAlternates(locale, '/voyages') };
}

/** Wiki Tours parent services page (blue-on-warm-white surface). */
export default async function VoyagesPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const [services, settings] = await Promise.all([getServices(), getSettings()]);

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-8">
      <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.voyages.title}</h1>
      <p className="mt-3 max-w-prose text-lg text-bm-black/70">{t.voyages.intro}</p>

      {SECTIONS.map((section) => {
        const items = services.filter((s) => s.section === section);
        if (items.length === 0) return null; // hides until the client provides content
        return (
          <section key={section} className="mt-12">
            <h2 className="text-2xl font-bold text-wiki-blue">{t.voyages[section]}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {items.map((service) => {
                const isOmra = service.slug === 'omra-hajj';
                return (
                  <article key={service.id} className="flex flex-col overflow-hidden rounded-card bg-white shadow-hairline">
                    <SmartGallery
                      entityType="services"
                      entityId={service.id}
                      locale={locale}
                      aspect="16 / 9"
                      sizes="(min-width: 640px) 50vw, 100vw"
                    />
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <h3 className="font-bold text-bm-black">{pickLang(service, 'name', locale)}</h3>
                      {pickLang(service, 'description', locale) ? (
                        <p className="text-sm text-bm-black/65">{pickLang(service, 'description', locale)}</p>
                      ) : null}
                      {isOmra ? (
                        <Link href={`/${locale}/bab-makka`} className="mt-auto inline-flex items-center gap-3">
                          <BrandLockup locale={locale} size="sm" />
                          <span className="text-sm font-semibold text-wiki-blue underline-offset-4 hover:underline">→</span>
                        </Link>
                      ) : (
                        <details className="mt-auto">
                          <summary className="cursor-pointer text-sm font-semibold text-wiki-blue">
                            {t.voyages.askQuote}
                          </summary>
                          <div className="mt-3">
                            <LeadForm locale={locale} labels={t.form} source={`service_${service.slug}`} whatsappNumber={settings?.whatsapp_number} />
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      <WhatsAppFloat locale={locale} />
    </main>
  );
}
