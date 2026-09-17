import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { SITE_URL, hreflangAlternates, clampDesc, personNode } from '@/lib/seo';
import { pageDescription, trustClauses } from '@/lib/page-seo';
import { routeTitle } from '@/lib/titles';
import { getSettings } from '@/lib/data/settings';
import { getTeam, getFaqs } from '@/lib/data/content';
import { authorRenderable, teamIndexable, authorName, languagesOf } from '@/lib/authors';
import JsonLd from '@/components/site/JsonLd';
import BrandLockup from '@/components/site/BrandLockup';
import SectionBridge from '@/components/site/SectionBridge';
import { StorySection, GuaranteesStrip } from '@/components/site/HomeSections';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const trust = trustClauses(locale, { license: (await getSettings())?.license_number ?? null });
  return {
    title: { absolute: routeTitle('aPropos', locale) },
    // Authored, NOT t.brand.description — the legal pages inherit that string as
    // the layout default, which made /a-propos and /politique-de-confidentialite
    // byte-identical and failed the audit's duplicate check.
    description: pageDescription(locale, 'aPropos', { extra: [trust.licence, trust.noPayment] }),
    alternates: hreflangAlternates(locale, '/a-propos'),
  };
}

/* /a-propos — parent-brand identity: answer-first paragraph, real stats,
   written story + team, guarantees, then the two service doors. */
export default async function AProposPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const [settings, team, trustFaqs] = await Promise.all([getSettings(), getTeam(), getFaqs('confiance')]);

  const stats = [
    settings?.community_count ? [settings.community_count, t.home.statCommunity] : null,
    [String(new Date().getFullYear() - 2016), t.home.statSince],
    settings?.gbp_rating ? [`${settings.gbp_rating} ★`, t.home.statRating] : null,
    settings?.gbp_review_count ? [String(settings.gbp_review_count), t.home.statReviews] : null,
  ].filter(Boolean);

  // Person schema for the real, published team (E-E-A-T + GEO entity graph) —
  // the SAME node builder and @id as /equipe and the article bylines
  // (personNode), renderable profiles only; never a placeholder.
  const authors = settings?.team_enabled ? team.filter(authorRenderable) : [];
  const teamJsonLd = authors.map((m) => ({ '@context': 'https://schema.org', ...personNode(m, locale) }));

  return (
    <>
      <main>
        <div className="mx-auto max-w-5xl px-6 pt-10">
          {teamJsonLd.map((node) => (
            <JsonLd key={node['@id']} data={node} />
          ))}
          <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.aproposTitle}</h1>
          {/* Answer-first: THE canonical entity description, verbatim (the same
              string as Organization.description + llms.txt — consistency law). */}
          <p data-answer className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{t.brand.description}</p>
          <p className="mt-3 max-w-2xl leading-relaxed text-bm-black/60">{t.home.intro}</p>
          {/* The people page — linked once it is indexable (one complete
              published profile), never into a noindex page. */}
          {/* The people the Person nodes above describe, VISIBLY: structured
              data must match what the page shows, and StorySection shows a
              single team photo when team_display = 'photo', never names. */}
          {authors.length ? (
            <ul className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
              {authors.map((m) => {
                const languages = languagesOf(m);
                const credentials = pickLang(m, 'credentials', locale);
                return (
                  <li key={m.id} className="rounded-card border border-bm-black/10 bg-white p-4 shadow-hairline">
                    <p className="font-semibold text-bm-black">{authorName(m, locale)}</p>
                    {pickLang(m, 'role', locale) ? <p className="text-sm text-bm-black/60">{pickLang(m, 'role', locale)}</p> : null}
                    {pickLang(m, 'bio', locale) ? <p className="mt-2 text-sm leading-relaxed text-bm-black/70">{pickLang(m, 'bio', locale)}</p> : null}
                    {languages.length ? <p className="mt-2 text-xs text-bm-black/55">{t.pages.speaks.replace('{langs}', languages.join(', '))}</p> : null}
                    {credentials ? (
                      <p className="mt-1 text-xs text-bm-black/55">
                        <span className="font-semibold">{t.pages.credentialsTitle} :</span> {credentials}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {teamIndexable(team) ? (
            <p className="mt-3 text-sm font-semibold">
              <Link href={`/${locale}/equipe`} className="text-wiki-blue underline-offset-4 hover:underline">
                {t.pages.teamTitle} →
              </Link>
            </p>
          ) : null}
          {/* Contextual link to the agency entity page. Lives here rather than
              in StorySection because that section renders only once the admin
              has written a story — this block always renders. */}
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bm-black/70">
            {t.agency.contextLead}{' '}
            <Link
              href={`/${locale}/agence-omra-casablanca`}
              className="font-semibold text-wiki-blue underline-offset-4 hover:underline"
            >
              {t.agency.contextLink}
            </Link>
          </p>

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

        {/* Entity disambiguation. The `confiance` set answers "Bab Makka and
            Wiki Tours — same company?" in all three locales, and that answer is
            doing entity-resolution work for Google and for LLM retrieval. It
            belongs on the page ABOUT the entity, not only on the home page.
            VISIBLE only: the FAQPage node stays on the home page alone, so this
            never becomes a second FAQPage competing with it (CLAUDE.md). */}
        {trustFaqs.length ? (
          <section className="mx-auto max-w-5xl px-6 pt-4">
            <h2 className="text-2xl font-bold text-bm-black">{t.home.faqTitle}</h2>
            <div className="mt-4 flex max-w-prose flex-col gap-3">
              {trustFaqs.map((faq, i) => (
                <details
                  key={faq.id}
                  open={i === 0}
                  className="group rounded-card border border-bm-black/10 bg-white px-5 py-4 shadow-hairline"
                >
                  <summary className="cursor-pointer list-none font-semibold marker:content-none">
                    {pickLang(faq, 'question', locale)}
                  </summary>
                  <p data-faq-answer className="mt-3 text-sm leading-relaxed text-bm-black/70">
                    {pickLang(faq, 'answer', locale)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* Histoire + équipe (real faces = the conversion lever) */}
        <StorySection locale={locale} team={team} settings={settings} />

        <GuaranteesStrip locale={locale} license={settings?.license_number} />

        {/* The two service doors: Bab Makkah (dark, lockup) + Voyages (blue) */}
        <SectionBridge from="light" to="dark" />
        <section className="bg-bm-black text-white">
          <div className="mx-auto grid max-w-5xl gap-6 px-6 py-14 sm:grid-cols-2">
            <Link
              href={`/${locale}/bab-makka`}
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
