import { getDictionary, pickLang } from '@/lib/i18n';
import { getMenu } from '@/lib/data/content';
import HeaderClient from '@/components/site/HeaderClient';

/**
 * Public header (server shell): items come from the menus table
 * (location=header) when present; otherwise the code fallback nav —
 * which includes the Bab Makkah dropdown (parent link clickable).
 */
export default async function SiteHeader({ locale }) {
  const t = getDictionary(locale);
  const menu = await getMenu('header');

  const items = menu.length
    ? menu.map((m) => ({
        href: `/${locale}${m.href}`,
        label: pickLang(m, 'label', locale) ?? m.href,
      }))
    : [
        { href: `/${locale}`, label: t.nav.home },
        {
          href: `/${locale}/bab-makka`,
          label: t.nav.babmakkah,
          children: [
            { href: `/${locale}/bab-makka#par-mois`, label: t.nav.omraByMonth },
            { href: `/${locale}/bab-makka#par-occasion`, label: t.nav.omraByOccasion },
            { href: `/${locale}/hajj`, label: t.nav.hajj },
          ],
        },
        { href: `/${locale}/voyages`, label: t.nav.voyages },
        { href: `/${locale}/blog`, label: t.nav.blog },
        { href: `/${locale}/avis`, label: t.nav.avis },
        { href: `/${locale}/contact`, label: t.nav.contact },
      ];

  return (
    <>
      <HeaderClient
        locale={locale}
        items={items}
        reserveLabel={t.cta.reserveShort}
        reserveHref={`/${locale}/bab-makka`}
        a11y={{ openMenu: t.a11y.openMenu, closeMenu: t.a11y.closeMenu }}
      />
      {/* Spacer under the fixed capsule */}
      <div aria-hidden="true" className="h-20" />
    </>
  );
}
