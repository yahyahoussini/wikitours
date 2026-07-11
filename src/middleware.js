import { NextResponse } from 'next/server';
import { LOCALES } from '@/lib/i18n';
import { getDefaultLocale, getRedirectsMap } from '@/lib/edge-data';

// Looks like a locale segment (xx or xx-YY) — but not one we support.
const LOCALE_SHAPE = /^[a-z]{2}(-[a-zA-Z]{2})?$/;

const ADMIN_HOST = process.env.ADMIN_HOST ?? 'admin.wikitours.ma';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') ?? '').toLowerCase();
  const isAdminHost = host === ADMIN_HOST || host.startsWith(`${ADMIN_HOST}:`);

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

  // Main-domain /admin: served in dev, 308 to the admin host in prod.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (process.env.NODE_ENV === 'production') {
      const target = new URL(pathname.replace(/^\/admin/, '') || '/', `https://${ADMIN_HOST}`);
      return NextResponse.redirect(target, 308);
    }
    return NextResponse.next();
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

  const defaultLocale = await getDefaultLocale();
  const url = request.nextUrl.clone();

  // Invalid locale (e.g. /es/..., /en-us/...) — 404, keep the URL.
  // Rewriting under the default locale lands in the [...rest] catch-all,
  // which renders the localized not-found page with a 404 status.
  if (LOCALE_SHAPE.test(first)) {
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Bare path (/, /offres, ...) — redirect to the default locale.
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals and any file with an extension.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
