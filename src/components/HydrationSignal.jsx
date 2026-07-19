'use client';

import { useEffect } from 'react';

/**
 * Tells the vanilla motion script (public/wt-motion.js) that React hydration
 * has committed. useEffect only runs after hydration, so mutations gated on
 * this call can never race the hydration diff (a bare requestAnimationFrame
 * fires after first PAINT, which React 19 hydration routinely outlives — that
 * race produced is-in/transition-delay hydration mismatches).
 * dataset.hydrated covers the reverse order: the deferred script executing
 * after this effect already ran.
 */
export default function HydrationSignal() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = '1';
    window.__wtMotionStart?.();
  }, []);
  return null;
}
