import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { getSettings } from '@/lib/data/settings';
import { GuaranteesStrip } from '@/components/site/HomeSections';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.pages.agrementTitle, description: t.pages.agrementBody, alternates: hreflangAlternates(locale, '/agrement') };
}

/* /agrement — deliberately spare and official: the real license number in a
   certificate-style card, verification statement, guarantees. */
export default async function AgrementPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const settings = await getSettings();

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.agrementTitle}</h1>
        <p className="mt-4 text-lg leading-relaxed text-bm-black/70">{t.pages.agrementBody}</p>

        {settings?.license_number ? (
          <div className="mt-8 rounded-panel border border-bm-gold/40 bg-white p-8 text-center shadow-lift">
            <p className="text-xs font-semibold uppercase tracking-widest text-bm-black/50">
              {t.footer.licenseLabel}
            </p>
            <p className="mt-2 bg-gradient-to-b from-bm-gold to-[#a8871f] bg-clip-text text-4xl font-bold tabular-nums text-transparent">
              {settings.license_number}
            </p>
            {pickLang(settings, 'address', locale) ? (
              <p className="mt-3 text-sm text-bm-black/50">{pickLang(settings, 'address', locale)}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href={`/${locale}/contact`} className="text-wiki-blue underline-offset-4 hover:underline">
            {t.pages.contactTitle} →
          </Link>
          <Link href={`/${locale}/avis`} className="text-wiki-blue underline-offset-4 hover:underline">
            {t.pages.avisTitle} →
          </Link>
        </div>
      </main>

      <GuaranteesStrip locale={locale} license={settings?.license_number} />
      <WhatsAppFloat locale={locale} />
    </>
  );
}
