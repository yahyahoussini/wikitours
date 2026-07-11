import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Site settings (single row, id = 1). Read server-side with the service
 * client because the settings table holds server tokens (Meta CAPI, TikTok
 * events, IndexNow) and is therefore not anon-readable. Returns null when
 * the DB is not configured or the row is missing — callers hide the
 * dependent UI (LAWS §10).
 */
export const getSettings = cache(async function getSettings() {
  try {
    const supabase = supabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
});
