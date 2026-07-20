import { NextResponse } from 'next/server';
import { LOCALES } from '@/lib/i18n';
import { getRedirectsMap } from '@/lib/edge-data';
import { resolveLegacyRedirect } from '@/lib/redirects/legacy-map';
import { MONTH_SLUGS } from '@/lib/months';

// Looks like a locale segment (xx or xx-YY) — but not one we support.
const LOCALE_SHAPE = /^[a-z]{2}(-[a-zA-Z]{2})?$/;

const ADMIN_HOST = process.env.ADMIN_HOST ?? 'admin.wikitours.ma';

/** Locale from the browser's Accept-Language: the visitor's first preference
 *  among fr/ar/en wins (browsers list tags in preference order); any other
 *  main language falls back to French (business default). */
function detectLocale(request) {
  const header = request.headers.get('accept-language') ?? '';
  for (const part of header.split(',')) {
    const primary = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (LOCALES.includes(primary)) return primary;
  }
  return 'fr';
}

// AI/search crawlers we log (GEO observability). Human analytics live in
// wt.js//api/t, which drops these UAs — the two datasets never overlap.
const BOT_UA =
  /(GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-Web|PerplexityBot|Google-Extended|Bingbot|CCBot)/i;

/** Fire-and-forget insert into bot_hits (service role; RLS keeps it private).
 *  Never throws, never blocks the response. */
function logBotHit(bot, path, ua) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Promise.resolve();
  return fetch(`${url}/rest/v1/bot_hits`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({ bot, path, ua: ua.slice(0, 300) }),
  }).catch(() => {});
}

export async function middleware(request, event) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') ?? '').toLowerCase();
  const isAdminHost = host === ADMIN_HOST || host.startsWith(`${ADMIN_HOST}:`);

  // Bot logger — public page requests only (the matcher already excludes
  // /api, /_next and files; admin surfaces are skipped explicitly).
  if (!isAdminHost && !pathname.startsWith('/admin') && (request.method === 'GET' || request.method === 'HEAD')) {
    const ua = request.headers.get('user-agent') ?? '';
    const m = ua.match(BOT_UA);
    if (m) event.waitUntil(logBotHit(m[1], pathname, ua));
  }

  // 0) Canonical host: www → apex (SEO consistency, LAWS §5). Trailing-slash
  // normalization is handled by Next (trailingSlash:false → 308 to no-slash).
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    return NextResponse.redirect(url, 308);
  }

  // 1) admin.wikitours.ma serves the admin app at its root.
  if (isAdminHost) {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Main-domain /admin: served in dev (no separate host to test against).
  // In production it falls straight through to the normal locale routing
  // below, which 404s it like any other unknown path — a redirect to
  // ADMIN_HOST would hand a recon scan the exact working hostname of the
  // dashboard. Admins are expected to already know that address.
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }
  // In production, /admin* on the main domain intentionally falls through to
  // the same locale-routing / catch-all logic as any other unknown path
  // below — no early return, no special-casing, so it 404s indistinguishably.

  // 1.4) Legacy dated month hub (/xx/omra-juillet-2026) → evergreen
  // (/xx/omra-juillet). Handled here, not in the [flat] page, because the hub
  // can be prerendered (an occasion slug collision) and never reach the page
  // redirect. Year is content, never URL.
  const dm = pathname.match(/^\/([a-z]{2})\/omra-([a-z]+)-\d{4}\/?$/);
  if (dm && LOCALES.includes(dm[1]) && MONTH_SLUGS.includes(dm[2])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${dm[1]}/omra-${dm[2]}`;
    return NextResponse.redirect(url, 301);
  }

  // 1.5) Static legacy/rename 301 map (in-code, no DB round-trip).
  const legacy = resolveLegacyRedirect(pathname);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy.to;
    return NextResponse.redirect(url, legacy.status);
  }

  // 2) Admin-created redirects (60s-cached map — no deploy needed).
  const redirects = await getRedirectsMap();
  const hit = redirects.get(pathname);
  if (hit) {
    const target = hit.to.startsWith('http')
      ? new URL(hit.to)
      : new URL(hit.to, request.url);
    return NextResponse.redirect(target, hit.permanent ? 308 : 307);
  }

  // 3) Locale routing.
  const first = pathname.split('/')[1] ?? '';

  // Supported locale prefix — let it through.
  if (LOCALES.includes(first)) return NextResponse.next();

  const preferred = detectLocale(request);
  const url = request.nextUrl.clone();

  // Invalid locale (e.g. /es/..., /en-us/...) — 404, keep the URL.
  // Rewriting under a supported locale lands in the [...rest] catch-all,
  // which renders the localized not-found page with a 404 status.
  if (LOCALE_SHAPE.test(first)) {
    url.pathname = `/${preferred}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Bare path (/, /offres, ...) — redirect to the visitor's language.
  // Temporary redirect + Vary so caches never pin one locale for everyone.
  url.pathname = `/${preferred}${pathname === '/' ? '' : pathname}`;
  const res = NextResponse.redirect(url);
  res.headers.set('vary', 'accept-language');
  return res;
}

export const config = {
  // Skip API routes, Next internals and any file with an extension.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
