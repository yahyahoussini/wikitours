/**
 * Prose-shaped navigation skeleton for the glossary —
 * client-side navigations only; crawlers always get the full ISR HTML. The
 * generic [locale] skeleton is card-grid shaped, which shifts hard when a
 * text page lands; this one mirrors the guide layout instead.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" className="mx-auto max-w-3xl px-6 py-12">
      <div className="animate-pulse">
        <div className="h-3.5 w-28 rounded-full bg-bm-gold/25" />
        <div className="mt-6 h-9 w-3/4 rounded-lg bg-bm-black/10" />
        <div className="mt-4 h-4 w-full rounded bg-bm-black/[0.06]" />
        <div className="mt-2 h-4 w-2/3 rounded bg-bm-black/[0.06]" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`h-4 rounded bg-bm-black/[0.06] ${i % 3 === 2 ? 'w-4/5' : 'w-full'}`} />
          ))}
        </div>
        <div className="mt-10 h-6 w-1/2 rounded bg-bm-black/10" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-4 rounded bg-bm-black/[0.06] ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
