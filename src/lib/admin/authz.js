/**
 * WHO COUNTS AS AN ADMIN.
 *
 * Every guard in this app used to ask only "is there a Supabase user?", and RLS
 * granted the `authenticated` role `using (true)` on every table. So the single
 * control keeping the public out of `leads` (names, phones, IPs) and `settings`
 * (Meta CAPI token, TikTok events token, IndexNow key) was the "public sign-ups
 * disabled" toggle in the Supabase dashboard — recorded nowhere but a SQL
 * comment. NEXT_PUBLIC_SUPABASE_ANON_KEY is public by design, so if that toggle
 * were ever flipped, one `auth.signUp()` would have promoted anyone to full
 * admin. A dashboard toggle is not an access control, and nothing in this repo
 * could detect it changing.
 *
 * ADMIN_EMAILS is a comma-separated allowlist matched case-insensitively against
 * the SERVER-VERIFIED session email (always from `auth.getUser()`, never from a
 * client-supplied value).
 *
 * This FAILS CLOSED: an unset or empty ADMIN_EMAILS admits nobody. That is the
 * correct failure direction — a missing variable locks staff out of /admin,
 * which is recoverable; the opposite silently reopens the hole this closes.
 *
 * Defence in depth: this guards the Next.js surface (server actions, /api/admin,
 * the protected layout). It does NOT guard direct PostgREST calls made with a
 * user's own access token — that is what the matching RLS allowlist in
 * supabase/migrations/017_admin_allowlist.sql is for. Both are needed.
 */

/** The configured allowlist, normalized. Empty when unset. */
export function adminEmails() {
  return String(process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True only for a verified session whose email is on the allowlist. */
export function isAdminUser(user) {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return adminEmails().includes(email);
}

/**
 * Throwing form for server actions. Distinguishes "nobody is configured" from
 * "you are not on the list" in the SERVER log only — the caller still surfaces a
 * generic message, so the response never reveals which case it was.
 */
export function assertAdminUser(user) {
  if (isAdminUser(user)) return;
  if (!adminEmails().length) {
    console.error(
      '[authz] ADMIN_EMAILS is not set — every admin surface is denied. ' +
        'Set ADMIN_EMAILS to a comma-separated list of admin account emails.',
    );
  }
  throw new Error('unauthorized');
}
