import { LOCALES, FALLBACK_LOCALE } from '@/lib/i18n';
import { indexableMonths } from '@/lib/months';

/**
 * Edge-safe DB reads for the middleware — plain PostgREST fetches with a 60s
 * in-memory memo so the middleware never hits the DB per-request and admin
 * changes (default locale, redirects) propagate without a deploy.
 */

const TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 2_500;
// A fresh instance has no stale value to fall back on and pays DNS + TLS on its
// first read, so that read gets longer before it is abandoned.
const COLD_FETCH_TIMEOUT_MS = 5_000;
// After a failed read, requests use the fallback for this long before one of
// them tries again — an outage costs one slow request per window, not all.
const RETRY_AFTER_FAILURE_MS = 10_000;
// A refresh still pending after this long was frozen with the request that
// started it (edge runtimes do not keep detached promises running) — replace it.
const STUCK_REFRESH_MS = 4 * COLD_FETCH_TIMEOUT_MS;
const memos = new Map();
const inflight = new Map();
const failures = new Map();

/**
 * Stale-while-revalidate memo. The middleware awaits this on EVERY public
 * request, so it must never wedge the site: refreshes are deduped (one fetch
 * per key regardless of concurrency), an expired memo keeps serving its stale
 * value while the refresh runs, and the fetch itself is hard-capped.
 *
 * A loader returns null when its read FAILED, and that is never cached. It
 * used to be: a cold instance's first redirects read timed out, the empty map
 * was memoised, and the refresh meant to replace it was frozen with its
 * request — so every admin redirect 404'd in production (found 2026-09-17:
 * the July rows and /omra-ramadan-2027 alike). A failed read now answers with
 * the last good value, else with `fallback`, for that request only.
 */
function memoized(key, loader, fallback) {
  const hit = memos.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  if (!hit && Date.now() - (failures.get(key) ?? -Infinity) < RETRY_AFTER_FAILURE_MS) return Promise.resolve(fallback);
  let pending = inflight.get(key);
  if (!pending || Date.now() - pending.started > STUCK_REFRESH_MS) {
    const promise = loader(hit ? FETCH_TIMEOUT_MS : COLD_FETCH_TIMEOUT_MS)
      .then((value) => {
        if (value == null) {
          failures.set(key, Date.now());
          return memos.get(key)?.value ?? fallback;
        }
        failures.delete(key);
        memos.set(key, { value, at: Date.now() });
        return value;
      })
      .finally(() => {
        if (inflight.get(key)?.promise === promise) inflight.delete(key);
      });
    pending = { promise, started: Date.now() };
    inflight.set(key, pending);
  }
  // Stale value (if any) answers immediately; only cold starts await the fetch.
  return hit ? Promise.resolve(hit.value) : pending.promise;
}

/** PostgREST read; null on any failure (missing env, HTTP error, timeout). */
async function restFetch(path, key, timeoutMs = FETCH_TIMEOUT_MS) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
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
  return memoized('default_locale', async (timeoutMs) => {
    const rows = await restFetch(
      'settings?id=eq.1&select=default_locale',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      timeoutMs,
    );
    if (rows == null) return null;
    const value = rows[0]?.default_locale;
    return LOCALES.includes(value) ? value : FALLBACK_LOCALE;
  }, FALLBACK_LOCALE);
}

/** Active admin-created redirects as a Map(from_path → {to, permanent}). */
export function getRedirectsMap() {
  return memoized('redirects', async (timeoutMs) => {
    const rows = await restFetch(
      'redirects?is_active=eq.true&select=from_path,to_path,permanent',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      timeoutMs,
    );
    if (rows == null) return null;
    const map = new Map();
    for (const row of rows) {
      map.set(row.from_path, { to: row.to_path, permanent: row.permanent });
    }
    return map;
  }, new Map());
}

/**
 * Departures that have LEFT (date_start < today), any publish state, keyed by
 * slug → { date_start, date_end, is_published }. The middleware 301s a retired
 * one (returned > 90 days ago, offerLifecycle) — or an unpublished one, which
 * cannot render (RLS) and would 404 — to its month lander, so an expired
 * departure URL never 404s. A published departure in progress or archived is
 * in the map too but falls through to its page. Service key: RLS hides
 * unpublished rows from anon, and those are exactly the ones that would 404.
 */
export function getDepartedOffersMap() {
  return memoized('departed_offers', async (timeoutMs) => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await restFetch(
      `offers?select=slug,date_start,date_end,is_published&date_start=lt.${today}`,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      timeoutMs,
    );
    if (rows == null) return null;
    return new Map(rows.map((r) => [r.slug, r]));
  }, new Map());
}

/**
 * The month landers a retired departure may be sent to — the SAME predicate
 * the pages, the sitemap and the footer use (indexableMonths), fed the same
 * two inputs: published offers that have not returned, and the month_pages
 * rows. A 301 must never land on a noindex page.
 */
export function getIndexableMonthSet() {
  return memoized('indexable_months', async (timeoutMs) => {
    const today = new Date().toISOString().slice(0, 10);
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const [offers, monthPages] = await Promise.all([
      restFetch(`offers?select=date_start,date_end&is_published=eq.true&or=(date_end.gte.${today},date_end.is.null)`, anon, timeoutMs),
      restFetch('month_pages?select=slug,is_indexable,never_sold,weather_fr,weather_ar,suits_fr,suits_ar', anon, timeoutMs),
    ]);
    if (offers == null || monthPages == null) return null;
    return indexableMonths(offers, new Map(monthPages.map((r) => [r.slug, r])));
  }, indexableMonths([], new Map()));
}

/** Test hook: clears the 60s memos. */
export function clearEdgeMemos() {
  memos.clear();
  inflight.clear();
  failures.clear();
}
