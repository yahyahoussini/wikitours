import { BRAND } from '@/lib/brand';

/**
 * One OG card design for the whole site (1200×630). Rendered by next/og
 * (Satori), so: no external fonts, explicit top/left/right/bottom instead of
 * `inset`, display:flex on every container, and no textTransform — Satori
 * supports a subset of CSS and silently drops the rest.
 */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';
export const ogAlt = BRAND.lockup;

const GOLD = '#d4af37';
const GOLD_LIGHT = '#e8c766';
const BLACK = '#0d0d0d';

export function OgCard({ title, meta, badge, cover }) {
  const heading = title ?? BRAND.lockup;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        position: 'relative',
        backgroundColor: BLACK,
        padding: 64,
      }}
    >
      {cover ? (
        // Explicit px, not 100%: Satori falls back to the image's intrinsic
        // width, and Supabase won't upscale a source smaller than the box —
        // which left a black strip down the right edge.
        <img
          src={cover}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: ogSize.width,
            height: ogSize.height,
            objectFit: 'cover',
          }}
        />
      ) : null}

      {/* Scrim — keeps the text legible over any photo, and gives the
          photo-less variant a warm gold wash instead of flat black. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          background: cover
            ? 'linear-gradient(90deg, rgba(13,13,13,0.97) 45%, rgba(13,13,13,0.50) 100%)'
            : 'radial-gradient(60% 90% at 20% 50%, rgba(212,175,55,0.20), rgba(13,13,13,1) 70%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          display: 'flex',
          background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', maxWidth: 880 }}>
        {badge ? (
          <div style={{ display: 'flex', marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                border: `2px solid ${GOLD}`,
                color: GOLD,
                borderRadius: 999,
                padding: '6px 22px',
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              {String(badge).toUpperCase()}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            color: '#ffffff',
            fontSize: heading.length > 58 ? 52 : 66,
            fontWeight: 800,
            lineHeight: 1.12,
          }}
        >
          {heading}
        </div>

        {meta ? (
          <div style={{ display: 'flex', color: GOLD_LIGHT, fontSize: 34, fontWeight: 700, marginTop: 18 }}>
            {meta}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 26,
            fontWeight: 600,
            marginTop: 26,
          }}
        >
          {BRAND.lockup}
        </div>
      </div>
    </div>
  );
}
