import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Nightly (vercel.json cron, 03:30 UTC): materialize yesterday into
 * daily_rollups, then apply retention (events 90 d, sessions/visitors 13 mo).
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically.
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

  if (rollupError || cleanupError) {
    return NextResponse.json({ ok: false, day: yesterday }, { status: 500 });
  }
  return NextResponse.json({ ok: true, day: yesterday });
}
