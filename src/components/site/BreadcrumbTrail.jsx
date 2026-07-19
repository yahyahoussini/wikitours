import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import JsonLd from '@/components/site/JsonLd';

/**
 * Visible breadcrumb trail + its BreadcrumbList JSON-LD in one element, so a
 * page adds breadcrumbs with a single line and the markup always has a visible
 * counterpart (Google drops breadcrumb rich results otherwise).
 * `items`: [{ label, href }] — href is the locale-relative path (`/fr/...`);
 * the last item is the current page and never links.
 */
export default function BreadcrumbTrail({ items, className = '', dark = false }) {
  const muted = dark ? 'text-white/50' : 'text-bm-black/50';
  const current = dark ? 'text-white/80' : 'text-bm-black/70';
  const hover = dark ? 'hover:text-white' : 'hover:text-bm-black';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.href && i < items.length - 1
        ? { item: it.href.startsWith('http') ? it.href : `${SITE_URL}${it.href}` }
        : {}),
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className={`flex flex-wrap items-center gap-1.5 text-xs ${muted}`}>
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <li key={item.label} className="flex items-center gap-1.5">
                {item.href && !last ? (
                  <Link href={item.href} className={`transition ${hover}`}>
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={last ? current : ''}>
                    {item.label}
                  </span>
                )}
                {last ? null : (
                  <span aria-hidden="true" className="text-bm-gold/60">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
