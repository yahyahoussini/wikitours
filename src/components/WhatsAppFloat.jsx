import { getSettings } from '@/lib/data/settings';
import { getDictionary } from '@/lib/i18n';
import { waLink } from '@/lib/whatsapp';
import WhatsAppIcon from '@/components/WhatsAppIcon';

/**
 * Global floating WhatsApp button — bottom-end of every public page
 * (LAWS §9). Hidden when no number is configured (LAWS §10).
 */
export default async function WhatsAppFloat({ locale }) {
  const settings = await getSettings();
  const href = waLink(settings?.whatsapp_number);
  if (!href) return null;

  const t = getDictionary(locale);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-wt="whatsapp_click"
      data-wt-label="float"
      aria-label={t.cta.whatsappFloatLabel}
      className="fixed bottom-6 end-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-float transition hover:scale-105"
      style={{ animation: 'wa-pulse 2.6s ease-out infinite' }}
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
