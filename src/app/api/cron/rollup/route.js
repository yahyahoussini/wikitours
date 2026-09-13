import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Nightly (vercel.json cron, 03:30 UTC): materialize yesterday into
 * daily_rollups, then apply retention (events 90 d, sessions/visitors 13 mo).
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically.
 *
 * Departure expiry is NOT done here any more. A departure's state (live →
 * archived → retired, then the 301 to its month lander) derives from its
 * return date at request time — src/lib/offers.js offerLifecycle(), applied by
 * the middleware and the page — so nothing lags a nightly job or a flag. The
 * `redirects` table stays what it is: admin-authored content moves.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'unconfigured' }, { status: 500 });

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { error: rollupError } = await admin.rpc('rollup_daily', { day: yesterday });
  const { error: cleanupError } = await admin.rpc('cleanup_analytics');
  // Bot logger cap (migration 009): fold raw hits >7 d into weekly counts.
  const { error: botError } = await admin.rpc('rollup_bot_hits');

  if (rollupError || cleanupError || botError) {
    return NextResponse.json({ ok: false, day: yesterday }, { status: 500 });
  }
  return NextResponse.json({ ok: true, day: yesterday });
}
