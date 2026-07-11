import { createHash } from 'node:crypto';
import { BRAND } from '@/lib/brand';

/**
 * Server-side marketing side effects fired AFTER a lead row is written:
 * Meta CAPI + TikTok Events API (deduped against the browser pixels via the
 * shared event_id) and the instant new-lead alert email (Resend).
 * ALL of it is fire-and-forget — a failure is logged and never blocks the
 * lead or the response. Never import this module client-side.
 *
 * Endpoint bases are env-overridable so the local harness can assert the
 * exact payloads without reaching the real platforms.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wikitours.ma';
const META_CAPI_URL = process.env.META_CAPI_URL ?? 'https://graph.facebook.com/v19.0';
const TIKTOK_EVENTS_URL =
  process.env.TIKTOK_EVENTS_URL ?? 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const RESEND_API_URL = process.env.RESEND_API_URL ?? 'https://api.resend.com/emails';
// Until the sending domain is verified in Resend, use their onboarding sender.
const RESEND_FROM = process.env.RESEND_FROM ?? `${BRAND.parent} <onboarding@resend.dev>`;

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** "06 12-34 56 78" / "+212612345678" → E.164 "+212612345678" (null if not possible). */
export function toE164(phone) {
  const cleaned = String(phone ?? '').replace(/[\s.\-()]/g, '');
  if (/^0[5-7]\d{8}$/.test(cleaned)) return `+212${cleaned.slice(1)}`;
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  return null;
}

async function post(url, options, label) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.error(`[marketing] ${label} responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
  } catch (err) {
    console.error(`[marketing] ${label} failed:`, err?.message ?? err);
  }
}

/**
 * Meta CAPI + TikTok Events API for one lead. `ctx` carries the request-scope
 * facts: eventId, phoneE164, ip, userAgent, sourceUrl, fbp, fbc, ttp.
 */
export function sendLeadEvents(settings, ctx) {
  const eventTime = Math.floor(Date.now() / 1000);

  if (settings?.meta_pixel_id && settings?.meta_capi_token) {
    // Meta wants digits-only E.164 (no "+"), sha256.
    const body = {
      data: [
        {
          event_name: 'Lead',
          event_time: eventTime,
          event_id: ctx.eventId,
          action_source: 'website',
          event_source_url: ctx.sourceUrl,
          user_data: {
            ...(ctx.phoneE164 ? { ph: [sha256(ctx.phoneE164.slice(1))] } : {}),
            ...(ctx.ip ? { client_ip_address: ctx.ip } : {}),
            ...(ctx.userAgent ? { client_user_agent: ctx.userAgent } : {}),
            ...(ctx.fbp ? { fbp: ctx.fbp } : {}),
            ...(ctx.fbc ? { fbc: ctx.fbc } : {}),
          },
        },
      ],
    };
    void post(
      `${META_CAPI_URL}/${settings.meta_pixel_id}/events?access_token=${encodeURIComponent(settings.meta_capi_token)}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
      'meta-capi',
    );
  }

  if (settings?.tiktok_pixel_id && settings?.tiktok_events_token) {
    const body = {
      event_source: 'web',
      event_source_id: settings.tiktok_pixel_id,
      data: [
        {
          event: 'SubmitForm',
          event_time: eventTime,
          event_id: ctx.eventId,
          user: {
            ...(ctx.phoneE164 ? { phone: sha256(ctx.phoneE164) } : {}),
            ...(ctx.ip ? { ip: ctx.ip } : {}),
            ...(ctx.userAgent ? { user_agent: ctx.userAgent } : {}),
            ...(ctx.ttp ? { ttp: ctx.ttp } : {}),
          },
          page: { url: ctx.sourceUrl },
        },
      ],
    };
    void post(
      TIKTOK_EVENTS_URL,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Access-Token': settings.tiktok_events_token },
        body: JSON.stringify(body),
      },
      'tiktok-events',
    );
  }
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Instant new-lead alert to the agency inbox (settings.email) via Resend. */
export function sendLeadAlertEmail(settings, lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !settings?.email) return;

  const digits = String(lead.phone ?? '').replace(/\D/g, '');
  const crmUrl = `${SITE_URL}/admin/crm/${lead.id}`;
  const rows = [
    ['Nom', esc(lead.full_name)],
    ['Ville', esc(lead.city ?? '—')],
    [
      'Téléphone',
      `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a> · <a href="https://wa.me/${digits}">WhatsApp</a>`,
    ],
    ['Offre', esc(lead.offer_title ?? '—')],
    ...(lead.room_type ? [['Chambre', esc(lead.room_type)]] : []),
    ['Source', esc(lead.source ?? '—')],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">${k}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#0d0d0d">
      <p style="font-size:17px"><strong>Nouveau lead — ${esc(lead.full_name)}</strong></p>
      <table style="border-collapse:collapse">${rows}</table>
      <p style="margin-top:16px">
        <a href="${crmUrl}" style="background:#1398c9;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">
          Ouvrir dans le CRM
        </a>
      </p>
      <p style="color:#999;font-size:12px">${esc(BRAND.parent)} — alerte automatique.</p>
    </div>`;

  void post(
    RESEND_API_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [settings.email],
        subject: `Nouveau lead — ${lead.full_name}${lead.offer_title ? ` · ${lead.offer_title}` : ''}`,
        html,
      }),
    },
    'resend-alert',
  );
}
