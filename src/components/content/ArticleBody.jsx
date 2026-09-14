import { renderMarkdown, markdownClass, minHeadingDepth } from '@/lib/markdown';
import { parseContentTags } from '@/lib/content-tags';
import CommercialCTA from '@/components/content/CommercialCTA';
import LiveDepartures from '@/components/content/LiveDepartures';
import ReviewQuote from '@/components/content/ReviewQuote';
import HijriCountdown from '@/components/content/HijriCountdown';
import DepositPolicy from '@/components/content/DepositPolicy';
import HotelList from '@/components/content/HotelList';

const COMPONENTS = { CommercialCTA, LiveDepartures, ReviewQuote, HijriCountdown, DepositPolicy, HotelList };

/**
 * An article body: markdown prose written ahead of time, with placeholder
 * tags (src/lib/content-tags.js) rendered as SERVER components that read
 * Supabase at request time — the render-live half of the content architecture.
 *
 * Each markdown segment goes through the untouched escape-first renderer
 * (nothing from the body is ever injected as raw HTML); heading depth is
 * normalised against the WHOLE body so a segment that starts with "###" still
 * renders at the right level. Tag names outside the registry never reach
 * here — the parser leaves them in the text.
 */
export default function ArticleBody({ body, locale, className = '' }) {
  if (!body) return null;
  const minHashes = minHeadingDepth(body);
  const segments = parseContentTags(body);
  return (
    <div className={`mt-8 flex flex-col gap-6 text-bm-black/80 ${className}`} data-article-body>
      {segments.map((seg, i) => {
        if (seg.type === 'markdown') {
          const html = renderMarkdown(seg.text, { minHashes });
          // Whitespace-only slices between two tags render nothing.
          return html ? <div key={i} className={markdownClass} dangerouslySetInnerHTML={{ __html: html }} /> : null;
        }
        const Tag = COMPONENTS[seg.name];
        return Tag ? <Tag key={i} {...seg.attrs} locale={locale} /> : null;
      })}
    </div>
  );
}
