import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin/authz';

/**
 * The verified admin of this request, or null. React's cache() makes the
 * (protected) layout and its page share ONE auth.getUser() call per request.
 */
export const getAdminUser = cache(async () => {
  const auth = await supabaseServer();
  if (!auth) return null;
  const {
    data: { user },
  } = await auth.auth.getUser();
  // Session + allowlist: a Supabase account that is not on ADMIN_EMAILS is
  // treated exactly like a logged-out visitor.
  return user && isAdminUser(user) ? user : null;
});

/**
 * The FIRST statement of every page under admin/(protected), before any data
 * read. The layout's own check is not enough: Next renders a layout and its
 * page in parallel, so a page still ran its queries, and its output was
 * serialised into the response, even when the layout redirected. Measured
 * 2026-10-15: logged-out GETs answered 307 → /admin/login with the page in the
 * body (the media library, read with the service role: 103 KB, 59 file URLs).
 * tests/admin-guard.test.mjs fails the build when a page misses this call.
 */
export async function requireAdminPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  return user;
}
