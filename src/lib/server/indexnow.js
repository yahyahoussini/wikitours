import { SITE_URL } from '@/lib/seo';
import { LOCALES } from '@/lib/i18n';

/**
 * IndexNow ping (Bing / Copilot index instantly; Google does NOT use IndexNow
 * — it discovers via the sitemap + ISR, see README). Fire-and-forget: called
 * after on-demand revalidation with the locale-relative paths that changed.
 * No-op until an admin sets settings.indexnow_key. Never throws.
 */
export async function pingIndexNow(settings, relativePaths) {
  try {
    const key = settings?.indexnow_key;
    if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key) || !relativePaths?.length) return;

    const host = new URL(SITE_URL).host;
    const urlList = [];
    for (const path of relativePaths) {
      for (const locale of LOCALES) {
        urlList.push(`${SITE_URL}/${locale}${path === '/' ? '' : path}`);
      }
    }

    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/indexnow-key.txt`,
        urlList: urlList.slice(0, 10000),
      }),
    });
  } catch (err) {
    console.error('[indexnow] ping failed:', err?.message ?? err);
  }
}
