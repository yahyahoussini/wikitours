import { SITE_URL } from '@/lib/seo';

/**
 * /robots.txt — public crawl allowed, admin + API kept out. AI answer engines
 * (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are explicitly welcomed
 * for GEO/AEO (LAWS §5) rather than left to the default.
 */
export default function robots() {
  const disallow = ['/admin', '/api/'];
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Bingbot', 'CCBot'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
