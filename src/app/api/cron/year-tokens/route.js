import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getHijriEvents } from '@/lib/data/content';
import { refreshYearTokenPages } from '@/lib/server/year-token-refresh';

export const runtime = 'nodejs';

/**
 * Once a year (vercel.json cron "5 0 1 1 *": 1 January, 00:05 UTC — Vercel
 * Hobby fires it at some minute of that hour — and the VPS timer
 * wikitours-cron-year-tokens; already 1 January in Casablanca whether the
 * zone data says UTC+0 or UTC+1): a
 * {year:…} title token whose year just ended drops from the readers at
 * midnight, but the pages cached before it (6 h ISR, revalidate = false) would
 * keep printing the past year until the 08:00 release cron. This runs only the
 * site-wide revalidation (refreshYearTokenPages) — no release, no e-mail: the
 * publish route would send the missed-day alert at this hour. The release
 * cron runs the same check at 08:00 as the backstop.
 * Cron-only: Vercel sends `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'unconfigured' }, { status: 500 });

  const yearTokensRefreshed = await refreshYearTokenPages(admin, { revalidate: revalidatePath, events: getHijriEvents });
  return NextResponse.json({ ok: yearTokensRefreshed !== 'error', yearTokensRefreshed }, { status: yearTokensRefreshed === 'error' ? 500 : 200 });
}
