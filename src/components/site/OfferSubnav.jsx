'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky anchor sub-nav for the offer page. Links are plain #anchors in the
 * served HTML; the scrollspy (IntersectionObserver) only moves the gold
 * active indicator. Mobile: horizontal snap chips.
 */
export default function OfferSubnav({ items }) {
  const [active, setActive] = useState(items[0]?.id ?? null);

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        // Topmost visible section wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Sections"
      className="sticky top-16 z-30 mt-4 py-2 backdrop-blur md:top-20"
    >
      {/* Chips share the row equally, so the bar always fits the viewport —
          no horizontal scrolling on any screen. */}
      <div className="flex w-full gap-0.5 rounded-full border border-bm-black/10 bg-white/90 p-1 shadow-hairline sm:gap-1 sm:p-1.5">
        {items.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? 'true' : undefined}
            className={`min-w-0 flex-1 truncate whitespace-nowrap rounded-full px-1.5 py-1.5 text-center text-[11px] font-semibold transition sm:px-4 sm:text-xs ${
              active === id
                ? 'bg-bm-gold text-bm-black'
                : 'text-bm-black/60 hover:bg-bm-black/5 hover:text-bm-black'
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
