import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cookie-aware client for authenticated (admin) requests — respects RLS for
 * the signed-in user. Use in Server Components, Route Handlers and Server
 * Actions of the admin area. Returns null when the env is not configured so
 * admin pages degrade gracefully in local dev (like the other clients).
 */
export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore when a
            // middleware/route handler refreshes the session instead.
          }
        },
      },
    },
  );
}
