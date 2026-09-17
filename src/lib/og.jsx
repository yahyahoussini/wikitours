import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';
import { dirFor } from '@/lib/i18n';

/**
 * One OG card design for the whole site (1200×630). Rendered by next/og
 * (Satori), so: explicit top/left/right/bottom instead of `inset`,
 * display:flex on every container, and no textTransform — Satori supports a
 * subset of CSS and silently drops the rest. Latin cards use Satori's bundled
 * font; Arabic cards need Tajawal (see arabicFonts()).
 */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';
export const ogAlt = BRAND.lockup;

const GOLD = '#d4af37';
const GOLD_LIGHT = '#e8c766';
const BLACK = '#0d0d0d';

// Without a font carrying Arabic glyphs, @vercel/og downloads Noto Sans Arabic
// from Google Fonts at render time, and opentype.js throws on its GSUB table
// ("lookupType: 5 - substFormat: 3 is not yet supported") — every /ar card
// was a 500. Tajawal (the site's Arabic family) shapes cleanly. The files are
// read once per instance; literal paths so Vercel's file tracing ships them.
// Source: github.com/google/fonts/tree/main/ofl/tajawal — SIL Open Font License 1.1.
let arabicFontsPromise;
function arabicFonts() {
  arabicFontsPromise ??= Promise.all([
    readFile(join(process.cwd(), 'src/assets/fonts/Tajawal-Bold.ttf')),
    readFile(join(process.cwd(), 'src/assets/fonts/Tajawal-ExtraBold.ttf')),
  ]).then(([bold, extraBold]) => [
    { name: 'Tajawal', data: bold, weight: 700, style: 'normal' },
    { name: 'Tajawal', data: extraBold, weight: 800, style: 'normal' },
  ]);
  arabicFontsPromise.catch(() => { arabicFontsPromise = undefined; });
  return arabicFontsPromise;
}

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN = /\p{Script=Latin}/u;
const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '«': '»', '»': '«', '<': '>', '>': '<' };
const mirror = (s) => [...s].map((c) => MIRROR[c] ?? c).join('');

// Arabic letter → its presentation forms [isolated, final, initial, medial]
// (U+FE80 block, in code-point order; right-joining letters have two forms).
const FORM_COUNTS = [
  [0x0621, 1], [0x0622, 2], [0x0623, 2], [0x0624, 2], [0x0625, 2], [0x0626, 4], [0x0627, 2],
  [0x0628, 4], [0x0629, 2], [0x062a, 4], [0x062b, 4], [0x062c, 4], [0x062d, 4], [0x062e, 4],
  [0x062f, 2], [0x0630, 2], [0x0631, 2], [0x0632, 2], [0x0633, 4], [0x0634, 4], [0x0635, 4],
  [0x0636, 4], [0x0637, 4], [0x0638, 4], [0x0639, 4], [0x063a, 4], [0x0641, 4], [0x0642, 4],
  [0x0643, 4], [0x0644, 4], [0x0645, 4], [0x0646, 4], [0x0647, 4], [0x0648, 2], [0x0649, 2],
  [0x064a, 4],
];
const FORMS = new Map();
for (let i = 0, next = 0xfe80; i < FORM_COUNTS.length; next += FORM_COUNTS[i][1], i += 1) {
  const [letter, count] = FORM_COUNTS[i];
  FORMS.set(letter, Array.from({ length: count }, (_, k) => next + k));
}
// Lam + alef (آ أ إ ا) is a mandatory ligature: [isolated, final].
const LAM_ALEF = new Map([[0x0622, 0xfef5], [0x0623, 0xfef7], [0x0625, 0xfef9], [0x0627, 0xfefb]]);
const TATWEEL = 0x0640;
// opentype.js's isArabicChar() range.
const OPENTYPE_RTL_RUN = /[\u0600-\u065F\u066A-\u06D2\u06D6-\u06ED\u06FA-\u06FF]+/g;
const isMark = (cp) => (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670;
const joinsLeft = (cp) => cp === TATWEEL || FORMS.get(cp)?.length === 4;
const joinsRight = (cp) => cp === TATWEEL || (FORMS.get(cp)?.length ?? 0) >= 2;

/**
 * Satori measures a word grapheme by grapheme, i.e. with the wide isolated
 * letter forms, then draws it shaped — so every Arabic word got a box wider
 * than its ink (ragged gaps, early wraps). Writing the word in presentation
 * forms makes each grapheme already the glyph that is drawn, so the measure
 * is exact. A word with a letter outside the table is left to Satori.
 * Harakat are dropped: with no mark positioning they landed between letters,
 * and display Arabic reads naturally without them.
 */
function shapeArabic(word) {
  const cps = [...word].map((c) => c.codePointAt(0)).filter((cp) => !isMark(cp));
  const unknownLetter = (cp) => {
    const c = String.fromCodePoint(cp);
    return ARABIC.test(c) && /\p{L}/u.test(c) && !FORMS.has(cp) && cp !== TATWEEL;
  };
  if (cps.some(unknownLetter)) return word;
  const out = [];
  for (let i = 0; i < cps.length; i += 1) {
    const [prev, cp, next] = [cps[i - 1], cps[i], cps[i + 1]];
    const forms = FORMS.get(cp);
    const joinedBefore = prev !== undefined && joinsLeft(prev);
    if (!forms) {
      out.push(cp);
    } else if (cp === 0x0644 && LAM_ALEF.has(next)) {
      out.push(LAM_ALEF.get(next) + (joinedBefore ? 1 : 0));
      i += 1; // the alef is inside the ligature
    } else {
      const joinedAfter = forms.length === 4 && next !== undefined && joinsRight(next);
      const form = joinedBefore ? (joinedAfter ? 3 : 1) : joinedAfter ? 2 : 0;
      // Tajawal has no isolated presentation forms (it draws them from the
      // base letter, which is also what Satori measures): keep the letter.
      // A letter with fewer forms (the hamza has one) keeps its base code point
      // too, whatever its neighbours.
      const idx = Math.min(form, forms.length - 1);
      out.push(idx === 0 ? cp : forms[idx]);
    }
  }
  // Presentation forms are drawn as given, left to right, so the word goes
  // to Satori in visual order. opentype.js still reverses every run of
  // U+0600-block letters (the isolated ones) when it draws; pre-reverse those
  // runs to cancel it.
  const visual = String.fromCodePoint(...out.reverse());
  return visual.replace(OPENTYPE_RTL_RUN, (run) => [...run].reverse().join(''));
}

/**
 * Satori orders the words of a mixed Arabic line left-to-right ("2027 — 15"
 * and "ويكي تورز —" came out reversed). So the line is cut into words in
 * logical order and laid out by a row-reverse flex row: an Arabic word is
 * pre-shaped, a Latin run stays one LTR item, numbers and punctuation take
 * their bidi position, a bracket is mirrored, and a word's punctuation never
 * wraps away from it.
 */
function rtlWords(text) {
  const words = [];
  let lastBareLatin = false;
  // U+202F (Intl's thousands separator in some ICU builds) is not in Tajawal;
  // a missing glyph would send Satori back to Google Fonts.
  for (const token of String(text).replace(/\u202f/g, '\u00a0').split(/ +/).filter(Boolean)) {
    // Diacritics (\p{M}, e.g. the tanwin in "يوماً") belong to the word.
    const [, lead, core, trail] = token.match(/^([^\p{L}\p{N}\p{M}]*)(.*?)([^\p{L}\p{N}\p{M}]*)$/u);
    const arabic = ARABIC.test(core);
    const latin = !arabic && LATIN.test(core);
    const number = !arabic && !latin && core !== '';
    if (lastBareLatin && !lead && (latin || number)) {
      // "Bab Makka", "Wiki Tours 2026": one left-to-right run.
      const parts = words[words.length - 1];
      parts[parts.length - 1] += ` ${core}`;
      if (trail) parts.push(mirror(trail));
    } else {
      words.push([lead && mirror(lead), core && (arabic ? shapeArabic(core) : core), trail && mirror(trail)].filter(Boolean));
    }
    lastBareLatin = (latin || (number && lastBareLatin)) && !trail;
  }
  return words;
}

function RtlLine({ text, style, gap }) {
  return (
    <div style={{ ...style, display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
      {rtlWords(text).map((parts, i) => (
        // The gap sits on the word's left (the side the next word goes), so a
        // wrapped line keeps a flush right edge.
        <div key={i} style={{ display: 'flex', flexDirection: 'row-reverse', marginLeft: gap }}>
          {parts.map((part, k) => (
            <div key={k} style={{ display: 'flex' }}>
              {part}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function OgCard({ title, meta, badge, cover, scale = 1, locale }) {
  const rtl = dirFor(locale) === 'rtl';
  const heading = title ?? (rtl ? BRAND.lockupAr : BRAND.lockup);
  const lockup = rtl ? BRAND.lockupAr : BRAND.lockup;
  // `scale` lets the same card render at 1600×900 (the article hero) with the
  // type sized for the larger canvas; 1 is the 1200×630 share card.
  const s = (n) => Math.round(n * scale);
  // One text block: a plain flex div for Latin (unchanged), RtlLine for Arabic.
  const line = (text, style) =>
    rtl ? (
      <RtlLine text={text} style={style} gap={Math.round((style.fontSize ?? 16) * 0.28)} />
    ) : (
      <div style={{ display: 'flex', ...style }}>{text}</div>
    );
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
        padding: s(64),
        ...(rtl ? { alignItems: 'flex-end', fontFamily: 'Tajawal' } : null),
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
          photo-less variant a warm gold wash instead of flat black. Mirrored
          for Arabic, whose text block sits on the right. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          background: cover
            ? `linear-gradient(${rtl ? 270 : 90}deg, rgba(13,13,13,0.97) 45%, rgba(13,13,13,0.50) 100%)`
            : `radial-gradient(60% 90% at ${rtl ? 80 : 20}% 50%, rgba(212,175,55,0.20), rgba(13,13,13,1) 70%)`,
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

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: s(880),
          ...(rtl ? { alignItems: 'flex-end' } : null),
        }}
      >
        {badge ? (
          <div style={{ display: 'flex', marginBottom: s(20) }}>
            <div
              style={{
                display: 'flex',
                border: `2px solid ${GOLD}`,
                color: GOLD,
                borderRadius: 999,
                padding: `${s(6)}px ${s(22)}px`,
                fontSize: s(24),
                fontWeight: 700,
                // Letter-spacing would pull joined Arabic letters apart.
                letterSpacing: rtl ? 0 : 2,
              }}
            >
              {rtl ? line(String(badge), { fontSize: s(24) }) : String(badge).toUpperCase()}
            </div>
          </div>
        ) : null}

        {line(heading, {
          color: '#ffffff',
          fontSize: s(heading.length > 58 ? 52 : 66),
          fontWeight: 800,
          lineHeight: 1.12,
        })}

        {meta ? line(meta, { color: GOLD_LIGHT, fontSize: s(34), fontWeight: 700, marginTop: s(18) }) : null}

        {line(lockup, {
          color: 'rgba(255,255,255,0.72)',
          fontSize: s(26),
          fontWeight: 600,
          marginTop: s(26),
        })}
      </div>
    </div>
  );
}

/**
 * Renders an OgCard and never throws. ImageResponse renders lazily inside its
 * body stream, so a Satori failure used to surface as a 500 after the headers
 * were sent; buffering it here makes the failure catchable, and the fallback
 * is the language-neutral card (Latin lockup, no photo, bundled font).
 */
export async function ogResponse(card, { size = ogSize, headers } = {}) {
  try {
    const fonts = dirFor(card.locale) === 'rtl' ? await arabicFonts() : null;
    const res = new ImageResponse(<OgCard {...card} />, { ...size, headers, ...(fonts ? { fonts } : null) });
    const body = await res.arrayBuffer();
    return new Response(body, { status: res.status, headers: res.headers });
  } catch (err) {
    console.error('[og] render failed, serving the neutral card:', card.locale, err?.message ?? err);
    return new ImageResponse(<OgCard scale={card.scale} />, { ...size, headers });
  }
}
