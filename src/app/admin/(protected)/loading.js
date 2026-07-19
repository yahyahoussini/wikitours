/**
 * Instant feedback for admin navigation. The sidebar/nav from the protected
 * layout stays; this fills the content area with a light skeleton.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" className="animate-pulse">
      <div className="h-7 w-56 rounded bg-bm-black/10" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-card border border-bm-black/10 bg-bm-black/[0.04]" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
