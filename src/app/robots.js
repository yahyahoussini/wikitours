import { SITE_URL } from '@/lib/seo';

/**
 * /robots.txt — generated from code so it stays in version control and can
 * never drift from a hand-edited file on the host.
 *
 * CRAWLING IS NOT INDEXING. Nothing here is used to keep a page out of the
 * index: a disallowed URL can still be indexed from external links, and a
 * blocked page's `noindex` can never be read. Pages that must stay out of the
 * index say so with the robots META tag instead — empty month hubs
 * (`src/app/[locale]/[flat]/page.js`), the barometer while it has no periods,
 * and every scaffold behind its noindex-until-filled guard. Keep it that way.
 *
 * DISALLOW — only genuine non-content prefixes, enumerated from this repo:
 *   /admin   the dashboard. Covers the auth route `src/app/admin/login` and
 *            everything under `src/app/admin/(protected)`. On the main domain
 *            /admin 308s to admin.wikitours.ma; both are non-content.
 *   /api/    all 12 route handlers under `src/app/api`: admin/{export/leads,
 *            media,upload}, content/facts, cron/{draft-article,
 *            publish-articles,rollup,sync-reviews}, health/seo, lead, ping, t.
 *            None is a page. `content/facts` is public JSON, but /llms.txt is
 *            the canonical machine-readable summary — one source, not two.
 *
 * NOT disallowed, deliberately:
 *   /_next/  CSS, JS and optimised images. Blocking it hides the rendered page
 *            from every engine that renders. The string must never appear here.
 *   locale prefixes /fr /ar /en, and /sitemap.xml, /llms.txt,
 *   /indexnow-key.txt, /favicon.ico.
 *   Vercel preview deployments need no rule — they are served with an
 *   automatic `X-Robots-Tag: noindex` and live on *.vercel.app, not here.
 *
 * GROUP PRECEDENCE TRAP: a user-agent that has its own group ignores `*`
 * ENTIRELY — it does not inherit a single line from it. So every named group
 * repeats the same `disallow` array, and a new rule added only to `*` would
 * silently skip every AI crawler below. Always edit the shared array.
 *
 * Keep this list in step with `BOT_UA` (src/middleware.js, bot-hit logging)
 * and `htmlLimitedBots` (next.config.mjs, blocking metadata so crawlers get
 * real 404s). Welcoming an agent without logging it makes GEO unmeasurable.
 */
export default function robots() {
  const disallow = ['/admin', '/api/'];

  // Explicitly welcomed rather than left to `*`, so the intent is auditable
  // and survives any future tightening of the default group (LAWS §5, GEO/AEO).
  const aiBots = [
    // OpenAI — training, search index, and user-initiated fetch
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    // Anthropic — training, search index, user-initiated fetch, legacy
    'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Claude-Web',
    // Perplexity — index and user-initiated fetch
    'PerplexityBot', 'Perplexity-User',
    // Google AI surfaces (AI Overviews / Gemini grounding) + classic Bing
    'Google-Extended', 'Bingbot',
    // Common Crawl, which several models train from
    'CCBot',
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
