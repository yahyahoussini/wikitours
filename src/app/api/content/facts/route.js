import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildFactSheet } from '@/lib/server/article-drafter';

export const runtime = 'nodejs';
export const revalidate = 3600;

/**
 * PUBLIC, read-only fact sheet for the $0 article pipeline.
 *
 * The weekly cloud routine (content/ARTICLE-BRIEF.md) runs on the owner's
 * Claude subscription in a sandbox that holds NO secrets. It grounds every
 * article on this endpoint instead: the same object the API drafter uses —
 * business facts, live offers with tier prices, hotels, published FAQ, team,
 * existing slugs, allowed internal links — plus the queued editorial plan.
 * Everything here is already rendered on public pages; the settings fields
 * exposed are the public ones only (never tokens or keys).
 */
export async function GET() {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'unconfigured' }, { status: 503 });

  const now = new Date();
  const sheet = await buildFactSheet(admin, { today: now.toISOString().slice(0, 10) });

  // Queued plan rows whose season (if any) is within the next 3 months.
  const monthNow = now.getUTCMonth() + 1;
  const inWindow = (m) => !m || (m - monthNow + 12) % 12 <= 3;
  const { data: rows } = await admin
    .from('article_plan')
    .select('query_family, angle, category, owner_path, season_month, sort_order')
    .eq('is_active', true)
    .eq('status', 'queued')
    .order('sort_order', { ascending: true });
  const plan = (rows ?? []).filter((r) => inWindow(r.season_month));

  return NextResponse.json(
    {
      generated_at: now.toISOString(),
      facts: sheet.facts,
      existing_slugs: [...sheet.existingSlugs],
      published_articles: sheet.publishedArticles,
      allowed_links: sheet.allowedLinks,
      plan,
    },
    { headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
