import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { supabasePublic } from '@/lib/supabase/public';
import { hreflangAlternates } from '@/lib/seo';
import { renderMarkdown, markdownClass } from '@/lib/markdown';

/**
 * Shared builder for the three legal pages (mentions légales / politique de
 * confidentialité / CGV). Admin-edited markdown (fr/ar/en). Noindex + guarded
 * empty state until fr AND ar bodies exist (parity law) — the footer links
 * them only once filled, so no dead links either.
 */
async function getLegalPage(slug) {
  try {
    const supabase = supabasePublic();
    if (!supabase) return null;
    const { data } = await supabase.from('legal_pages').select('*').eq('slug', slug).maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export function legalIsFilled(row) {
  return Boolean(row?.is_published && row?.body_md_fr && row?.body_md_ar);
}

export function createLegalPage(slug) {
  async function generateMetadata({ params }) {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const row = await getLegalPage(slug);
    if (!row) notFound(); // metadata-phase 404 (real status for crawlers)
    return {
      title: pickLang(row, 'title', locale),
      alternates: hreflangAlternates(locale, `/${slug}`),
      ...(legalIsFilled(row) ? {} : { robots: { index: false, follow: true } }),
    };
  }

  async function LegalPage({ params }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    const row = await getLegalPage(slug);
    if (!row) notFound();

    const t = getDictionary(locale);
    const title = pickLang(row, 'title', locale);
    const body = pickLang(row, 'body_md', locale);
    const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' });

    return (
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <h1 className="text-3xl font-bold leading-tight text-bm-black">{title}</h1>
        {body ? (
          <>
            {row.updated_at ? (
              <p className="mt-2 text-sm text-bm-black/50">
                {t.pages.updatedOn}{' '}
                <time dateTime={row.updated_at}>{dateFmt.format(new Date(row.updated_at))}</time>
              </p>
            ) : null}
            <div
              className={`mt-8 text-bm-black/80 ${markdownClass}`}
              // Admin-authored markdown, HTML-escaped before parsing.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
            />
          </>
        ) : (
          // Guarded empty state (audit cross-checks data-guard vs indexability).
          <p data-guard="empty" className="mt-6 text-bm-black/50">
            {t.pages.legalEmpty}
          </p>
        )}
      </main>
    );
  }

  return { generateMetadata, LegalPage };
}
