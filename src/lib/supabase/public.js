import { createClient } from '@supabase/supabase-js';

/**
 * Anon-key client for public, cacheable reads (ISR pages, published content).
 * RLS restricts it to published rows only. Returns null when the env is not
 * configured so pages degrade gracefully in local dev (LAWS §10: missing
 * data ⇒ section hides).
 */
let client = null;

export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
