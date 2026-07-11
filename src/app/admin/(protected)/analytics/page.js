import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { getAnalytics } from '@/lib/admin/analytics';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('fr-MA');
const pct = (v) => `${(v * 100).toFixed(1)} %`;

function isoDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/** Inline SVG bar chart — pageviews per day, no library. */
function DayBars({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.pageviews), 1);
  const barWidth = Math.max(4, Math.min(24, Math.floor(720 / data.length) - 2));
  const width = data.length * (barWidth + 2);
  const height = 120;
  return (
    <svg viewBox={`0 0 ${width} ${height + 16}`} className="h-36 w-full" role="img" aria-label="Trafic par jour">
      {data.map((d, i) => {
        const h = Math.max(1, Math.round((d.pageviews / max) * height));
        return (
          <g key={d.day}>
            <rect
              x={i * (barWidth + 2)}
              y={height - h}
              width={barWidth}
              height={h}
              rx="2"
              fill="#1398c9"
              opacity={d.pageviews === 0 ? 0.15 : 0.9}
            >
              <title>{`${d.day} — ${d.pageviews} pages vues`}</title>
            </rect>
            {data.length <= 14 || i % Math.ceil(data.length / 10) === 0 ? (
              <text x={i * (barWidth + 2) + barWidth / 2} y={height + 12} textAnchor="middle" fontSize="8" fill="#0d0d0d" opacity="0.4">
                {d.day.slice(8)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Funnel row: offer_view → form_start → form_submit relative bars. */
function FunnelRow({ item }) {
  const max = Math.max(item.offer_view, 1);
  const steps = [
    ['Vues', item.offer_view, '#1398c9'],
    ['Form. commencé', item.form_start, '#d4af37'],
    ['Demandes', item.form_submit, '#16a34a'],
  ];
  return (
    <div className="py-2">
      <p className="truncate text-sm font-medium">{item.title}</p>
      <div className="mt-1 flex flex-col gap-0.5">
        {steps.map(([label, value, color]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 text-bm-black/40">{label}</span>
            <div className="h-3 flex-1 rounded-sm bg-bm-black/5">
              <div
                className="h-full rounded-sm"
                style={{ width: `${Math.max(1, (value / max) * 100)}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-10 text-end tabular-nums">{nf.format(value)}</span>
          </div>
        ))}
      </div>
      {item.offer_view > 0 ? (
        <p className="mt-1 text-xs text-bm-black/40">
          Perte vues → formulaire : {pct(1 - item.form_start / Math.max(item.offer_view, 1))} · formulaire → envoi :{' '}
          {item.form_start > 0 ? pct(1 - item.form_submit / item.form_start) : '—'}
        </p>
      ) : null}
    </div>
  );
}

function DataTable({ title, headers, rows }) {
  return (
    <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
      <h2 className="text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-bm-black/40">Aucune donnée.</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-bm-black/40">
              {headers.map((h, i) => (
                <th key={h} className={`py-1 font-semibold ${i === 0 ? 'text-start' : 'text-end'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-t border-bm-black/5">
                {row.map((cell, ci) => (
                  <td key={ci} className={`max-w-56 truncate py-1.5 ${ci === 0 ? '' : 'text-end tabular-nums'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function AdminAnalyticsPage({ searchParams }) {
  const params = await searchParams;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? '') ? params.to : isoDaysAgo(0);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? '') ? params.from : isoDaysAgo(29);

  const sb = await supabaseServer();
  const data = sb
    ? await getAnalytics(sb, from, to)
    : { cards: { visitors: 0, sessions: 0, pageviews: 0, leads: 0, leadRate: 0, whatsappClicks: 0 }, trafficByDay: [], topSources: [], cities: [], topPaths: [], entryPages: [], funnel: [], deviceSplit: [] };

  const presets = [
    ['7 jours', isoDaysAgo(6)],
    ['30 jours', isoDaysAgo(29)],
    ['90 jours', isoDaysAgo(89)],
  ];

  const cards = [
    ['Visiteurs', nf.format(data.cards.visitors)],
    ['Sessions', nf.format(data.cards.sessions)],
    ['Pages vues', nf.format(data.cards.pageviews)],
    ['Leads', nf.format(data.cards.leads)],
    ['Taux de lead', pct(data.cards.leadRate)],
    ['Clics WhatsApp', nf.format(data.cards.whatsappClicks)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="mt-1 max-w-2xl text-xs text-bm-black/40">
          Données first-party — la vérité business. GA4 reste branché pour les plateformes
          publicitaires (Google Ads / Meta), mais les décisions se prennent ici.
        </p>
      </div>

      <form action="/admin/analytics" method="get" className="flex flex-wrap items-center gap-2 text-sm">
        {presets.map(([label, f]) => (
          <Link
            key={label}
            href={`/admin/analytics?from=${f}&to=${isoDaysAgo(0)}`}
            className={`rounded-ctrl px-3 py-1.5 transition ${from === f ? 'bg-wiki-blue font-semibold text-white' : 'bg-bm-black/5 hover:bg-bm-black/10'}`}
          >
            {label}
          </Link>
        ))}
        <input type="date" name="from" defaultValue={from} className="rounded-ctrl border border-bm-black/15 bg-white px-2.5 py-1.5 shadow-hairline outline-none focus:border-wiki-blue" />
        <span className="text-bm-black/40">→</span>
        <input type="date" name="to" defaultValue={to} className="rounded-ctrl border border-bm-black/15 bg-white px-2.5 py-1.5 shadow-hairline outline-none focus:border-wiki-blue" />
        <button type="submit" className="rounded-ctrl bg-bm-black px-4 py-1.5 font-semibold text-white transition hover:bg-bm-black-soft">
          Appliquer
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-card border border-bm-black/10 bg-white p-4 shadow-hairline">
            <p className="text-xs font-semibold uppercase tracking-wide text-bm-black/40">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
        <h2 className="text-sm font-bold">Trafic par jour (pages vues)</h2>
        <div className="mt-3">
          <DayBars data={data.trafficByDay} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          title="Top sources — d'où vient la masse"
          headers={['Source / medium', 'Sessions', 'Leads', 'Taux']}
          rows={data.topSources.map((s) => [s.source, nf.format(s.sessions), nf.format(s.leads), pct(s.rate)])}
        />
        <DataTable
          title="Régions & villes — Casablanca vs le reste"
          headers={['Ville', 'Sessions', 'Leads']}
          rows={data.cities.map((c) => [c.city, nf.format(c.sessions), nf.format(c.leads)])}
        />
        <DataTable
          title="Pages les plus vues"
          headers={['Page', 'Vues']}
          rows={data.topPaths.map((p) => [p.path, nf.format(p.views)])}
        />
        <DataTable
          title="Pages d'entrée"
          headers={['Page', 'Sessions']}
          rows={data.entryPages.map((p) => [p.path, nf.format(p.count)])}
        />
      </div>

      <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
        <h2 className="text-sm font-bold">Funnel par offre — où les gens décrochent</h2>
        {data.funnel.length === 0 ? (
          <p className="mt-2 text-sm text-bm-black/40">Aucune donnée de funnel sur la période.</p>
        ) : (
          <div className="mt-2 divide-y divide-bm-black/5">
            {data.funnel.map((item) => (
              <FunnelRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
        <h2 className="text-sm font-bold">Appareils</h2>
        <div className="mt-3 flex max-w-md flex-col gap-1.5">
          {data.deviceSplit.length === 0 ? (
            <p className="text-sm text-bm-black/40">Aucune donnée.</p>
          ) : (
            data.deviceSplit.map((d) => {
              const total = data.cards.sessions || 1;
              return (
                <div key={d.device} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-bm-black/60">{d.device}</span>
                  <div className="h-3 flex-1 rounded-sm bg-bm-black/5">
                    <div className="h-full rounded-sm bg-wiki-blue" style={{ width: `${(d.count / total) * 100}%` }} />
                  </div>
                  <span className="w-14 text-end tabular-nums">{pct(d.count / total)}</span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
