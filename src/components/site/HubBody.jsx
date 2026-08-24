/**
 * Rich body sections for commercial hubs (omra-pas-cher, hotels-omra…).
 * These pages previously rendered only a heading + one-line lede + listings —
 * far too thin to rank on a head commercial query. Content comes from the
 * dictionaries (fr/ar/en parity) as an array of { h2, p[] }, so each section
 * is a real crawlable heading with substantive copy under it, and the first
 * paragraph of the first section carries data-answer for speakable/AEO.
 */
export default function HubBody({ sections = [], className = '' }) {
  if (!sections.length) return null;
  return (
    <div className={`mx-auto max-w-3xl px-6 pb-4 ${className}`}>
      {sections.map((s, i) => (
        <section key={s.h2} className="mt-10 first:mt-0">
          <h2 className="text-xl font-bold text-bm-black sm:text-2xl">{s.h2}</h2>
          {(s.p ?? []).map((para, j) => (
            <p
              key={para.slice(0, 24)}
              {...(i === 0 && j === 0 ? { 'data-answer': '' } : {})}
              className="mt-3 leading-relaxed text-bm-black/70"
            >
              {para}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
