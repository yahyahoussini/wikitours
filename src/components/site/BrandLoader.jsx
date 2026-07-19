import Image from 'next/image';

/**
 * Branded route-transition screen (the loading.js fallback): the brand logo
 * breathing over a sweeping gold hairline. `variant="babmakka"` on Bab Makka
 * surfaces (offer pages, omra hubs), default Wiki Tours elsewhere. Client-side
 * navigations only — first paint always ships real server HTML (SEO/LCP), and
 * the CSS delays the fade-in 150ms so cached navigations never flash it.
 */
export default function BrandLoader({ variant = 'wikitours' }) {
  const babmakka = variant === 'babmakka';
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="brand-loader flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6"
    >
      <Image
        src={babmakka ? '/brand/bab-makka-logo.png' : '/brand/wikitours-logo.png'}
        alt=""
        width={babmakka ? 5888 : 5780}
        height={babmakka ? 3640 : 934}
        priority
        className={`brand-loader-logo w-auto ${babmakka ? 'h-20' : 'h-14'}`}
      />
      <span aria-hidden="true" className="brand-loader-track h-0.5 w-40 rounded-full" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
