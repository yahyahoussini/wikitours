import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { LOCALES } from '@/lib/i18n';
import { MONTH_SLUGS } from '@/lib/months';

export const runtime = 'nodejs';

/**
 * Offers departed >60 days ago → 301 their URL to the month hub (per locale),
 * so an expired offer is redirected, never deleted or 404'd (LAWS). Idempotent
 * upsert on the unique from_path. Uses the service client (reads past the RLS
 * grace window). Never throws — expiry must not break the nightly rollup.
 */
async function expireOffers(admin) {
  try {
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const { data: expired } = await admin
      .from('offers')
      .select('slug, date_start')
      .lt('date_end', cutoff);
    const rows = [];
    for (const o of expired ?? []) {
      if (!o.slug || !o.date_start) continue;
      const to = `/omra-${MONTH_SLUGS[new Date(o.date_start).getUTCMonth()]}`;
      for (const locale of LOCALES) {
        rows.push({
          from_path: `/${locale}/omra/${o.slug}`,
          to_path: `/${locale}${to}`,
          permanent: true,
          is_active: true,
        });
      }
    }
    if (rows.length) await admin.from('redirects').upsert(rows, { onConflict: 'from_path' });
    return rows.length;
  } catch {
    return 0;
  }
}

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
  // Bot logger cap (migration 009): fold raw hits >7 d into weekly counts.
  const { error: botError } = await admin.rpc('rollup_bot_hits');
  const expired = await expireOffers(admin);

  if (rollupError || cleanupError || botError) {
    return NextResponse.json({ ok: false, day: yesterday, expired }, { status: 500 });
  }
  return NextResponse.json({ ok: true, day: yesterday, expired });
}
