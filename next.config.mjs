const isDev = process.env.NODE_ENV === 'development';

// CSP: self + Supabase (LAWS §8), widened for the exact third parties the
// build loads and nothing more. Marketing pixels (GA4/Meta/TikTok — injected
// only when their id is set in settings, and consent-gated when enabled) need
// their script/img/connect origins; the lazy Google Maps embed on /contact
// and /agence-omra-casablanca needs frame-src + Google tile hosts. Server
// events (Meta CAPI / TikTok / Resend) are server-to-server and unaffected.
const GA = ['https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'];
// Google Ads conversion + Enhanced Conversions load a script from
// googleads.g.doubleclick.net and beacon to doubleclick / www.google.com.
const ADS = ['https://www.googleadservices.com', 'https://googleads.g.doubleclick.net', 'https://*.doubleclick.net', 'https://www.google.com'];
// Google Ads remarketing beacons hit country-specific TLDs (CSP can't wildcard
// a TLD) — cover Morocco + the main diaspora markets for this audience.
const GOOGLE_CCTLD = ['https://www.google.co.ma', 'https://www.google.fr', 'https://www.google.es', 'https://www.google.de', 'https://www.google.it', 'https://www.google.be', 'https://www.google.nl', 'https://www.google.ca'];
const META = ['https://connect.facebook.net', 'https://www.facebook.com'];
const TIKTOK = ['https://analytics.tiktok.com', 'https://*.tiktok.com'];
const MAPS = ['https://www.google.com', 'https://maps.googleapis.com', 'https://maps.gstatic.com', 'https://*.gstatic.com'];

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net ${[...META, 'https://analytics.tiktok.com'].join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.supabase.co ${[...GA, ...ADS, ...GOOGLE_CCTLD, ...META, ...TIKTOK, ...MAPS].join(' ')}`,
  "media-src 'self' https://*.supabase.co",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${[...GA, ...ADS, ...GOOGLE_CCTLD, ...META, ...TIKTOK].join(' ')}`,
  "font-src 'self' data:",
  "frame-src 'self' https://www.google.com https://*.doubleclick.net https://www.facebook.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: do not set turbopack.root here — with the space in this project
  // path, Next 15.5 Turbopack fails page-data collection when the root is
  // pinned. The multiple-lockfile warning at build time is cosmetic (a stray
  // package-lock.json exists in the user home directory).
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
