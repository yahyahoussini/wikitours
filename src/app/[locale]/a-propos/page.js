import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { getSettings } from '@/lib/data/settings';
import { getTeam, getTimeline } from '@/lib/data/content';
import BrandLockup from '@/components/site/BrandLockup';
import SectionBridge from '@/components/site/SectionBridge';
import { StorySection, GuaranteesStrip } from '@/components/site/HomeSections';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.pages.aproposTitle, description: t.home.intro, alternates: hreflangAlternates(locale, '/a-propos') };
}

/* /a-propos — parent-brand identity: answer-first paragraph, real stats,
   timeline + team faces, guarantees, then the two service doors. */
export default async function AProposPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const [settings, team, timeline] = await Promise.all([getSettings(), getTeam(), getTimeline()]);

  const stats = [
    settings?.community_count ? [settings.community_count, t.home.statCommunity] : null,
    [String(new Date().getFullYear() - 2016), t.home.statSince],
    settings?.gbp_rating ? [`${settings.gbp_rating} ★`, t.home.statRating] : null,
    settings?.gbp_review_count ? [String(settings.gbp_review_count), t.home.statReviews] : null,
  ].filter(Boolean);

  return (
    <>
      <main>
        <div className="mx-auto max-w-5xl px-6 pt-10">
          <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.aproposTitle}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{t.home.intro}</p>

          {stats.length ? (
            <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-bold tabular-nums text-wiki-blue">{value}</dt>
                  <dd className="mt-1 text-sm text-bm-black/60">{label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {/* Histoire + équipe (real faces = the conversion lever) */}
        <StorySection locale={locale} timeline={timeline} team={team} />

        <GuaranteesStrip locale={locale} license={settings?.license_number} />

        {/* The two service doors: Bab Makkah (dark, lockup) + Voyages (blue) */}
        <SectionBridge from="light" to="dark" />
        <section className="bg-bm-black text-white">
          <div className="mx-auto grid max-w-5xl gap-6 px-6 py-14 sm:grid-cols-2">
            <Link
              href={`/${locale}/bab-makkah`}
              className="group rounded-panel border border-bm-gold/25 bg-bm-black-soft p-7 transition hover:border-bm-gold/60"
            >
              <BrandLockup locale={locale} size="sm" />
              <p className="mt-4 text-sm leading-relaxed text-white/70">{t.brand.premiumService}</p>
              <p className="mt-4 text-sm font-semibold text-bm-gold">{t.cta.discoverOffers} →</p>
            </Link>
            <Link
              href={`/${locale}/voyages`}
              className="group rounded-panel border border-white/10 bg-white/5 p-7 transition hover:border-wiki-blue"
            >
              <h2 className="text-xl font-bold">{t.voyages.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70">{t.voyages.intro}</p>
              <p className="mt-4 text-sm font-semibold text-[#6fc8e8]">{t.nav.voyages} →</p>
            </Link>
          </div>
        </section>
      </main>
      <WhatsAppFloat locale={locale} />
    </>
  );
}
