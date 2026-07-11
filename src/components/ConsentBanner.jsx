'use client';

import { useEffect, useState } from 'react';

/**
 * Measurement-consent banner. Shows only when the admin enabled gating
 * (settings.consent_banner_enabled → __wtMkt.gate) and no decision cookie
 * exists. Accept loads the pixels immediately; decline keeps them off for a
 * year. First-party analytics and server events are not gated.
 */
export default function ConsentBanner({ labels }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.__wtMkt?.gate && !/(?:^|; )wt_consent=/.test(document.cookie)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function decide(granted) {
    document.cookie = `wt_consent=${granted ? 1 : 0}; path=/; max-age=31536000; SameSite=Lax`;
    if (granted) window.__wtConsentGrant?.();
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={labels.text}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-card border border-bm-black/10 bg-white/95 p-4 shadow-float backdrop-blur"
    >
      <p className="max-w-md text-sm leading-relaxed text-bm-black/80">{labels.text}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => decide(false)}
          className="text-xs font-medium text-bm-black/50 underline-offset-4 transition hover:text-bm-black hover:underline"
        >
          {labels.decline}
        </button>
        <button
          type="button"
          onClick={() => decide(true)}
          className="rounded-ctrl bg-wiki-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
        >
          {labels.accept}
        </button>
      </div>
    </div>
  );
}
