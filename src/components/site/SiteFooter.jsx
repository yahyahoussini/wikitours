import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getMenu } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
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

  const col1 = await column('footer_col1', locale, [
    { href: `/${locale}/bab-makkah`, label: t.nav.babmakkah },
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

  const socials = [
    ['Facebook', settings?.facebook_url],
    ['Instagram', settings?.instagram_url],
    ['TikTok', settings?.tiktok_url],
    ['YouTube', settings?.youtube_url],
  ].filter(([, url]) => url);

  const phones = [settings?.phone_1, settings?.phone_2, settings?.phone_3].filter(Boolean);

  return (
    <footer className="bg-bm-black text-white/70">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Image src="/brand/wikitours-logo-white.png" alt={BRAND.parent} width={1536} height={1024} className="h-14 w-auto" />
          <div className="mt-4">
            <BrandLockup locale={locale} size="sm" />
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
          {socials.length ? (
            <p className="mt-3 flex gap-4 text-sm">
              {socials.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="transition hover:text-bm-gold-light">
                  {name}
                </a>
              ))}
            </p>
          ) : null}
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

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-xs text-white/60">
          <span>© {new Date().getFullYear()} {BRAND.parent}. {t.footer.rights}</span>
          {phones.map((p) => (
            <a key={p} href={`tel:${p}`} className="tabular-nums hover:text-white/70">{p}</a>
          ))}
          {pickLang(settings, 'address', locale) ? <span>{pickLang(settings, 'address', locale)}</span> : null}
        </div>
      </div>
    </footer>
  );
}
