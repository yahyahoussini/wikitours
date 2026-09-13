import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Site settings (single row, id = 1). Read server-side with the service
 * client because the settings table holds server tokens (Meta CAPI, TikTok
 * events, IndexNow) and is therefore not anon-readable.
 *
 * Returns null ONLY when there is genuinely nothing to show — the DB is not
 * configured, or the row does not exist — so callers hide the dependent UI
 * (LAWS §10). A transient FAILURE to read the row is not the same thing and
 * is rethrown on purpose. This used to be swallowed into null as well, and the
 * two cases are indistinguishable downstream: during an ISR regeneration a
 * Supabase hiccup produced a page with no address, no phones, no hours and no
 * social profiles on the TravelAgency node, and Next.js then cached that
 * degraded HTML for the whole revalidate window (seen live on /en, age 52 min,
 * while sibling pages from the same code were complete). When the render
 * throws instead, Next keeps serving the last good page — and at build time
 * the build fails rather than shipping a site with no business data.
 */
export const getSettings = cache(async function getSettings() {
  const supabase = supabaseAdmin();
  if (!supabase) return null; // not configured — nothing to fetch

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(`settings: ${error.message}`); // real failure — do not cache a degraded page
  return data; // null when the row is missing, which callers already handle
});
