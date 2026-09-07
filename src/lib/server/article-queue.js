/**
 * Blog release queue — the single definition of "what went live since the last
 * run" and "how many days of scheduled posts remain". Used by the daily publish
 * cron AND the admin dashboard so both read the same numbers.
 *
 * Release is DATA, not an action. An article is public the moment
 *   is_published = true AND published_at <= now()
 * — that is the anon RLS policy on `articles`. The admin schedules a post by
 * setting a future published_at; nothing has to happen on the day itself. What
 * this module and the cron add is the part RLS cannot do: revalidating the
 * cached pages, pinging IndexNow, and warning before the queue runs dry.
 */

const DAY = 86400000;

/** Alert when fewer than this many days of scheduled posts remain. */
export const LOW_WATERMARK_DAYS = 7;

/**
 * @param client  a Supabase client that can see every article row — the
 *                service client in the cron, the admin's authenticated client
 *                on the dashboard (admin_full_access RLS).
 * @param now     injectable for tests.
 * @param windowHours  how far back "released since the last run" looks. 25 h
 *                tolerates cron jitter; revalidation is idempotent, so a row
 *                seen twice costs nothing.
 */
export async function articleQueue(client, { now = new Date(), windowHours = 25 } = {}) {
  const nowISO = now.toISOString();
  const sinceISO = new Date(now.getTime() - windowHours * 3600000).toISOString();

  const [releasedRes, scheduledRes, lastRes] = await Promise.all([
    // Crossed into visibility inside the window → needs revalidation + IndexNow.
    // Deliberately NOT selecting supports_path here: that column arrives with
    // migration 020, and the daily release must never fail because a migration
    // is pending (a local run proved it would). The cron looks it up best-effort.
    client
      .from('articles')
      .select('id, slug, title_fr, published_at')
      .eq('is_published', true)
      .gt('published_at', sinceISO)
      .lte('published_at', nowISO)
      .order('published_at', { ascending: true }),
    // The queue: approved and dated in the future.
    client
      .from('articles')
      .select('id, slug, title_fr, published_at')
      .eq('is_published', true)
      .gt('published_at', nowISO)
      .order('published_at', { ascending: true }),
    // Most recent live post — how long since the blog last moved.
    client
      .from('articles')
      .select('published_at')
      .eq('is_published', true)
      .lte('published_at', nowISO)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const released = releasedRes.data ?? [];
  const scheduled = scheduledRes.data ?? [];
  const lastReleasedAt = lastRes.data?.published_at ?? null;
  const lastScheduledAt = scheduled.length ? scheduled[scheduled.length - 1].published_at : null;
  // One post a day ⇒ runway is the number of days until the last scheduled date.
  const runwayDays = lastScheduledAt
    ? Math.max(0, Math.ceil((new Date(lastScheduledAt).getTime() - now.getTime()) / DAY))
    : 0;
  const daysSinceLastRelease = lastReleasedAt
    ? Math.floor((now.getTime() - new Date(lastReleasedAt).getTime()) / DAY)
    : null;

  return {
    now: nowISO,
    released,
    scheduled,
    queued: scheduled.length,
    runwayDays,
    lastScheduledAt,
    lastReleasedAt,
    daysSinceLastRelease,
    lowQueue: runwayDays < LOW_WATERMARK_DAYS,
    error: releasedRes.error ?? scheduledRes.error ?? lastRes.error ?? null,
  };
}
