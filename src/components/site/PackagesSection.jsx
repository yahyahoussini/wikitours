'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import Icon from '@/components/site/Icon';
import { publicMediaUrl } from '@/lib/media';
import { BLUR_DATA_URL } from '@/lib/blur';

const nf = new Intl.NumberFormat('fr-MA');

function isPast(offer) {
  return offer.date_end && offer.date_end < new Date().toISOString().slice(0, 10);
}

/** "16 → 30 août 2026" — start day collapses when both dates share the month. */
function formatDateRange(startISO, endISO, locale) {
  const loc = locale === 'ar' ? 'ar-MA' : `${locale}-MA`;
  const start = new Date(startISO);
  const end = new Date(endISO);
  const full = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = sameMonth
    ? new Intl.DateTimeFormat(loc, { day: 'numeric', timeZone: 'UTC' }).format(start)
    : new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(start);
  return `${startLabel} → ${full.format(end)}`;
}

const ROOM_KEYS = ['double', 'triple', 'quad', 'quint'];

/**
 * The (gamme × room) combination whose per-person price is the offer's
 * displayed minimum. Prices live on offer_tiers; offers that predate the tiers
 * model still carry them on the offer row itself, so fall back to that.
 */
function cheapestCombo(offer) {
  const sources = offer.tiers?.length ? offer.tiers : [offer];
  let best = null;
  for (const tier of sources) {
    for (const room of ROOM_KEYS) {
      const price = tier[`price_${room}`];
      if (typeof price !== 'number' || price <= 0) continue;
      if (!best || price < best.price) best = { tier, room, price };
    }
  }
  return best;
}

/**
 * OFFER CARD v3 — everything scannable in ~3 seconds, dates first-class,
 * price honesty micro-line (which room the price means). The whole card is
 * one stretched link; the action buttons sit above it (z-10).
 */
export function OfferCard({ offer, locale, t, whatsappHref, compact = false }) {
  const full = offer.status === 'full';
  const title = offer[`title_${locale}`] || offer.title_fr;
  const occasionName = offer.occasion
    ? offer.occasion[`name_${locale}`] || offer.occasion.name_fr
    : null;
  const tiers = offer.tiers ?? [];
  const combo = cheapestCombo(offer);
  // Everything below describes the gamme the displayed "from" price belongs to,
  // so the card never pairs one gamme's price with another's hotel (LAWS §6).
  const priceTier = combo?.tier ?? tiers[0] ?? null;
  const tierLabel = priceTier?.label ?? offer.tier_label ?? null;
  const makkahHotel = priceTier?.hotel_makkah ?? offer.hotel_makkah ?? null;
  const price = combo?.price ?? offer.starting_price;
  const minRoom = combo?.room ?? null;
  const distance = priceTier?.distance_to_haram_m ?? makkahHotel?.distance_to_haram_m ?? null;
  const logoUrl = publicMediaUrl(makkahHotel?.logo_path);

  return (
    <article
      data-reveal
      // wt-motion adds is-in/transition-delay before this lazy boundary
      // hydrates — suppress that expected attribute diff.
      suppressHydrationWarning
      className={`group relative flex h-full flex-col overflow-hidden rounded-panel border border-bm-black/10 bg-white shadow-lift transition duration-300 hover:border-bm-gold/40 hover:shadow-float ${
        full ? 'opacity-55 saturate-50' : ''
      }`}
    >
      {/* Whole-card link (keyboard-focusable); buttons below sit above it */}
      <Link
        href={`/${locale}/omra/${offer.slug}`}
        aria-label={title ?? t.details}
        className="absolute inset-0 z-[1] rounded-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-bm-gold"
      />

      <div className="relative aspect-[16/10] overflow-hidden">
        {offer.cover ? (
          <Image
            src={offer.cover.src}
            alt={offer.cover.alt ?? title ?? ''}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover transition duration-500 ease-luxe group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-bm-black/5" />
        )}
        {occasionName ? (
          <span className="absolute start-3 top-3 rounded-full bg-bm-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-bm-black">
            {occasionName}
          </span>
        ) : null}
        {/* Honest status straight from the DB (LAWS §6) */}
        <span
          className={`absolute end-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold ${
            offer.status === 'open'
              ? 'bg-white/90 text-bm-black'
              : offer.status === 'few_left'
                ? 'bg-amber-400 text-bm-black'
                : 'bg-bm-black/80 text-white'
          }`}
        >
          {t.status[offer.status]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 text-bm-black">
        {/* DATE CHIP — the #1 scan target, first-class */}
        {offer.date_start && offer.date_end ? (
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-bm-gold/40 bg-bm-gold/10 px-3.5 py-1.5 text-sm font-bold text-bm-gold">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-current">
              <path d="M4 0v2H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2V0h-2v2H6V0H4Zm10 6v8H2V6h12Z" />
            </svg>
            <span className="tabular-nums">{formatDateRange(offer.date_start, offer.date_end, locale)}</span>
          </p>
        ) : null}

        <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold leading-snug">
          {title}
          {tierLabel && t.tier?.[tierLabel] ? (
            <span className="rounded-full border border-bm-gold/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-bm-gold">
              {t.tier[tierLabel]}
            </span>
          ) : null}
        </h2>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bm-black/55">
          {offer.duration_days && offer.duration_nights ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5 text-bm-black/40" />
              {t.duration.replace('{days}', offer.duration_days).replace('{nights}', offer.duration_nights)}
            </span>
          ) : null}
          {offer.airline ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="plane" className="size-3.5 text-bm-black/40" />
              {offer.airline}
            </span>
          ) : null}
          {offer.land_only ? <span>{t.landOnly}</span> : null}
          {priceTier?.breakfast_included ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="coffee" className="size-3.5 text-bm-black/40" />
              {t.breakfastIncluded}
            </span>
          ) : null}
        </p>

        {makkahHotel ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-bm-black/70">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny brand mark
              <img src={logoUrl} alt="" className="h-5 w-auto rounded-[4px] bg-white/90 px-1 py-0.5" />
            ) : null}
            <span className="truncate">{makkahHotel.name}</span>
            {distance != null ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-bm-gold/50 px-2 py-0.5 text-[11px] font-semibold text-bm-gold">
                <Icon name="pin" className="size-3" />
                {t.distanceToHaram.replace('{m}', distance)}
              </span>
            ) : null}
          </p>
        ) : null}

        {price != null ? (
          <div className="mt-auto">
            <p>
              <span className="text-xs text-bm-black/50">{t.from} </span>
              <span className="bg-gradient-to-b from-bm-gold-light to-bm-gold bg-clip-text text-2xl font-bold tabular-nums text-transparent">
                {nf.format(price)}
              </span>
              <span className="text-sm font-semibold text-bm-gold"> {t.currency}</span>
              <span className="text-xs text-bm-black/50"> / {t.perPerson}</span>
            </p>
            {/* Price honesty: which room this price means */}
            {minRoom ? (
              <p className="mt-0.5 text-[11px] text-bm-black/55">
                {t.priceInRoom.replace('{room}', t.roomShort[minRoom])}
              </p>
            ) : null}
          </div>
        ) : null}

        {compact ? null : (
          <div className="relative z-10 flex flex-col gap-2">
            <Link
              href={`/${locale}/omra/${offer.slug}#reserver`}
              data-wt="cta_click"
              data-wt-label="card_reserve"
              data-wt-offer={offer.id}
              className="rounded-ctrl bg-wiki-blue px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
            >
              {t.reserve}
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-wt="whatsapp_click"
                data-wt-offer={offer.id}
                className="inline-flex items-center justify-center gap-2 text-xs text-bm-black/50 underline-offset-4 transition hover:text-bm-black hover:underline"
              >
                <WhatsAppIcon className="size-3.5" />
                {t.whatsappAlt}
              </a>
            ) : null}
            <Link
              href={`/${locale}/omra/${offer.slug}`}
              className="inline-block py-1.5 text-center text-xs font-medium text-bm-gold underline-offset-4 hover:underline"
            >
              {t.details} →
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Offer grid with client-side occasion filter. ALL cards are in the served
 * HTML (LAWS §3) — filtering only fades them. mode="archive" adds month
 * pills, pushes full offers to the end and syncs filters to the URL
 * (shareable) via replaceState without losing ISR.
 */
export default function PackagesSection({
  offers,
  occasions,
  locale,
  t,
  whatsappHref,
  mode = 'home',
  months = null,
  initialOccasion = '',
  initialMonth = '',
}) {
  const [occasion, setOccasion] = useState(initialOccasion);
  const [month, setMonth] = useState(initialMonth);

  function syncUrl(nextOccasion, nextMonth) {
    if (mode !== 'archive') return;
    const params = new URLSearchParams();
    if (nextOccasion) params.set('occasion', nextOccasion);
    if (nextMonth) params.set('mois', nextMonth);
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }

  const list = useMemo(() => {
    const filtered = offers.filter((o) => {
      if (occasion && o.occasion?.slug !== occasion) return false;
      if (month !== '' && (!o.date_start || new Date(o.date_start).getUTCMonth() !== Number(month))) return false;
      return true;
    });
    if (mode === 'archive') {
      // featured → date, full ones greyed at the end
      return [
        ...filtered.filter((o) => o.status !== 'full'),
        ...filtered.filter((o) => o.status === 'full'),
      ];
    }
    return filtered;
  }, [offers, occasion, month, mode]);

  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
      active ? 'bg-bm-gold text-bm-black' : 'bg-bm-black/5 text-bm-black/70 hover:bg-bm-black/10 hover:text-bm-black'
    }`;

  return (
    <div className="flex flex-col gap-6">
      {occasions.length > 0 ? (
        <div
          id="par-occasion"
          className={`flex flex-wrap items-center gap-2 ${mode === 'archive' ? 'sticky top-20 z-30 rounded-full bg-white/90 p-2 shadow-hairline backdrop-blur' : ''}`}
        >
          <button type="button" onClick={() => { setOccasion(''); syncUrl('', month); }} className={pill(occasion === '')}>
            {t.filterAll}
          </button>
          {occasions.map((o) => (
            <button
              key={o.slug}
              type="button"
              onClick={() => { setOccasion(o.slug); syncUrl(o.slug, month); }}
              className={pill(occasion === o.slug)}
            >
              {o[`name_${locale}`] || o.name_fr}
            </button>
          ))}
          {mode === 'archive' && months ? (
            <select
              id="par-mois"
              aria-label={t.monthAll}
              value={month}
              onChange={(e) => { setMonth(e.target.value); syncUrl(occasion, e.target.value); }}
              className="ms-auto rounded-full bg-bm-black/5 px-3 py-1.5 text-sm font-semibold text-bm-black outline-none"
            >
              <option value="">{t.monthAll}</option>
              {months.map((m) => (
                <option key={m.value} value={m.value} className="text-bm-black">
                  {m.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((offer) => (
          <OfferCard key={offer.id} offer={offer} locale={locale} t={t} whatsappHref={whatsappHref} />
        ))}
      </div>
      {list.length === 0 ? <p className="text-sm text-bm-black/50">—</p> : null}
    </div>
  );
}
