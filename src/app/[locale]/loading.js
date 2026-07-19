/**
 * Instant navigation feedback for the public site. This is a Suspense fallback
 * shown ONLY during client-side navigation — Googlebot requests each URL fresh
 * and receives the full ISR HTML, never this skeleton, so it has zero SEO
 * impact. The header/footer from the layout stay put; this fills the page area.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" className="mx-auto max-w-6xl px-6 py-12">
      <div className="animate-pulse">
        <div className="h-3.5 w-28 rounded-full bg-bm-gold/25" />
        <div className="mt-6 h-9 w-3/4 max-w-2xl rounded-lg bg-bm-black/10" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-bm-black/[0.06]" />
        <div className="mt-2 h-4 w-2/3 max-w-md rounded bg-bm-black/[0.06]" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-panel border border-bm-black/10 bg-white">
              <div className="aspect-[16/10] bg-bm-black/[0.06]" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-2/3 rounded bg-bm-black/10" />
                <div className="h-3 w-full rounded bg-bm-black/[0.06]" />
                <div className="h-3 w-1/3 rounded bg-bm-gold/25" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
