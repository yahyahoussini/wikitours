import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily (vercel.json cron): refresh the Google rating + review COUNT from the
 * Places API into settings, so the on-site figure never drifts from Google.
 *
 * Only the aggregate is stored — rating and count. Google's terms do NOT allow
 * persisting review text or author names in our own database, so this job
 * deliberately never reads or writes them.
 *
 * No-ops (200, skipped) until GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID exist,
 * so shipping this is safe before the credentials are created.
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) {
    return NextResponse.json({ ok: true, skipped: 'GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID not set' });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'unconfigured' }, { status: 500 });

  let rating = null;
  let count = null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        // Field mask keeps the call in the cheapest SKU: no review bodies.
        'X-Goog-FieldMask': 'rating,userRatingCount',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: 'places api error' }, { status: 502 });
    }
    const data = await res.json();
    rating = typeof data.rating === 'number' ? Math.round(data.rating * 10) / 10 : null;
    count = Number.isInteger(data.userRatingCount) ? data.userRatingCount : null;
  } catch {
    return NextResponse.json({ ok: false, error: 'places api unreachable' }, { status: 502 });
  }

  // Never blank a real figure if Google returns something unusable.
  const patch = {};
  if (rating != null && rating > 0 && rating <= 5) patch.gbp_rating = rating;
  if (count != null && count >= 0) patch.gbp_review_count = count;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: 'no usable values returned' }, { status: 502 });
  }

  // Only write + revalidate when the figure actually MOVED. The rating shows in
  // the sitewide Organization node, so a refresh means a layout revalidation —
  // cheap a few times a month, wasteful every single day for an unchanged value.
  const { data: current } = await admin
    .from('settings')
    .select('gbp_rating, gbp_review_count')
    .eq('id', 1)
    .maybeSingle();

  const changed =
    (patch.gbp_rating != null && patch.gbp_rating !== current?.gbp_rating) ||
    (patch.gbp_review_count != null && patch.gbp_review_count !== current?.gbp_review_count);

  if (!changed) {
    return NextResponse.json({ ok: true, unchanged: true, ...patch });
  }

  const { error } = await admin.from('settings').update(patch).eq('id', 1);
  if (error) return NextResponse.json({ ok: false, error: 'db update failed' }, { status: 500 });

  // Same spec the admin uses for a settings save (revalidate.js: settings -> 'layout').
  revalidatePath('/', 'layout');

  return NextResponse.json({
    ok: true,
    changed: true,
    from: { rating: current?.gbp_rating ?? null, count: current?.gbp_review_count ?? null },
    to: patch,
  });
}
