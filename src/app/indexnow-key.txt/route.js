import { getSettings } from '@/lib/data/settings';

export const runtime = 'nodejs';
// Dynamic: always reflect the current admin key (tiny file, bot-only traffic)
// so it appears immediately when the key is set — no revalidation race.
export const dynamic = 'force-dynamic';

/**
 * IndexNow ownership key file. Served at a fixed path (a dynamic /{key}.txt
 * segment would collide with [locale]); the ping passes this as keyLocation.
 * 404s until an admin sets settings.indexnow_key (LAW §10).
 */
export async function GET() {
  const settings = await getSettings();
  const key = settings?.indexnow_key;
  if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
