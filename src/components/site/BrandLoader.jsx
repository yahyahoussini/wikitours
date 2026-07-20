import Image from 'next/image';

/**
 * Branded content: the brand logo breathing over a sweeping gold hairline.
 * `variant="babmakka"` on Bab Makka surfaces (offer pages, omra hubs),
 * default Wiki Tours elsewhere. Bare content only — mounted exclusively by
 * <NavigationOverlay>, which owns the entrance timing/positioning. (NOT a
 * loading.js fallback: that file convention creates a Suspense boundary that
 * flushes a 200 status before a deeper notFound() can run — see
 * NavigationOverlay's comment.)
 */
export default function BrandLoader({ variant = 'wikitours' }) {
  const babmakka = variant === 'babmakka';
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="flex flex-col items-center justify-center gap-6 px-6"
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
