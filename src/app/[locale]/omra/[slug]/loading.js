/**
 * Light skeleton for the offer detail page (matches its light surface), so
 * navigating to an offer shows an instant branded placeholder instead of a
 * frozen previous page. Client-navigation only — never served to crawlers.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" className="bg-wiki-white text-bm-black">
      <div className="mx-auto max-w-6xl animate-pulse px-6 pb-28 pt-6">
        <div className="h-5 w-40 rounded bg-bm-black/10" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="h-10 w-3/4 rounded-lg bg-bm-black/10" />
            <div className="mt-4 h-4 w-full rounded bg-bm-black/[0.06]" />
            <div className="mt-2 h-4 w-2/3 rounded bg-bm-black/[0.06]" />
            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-24 rounded-full bg-bm-black/[0.06]" />
              ))}
            </div>
            <div className="mt-6 aspect-[16/9] w-full rounded-panel bg-bm-black/[0.05]" />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-72 rounded-panel bg-bm-black/[0.05]" />
              ))}
            </div>
          </div>
          <div className="hidden h-[28rem] rounded-panel bg-bm-black/[0.05] lg:block" />
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
