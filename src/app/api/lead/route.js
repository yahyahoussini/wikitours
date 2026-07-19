import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/data/settings';
import { sendLeadEvents, sendLeadAlertEmail, toE164 } from '@/lib/server/marketing';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wikitours.ma';

const optional = (max) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

// Moroccan mobile/landline (0X… or +212…) or generic E.164 (diaspora leads).
const phoneSchema = z
  .string()
  .trim()
  .refine((v) => {
    const cleaned = v.replace(/[\s.\-()]/g, '');
    return /^0[5-7]\d{8}$/.test(cleaned) || /^\+212[5-7]\d{8}$/.test(cleaned) || /^\+\d{8,15}$/.test(cleaned);
  });

const leadSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  city: optional(60),
  locale: z.enum(['fr', 'ar', 'en']).optional(),
  offer_id: z.preprocess((v) => (v === '' ? null : v), z.uuid().nullable().optional()),
  offer_title: optional(300),
  room_type: z.preprocess(
    (v) => (v === '' ? null : v),
    z.enum(['double', 'triple', 'quad', 'quint']).nullable().optional(),
  ),
  tier_label: z.preprocess(
    (v) => (v === '' ? null : v),
    z.enum(['economique', 'confort', 'premium', 'vip']).nullable().optional(),
  ),
  // Free-text comment from the reservation form (optional).
  message: optional(500),
  source: optional(80),
  utm_source: optional(200),
  utm_medium: optional(200),
  utm_campaign: optional(200),
  utm_content: optional(200),
  gclid: optional(300),
  fbclid: optional(300),
  // Dedup key shared with the browser pixels (fbq Lead / ttq SubmitForm).
  event_id: z.preprocess((v) => (v === '' ? null : v), z.uuid().nullable().optional()),
  // Honeypot — humans never see it, bots fill it.
  website: z.string().max(500).optional(),
});

/** Same-site check: Origin (or Referer) must be our host, a Vercel preview, or local dev. */
function isAllowedOrigin(request) {
  const header = request.headers.get('origin') ?? request.headers.get('referer');
  if (!header) return false;
  try {
    const { hostname } = new URL(header);
    const site = new URL(SITE_URL).hostname;
    return (
      hostname === site ||
      hostname.endsWith('.vercel.app') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

/** Upstash when configured; else a small in-memory fallback (per instance). */
let upstash = null;
const memoryHits = new Map();
const WINDOW_MS = 10 * 60_000;
const LIMIT = 5;

async function isRateLimited(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    if (!upstash) {
      const [{ Ratelimit }, { Redis }] = await Promise.all([
        import('@upstash/ratelimit'),
        import('@upstash/redis'),
      ]);
      upstash = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(LIMIT, '600 s'),
        prefix: 'lead',
      });
    }
    const { success } = await upstash.limit(ip);
    return !success;
  }
  const now = Date.now();
  const hits = (memoryHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  memoryHits.set(ip, hits);
  return hits.length > LIMIT;
}

export async function POST(request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (await isRateLimited(ip)) {
      // The client shows this state localized (labels.rateLimited).
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const parsed = leadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    const { event_id: eventId, website: honeypot, ...lead } = parsed.data;

    // Honeypot filled → pretend success, write nothing.
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'generic' }, { status: 500 });
    }

    // The offer must exist and be published; its title is taken from the DB,
    // never from the client.
    if (lead.offer_id) {
      const { data: offer } = await admin
        .from('offers')
        .select('id, title_fr, is_published')
        .eq('id', lead.offer_id)
        .maybeSingle();
      if (!offer || !offer.is_published) {
        return NextResponse.json({ error: 'invalid' }, { status: 400 });
      }
      lead.offer_title = offer.title_fr;
    } else {
      lead.offer_title = null;
    }

    const userAgent = request.headers.get('user-agent') ?? null;
    const device = userAgent
      ? /mobile|android|iphone/i.test(userAgent)
        ? 'mobile'
        : 'desktop'
      : null;

    // Journey linking: the visitor cookie is read SERVER-side (same-origin
    // request carries it) so the client cannot claim another visitor's id.
    const vidCookie = request.cookies.get('wt_vid')?.value;
    const visitorId = z.uuid().safeParse(vidCookie).success ? vidCookie : null;

    // The row is written BEFORE any success UI or side effect.
    const row = {
      ...lead,
      visitor_id: visitorId,
      source: lead.source ?? 'website',
      ip: ip === 'unknown' ? null : ip,
      country: request.headers.get('x-vercel-ip-country') ?? null,
      region: request.headers.get('x-vercel-ip-country-region') ?? null,
      geo_city: request.headers.get('x-vercel-ip-city') ?? null,
      device,
      user_agent: userAgent,
    };
    let { data: inserted, error } = await admin.from('leads').insert(row).select('id').single();
    if (error && (row.message != null || row.ip != null)) {
      // leads.message / leads.ip arrive with migrations 012/013 — if not yet
      // applied, NEVER lose the lead over them: retry without both.
      console.error('[lead] insert failed, retrying without message/ip:', error.message);
      const { message: _m, ip: _i, ...compat } = row;
      ({ data: inserted, error } = await admin.from('leads').insert(compat).select('id').single());
    }
    if (error) {
      return NextResponse.json({ error: 'generic' }, { status: 500 });
    }

    // Fire-and-forget: server events (dedup vs pixels) + instant alert email.
    const settings = await getSettings();
    sendLeadEvents(settings, {
      eventId: eventId ?? crypto.randomUUID(),
      phoneE164: toE164(lead.phone),
      ip: ip === 'unknown' ? null : ip,
      userAgent,
      sourceUrl: request.headers.get('referer') ?? SITE_URL,
      fbp: request.cookies.get('_fbp')?.value ?? null,
      fbc: request.cookies.get('_fbc')?.value ?? null,
      ttp: request.cookies.get('_ttp')?.value ?? null,
    });
    sendLeadAlertEmail(settings, { ...lead, id: inserted.id });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'generic' }, { status: 500 });
  }
}
