import Image from 'next/image';
import { getDictionary } from '@/lib/i18n';

const SIZES = {
  sm: { logo: 'h-8', plaque: 'text-[9px]' },
  md: { logo: 'h-12', plaque: 'text-[10px]' },
  lg: { logo: 'h-16', plaque: 'text-xs' },
};

/**
 * BRAND LAW: every Bab Makkah surface carries the lockup — the Bab Makkah
 * logo with a "by WIKI TOURS" plaque (mirrored automatically in RTL via
 * logical properties). Never present Bab Makkah as independent.
 */
export default function BrandLockup({ locale, size = 'md', className = '' }) {
  const t = getDictionary(locale);
  const s = SIZES[size] ?? SIZES.md;

  return (
    <span className={`inline-flex items-end gap-2 ${className}`}>
      <Image
        src="/brand/bab-makka-logo.png"
        alt="Bab Makka"
        width={5888}
        height={3640}
        // Tiny display (≤~130px) — cap the served resolution (was pulling the
        // 3840px source) and pin the aspect ratio so space is reserved before
        // load, killing the footer CLS Lighthouse flagged.
        sizes="130px"
        style={{ aspectRatio: '5888 / 3640' }}
        className={`w-auto ${s.logo}`}
      />
      {/* Filled gold pill (not gold-on-transparent) so it clears WCAG AA on
          BOTH light and dark surfaces — the old gold text failed contrast on
          the light packages/why-us bands. */}
      <span
        className={`mb-1 rounded-full bg-bm-gold px-2 py-0.5 font-semibold uppercase tracking-[0.18em] text-bm-black ${s.plaque}`}
      >
        {t.brand.byParent}
      </span>
    </span>
  );
}
