import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates } from '@/lib/seo';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import JsonLd from '@/components/site/JsonLd';
import LeadForm from '@/components/LeadForm';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.pages.contactTitle, description: t.pages.contactIntro, alternates: hreflangAlternates(locale, '/contact') };
}

/* /contact — NAP + hours as crawlable text, WhatsApp-first channels on one
   side, the lead form on the other, lazy map underneath. */
export default async function ContactPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const settings = await getSettings();

  const whatsappHref = waLink(settings?.whatsapp_number);
  const phones = [settings?.phone_1, settings?.phone_2, settings?.phone_3].filter(Boolean);
  const address = pickLang(settings, 'address', locale);
  const hours = pickLang(settings, 'opening_hours', locale);

  return (
    <>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': `${absoluteUrl(locale, '/contact')}#webpage`,
            url: absoluteUrl(locale, '/contact'),
            name: t.pages.contactTitle,
            inLanguage: locale,
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@id': `${SITE_URL}/#organization` },
            speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
          }}
        />
        <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.contactTitle}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-bm-black/70">{t.pages.contactIntro}</p>

        {/* Local-AEO direct answer ("Où se trouve l'agence ?") — rendered from
            the settings address only, omitted while it is empty (LAW §10). */}
        {address ? (
          <section className="mt-6 max-w-2xl rounded-panel border border-bm-black/10 bg-white p-5 shadow-hairline">
            <h2 className="text-lg font-bold text-bm-black">{t.pages.whereQuestion}</h2>
            <p data-answer className="mt-2 leading-relaxed text-bm-black/80">
              {t.pages.whereAnswer.replace('{address}', address)}
            </p>
          </section>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {/* Channels — WhatsApp is the primary action (blue per LAWS §7) */}
          <div className="flex flex-col gap-6">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-wt="whatsapp_click"
                data-wt-label="contact"
                className="inline-flex w-fit items-center gap-2.5 rounded-full bg-wiki-blue px-7 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
              >
                <WhatsAppIcon className="size-5" />
                {t.cta.whatsappFloatLabel}
              </a>
            ) : null}

            {phones.length ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-bm-black/50">
                  {t.pages.phonesTitle}
                </h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {phones.map((phone) => (
                    <li key={phone}>
                      <a
                        href={`tel:${String(phone).replace(/[^+\d]/g, '')}`}
                        className="text-lg font-semibold tabular-nums text-bm-black hover:text-wiki-blue"
                        dir="ltr"
                      >
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {settings?.email ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-bm-black/50">Email</h2>
                <a href={`mailto:${settings.email}`} className="mt-1 inline-block font-medium text-wiki-blue hover:underline">
                  {settings.email}
                </a>
              </div>
            ) : null}

            {address ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-bm-black/50">
                  {t.pages.addressTitle}
                </h2>
                <p className="mt-1 leading-relaxed text-bm-black/80">{address}</p>
              </div>
            ) : null}

            {hours ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-bm-black/50">
                  {t.pages.hoursTitle}
                </h2>
                <p className="mt-1 whitespace-pre-line leading-relaxed text-bm-black/80">{hours}</p>
              </div>
            ) : null}
          </div>

          {/* Lead form (the request pattern, LAWS §6) */}
          <section className="rounded-panel border border-bm-black/5 bg-white p-6 shadow-hairline">
            <h2 className="text-xl font-bold text-bm-black">{t.pages.contactFormTitle}</h2>
            <div className="mt-4">
              <LeadForm locale={locale} labels={t.form} source="contact" whatsappNumber={settings?.whatsapp_number} />
            </div>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-wt="whatsapp_click"
                data-wt-label="contact_form"
                className="mt-3 inline-block text-sm text-bm-black/60 underline-offset-4 hover:underline"
              >
                {t.cta.whatsappAlt}
              </a>
            ) : null}
          </section>
        </div>

        {/* Lazy map — only when an address exists */}
        {address ? (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-bm-black">{t.pages.findUs}</h2>
            <div className="mt-4 overflow-hidden rounded-panel shadow-hairline">
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                title={t.pages.findUs}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-80 w-full border-0"
              />
            </div>
          </section>
        ) : null}
      </main>
      <WhatsAppFloat locale={locale} />
    </>
  );
}
