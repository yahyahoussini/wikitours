import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getMenu, getCityPages } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { supabasePublic } from '@/lib/supabase/public';
import { legalIsFilled } from '@/lib/legal-page';
import { MONTH_SLUGS, monthPagePath, monthName, CITY_SLUGS, cityPageIndexable } from '@/lib/months';
import BrandLockup from '@/components/site/BrandLockup';

async function column(location, locale, fallback) {
  const rows = await getMenu(location);
  if (rows.length) {
    return rows.map((m) => ({ href: `/${locale}${m.href}`, label: pickLang(m, 'label', locale) ?? m.href }));
  }
  return fallback;
}

/** Dark footer: brand hierarchy line, two admin-managed link columns, NAP. */
export default async function SiteFooter({ locale }) {
  const t = getDictionary(locale);
  const settings = await getSettings();
  // City pages join the hub layer only once their guard passes — a sitemap URL
  // must always be internally linked (orphan rule in scripts/seo-audit.js).
  const cityPages = await getCityPages();
  const liveCities = Object.keys(CITY_SLUGS).filter((slug) => cityPageIndexable(cityPages.get(slug)));

  // Legal pages: only link the ones the admin has actually filled (fr+ar+
  // published) — never a dead/empty link (LAW §10, parity gate). Titles come
  // from the row itself (seeded fr/ar/en by migration 014, editable in admin).
  let legalLinks = [];
  try {
    const supabase = supabasePublic();
    if (supabase) {
      const { data } = await supabase.from('legal_pages').select('slug, title_fr, title_ar, title_en, body_md_fr, body_md_ar, is_published');
      legalLinks = (data ?? [])
        .filter(legalIsFilled)
        .map((row) => ({ href: `/${locale}/${row.slug}`, label: pickLang(row, 'title', locale) }));
    }
  } catch {
    /* footer must never break the page over this */
  }

  const col1 = await column('footer_col1', locale, [
    { href: `/${locale}/bab-makka`, label: t.nav.babmakkah },
    { href: `/${locale}/hajj`, label: t.nav.hajj },
    { href: `/${locale}/avis`, label: t.nav.avis },
    { href: `/${locale}/agrement`, label: t.pages.agrementTitle },
  ]);
  const col2 = await column('footer_col2', locale, [
    { href: `/${locale}/voyages`, label: t.nav.voyages },
    { href: `/${locale}/a-propos`, label: t.nav.about },
    { href: `/${locale}/blog`, label: t.nav.blog },
    { href: `/${locale}/contact`, label: t.nav.contact },
  ]);

  // Two profiles per network: the Wiki Tours main accounts + the Bab Makka
  // brand accounts. Each group renders only when at least one URL is set.
  const socialGroups = [
    {
      label: BRAND.parent,
      links: [
        ['Facebook', settings?.facebook_url],
        ['Instagram', settings?.instagram_url],
        ['TikTok', settings?.tiktok_url],
        ['YouTube', settings?.youtube_url],
      ].filter(([, url]) => url),
    },
    {
      label: BRAND.service,
      links: [
        ['Facebook', settings?.babmakka_facebook_url],
        ['Instagram', settings?.babmakka_instagram_url],
        ['TikTok', settings?.babmakka_tiktok_url],
        ['YouTube', settings?.babmakka_youtube_url],
      ].filter(([, url]) => url),
    },
  ].filter((g) => g.links.length);

  const phones = [settings?.phone_1, settings?.phone_2, settings?.phone_3].filter(Boolean);

  return (
    <footer className="bg-bm-black text-white/70">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Image src="/brand/wikitours-logo-white.png" alt={BRAND.parent} width={1536} height={1024} className="h-20 w-auto" />
          <div className="mt-4">
            <BrandLockup locale={locale} size="md" />
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">{t.brand.footerLine}</p>
          {/* Ministère du Tourisme mark — ONLY when the license is set (LAWS §10) */}
          {settings?.license_number ? (
            <p className="mt-3 flex w-fit items-center gap-2.5 rounded-full border border-bm-gold/30 bg-bm-gold/5 px-4 py-2 text-xs text-white/70">
              <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-bm-gold/20 text-[10px] text-bm-gold">✓</span>
              <span>
                {t.footer.ministryMark}
                <span className="ms-2 font-semibold tabular-nums text-bm-gold-light">
                  {t.footer.licenseLabel} {settings.license_number}
                </span>
              </span>
            </p>
          ) : null}
          {socialGroups.map((group) => (
            <p key={group.label} className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">{group.label}</span>
              {group.links.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="transition hover:text-bm-gold-light">
                  {name}
                </a>
              ))}
            </p>
          ))}
        </div>

        {[col1, col2].map((col, i) => (
          <nav key={i} className="flex flex-col gap-2 text-sm">
            {col.map((item) => (
              <Link key={item.href} href={item.href} className="link-underline w-fit transition hover:text-bm-gold-light">
                {item.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      {/* SEO hub layer — permanent internal links to the evergreen hubs
          (decision C9: hubs are the permanent SEO layer, in sitewide linking). */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-white/75">
            <Link href={`/${locale}/bab-makka`} className="hover:text-bm-gold-light">{t.nav.offers}</Link>
            <Link href={`/${locale}/omra-ramadan`} className="hover:text-bm-gold-light">Omra Ramadan</Link>
            <Link href={`/${locale}/omra-pas-cher`} className="hover:text-bm-gold-light">{t.pages.pasCherTitle}</Link>
            <Link href={`/${locale}/hotels-omra`} className="hover:text-bm-gold-light">{t.home.hotelsTitle}</Link>
            <Link href={`/${locale}/guide-omra`} className="hover:text-bm-gold-light">{t.guide.backToPillar}</Link>
            <Link href={`/${locale}/glossaire-omra`} className="hover:text-bm-gold-light">{t.glossary.title}</Link>
            <Link href={`/${locale}/barometre-prix-omra`} className="hover:text-bm-gold-light">{t.barometer.title}</Link>
            <Link href={`/${locale}/presse`} className="hover:text-bm-gold-light">{t.pages.pressTitle}</Link>
          </nav>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-white/40">{t.home.monthsTitle}</p>
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/55">
            {MONTH_SLUGS.map((slug, i) => (
              <Link key={slug} href={`/${locale}${monthPagePath(i)}`} className="capitalize hover:text-bm-gold-light">
                {monthName(i, locale)}
              </Link>
            ))}
          </nav>
          {liveCities.length ? (
            <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/55">
              {liveCities.map((slug) => (
                <Link key={slug} href={`/${locale}/omra-depuis-${slug}`} className="hover:text-bm-gold-light">
                  {t.cityPage.title.replace('{city}', CITY_SLUGS[slug])}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-xs text-white/60">
          <span>© {new Date().getFullYear()} {BRAND.parent}. {t.footer.rights}</span>
          {phones.map((p) => (
            <a key={p} href={`tel:${p}`} className="tabular-nums hover:text-white/70">{p}</a>
          ))}
          {pickLang(settings, 'address', locale) ? <span>{pickLang(settings, 'address', locale)}</span> : null}
          {legalLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white/70">{l.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
