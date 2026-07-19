import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const BOT_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pingdom|facebookexternalhit|preview|monitor|curl|wget|python-requests/i;

const short = (max) =>
  z.preprocess((v) => (v === '' ? null : v), z.string().max(max).nullable().optional());

const eventSchema = z.object({
  // web_vital carries the metric in m.label ('LCP:2400' | 'CLS:0.052' | 'INP:120').
  t: z.enum([
    'pageview',
    'offer_view',
    'form_start',
    'form_submit',
    'whatsapp_click',
    'cta_click',
    'web_vital',
    'tier_select',
    'room_select',
    'tel_click',
    'faq_expand',
    'devis_request',
  ]),
  p: z.string().max(500),
  o: z.preprocess((v) => (v ? v : null), z.uuid().nullable().optional()),
  m: z.object({ label: z.string().max(200).optional() }).nullable().optional(),
  ts: z.number().int().positive(),
});

const bodySchema = z.object({
  h: z.literal('1').optional(),
  vid: z.uuid(),
  sid: z.uuid(),
  nv: z.boolean().optional(),
  ns: z.boolean().optional(),
  ft: z
    .object({ s: short(300), m: short(300), c: short(300), t: short(300), g: short(300), f: short(300), r: short(600) })
    .nullable()
    .optional(),
  utm: z.object({ s: short(300), m: short(300), c: short(300) }).optional(),
  ref: short(600),
  ev: z.array(eventSchema).min(1).max(20),
});

/** In-memory limiter (per instance): 60 batches/min/IP is plenty for humans. */
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 60;
}

function deviceOf(ua) {
  if (!ua) return null;
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export async function POST(request) {
  try {
    const ua = request.headers.get('user-agent') ?? '';
    let raw;
    try {
      raw = await request.json();
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    // Honeypot: real beacons send the x-wt header (fetch keepalive) or the
    // body token (sendBeacon fallback). Bots replaying HTML forms send neither.
    if (request.headers.get('x-wt') !== '1' && raw?.h !== '1') {
      return new NextResponse(null, { status: 204 });
    }
    if (BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (limited(ip)) return new NextResponse(null, { status: 204 });

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return new NextResponse(null, { status: 204 });
    const body = parsed.data;

    const admin = supabaseAdmin();
    if (!admin) return new NextResponse(null, { status: 204 });

    const geo = {
      country: request.headers.get('x-vercel-ip-country') ?? null,
      region: request.headers.get('x-vercel-ip-country-region') ?? null,
      city: request.headers.get('x-vercel-ip-city') ?? null,
    };
    const device = deviceOf(ua);
    const ft = body.ft ?? {};

    if (body.nv) {
      await admin.from('visitors').upsert(
        {
          id: body.vid,
          first_utm_source: ft.s ?? body.utm?.s ?? null,
          first_utm_medium: ft.m ?? body.utm?.m ?? null,
          first_utm_campaign: ft.c ?? body.utm?.c ?? null,
          first_referrer: ft.r ?? body.ref ?? null,
          ...geo,
          device,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
    }

    if (body.ns) {
      const entry = body.ev.find((e) => e.t === 'pageview')?.p ?? body.ev[0].p;
      await admin.from('sessions').upsert(
        {
          id: body.sid,
          visitor_id: body.vid,
          entry_path: entry,
          referrer: body.ref ?? null,
          utm_source: body.utm?.s ?? null,
          utm_medium: body.utm?.m ?? null,
          utm_campaign: body.utm?.c ?? null,
          ...geo,
          device,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
    }

    await admin.from('events').insert(
      body.ev.map((e) => ({
        session_id: body.sid,
        visitor_id: body.vid,
        ts: new Date(e.ts).toISOString(),
        type: e.t,
        path: e.p,
        offer_id: e.o ?? null,
        meta: e.m ?? null,
      })),
    );

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
