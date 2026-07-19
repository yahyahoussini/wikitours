import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { getSettings } from '@/lib/data/settings';
import { supabasePublic } from '@/lib/supabase/public';
import { waLink } from '@/lib/whatsapp';
import { renderMarkdown, markdownClass } from '@/lib/markdown';
import SmartGallery from '@/components/SmartGallery';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

/** Prebuild every public LP × locale so campaign traffic hits the ISR cache
 *  instead of a per-request render. Unknown slugs still resolve on demand. */
export async function generateStaticParams() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase.from('landing_pages').select('slug');
    return LOCALES.flatMap((locale) => (data ?? []).map(({ slug }) => ({ locale, slug })));
  } catch {
    return [];
  }
}

async function getLandingPage(slug) {
  try {
    const supabase = supabasePublic();
    if (!supabase) return null;
    const { data } = await supabase
      .from('landing_pages')
      .select('*, cta_offer:cta_offer_id (slug, title_fr, title_ar, title_en)')
      .eq('slug', slug)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const page = await getLandingPage(slug);
  if (!page) return {};
  return {
    title: pickLang(page, 'seo_title', locale) ?? pickLang(page, 'title', locale),
    description: pickLang(page, 'seo_description', locale) ?? pickLang(page, 'subtitle', locale),
    robots: page.noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function LandingPage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const [page, settings] = await Promise.all([getLandingPage(slug), getSettings()]);
  if (!page) notFound();

  const t = getDictionary(locale);
  const title = pickLang(page, 'title', locale);
  const subtitle = pickLang(page, 'subtitle', locale);
  const bodyMd = pickLang(page, 'body_md', locale);
  const ctaLabel = pickLang(page, 'cta_label', locale) ?? t.cta.interest;
  const whatsappHref = waLink(settings?.whatsapp_number, title ?? undefined);

  let ctaHref = null;
  if (page.cta_target === 'offer' && page.cta_offer?.slug) {
    ctaHref = `/${locale}/offres/${page.cta_offer.slug}`;
  } else if (page.cta_target === 'whatsapp') {
    ctaHref = whatsappHref;
  } else if (page.cta_target === 'babmakkah') {
    ctaHref = `/${locale}`;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-wiki-blue">
        {locale === 'ar' ? BRAND.lockupAr : BRAND.lockup}
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">{title}</h1>
      {subtitle ? (
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-bm-black/70">{subtitle}</p>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-panel shadow-lift empty:hidden">
        <SmartGallery
          entityType="landing_pages"
          entityId={page.id}
          locale={locale}
          aspect="16 / 9"
          sizes="(min-width: 768px) 768px, 100vw"
        />
      </div>

      {bodyMd ? (
        <div
          className={`mt-8 max-w-prose text-bm-black/80 ${markdownClass}`}
          // Rendered from admin-authored markdown, HTML-escaped before parsing.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyMd) }}
        />
      ) : null}

      {ctaHref ? (
        <div className="mt-10 flex flex-col items-start gap-3">
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-ctrl bg-wiki-blue px-7 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lift transition hover:bg-wiki-blue/90"
          >
            {ctaLabel}
          </a>
          {whatsappHref && page.cta_target !== 'whatsapp' ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-bm-black/60 underline-offset-4 transition hover:text-bm-black hover:underline"
            >
              {t.cta.whatsappAlt}
            </a>
          ) : null}
        </div>
      ) : null}

      {page.show_lead_form ? (
        <section className="mt-12 rounded-panel border border-bm-black/10 bg-white p-6 shadow-lift">
          <h2 className="text-xl font-bold">{t.cta.interest}</h2>
          <div className="mt-4">
            <LeadForm
              locale={locale}
              offerId={page.cta_offer_id}
              offerTitle={pickLang(page.cta_offer, 'title', locale)}
              labels={t.form}
              whatsappNumber={settings?.whatsapp_number}
            />
          </div>
        </section>
      ) : null}

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
