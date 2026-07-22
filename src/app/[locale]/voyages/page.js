import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { getVoyages, getCovers } from '@/lib/data/content';
import { publicMediaUrl } from '@/lib/media';
import { BLUR_DATA_URL } from '@/lib/blur';
import JsonLd from '@/components/site/JsonLd';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

const nf = new Intl.NumberFormat('fr-MA');

/** "12 → 19 octobre 2026" — start day collapses when both share the month. */
function formatDateRange(startISO, endISO, locale) {
  const loc = locale === 'ar' ? 'ar-MA' : `${locale}-MA`;
  const start = new Date(startISO);
  const end = new Date(endISO);
  const full = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = sameMonth
    ? new Intl.DateTimeFormat(loc, { day: 'numeric', timeZone: 'UTC' }).format(start)
    : new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(start);
  return `${startLabel} → ${full.format(end)}`;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const voyages = await getVoyages();
  return {
    title: t.voyages.title,
    description: clampDesc(t.voyages.intro),
    alternates: hreflangAlternates(locale, '/voyages'),
    // Scaffold law: an empty catalog is thin content — stay out of the index
    // (follow) until the client publishes real voyages.
    ...(voyages.length ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * Wiki Tours organized-trips catalog (client decision 2026-07: /voyages lists
 * ONLY real voyage offers — Omra/Hajj live exclusively under Bab Makka).
 */
export default async function VoyagesPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const voyages = await getVoyages();
  const covers = await getCovers('voyages', voyages.map((v) => v.id));

  const itemListJsonLd = voyages.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t.voyages.title,
        itemListElement: voyages.map((v, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: pickLang(v, 'title', locale) ?? v.slug,
          url: absoluteUrl(locale, `/voyage/${v.slug}`),
        })),
      }
    : null;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      {itemListJsonLd ? <JsonLd data={itemListJsonLd} /> : null}
      <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.voyages.title}</h1>
      <p className="mt-3 max-w-prose text-lg text-bm-black/70" data-answer>
        {t.voyages.intro}
      </p>

      {voyages.length === 0 ? (
        <p data-guard="empty" className="mt-10 text-bm-black/50">
          {t.voyages.empty}
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {voyages.map((voyage) => {
            const cover = covers.get(voyage.id);
            const title = pickLang(voyage, 'title', locale) ?? voyage.slug;
            return (
              <article
                key={voyage.id}
                data-reveal
                suppressHydrationWarning
                className="group relative flex h-full flex-col overflow-hidden rounded-panel border border-bm-black/10 bg-white shadow-lift transition duration-300 hover:border-wiki-blue/40 hover:shadow-float"
              >
                {/* Whole-card link; keyboard focusable */}
                <Link
                  href={`/${locale}/voyage/${voyage.slug}`}
                  aria-label={title}
                  className="absolute inset-0 z-[1] rounded-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-wiki-blue"
                />
                <div className="relative aspect-[16/10] overflow-hidden">
                  {cover ? (
                    <Image
                      src={publicMediaUrl(cover.path)}
                      alt={pickLang(cover, 'alt', locale) ?? title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      className="object-cover transition duration-500 ease-luxe group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-wiki-blue/5" />
                  )}
                  {voyage.destination ? (
                    <span className="absolute start-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-bm-black">
                      {voyage.destination}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5 text-bm-black">
                  <h2 className="text-lg font-bold leading-snug">{title}</h2>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bm-black/55">
                    {voyage.date_start && voyage.date_end ? (
                      <span className="tabular-nums">{formatDateRange(voyage.date_start, voyage.date_end, locale)}</span>
                    ) : null}
                    {voyage.duration_days && voyage.duration_nights ? (
                      <span>
                        {t.offer.duration
                          .replace('{days}', voyage.duration_days)
                          .replace('{nights}', voyage.duration_nights)}
                      </span>
                    ) : null}
                  </p>
                  {voyage.starting_price != null ? (
                    <p className="mt-auto">
                      <span className="text-xs text-bm-black/50">{t.offer.from} </span>
                      <span className="text-2xl font-bold tabular-nums text-wiki-blue">
                        {nf.format(voyage.starting_price)}
                      </span>
                      <span className="text-sm font-semibold text-wiki-blue"> {t.offer.currency}</span>
                      <span className="text-xs text-bm-black/50"> / {t.voyages.priceNote}</span>
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <WhatsAppFloat locale={locale} />
    </main>
  );
}
