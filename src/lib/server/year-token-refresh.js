import { yearTokensChanged, YEAR_TOKEN_COLUMNS } from '@/lib/title-tokens';

/**
 * The site-wide revalidation a {year:…} title token needs (src/lib/title-tokens.js).
 * The day one reads differently than two days before — its year just ended on
 * 1 January, or a bare tag's next occurrence moved on — every cached page that
 * shows it is stale, and the ones rendered with revalidate = false (the article
 * share cards, the guide chapters and hubs that list posts) would keep the old
 * year until a deploy. One revalidatePath('/', 'layout') on those days, a
 * handful a year; the 48 h window catches the change again the next morning if
 * a run missed it.
 *
 * Run first and best effort by the daily release cron (08:00 UTC), and by
 * /api/cron/year-tokens at 00:05 UTC on 1 January, so a year that just ended
 * goes minutes after midnight in Casablanca (UTC+0 or +1, whatever the zone
 * data says), not eight hours later at the release.
 *
 * → true (revalidated), false (nothing changed) or 'error' (logged): never
 * throws, and a failed check never reads as « nothing changed ». `revalidate`
 * and `events` are injected — next/cache's revalidatePath and getHijriEvents in
 * the routes — so the tests run without Next.
 */
export async function refreshYearTokenPages(admin, { revalidate, events, now = new Date() }) {
  try {
    const { data, error } = await admin.from('articles').select(['slug', ...YEAR_TOKEN_COLUMNS].join(', ')).eq('is_published', true);
    if (error) throw error;
    if (!yearTokensChanged(data ?? [], { now, since: new Date(now.getTime() - 2 * 86400000), events: await events() })) return false;
    revalidate('/', 'layout');
    return true;
  } catch (e) {
    console.error('[year-tokens] check or revalidation failed:', e?.message ?? e);
    return 'error';
  }
}
