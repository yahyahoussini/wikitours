import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data/settings';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { criticalSettingsHealth } from '@/lib/seo/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health/seo — internal check for uptime monitors / CI. Returns the
 * names of missing critical settings (never any values, so no secrets leak),
 * plus bot-logger liveness (counts only). 200 when healthy, 503 when a
 * critical setting is blank. noindex.
 */
export async function GET() {
  const health = criticalSettingsHealth(await getSettings());

  // Bot logger (migration 009): ok = table reachable; hits7d = raw rows still
  // un-rolled-up (0 is normal early on — the audit only warns on it).
  let botLogger = { ok: false, hits7d: null };
  try {
    const admin = supabaseAdmin();
    if (admin) {
      const { count, error } = await admin
        .from('bot_hits')
        .select('*', { count: 'exact', head: true })
        .gte('ts', new Date(Date.now() - 7 * 86400000).toISOString());
      botLogger = { ok: !error, hits7d: error ? null : (count ?? 0) };
    }
  } catch {
    botLogger = { ok: false, hits7d: null };
  }

  return NextResponse.json(
    { ...health, bot_logger: botLogger },
    {
      status: health.ok ? 200 : 503,
      headers: { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' },
    },
  );
}
