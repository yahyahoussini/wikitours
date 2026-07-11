import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Daily keep-alive (vercel.json cron): a trivial DB read so the free-tier
 * Supabase project never pauses for inactivity. Cron-only — Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}`; anyone else gets 401.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'unconfigured' }, { status: 500 });

  const { error } = await admin.from('settings').select('id').limit(1).maybeSingle();
  return NextResponse.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 500 : 200 });
}
