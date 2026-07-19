import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';
import { hreflangAlternates, clampDesc } from '@/lib/seo';
import { getSettings } from '@/lib/data/settings';
import BrandLockup from '@/components/site/BrandLockup';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.hajjPage.title, description: clampDesc(t.hajjPage.body), alternates: hreflangAlternates(locale, '/hajj') };
}

/** Hajj: interest-only until the agrément is confirmed (LAWS §6). */
export default async function HajjPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const settings = await getSettings();

  return (
    <div className="bg-bm-black text-white">
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-10">
        <BrandLockup locale={locale} size="md" />
        <h1 className="mt-5 text-3xl font-bold sm:text-4xl">{t.hajjPage.title}</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-white/80">{t.hajjPage.body}</p>
        <section className="mt-8 rounded-panel border border-bm-gold/25 bg-bm-black-soft p-6">
          <h2 className="font-bold text-bm-gold-light">{t.hajjPage.interestCta}</h2>
          <div className="mt-4">
            <LeadForm locale={locale} labels={t.form} dark source="hajj_interest" whatsappNumber={settings?.whatsapp_number} />
          </div>
        </section>
      </main>
      <WhatsAppFloat locale={locale} />
    </div>
  );
}
