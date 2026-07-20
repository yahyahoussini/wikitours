/**
 * Field Core Web Vitals (RUM) from the `events` table. wt.js emits one
 * web_vital event per metric on page-hide, encoded as meta.label
 * "METRIC:value" (e.g. "LCP:2400", "CLS:0.05", "TTFB:180"). This computes the
 * p75 — the percentile Google ranks with — per metric, split by device, over
 * a window, and grades each against the Core-Web-Vitals thresholds.
 */

// [good ≤, needs-improvement ≤] — above the second value is "poor". CLS is
// unitless; the rest are milliseconds. Matches web.dev's published thresholds.
export const CWV_THRESHOLDS = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
};

const METRIC_ORDER = ['LCP', 'INP', 'CLS', 'TTFB'];

function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  // Nearest-rank (matches CrUX/Lighthouse reporting closely enough for RUM).
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

export function gradeVital(metric, value) {
  const t = CWV_THRESHOLDS[metric];
  if (!t || value == null) return 'unknown';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}

/**
 * @returns {{ window, total, metrics: Array<{ metric, unit, all, mobile,
 *   desktop, sampleAll }> }} p75 per metric overall + per device.
 */
export async function getWebVitals(sb, from, to) {
  const { data: events } = await sb
    .from('events')
    .select('meta, path, visitor_id, ts')
    .eq('type', 'web_vital')
    .gte('ts', `${from}T00:00:00Z`)
    .lte('ts', `${to}T23:59:59Z`)
    .limit(100000);

  const rows = events ?? [];

  // Device is on the visitor, not the event — resolve it in one batched read.
  const visitorIds = [...new Set(rows.map((r) => r.visitor_id).filter(Boolean))];
  const deviceOf = new Map();
  if (visitorIds.length) {
    // chunk to stay under URL length limits on the .in() filter
    for (let i = 0; i < visitorIds.length; i += 500) {
      const chunk = visitorIds.slice(i, i + 500);
      const { data: visitors } = await sb.from('visitors').select('id, device').in('id', chunk);
      for (const v of visitors ?? []) deviceOf.set(v.id, v.device);
    }
  }

  // Bucket parsed values per metric per device.
  const buckets = {}; // metric -> { all:[], mobile:[], desktop:[] }
  for (const metric of METRIC_ORDER) buckets[metric] = { all: [], mobile: [], desktop: [] };

  for (const row of rows) {
    const label = row.meta?.label;
    if (typeof label !== 'string') continue;
    const [metric, raw] = label.split(':');
    if (!buckets[metric]) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    buckets[metric].all.push(value);
    const device = deviceOf.get(row.visitor_id);
    if (device === 'mobile') buckets[metric].mobile.push(value);
    else if (device === 'desktop') buckets[metric].desktop.push(value);
  }

  const metrics = METRIC_ORDER.map((metric) => {
    const b = buckets[metric];
    const sort = (arr) => [...arr].sort((a, z) => a - z);
    const p75 = (arr) => percentile(sort(arr), 75);
    const allP = p75(b.all);
    return {
      metric,
      unit: metric === 'CLS' ? '' : 'ms',
      all: allP,
      allGrade: gradeVital(metric, allP),
      mobile: p75(b.mobile),
      mobileGrade: gradeVital(metric, p75(b.mobile)),
      desktop: p75(b.desktop),
      desktopGrade: gradeVital(metric, p75(b.desktop)),
      sampleAll: b.all.length,
    };
  });

  return { window: { from, to }, total: rows.length, metrics };
}
