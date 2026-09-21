import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * /robots.txt — generated from code so it stays in version control and can
 * never drift from a hand-edited file on the host.
 *
 * WHY A ROUTE HANDLER AND NOT `robots.js` (2026-09-21). The Next metadata
 * export can only emit the fields it knows (`User-Agent`, `Allow`, `Disallow`,
 * `Sitemap`, `Host`). The Content Signals Policy line is not one of them, and
 * it has to sit INSIDE each user-agent group, so the file is emitted by hand
 * here. The byte output is otherwise identical to what `robots.js` produced —
 * the same ten groups, in the same order, with the same two disallows.
 *
 * CONTENT-SIGNAL states, in machine-readable form, what this site already
 * allows in practice: appear in search, be quoted as AI input (grounding,
 * AI Overviews, RAG), and be used for training. `search=yes, ai-input=yes,
 * ai-train=yes` is the permissive stance the business wants — an Omra agency
 * gains from being quoted. Changing a value to `no` is a business decision,
 * not a technical one; it does not block anything by itself.
 *
 * CRAWLING IS NOT INDEXING. Nothing here is used to keep a page out of the
 * index: a disallowed URL can still be indexed from external links, and a
 * blocked page's `noindex` can never be read. Pages that must stay out of the
 * index say so with the robots META tag instead — empty month hubs
 * (`src/app/[locale]/[flat]/page.js`), the barometer while it has no periods,
 * and every scaffold behind its noindex-until-filled guard. Keep it that way.
 *
 * DISALLOW — only genuine non-content prefixes, enumerated from this repo:
 *   /admin   the dashboard (auth route + everything under `(protected)`).
 *   /api/    all route handlers under `src/app/api`. None is a page;
 *            /llms.txt is the canonical machine-readable summary.
 *
 * NOT disallowed, deliberately:
 *   /_next/  CSS, JS and optimised images. Blocking it hides the rendered page
 *            from every engine that renders. The string must never appear here.
 *   locale prefixes /fr /ar /en, and /sitemap.xml, /llms.txt,
 *   /indexnow-key.txt, /favicon.ico.
 *
 * GROUP PRECEDENCE TRAP: a user-agent that has its own group ignores `*`
 * ENTIRELY — it does not inherit a single line from it. So every named group
 * repeats the same lines, and a new rule added only to `*` would silently skip
 * every AI crawler below. Always edit the shared arrays.
 *
 * Keep this list in step with `BOT_UA` (src/middleware.js, bot-hit logging)
 * and `htmlLimitedBots` (next.config.mjs, blocking metadata so crawlers get
 * real 404s). Welcoming an agent without logging it makes GEO unmeasurable.
 */
const DISALLOW = ['/admin', '/api/'];

// Content Signals Policy (contentsignals.org): declared per group because a
// named user-agent never reads the `*` group.
const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=yes';

// Explicitly welcomed rather than left to `*`, so the intent is auditable
// and survives any future tightening of the default group (LAWS §5, GEO/AEO).
const AI_BOTS = [
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

const group = (userAgent) => [
  `User-Agent: ${userAgent}`,
  `Content-Signal: ${CONTENT_SIGNAL}`,
  'Allow: /',
  ...DISALLOW.map((path) => `Disallow: ${path}`),
].join('\n');

export function GET() {
  const body = [
    ...['*', ...AI_BOTS].map(group),
    `Host: ${SITE_URL}`,
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join('\n\n') + '\n';

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
