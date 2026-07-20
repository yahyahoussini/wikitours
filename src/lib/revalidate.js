import { revalidatePath } from 'next/cache';
import { LOCALES } from '@/lib/i18n';
import { getSettings } from '@/lib/data/settings';
import { pingIndexNow } from '@/lib/server/indexnow';

/**
 * Central on-demand revalidation: table → public paths, called after EVERY
 * admin mutation so content is live within one request instead of waiting for
 * the 60s ISR window. Three path shapes:
 *   '/foo'            locale-relative — expanded to every locale
 *   '/[locale]/…'     dynamic-segment — one revalidatePath(p, 'page') call
 *                     invalidates ALL params of that segment, all locales
 *   'raw:/foo'        absolute, no locale prefix (llms.txt)
 * 'layout' revalidates the whole tree (site-wide surfaces: header menus,
 * announcement bar, settings).
 */
const TABLE_PATHS = {
  offers: (row) => [
    '/', '/bab-makka', '/agence-omra-casablanca', '/omra-pas-cher',
    '/hotels-omra', '/barometre-prix-omra',
    row?.slug ? `/omra/${row.slug}` : '/[locale]/omra/[slug]',
    '/[locale]/[flat]', // month + occasion hubs (price tables, offer lists)
    'raw:/llms.txt',
  ],
  offer_tiers: () => [
    '/', '/bab-makka', '/omra-pas-cher', '/barometre-prix-omra',
    '/[locale]/omra/[slug]', '/[locale]/[flat]',
  ],
  occasions: () => ['/', '/bab-makka', '/[locale]/[flat]'],
  hotels: (row) => [
    '/', '/hotels-omra',
    row?.slug ? `/hotel/${row.slug}` : '/[locale]/hotel/[slug]',
    '/[locale]/omra/[slug]', // tier hotel cards on offer pages
  ],
  destinations: () => ['/'],
  testimonials: () => [
    '/', '/avis', '/agence-omra-casablanca',
    '/[locale]/omra/[slug]', // reviews block on offer pages
  ],
  faqs: () => [
    '/', '/agrement', '/bab-makka', '/guide-omra',
    '/[locale]/omra/[slug]', '/[locale]/[flat]', '/[locale]/guide-omra/[slug]',
  ],
  timeline_items: () => ['/', '/a-propos'],
  team_members: () => ['/', '/a-propos'],
  articles: (row) => ['/', '/blog', row?.slug ? `/blog/${row.slug}` : null, 'raw:/llms.txt'],
  landing_pages: (row) => [row?.slug ? `/lp/${row.slug}` : '/[locale]/lp/[slug]'],
  city_pages: (row) => [
    row?.slug ? `/omra-depuis-${row.slug}` : '/[locale]/[flat]',
    'raw:/llms.txt',
  ],
  guide_pages: (row) => [
    '/guide-omra',
    row?.slug ? `/guide-omra/${row.slug}` : '/[locale]/guide-omra/[slug]',
    'raw:/llms.txt',
  ],
  glossary_terms: () => ['/glossaire-omra', 'raw:/llms.txt'],
  services: () => ['/voyages'],
  // 'layout': the footer's link visibility depends on legalIsFilled() for
  // EVERY row, so any edit can flip the footer on every page, not just the
  // one legal page's own content.
  legal_pages: 'layout',
  announcements: 'layout',
  menus: 'layout',
  settings: 'layout',
  redirects: null, // consumed by the middleware's 60s map, not by pages
  media: null,
  galleries: null,
  keyword_checks: null,
  leads: null,
  lead_activities: null,
};

export function revalidateForTable(table, row) {
  const spec = TABLE_PATHS[table];
  if (!spec) return;
  if (spec === 'layout') {
    revalidatePath('/', 'layout');
    return;
  }
  const literalPaths = [];
  for (const path of spec(row).filter(Boolean)) {
    if (path.startsWith('/[locale]')) {
      revalidatePath(path, 'page');
      continue;
    }
    if (path.startsWith('raw:')) {
      revalidatePath(path.slice(4));
      continue;
    }
    literalPaths.push(path);
    for (const locale of LOCALES) {
      revalidatePath(`/${locale}${path === '/' ? '' : path}`);
    }
  }
  // Fire-and-forget IndexNow ping for the changed URLs (Bing/Copilot instant;
  // Google discovers via sitemap/ISR — see README). Segment invalidations have
  // no concrete URL to ping. Never blocks the mutation.
  void (async () => {
    try {
      await pingIndexNow(await getSettings(), literalPaths);
    } catch {
      /* logged inside pingIndexNow */
    }
  })();
}
