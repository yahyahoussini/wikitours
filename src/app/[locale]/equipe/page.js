import MediaImage from '@/components/MediaImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates, SPEAKABLE, personNode } from '@/lib/seo';
import { pageDescription, trustClauses } from '@/lib/page-seo';
import { routeTitle } from '@/lib/titles';
import { getTeam, getArticles } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { getGallerySlides } from '@/lib/data/gallery';
import { authorRenderable, teamIndexable, authorName, languagesOf, findAuthor } from '@/lib/authors';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import ClusterLinks from '@/components/site/ClusterLinks';
import JsonLd from '@/components/site/JsonLd';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 3600;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const [team, settings] = await Promise.all([getTeam(), getSettings()]);
  const trust = trustClauses(locale, { license: settings?.license_number ?? null });
  return {
    title: { absolute: routeTitle('equipe', locale) },
    description: pageDescription(locale, 'equipe', { extra: [trust.licence, trust.noPayment] }),
    alternates: hreflangAlternates(locale, '/equipe'),
    // noindex-until-filled (the scaffold law): indexes once one complete
    // (fr + ar bio) published profile exists — a page of empty cards is thin.
    ...(teamIndexable(team) ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * /equipe — the people behind the content (E-E-A-T for a YMYL site): every
 * renderable profile (published, not a placeholder, with a bio) as a card and
 * as a Person node whose @id every article's author/reviewer resolves to,
 * worksFor → the ONE business entity. Nothing here is invented: a field the
 * client has not supplied is simply absent (docs/authors-intake.md lists them).
 */
export default async function TeamPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [allTeam, articles] = await Promise.all([getTeam(), getArticles(500)]);
  const team = allTeam.filter(authorRenderable);
  const faces = new Map();
  for (const member of team) {
    const slides = await getGallerySlides('team_members', member.id, locale);
    const face = slides.find((s) => s.kind === 'image');
    if (face) faces.set(member.id, face);
  }
  const url = absoluteUrl(locale, '/equipe');
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'medium', timeZone: 'UTC' });

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: t.pages.teamTitle,
    description: t.pages.teamLede,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    speakable: SPEAKABLE,
  };
  const personJsonLd = team.map((m) => ({ '@context': 'https://schema.org', ...personNode(m, locale, { image: faces.get(m.id)?.src ?? null }) }));

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <JsonLd data={webPageJsonLd} />
      {personJsonLd.map((node) => (
        <JsonLd key={node['@id']} data={node} />
      ))}
      <BrandLockup locale={locale} size="sm" />
      <BreadcrumbTrail locale={locale} className="mt-3" items={[{ label: t.nav.home, href: `/${locale}` }, { label: t.nav.about, href: `/${locale}/a-propos` }, { label: t.pages.teamTitle }]} />

      <h1 className="mt-3 text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.teamTitle}</h1>
      <p data-answer className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{t.pages.teamLede}</p>

      {team.length ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {team.map((m) => {
            const face = faces.get(m.id);
            const name = authorName(m, locale);
            const byline = articles.filter((a) => findAuthor(allTeam, a)?.id === m.id);
            const languages = languagesOf(m);
            const credentials = pickLang(m, 'credentials', locale);
            return (
              <li key={m.id} id={m.slug} className="scroll-mt-24 rounded-panel border border-bm-black/10 bg-white p-6 shadow-hairline">
                <div className="flex items-center gap-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-bm-black/5">
                    {face ? <MediaImage src={face.src} alt={name} fill sizes="80px" className="object-cover" /> : null}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-bm-black">{name}</h2>
                    {pickLang(m, 'role', locale) ? <p className="text-sm text-bm-black/60">{pickLang(m, 'role', locale)}</p> : null}
                    {m.years_experience ? <p className="mt-1 text-xs font-semibold text-bm-gold-deep">{t.pages.yearsExperience.replace('{n}', String(m.years_experience))}</p> : null}
                  </div>
                </div>
                {pickLang(m, 'bio', locale) ? <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-bm-black/75">{pickLang(m, 'bio', locale)}</p> : null}
                {languages.length ? <p className="mt-3 text-xs text-bm-black/55">{t.pages.speaks.replace('{langs}', languages.join(', '))}</p> : null}
                {credentials ? (
                  <p className="mt-2 text-xs text-bm-black/55">
                    <span className="font-semibold">{t.pages.credentialsTitle} :</span> {credentials}
                  </p>
                ) : null}
                {byline.length ? (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-bm-black/50">{t.pages.articlesBy.replace('{name}', name)}</h3>
                    <ul className="mt-1 flex flex-col gap-1 text-sm">
                      {byline.slice(0, 6).map((a) => (
                        <li key={a.slug}>
                          <Link href={`/${locale}/blog/${a.slug}`} className="text-wiki-blue underline-offset-4 hover:underline">{pickLang(a, 'title', locale)}</Link>
                          {a.published_at ? <span className="text-xs text-bm-black/45"> · {dateFmt.format(new Date(a.published_at))}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        /* Honest empty state — the audit fails an indexable page showing this. */
        <section data-guard="empty" className="mt-10 rounded-panel border border-dashed border-bm-black/15 bg-bm-black/[0.02] p-6">
          <p className="text-sm leading-relaxed text-bm-black/60">{t.pages.teamEmpty}</p>
          <Link href={`/${locale}/a-propos`} className="mt-3 inline-block text-sm font-semibold text-bm-gold-deep underline-offset-4 hover:underline">
            {t.nav.about} →
          </Link>
        </section>
      )}

      <ClusterLinks path="/equipe" locale={locale} />
      <WhatsAppFloat locale={locale} />
    </main>
  );
}
