import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { supabasePublic } from '@/lib/supabase/public';
import { LOCALES } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = {
  new: 'Nouveau',
  contacted: 'Contacté',
  qualified: 'Qualifié',
  paid_deposit: 'Acompte payé',
  traveled: 'A voyagé',
  lost: 'Perdu',
};

function countByStatus(rows) {
  const counts = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}

export default async function AdminDashboard() {
  const sb = await supabaseServer();
  const anon = supabasePublic();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const since7d = new Date(now.getTime() - 7 * 86400000).toISOString();
  const cutoff48h = new Date(now.getTime() - 48 * 3600000).toISOString();

  let leadsToday = [];
  let leads7d = [];
  let stale = 0;
  let departures = [];
  let drafts = {};
  let settings = null;
  let featuredMissingSeo = 0;
  let publishedCounts = { offers: 0, hotels: 0, occasions: 0, articles: 0, landing_pages: 0 };

  if (sb) {
    const [t, w, s, d, st, f] = await Promise.all([
      sb.from('leads').select('status').gte('created_at', `${today}T00:00:00Z`),
      sb.from('leads').select('status').gte('created_at', since7d),
      sb.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new').lt('created_at', cutoff48h),
      sb.from('offers').select('id, title_fr, slug, date_start, status').gte('date_start', today).order('date_start').limit(5),
      sb.from('settings').select('gbp_review_count, gbp_rating, community_count').eq('id', 1).maybeSingle(),
      sb.from('offers').select('id, seo_title_fr, seo_description_fr').eq('is_featured', true).eq('is_published', true),
    ]);
    leadsToday = t.data ?? [];
    leads7d = w.data ?? [];
    stale = s.count ?? 0;
    departures = d.data ?? [];
    settings = st.data;
    featuredMissingSeo = (f.data ?? []).filter((o) => !o.seo_title_fr || !o.seo_description_fr).length;

    const draftTables = ['offers', 'occasions', 'hotels', 'articles', 'landing_pages', 'destinations'];
    const draftCounts = await Promise.all(
      draftTables.map((table) =>
        sb.from(table).select('id', { count: 'exact', head: true }).eq('is_published', false),
      ),
    );
    drafts = Object.fromEntries(draftTables.map((table, i) => [table, draftCounts[i].count ?? 0]));

    const pubCounts = await Promise.all(
      Object.keys(publishedCounts).map((table) =>
        sb.from(table).select('id', { count: 'exact', head: true }).eq('is_published', true),
      ),
    );
    publishedCounts = Object.fromEntries(
      Object.keys(publishedCounts).map((table, i) => [table, pubCounts[i].count ?? 0]),
    );
  }

  // Site Health — run the past-offers check as ANON: it must be impossible
  // for the public to see a past-dated offer (RLS), so this must be 0.
  let visiblePastOffers = null;
  if (anon) {
    const { count } = await anon
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .lt('date_end', today);
    visiblePastOffers = count ?? 0;
  }

  const sitemapUrls =
    (publishedCounts.offers +
      publishedCounts.hotels +
      publishedCounts.occasions +
      publishedCounts.articles +
      publishedCounts.landing_pages +
      1) * // home
    LOCALES.length;

  const totalDrafts = Object.values(drafts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Leads aujourd’hui" value={leadsToday.length}>
          <StatusLine counts={countByStatus(leadsToday)} />
        </Card>
        <Card title="Leads — 7 jours" value={leads7d.length}>
          <StatusLine counts={countByStatus(leads7d)} />
        </Card>
        <Card
          title="À contacter (> 48 h)"
          value={stale}
          tone={stale > 0 ? 'danger' : 'ok'}
          href="/admin/crm?status=new"
        />
        <Card
          title="Avis Google"
          value={settings?.gbp_review_count ?? '—'}
          subtitle={settings?.gbp_rating ? `${settings.gbp_rating} ★ · communauté ${settings.community_count ?? '—'}` : null}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline lg:col-span-2">
          <h2 className="text-sm font-bold">Prochains départs</h2>
          {departures.length === 0 ? (
            <p className="mt-2 text-sm text-bm-black/50">Aucun départ à venir.</p>
          ) : (
            <ul className="mt-2 divide-y divide-bm-black/5">
              {departures.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/offres/${o.id}`}
                    className="flex items-center justify-between py-2 text-sm hover:text-wiki-blue"
                  >
                    <span className="truncate">{o.title_fr ?? o.slug}</span>
                    <span className="ms-4 shrink-0 tabular-nums text-bm-black/50">
                      {o.date_start?.slice(0, 10)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
          <h2 className="text-sm font-bold">Brouillons ({totalDrafts})</h2>
          <ul className="mt-2 space-y-1 text-sm text-bm-black/70">
            {Object.entries(drafts).map(([table, count]) =>
              count > 0 ? (
                <li key={table} className="flex justify-between">
                  <span>{table}</span>
                  <span className="tabular-nums">{count}</span>
                </li>
              ) : null,
            )}
            {totalDrafts === 0 ? <li className="text-bm-black/40">Aucun brouillon.</li> : null}
          </ul>
        </section>
      </div>

      <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
        <h2 className="text-sm font-bold">Santé du site</h2>
        <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <HealthItem
            ok={visiblePastOffers === 0}
            unknown={visiblePastOffers === null}
            label="Offres passées visibles publiquement"
            value={visiblePastOffers === null ? 'DB non configurée' : visiblePastOffers === 0 ? '0 ✓' : `${visiblePastOffers} !`}
          />
          <HealthItem ok label="URLs sitemap (estimation)" value={sb ? sitemapUrls : '—'} />
          <HealthItem
            ok={false}
            unknown
            label="Dernier ping IndexNow"
            value="jamais (phase SEO à venir)"
          />
          <HealthItem
            ok={featuredMissingSeo === 0}
            label="Offres en avant sans SEO override"
            value={sb ? featuredMissingSeo : '—'}
          />
        </ul>
      </section>
    </div>
  );
}

function Card({ title, value, subtitle, tone, href, children }) {
  const body = (
    <div
      className={`rounded-card border p-5 shadow-hairline transition ${
        tone === 'danger'
          ? 'border-red-300 bg-red-50'
          : 'border-bm-black/10 bg-white'
      } ${href ? 'hover:shadow-lift' : ''}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-bm-black/40">{title}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tone === 'danger' ? 'text-red-700' : ''}`}>
        {value}
      </p>
      {subtitle ? <p className="mt-1 text-xs text-bm-black/50">{subtitle}</p> : null}
      {children}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function StatusLine({ counts }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return (
    <p className="mt-1 text-xs text-bm-black/50">
      {entries.map(([status, count]) => `${STATUS_LABEL[status] ?? status} ${count}`).join(' · ')}
    </p>
  );
}

function HealthItem({ ok, unknown, label, value }) {
  return (
    <li className="flex items-start gap-2">
      <span className={unknown ? 'text-bm-black/30' : ok ? 'text-green-600' : 'text-red-600'}>
        {unknown ? '○' : ok ? '●' : '●'}
      </span>
      <span>
        <span className="block text-bm-black/60">{label}</span>
        <span className="font-semibold">{value}</span>
      </span>
    </li>
  );
}
