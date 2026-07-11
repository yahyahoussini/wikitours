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
      className="sticky top-16 z-30 -mx-6 mt-4 overflow-x-auto px-6 py-2 backdrop-blur md:top-20 [scrollbar-width:none]"
    >
      <div className="flex w-max min-w-full snap-x gap-1 rounded-full border border-white/10 bg-bm-black/85 p-1.5">
        {items.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? 'true' : undefined}
            className={`snap-start whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              active === id
                ? 'bg-bm-gold text-bm-black'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
