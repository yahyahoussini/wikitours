import { revalidatePath } from 'next/cache';
import { LOCALES } from '@/lib/i18n';
import { getSettings } from '@/lib/data/settings';
import { pingIndexNow } from '@/lib/server/indexnow';

/**
 * Central on-demand revalidation: table → locale-relative public paths,
 * expanded to every locale. Called after EVERY admin mutation so content is
 * live within one request instead of waiting for the 60s ISR window.
 * 'layout' revalidates the whole tree (site-wide surfaces: header menus,
 * announcement bar, settings).
 */
const TABLE_PATHS = {
  offers: (row) => ['/', '/bab-makkah', '/agence-omra-casablanca', row?.slug ? `/omra/${row.slug}` : null],
  occasions: () => ['/', '/bab-makkah'],
  hotels: (row) => ['/', row?.slug ? `/hotel/${row.slug}` : null],
  destinations: () => ['/'],
  testimonials: () => ['/', '/avis', '/agence-omra-casablanca'],
  faqs: () => ['/', '/agrement'],
  timeline_items: () => ['/', '/a-propos'],
  team_members: () => ['/', '/a-propos'],
  articles: (row) => ['/blog', row?.slug ? `/blog/${row.slug}` : null],
  landing_pages: (row) => [row?.slug ? `/lp/${row.slug}` : null],
  services: () => ['/voyages'],
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
  const paths = spec(row).filter(Boolean);
  for (const path of paths) {
    for (const locale of LOCALES) {
      revalidatePath(`/${locale}${path === '/' ? '' : path}`);
    }
  }
  // Fire-and-forget IndexNow ping for the changed URLs (Bing/Copilot instant;
  // Google discovers via sitemap/ISR — see README). Never blocks the mutation.
  void (async () => {
    try {
      await pingIndexNow(await getSettings(), paths);
    } catch {
      /* logged inside pingIndexNow */
    }
  })();
}
