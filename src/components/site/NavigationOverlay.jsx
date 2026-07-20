'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import BrandLoader from '@/components/site/BrandLoader';

// Bab Makka surfaces get the Bab Makka logo; everything else, Wiki Tours.
const BABMAKKA_HREF = /\/(bab-makka|omra\/|omra-|hotel\/|hotels-omra)/;

/**
 * Branded route-transition overlay — a client-only replacement for
 * file-based `loading.js`. loading.js creates an ambient Suspense boundary
 * that Next.js flushes as a 200 response BEFORE a deeper notFound() can set
 * the real status: every route that had one silently soft-404'd (200 + 404
 * UI) for unknown slugs, invisible to Google/Bing/AI crawlers and to plain
 * curl. This component reacts to link clicks instead of Suspense, so the
 * server-rendered status (404 or 200) is decided with zero interference —
 * and it fires faster too (on click, not once the fallback mounts).
 * Mounted once in the root layout.
 */
export default function NavigationOverlay() {
  const pathname = usePathname();
  const [target, setTarget] = useState(null); // href of the in-flight navigation, or null

  // Route committed (pathname changed, or a same-path re-navigation settled) → hide.
  useEffect(() => {
    setTarget(null);
  }, [pathname]);

  useEffect(() => {
    function onClick(e) {
      // NOT e.defaultPrevented: next/link's own handler (attached closer to
      // the anchor) already calls preventDefault() before this document-level
      // listener runs, since it fires during the same bubble phase — checking
      // it here made this handler a no-op for every real Link click.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a');
      if (!a || !a.href) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      let url;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return; // in-page anchor
      if (url.pathname === window.location.pathname) return;
      setTarget(url.pathname);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!target) return null;

  return (
    <div
      aria-hidden="true"
      className="brand-loader-overlay fixed inset-0 z-[70] flex items-center justify-center bg-wiki-white"
    >
      <BrandLoader variant={BABMAKKA_HREF.test(target) ? 'babmakka' : 'wikitours'} />
    </div>
  );
}
