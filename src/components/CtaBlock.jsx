import WhatsAppIcon from '@/components/WhatsAppIcon';

/**
 * The canonical CTA pattern (LAWS §9): one primary action button with a
 * quieter "ou écrivez-nous sur WhatsApp" link beneath it. CTAs are requests,
 * never purchases (LAWS §6). The WhatsApp line hides when no link is
 * available (LAWS §10).
 */
export default function CtaBlock({
  primaryLabel,
  primaryHref,
  whatsappHref,
  whatsappLabel,
  variant = 'wiki', // 'wiki' (blue on warm white) | 'babmakkah' (gold on black)
  offerId = null, // links analytics events to the offer
}) {
  if (!primaryLabel || !primaryHref) return null;

  // WhatsApp destinations count as whatsapp_click; anything else is cta_click.
  const primaryEvent = primaryHref.includes('wa.me') ? 'whatsapp_click' : 'cta_click';

  const primaryClasses =
    variant === 'babmakkah'
      ? 'bg-wiki-blue text-white hover:bg-wiki-blue/90'
      : 'bg-wiki-blue text-white hover:bg-wiki-blue/90';

  const quietClasses =
    variant === 'babmakkah'
      ? 'text-bm-gold-light hover:text-bm-gold'
      : 'text-bm-black/60 hover:text-bm-black';

  return (
    <div className="flex flex-col items-start gap-3">
      <a
        href={primaryHref}
        data-wt={primaryEvent}
        data-wt-label={primaryLabel}
        data-wt-offer={offerId ?? undefined}
        className={`inline-flex items-center justify-center rounded-ctrl px-7 py-3.5 text-sm font-semibold tracking-wide shadow-lift transition ${primaryClasses}`}
      >
        {primaryLabel}
      </a>
      {whatsappHref && whatsappLabel ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          data-wt="whatsapp_click"
          data-wt-offer={offerId ?? undefined}
          className={`inline-flex items-center gap-2 text-sm underline-offset-4 transition hover:underline ${quietClasses}`}
        >
          <WhatsAppIcon className="size-4" />
          {whatsappLabel}
        </a>
      ) : null}
    </div>
  );
}
