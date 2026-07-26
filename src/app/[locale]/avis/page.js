import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { SITE_URL, hreflangAlternates } from '@/lib/seo';
import { getTestimonials } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { getTestimonialMedia } from '@/lib/data/gallery';
import JsonLd from '@/components/site/JsonLd';
import SectionBridge from '@/components/site/SectionBridge';
import ReelsRow from '@/components/site/ReelsRow';
import ScreenshotWall from '@/components/site/ScreenshotWall';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.pages.avisTitle, description: t.pages.avisDesc, alternates: hreflangAlternates(locale, '/avis') };
}

/* /avis — every proof kind on one page: reels (dark band), text cards,
   screenshot wall, Google badge + review link. All counts computed. */
export default async function AvisPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const [testimonials, settings] = await Promise.all([getTestimonials(), getSettings()]);
  const { reels, shots, texts } = await getTestimonialMedia(testimonials, locale);

  // Real, rated testimonials as Review nodes pointing at the organization —
  // enriches the entity for answer engines. Only rows carrying a real rating.
  const rated = texts.filter((x) => typeof x.rating === 'number' && x.rating > 0);
  const reviewsJsonLd = rated.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t.pages.avisTitle,
        numberOfItems: rated.length,
        itemListElement: rated.slice(0, 20).map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Review',
            itemReviewed: { '@id': `${SITE_URL}/#organization` },
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            ...(r.author_name ? { author: { '@type': 'Person', name: r.author_name } } : {}),
            ...(pickLang(r, 'content', locale) ? { reviewBody: pickLang(r, 'content', locale) } : {}),
          },
        })),
      }
    : null;

  // Uploaded testimonial videos as VideoObject nodes — only real fields
  // (contentUrl from storage, poster when one exists); nothing invented.
  const videosJsonLd = reels
    .filter((r) => r.src)
    .map((r) => ({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: r.caption ? `${t.pages.avisTitle} — ${r.caption}` : t.pages.avisTitle,
      description: r.caption
        ? `Témoignage vidéo de ${r.caption}, pèlerin parti en Omra avec ${BRAND.lockup}.`
        : `Témoignage vidéo d'un pèlerin parti en Omra avec ${BRAND.lockup}.`,
      contentUrl: r.src,
      // uploadDate + thumbnailUrl are the fields Google requires to index a video.
      ...(r.date ? { uploadDate: String(r.date).slice(0, 10) } : {}),
      ...(r.poster ? { thumbnailUrl: r.poster } : {}),
      publisher: { '@id': `${SITE_URL}/#organization` },
    }));

  return (
    <>
      <main>
        {reviewsJsonLd ? <JsonLd data={reviewsJsonLd} /> : null}
        {videosJsonLd.map((node) => (
          <JsonLd key={node.contentUrl} data={node} />
        ))}
        <div className="mx-auto max-w-5xl px-6 pb-4 pt-10">
          <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.avisTitle}</h1>

          {testimonials.length > 0 ? (
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-bm-black/70">
              {t.pages.reviewsCount.replace('{n}', testimonials.length)}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {settings?.gbp_review_count > 0 && settings?.gbp_rating ? (
              <a
                href={settings.gbp_review_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-bm-black/10 bg-white px-4 py-1.5 text-sm font-semibold shadow-hairline"
              >
                {t.home.googleBadge
                  .replace('{rating}', settings.gbp_rating)
                  .replace('{count}', settings.gbp_review_count)}
              </a>
            ) : null}
            {settings?.gbp_review_url ? (
              <a
                href={settings.gbp_review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-wiki-blue underline-offset-4 hover:underline"
              >
                {t.pages.leaveReview} →
              </a>
            ) : null}
          </div>
        </div>

        {reels.length ? (
          <>
            <SectionBridge from="light" to="dark" />
            <section className="bg-bm-black text-white">
              <div className="mx-auto max-w-5xl px-6 py-14">
                <h2 className="text-2xl font-bold">{t.home.reelsTitle}</h2>
                <div className="mt-6">
                  <ReelsRow reels={reels} />
                </div>
              </div>
            </section>
            <SectionBridge from="dark" to="light" />
          </>
        ) : null}

        {texts.length ? (
          <section className="mx-auto max-w-5xl px-6 py-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {texts.map((item) => (
                <figure key={item.id} className="rounded-card bg-white p-5 shadow-hairline">
                  {item.rating ? (
                    <p className="text-sm tracking-widest text-bm-gold">{'★'.repeat(item.rating)}</p>
                  ) : null}
                  <blockquote className="mt-2 text-sm leading-relaxed text-bm-black/80">
                    {pickLang(item, 'content', locale)}
                  </blockquote>
                  <figcaption className="mt-3 text-xs font-semibold text-bm-black/50">
                    {item.author_name}
                    {item.author_city ? ` · ${item.author_city}` : ''}
                    {pickLang(item, 'trip_label', locale) ? ` · ${pickLang(item, 'trip_label', locale)}` : ''}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {shots.length ? (
          <section className="mx-auto max-w-5xl px-6 py-10">
            <ScreenshotWall shots={shots} closeLabel={t.a11y.close} />
          </section>
        ) : null}

        <div className="mx-auto max-w-5xl px-6 py-12">
          <Link
            href={`/${locale}/bab-makka`}
            data-wt="cta_click"
            data-wt-label="avis"
            className="inline-block rounded-full bg-wiki-blue px-8 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
          >
            {t.cta.discoverOffers}
          </Link>
        </div>
      </main>
      <WhatsAppFloat locale={locale} />
    </>
  );
}
