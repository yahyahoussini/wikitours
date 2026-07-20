import { LOCALES, FALLBACK_LOCALE } from '@/lib/i18n';

/**
 * Edge-safe DB reads for the middleware — plain PostgREST fetches with a 60s
 * in-memory memo so the middleware never hits the DB per-request and admin
 * changes (default locale, redirects) propagate without a deploy.
 */

const TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 2_500;
const memos = new Map();
const inflight = new Map();

/**
 * Stale-while-revalidate memo. The middleware awaits this on EVERY public
 * request, so it must never wedge the site: refreshes are deduped (one fetch
 * per key regardless of concurrency), an expired memo keeps serving its stale
 * value while the refresh runs, and the fetch itself is hard-capped at 2.5s —
 * a hung Supabase connection degrades to "redirect map up to a minute stale",
 * never to queued requests.
 */
function memoized(key, loader) {
  const hit = memos.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  if (!inflight.has(key)) {
    const p = loader()
      .then((value) => {
        memos.set(key, { value, at: Date.now() });
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  // Stale value (if any) answers immediately; only cold starts await the fetch.
  return hit ? Promise.resolve(hit.value) : inflight.get(key);
}

async function restFetch(path, key) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * settings.default_locale — the admin-set main language. Service key because
 * settings is not anon-readable (server-side only: the middleware).
 */
export function getDefaultLocale() {
  return memoized('default_locale', async () => {
    const rows = await restFetch(
      'settings?id=eq.1&select=default_locale',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const value = rows?.[0]?.default_locale;
    return LOCALES.includes(value) ? value : FALLBACK_LOCALE;
  });
}

/** Active admin-created redirects as a Map(from_path → {to, permanent}). */
export function getRedirectsMap() {
  return memoized('redirects', async () => {
    const rows = await restFetch(
      'redirects?is_active=eq.true&select=from_path,to_path,permanent',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    const map = new Map();
    for (const row of rows ?? []) {
      map.set(row.from_path, { to: row.to_path, permanent: row.permanent });
    }
    return map;
  });
}

/** Test hook: clears the 60s memos. */
export function clearEdgeMemos() {
  memos.clear();
}
