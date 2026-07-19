import Link from 'next/link';

/**
 * Visible breadcrumb trail. Each page emits its own BreadcrumbList JSON-LD;
 * this is the on-page counterpart Google expects to corroborate it (markup with
 * no visible equivalent is a common reason breadcrumb rich results are dropped).
 * `items`: [{ label, href }] — the last item is the current page and never links.
 */
export default function Breadcrumbs({ items, className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-bm-black/50">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="transition hover:text-bm-black">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-bm-black/70' : ''}>
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
  );
}
