/**
 * Analytics assembly: daily_rollups for whole days, live events only for
 * today's tail (free-tier-safe), sessions/leads tables for the rest.
 */

function groupCount(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export async function getAnalytics(sb, from, to) {
  const today = new Date().toISOString().slice(0, 10);
  const includesToday = to >= today;
  const rollupEnd = includesToday ? today : to; // rollups exist up to yesterday

  const [rollupsRes, sessionsRes, leadsRes, funnelRes, tailRes] = await Promise.all([
    sb.from('daily_rollups').select('*').gte('date', from).lte('date', rollupEnd),
    sb
      .from('sessions')
      .select('id, visitor_id, utm_source, utm_medium, referrer, city, region, device, entry_path, started_at')
      .gte('started_at', `${from}T00:00:00Z`)
      .lte('started_at', `${to}T23:59:59Z`)
      .limit(20000),
    sb
      .from('leads')
      .select('id, created_at, utm_source, utm_medium, city, geo_city, offer_id, offer_title, status')
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`)
      .limit(10000),
    sb
      .from('events')
      .select('type, offer_id')
      .in('type', ['offer_view', 'form_start', 'form_submit'])
      .not('offer_id', 'is', null)
      .gte('ts', `${from}T00:00:00Z`)
      .lte('ts', `${to}T23:59:59Z`)
      .limit(50000),
    includesToday
      ? sb
          .from('events')
          .select('type, path')
          .gte('ts', `${today}T00:00:00Z`)
          .limit(20000)
      : Promise.resolve({ data: [] }),
  ]);

  const rollups = (rollupsRes.data ?? []).filter((r) => r.date !== today);
  const sessions = sessionsRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const funnelEvents = funnelRes.data ?? [];
  const tail = tailRes.data ?? [];

  // ---- cards --------------------------------------------------------------
  const tailByType = groupCount(tail, (e) => e.type);
  const pageviews =
    rollups.reduce((a, r) => a + r.pageviews, 0) + (tailByType.get('pageview') ?? 0);
  const whatsappClicks =
    rollups.reduce((a, r) => a + r.whatsapp_clicks, 0) + (tailByType.get('whatsapp_click') ?? 0);
  const visitors = new Set(sessions.map((s) => s.visitor_id).filter(Boolean)).size;

  const cards = {
    visitors,
    sessions: sessions.length,
    pageviews,
    leads: leads.length,
    leadRate: sessions.length ? leads.length / sessions.length : 0,
    whatsappClicks,
  };

  // ---- traffic by day -----------------------------------------------------
  const byDay = new Map();
  for (const r of rollups) byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.pageviews);
  if (includesToday) byDay.set(today, (byDay.get(today) ?? 0) + (tailByType.get('pageview') ?? 0));
  const trafficByDay = [];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    trafficByDay.push({ day, pageviews: byDay.get(day) ?? 0 });
  }

  // ---- top sources (where the mass comes from) -----------------------------
  const sourceKey = (s, m) => `${s || 'direct'}${m ? ` / ${m}` : ''}`;
  const sessionsBySource = groupCount(sessions, (s) => sourceKey(s.utm_source, s.utm_medium));
  const leadsBySource = groupCount(leads, (l) => sourceKey(l.utm_source, l.utm_medium));
  const topSources = [...sessionsBySource.entries()]
    .map(([source, count]) => ({
      source,
      sessions: count,
      leads: leadsBySource.get(source) ?? 0,
      rate: count ? (leadsBySource.get(source) ?? 0) / count : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 12);

  // ---- regions & cities ----------------------------------------------------
  const sessionsByCity = groupCount(sessions, (s) => s.city || s.region);
  const leadsByCity = groupCount(leads, (l) => l.geo_city || l.city);
  const cities = [...sessionsByCity.entries()]
    .map(([city, count]) => ({ city, sessions: count, leads: leadsByCity.get(city) ?? 0 }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 12);

  // ---- top paths -----------------------------------------------------------
  const pathViews = new Map();
  for (const r of rollups) pathViews.set(r.path, (pathViews.get(r.path) ?? 0) + r.pageviews);
  for (const e of tail) if (e.type === 'pageview' && e.path) pathViews.set(e.path, (pathViews.get(e.path) ?? 0) + 1);
  const topPaths = [...pathViews.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const entryPages = [...groupCount(sessions, (s) => s.entry_path).entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ---- funnel per offer (the weakness finder) -------------------------------
  const funnelByOffer = new Map();
  for (const e of funnelEvents) {
    const entry = funnelByOffer.get(e.offer_id) ?? { offer_view: 0, form_start: 0, form_submit: 0 };
    entry[e.type] += 1;
    funnelByOffer.set(e.offer_id, entry);
  }
  const offerIds = [...funnelByOffer.keys()];
  let titles = new Map();
  if (offerIds.length) {
    const { data: offers } = await sb.from('offers').select('id, title_fr').in('id', offerIds);
    titles = new Map((offers ?? []).map((o) => [o.id, o.title_fr]));
  }
  const funnel = offerIds
    .map((id) => ({ id, title: titles.get(id) ?? id, ...funnelByOffer.get(id) }))
    .sort((a, b) => b.offer_view - a.offer_view)
    .slice(0, 10);

  // ---- device split ---------------------------------------------------------
  const deviceSplit = [...groupCount(sessions, (s) => s.device).entries()]
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  return { cards, trafficByDay, topSources, cities, topPaths, entryPages, funnel, deviceSplit };
}
