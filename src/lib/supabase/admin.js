import { createClient } from '@supabase/supabase-js';

// Hard guard: this module must never reach a browser bundle.
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/supabase/admin.js was imported in the browser. The service-role key is server-only.',
  );
}

/**
 * Service-role client — bypasses RLS. Server-only: lead inserts, analytics
 * writes, settings reads (settings holds server tokens and is not
 * anon-readable), admin mutations. Never expose its data to clients without
 * validation, and never import from client components.
 */
let client = null;

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
