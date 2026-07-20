'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const LOCALE_LABEL = { fr: 'FR', ar: 'ع', en: 'EN' };

/**
 * Floating capsule header: inset 12px, radius 999, light gradient surface,
 * hairline + lift, compresses on scroll. Nav items come from the server
 * (menus table or code fallback); `dropdown` items expand on hover/focus.
 */
export default function HeaderClient({ locale, items, reserveLabel, reserveHref, a11y }) {
  const [compressed, setCompressed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const pathname = usePathname() ?? `/${locale}`;
  const dropRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setCompressed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setSheetOpen(false);
    setDropOpen(false);
  }, [pathname]);

  // Open mobile sheet: tap/click anywhere outside the header (or Escape) closes it.
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setSheetOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  // Swap the locale prefix, keep the rest of the path.
  const pathRest = pathname.replace(/^\/(fr|ar|en)(?=\/|$)/, '') || '';

  return (
    <header ref={rootRef} className="fixed inset-x-3 top-3 z-50">
      <div
        className={`mx-auto flex max-w-5xl items-center gap-2 rounded-full border border-bm-black/10 bg-gradient-to-b from-white/95 to-wiki-white/90 shadow-lift backdrop-blur transition-all duration-300 ${
          compressed ? 'px-4 py-1.5' : 'px-5 py-2.5'
        }`}
      >
        <Link href={`/${locale}`} className="me-1 shrink-0">
          <Image
            src="/brand/wikitours-logo.png"
            alt="Wiki Tours"
            width={5780}
            height={934}
            priority
            sizes="170px"
            style={{ aspectRatio: '5780 / 934' }}
            className={`w-auto transition-all duration-300 ${compressed ? 'h-5' : 'h-6'}`}
          />
        </Link>

        <nav className="hidden min-w-0 items-center gap-0.5 text-sm lg:flex">
          {items.map((item) =>
            item.children ? (
              <div
                key={item.href}
                ref={dropRef}
                className="relative"
                onMouseEnter={() => setDropOpen(true)}
                onMouseLeave={() => setDropOpen(false)}
              >
                <Link
                  href={item.href}
                  aria-expanded={dropOpen}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 font-medium text-bm-black/75 transition hover:bg-bm-black/5 hover:text-bm-black"
                  onFocus={() => setDropOpen(true)}
                >
                  {item.label}
                  <span aria-hidden="true" className="text-[9px] text-bm-gold">▾</span>
                </Link>
                {dropOpen ? (
                  <div className="absolute start-0 top-full pt-2">
                    <div className="min-w-52 rounded-card border border-bm-black/10 bg-white p-1.5 shadow-float">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block rounded-ctrl px-3 py-2 text-sm text-bm-black/75 transition hover:bg-bm-gold/10 hover:text-bm-black"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 font-medium text-bm-black/75 transition hover:bg-bm-black/5 hover:text-bm-black"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {/* Segmented locale control */}
          <nav
            aria-label="Languages"
            className="hidden items-center rounded-full border border-bm-black/10 bg-white/70 p-0.5 text-[11px] font-bold sm:flex"
          >
            {['fr', 'ar', 'en'].map((l) => (
              <Link
                key={l}
                href={`/${l}${pathRest}`}
                hrefLang={l}
                aria-current={l === locale ? 'true' : undefined}
                className={`rounded-full px-2.5 py-1 transition ${
                  l === locale ? 'bg-bm-black text-white' : 'text-bm-black/50 hover:text-bm-black'
                }`}
              >
                {LOCALE_LABEL[l]}
              </Link>
            ))}
          </nav>

          <Link
            href={reserveHref}
            className="hidden rounded-full bg-bm-black px-5 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-bm-black-soft sm:block"
          >
            {reserveLabel}
          </Link>

          <button
            type="button"
            aria-label={sheetOpen ? a11y.closeMenu : a11y.openMenu}
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen((v) => !v)}
            className="flex size-9 flex-col items-center justify-center gap-1 rounded-full border border-bm-black/10 lg:hidden"
          >
            <span className={`h-0.5 w-4 bg-bm-black transition ${sheetOpen ? 'translate-y-1.5 rotate-45' : ''}`} />
            <span className={`h-0.5 w-4 bg-bm-black transition ${sheetOpen ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 w-4 bg-bm-black transition ${sheetOpen ? '-translate-y-1.5 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {sheetOpen ? (
        <div className="mx-auto mt-2 max-w-5xl rounded-panel border border-bm-black/10 bg-white p-4 shadow-float lg:hidden">
          <nav className="flex flex-col gap-1 text-base">
            {items.map((item) => (
              <div key={item.href}>
                <Link href={item.href} className="block rounded-ctrl px-3 py-2.5 font-medium hover:bg-bm-black/5">
                  {item.label}
                </Link>
                {item.children ? (
                  <div className="ms-3 border-s border-bm-gold/40 ps-3">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} className="block rounded-ctrl px-3 py-2 text-sm text-bm-black/70 hover:bg-bm-black/5">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-bm-black/10 pt-3">
            <div className="flex items-center gap-1 text-xs font-bold">
              {['fr', 'ar', 'en'].map((l) => (
                <Link
                  key={l}
                  href={`/${l}${pathRest}`}
                  className={`rounded-full px-3 py-1.5 ${l === locale ? 'bg-bm-black text-white' : 'text-bm-black/50'}`}
                >
                  {LOCALE_LABEL[l]}
                </Link>
              ))}
            </div>
            <Link href={reserveHref} className="rounded-full bg-bm-black px-5 py-2 text-sm font-semibold text-white">
              {reserveLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
