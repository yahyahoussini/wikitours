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

/**
 * Blog-queue alert from the daily publish cron (api/cron/publish-articles):
 * fires when a day passed with no release, or when the scheduled runway hits
 * 7 / 3 / 1 / 0 days. RETURNS the send promise so the cron can await it —
 * a serverless function may be frozen before a fire-and-forget fetch lands.
 */
export function sendArticleQueueEmail(settings, status) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !settings?.email) return Promise.resolve();

  const fmt = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'long' }) : '—';
  const headline = status.missedDay
    ? 'Aucun article publié aujourd’hui'
    : status.runwayDays === 0
      ? 'File d’articles vide'
      : `Plus que ${status.runwayDays} jour${status.runwayDays > 1 ? 's' : ''} d’articles programmés`;

  const rows = [
    ['Publiés aujourd’hui', esc(status.released?.length ? status.released.map((a) => a.title_fr ?? a.slug).join(' · ') : 'aucun')],
    ['Articles programmés', esc(String(status.queued ?? 0))],
    ['Dernier programmé pour le', esc(fmt(status.lastScheduledAt))],
    ['Dernière publication', esc(fmt(status.lastReleasedAt))],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">${k}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#0d0d0d">
      <p style="font-size:17px"><strong>${esc(headline)}</strong></p>
      <table style="border-collapse:collapse">${rows}</table>
      <p style="margin-top:12px">Pour garder un article par jour, programmez de nouveaux articles (Articles → « Date de publication ») — chacun sort seul à la date choisie, le matin à 08:00.</p>
      <p style="margin-top:16px">
        <a href="${SITE_URL}/admin/e/articles" style="background:#1398c9;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">
          Ouvrir les articles
        </a>
      </p>
      <p style="color:#999;font-size:12px">${esc(BRAND.parent)} — alerte automatique.</p>
    </div>`;

  return post(
    RESEND_API_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: RESEND_FROM, to: [settings.email], subject: `Blog — ${headline}`, html }),
    },
    'resend-article-queue',
  );
}

/**
 * Review request from the daily AI drafter (api/cron/draft-article). One mail
 * per run: a new draft to review (with the gate's problems, flags and the
 * model's own needs_review list), or why nothing was drafted. Returns the send
 * promise so the cron can await it.
 */
export function sendDraftReviewEmail(settings, info) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !settings?.email) return Promise.resolve();

  const li = (items) => (items?.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p style="color:#666">—</p>');
  let subject;
  let body;

  if (info.kind === 'draft') {
    const slot = new Date(info.article.published_at).toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'long', timeStyle: 'short' });
    const published = !!info.published;
    subject = published
      ? `Publié automatiquement — ${info.article.title_fr}`
      : `Brouillon à relire — ${info.article.title_fr}`;
    body = `
      <p style="font-size:17px"><strong>${published ? 'Article IA publié automatiquement' : 'Nouveau brouillon (IA) à relire'}</strong></p>
      <p><strong>${esc(info.article.title_fr)}</strong><br>
         <span style="color:#666">/blog/${esc(info.article.slug)} · famille : ${esc(info.plan.query_family)} · soutient ${esc(info.plan.owner_path ?? '—')}</span><br>
         ${
           published
             ? `Sortie programmée : <strong>${esc(slot)}</strong> — le contrôle automatique n’a rien signalé. Vous pouvez le relire ou le dépublier à tout moment.`
             : `Créneau proposé : <strong>${esc(slot)}</strong> (il ne sortira que si vous cochez « Publié »).`
         }</p>
      ${!published && info.reasons?.length ? `<p><strong>Pourquoi pas publié automatiquement</strong>${li(info.reasons)}</p>` : ''}
      <p><strong>Bloquant (à corriger avant de publier)</strong>${li(info.gate.problems)}</p>
      <p><strong>À vérifier (signalé par le contrôle automatique)</strong>${li(info.gate.flags)}</p>
      <p><strong>À vérifier (signalé par le rédacteur IA)</strong>${li(info.gate.needs_review)}</p>
      <p><strong>Faits utilisés</strong>${li(info.gate.facts_used)}</p>
      <p style="margin-top:8px;color:#666">Check-list avant « Publié » : exactitude de chaque chiffre · auteur et relecteur renseignés · image de couverture ajoutée · arabe relu · liens internes cliqués.</p>
      <p style="margin-top:16px">
        <a href="${SITE_URL}/admin/e/articles/${esc(info.article.id)}" style="background:#1398c9;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Relire le brouillon</a>
      </p>`;
  } else if (info.kind === 'backlog') {
    subject = `Blog — ${info.pending} brouillons IA en attente, rédaction en pause`;
    body = `<p style="font-size:17px"><strong>${info.pending} brouillons attendent une relecture</strong></p>
      <p>Le rédacteur IA ne produit plus rien tant que la file n’est pas relue (plafond : ${info.pending}). Relisez et cochez « Publié » — ou supprimez — pour reprendre.</p>
      <p style="margin-top:16px"><a href="${SITE_URL}/admin/e/articles" style="background:#1398c9;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Ouvrir les articles</a></p>`;
  } else if (info.kind === 'empty-plan') {
    subject = 'Blog — plan éditorial vide, aucun brouillon produit';
    body = `<p style="font-size:17px"><strong>Le plan éditorial est vide</strong></p>
      <p>Aucun sujet actif et en attente (ou tous les sujets saisonniers sont à plus de 3 mois). Ajoutez des lignes au plan pour que la rédaction quotidienne reprenne.</p>
      <p style="margin-top:16px"><a href="${SITE_URL}/admin/e/plan-articles" style="background:#1398c9;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Ouvrir le plan éditorial</a></p>`;
  } else {
    subject = `Blog — échec du brouillon du jour (${info.error})`;
    body = `<p style="font-size:17px"><strong>Le brouillon du jour n’a pas pu être produit</strong></p>
      <p>Sujet : ${esc(info.plan?.query_family ?? '—')}<br>Erreur : <code>${esc(info.error)}</code>${info.detail ? `<br>${esc(info.detail)}` : ''}</p>
      <p>Le sujet reste en file ; nouvel essai demain. Si l’erreur persiste, vérifiez la clé API et le plan.</p>`;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#0d0d0d">
      ${body}
      <p style="color:#999;font-size:12px">${esc(BRAND.parent)} — alerte automatique.</p>
    </div>`;

  return post(
    RESEND_API_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: RESEND_FROM, to: [settings.email], subject, html }),
    },
    'resend-draft-review',
  );
}
