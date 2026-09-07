import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/data/settings';
import { revalidateForTable } from '@/lib/revalidate';
import { articleQueue, LOW_WATERMARK_DAYS } from '@/lib/server/article-queue';
import { sendArticleQueueEmail } from '@/lib/server/marketing';

export const runtime = 'nodejs';

/**
 * Daily blog release (vercel.json cron, 07:00 UTC = 08:00 Casablanca).
 *
 * The database already decides what is public — the anon RLS policy on
 * `articles` is `is_published and published_at <= now()` — so scheduling a
 * post is nothing more than setting a future "Date de publication" in the
 * admin. What never existed before is the RELEASE: /blog and the article pages
 * are ISR-cached, so a post whose date had passed stayed invisible until an
 * admin happened to edit something or a deploy went out. This cron:
 *   1. finds the articles whose published_at crossed into the past since the
 *      last run (25 h window — idempotent, tolerates cron jitter);
 *   2. revalidates /, /blog, /blog/[slug] × fr/ar/en, llms.txt and the
 *      sitemap, and pings IndexNow for them (revalidateForTable does both);
 *   3. e-mails the agency when a day went by with nothing released, or when
 *      the scheduled runway hits 7 / 3 / 1 / 0 days — the two ways "a post
 *      every day" fails silently.
 * Cron-only: Vercel sends `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'unconfigured' }, { status: 500 });

  const q = await articleQueue(admin);
  if (q.error) return NextResponse.json({ ok: false, error: 'query' }, { status: 500 });

  // Awaited on purpose: this is a cron with no latency budget, and a serverless
  // function may be frozen before a fire-and-forget IndexNow ping completes.
  for (const article of q.released) {
    // supports_path (migration 020) revalidates the hub that lists this article
    // under « Pour aller plus loin ». Looked up best-effort so the release keeps
    // working before the migration is applied — a missing column yields null.
    let supportsPath = null;
    try {
      const { data } = await admin.from('articles').select('supports_path').eq('id', article.id).maybeSingle();
      supportsPath = data?.supports_path ?? null;
    } catch {
      supportsPath = null;
    }
    await revalidateForTable('articles', { ...article, supports_path: supportsPath });
  }
  if (q.released.length) revalidatePath('/sitemap.xml');

  // Runway thresholds fire once each as the queue drains one per day
  // (7 → 3 → 1 → 0) rather than nagging daily. A missed day ALWAYS fires:
  // that is precisely the failure this automation exists to prevent.
  const missedDay = q.released.length === 0;
  const thresholdHit = [LOW_WATERMARK_DAYS, 3, 1, 0].includes(q.runwayDays);
  let alerted = false;
  if (missedDay || thresholdHit) {
    const settings = await getSettings();
    await sendArticleQueueEmail(settings, { ...q, missedDay });
    alerted = Boolean(process.env.RESEND_API_KEY && settings?.email);
  }

  return NextResponse.json({
    ok: true,
    released: q.released.map((a) => a.slug),
    queued: q.queued,
    runwayDays: q.runwayDays,
    lastScheduledAt: q.lastScheduledAt,
    missedDay,
    alerted,
  });
}
