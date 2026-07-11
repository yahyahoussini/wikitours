'use client';

import { useMemo, useState } from 'react';
import { roomStore } from '@/lib/room-store';
import { fireLeadPixels } from '@/lib/pixels';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import Icon from '@/components/site/Icon';

/**
 * Public lead form (the request pattern, LAWS §6: never a purchase).
 * Captures UTM/click ids from the URL at submit time. Labels come from the
 * dictionary via props (server-passed) so the form stays SSR-friendly.
 *
 * The 3 visible fields never grow: the room selector enriches the lead via
 * the room store, a hidden honeypot ('website') catches bots, and a shared
 * event_id lets Meta/TikTok dedup the browser pixel against the server event.
 * The row is written server-side BEFORE the success state renders; success
 * offers a "Continue on WhatsApp" deep link with a localized prefilled
 * message (name, city, offer, price).
 */
export default function LeadForm({
  locale,
  offerId = null,
  offerTitle = null,
  offerPrice = null, // preformatted, e.g. "14 900 MAD"
  whatsappNumber = null,
  labels,
  dark = false,
  source = 'landing_page',
  defaultRoomType = null,
  magnetic = false, // booking card only (B7)
}) {
  const [state, setState] = useState('idle'); // idle | sending | done | rate_limited | error
  const [started, setStarted] = useState(false);
  const [sent, setSent] = useState(null); // { name, city } after success
  const eventId = useMemo(() => (typeof crypto !== 'undefined' ? crypto.randomUUID() : null), []);

  // form_start fires once, on the first field focus (funnel step 2).
  function onFirstFocus() {
    if (started) return;
    setStarted(true);
    window.wt?.track('form_start', { offer_id: offerId ?? undefined });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setState('sending');
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams(window.location.search);
    const name = form.get('full_name');
    const city = form.get('city');
    const phone = form.get('phone');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: name,
          phone,
          city,
          website: form.get('website'), // honeypot
          locale,
          offer_id: offerId,
          offer_title: offerTitle,
          room_type: offerId ? (roomStore.get() ?? defaultRoomType) : null,
          source,
          event_id: eventId,
          utm_source: params.get('utm_source'),
          utm_medium: params.get('utm_medium'),
          utm_campaign: params.get('utm_campaign'),
          utm_content: params.get('utm_content'),
          gclid: params.get('gclid'),
          fbclid: params.get('fbclid'),
        }),
      });
      if (res.ok) {
        setSent({ name, city });
        setState('done');
        window.wt?.track('form_submit', { offer_id: offerId ?? undefined });
        window.wt?.flush?.();
        // Browser-side conversions, deduped against the server via event_id.
        fireLeadPixels({ eventId, phone });
      } else {
        setState(res.status === 429 ? 'rate_limited' : 'error');
      }
    } catch {
      setState('error');
    }
  }

  const inputClasses = dark
    ? 'rounded-ctrl border border-white/20 bg-white/10 px-3 py-2.5 text-base text-white placeholder-white/40 outline-none focus:border-bm-gold'
    : 'rounded-ctrl border border-bm-black/15 bg-white px-3 py-2.5 text-base shadow-hairline outline-none focus:border-wiki-blue';

  if (state === 'done') {
    const digits = String(whatsappNumber ?? '').replace(/\D/g, '');
    let waHref = null;
    if (digits && sent) {
      const template = offerTitle && offerPrice ? labels.waMessage : labels.waMessageGeneric;
      const text = (sent.city ? template : template.replace(/\s*\(\{city\}\)/, ''))
        .replace('{name}', sent.name ?? '')
        .replace('{city}', sent.city ?? '')
        .replace('{offer}', offerTitle ?? '')
        .replace('{price}', offerPrice ?? '');
      waHref = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    }
    return (
      <div className={`flex max-w-md flex-col gap-3 rounded-card p-5 ${dark ? 'bg-white/10' : 'bg-green-50'}`}>
        <p className={`flex items-start gap-2.5 text-sm font-medium ${dark ? 'text-bm-gold-light' : 'text-green-800'}`}>
          <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-bm-gold text-bm-black' : 'bg-green-600 text-white'}`}>
            <Icon name="check" className="size-3.5" />
          </span>
          {labels.success}
        </p>
        <p className={`text-xs leading-relaxed ${dark ? 'text-white/70' : 'text-green-900/70'}`}>
          {labels.reassurance}
        </p>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-wt="whatsapp_click"
            data-wt-label="lead_success"
            data-wt-offer={offerId ?? undefined}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-wiki-blue px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
          >
            <WhatsAppIcon className="size-4" />
            {labels.waContinue}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        {labels.fullName}
        <input name="full_name" required minLength={2} maxLength={80} onFocus={onFirstFocus} className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {labels.phone}
        <input name="phone" type="tel" required minLength={6} onFocus={onFirstFocus} className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {labels.city}
        <input name="city" maxLength={60} onFocus={onFirstFocus} className={inputClasses} />
      </label>
      {/* Honeypot — visually hidden, never autofilled by humans */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state === 'error' ? <p className="text-sm text-red-500">{labels.genericError}</p> : null}
      {state === 'rate_limited' ? (
        <p className={`text-sm ${dark ? 'text-bm-gold-light' : 'text-amber-700'}`}>{labels.rateLimited}</p>
      ) : null}
      <button
        type="submit"
        disabled={state === 'sending'}
        {...(magnetic ? { 'data-magnetic': true } : {})}
        className="cta-shine cta-press mt-1 rounded-ctrl bg-wiki-blue px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90 disabled:opacity-60"
      >
        {state === 'sending' ? '…' : labels.submit}
      </button>
    </form>
  );
}
