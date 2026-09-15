import { renderMarkdown, markdownClass, minHeadingDepth } from '@/lib/markdown';
import { parseContentTags } from '@/lib/content-tags';
import CommercialCTA from '@/components/content/CommercialCTA';
import LiveDepartures from '@/components/content/LiveDepartures';
import PriceRange from '@/components/content/PriceRange';
import HotelCard from '@/components/content/HotelCard';
import HotelList from '@/components/content/HotelList';
import ReviewQuote from '@/components/content/ReviewQuote';
import HijriCountdown from '@/components/content/HijriCountdown';
import PolicyFact from '@/components/content/PolicyFact';
import DepositPolicy from '@/components/content/DepositPolicy';
import HajjBridgeCTA from '@/components/content/HajjBridgeCTA';
import RamadanNightsTable from '@/components/content/RamadanNightsTable';

const COMPONENTS = { CommercialCTA, LiveDepartures, PriceRange, HotelCard, HotelList, ReviewQuote, HijriCountdown, PolicyFact, DepositPolicy, HajjBridgeCTA, RamadanNightsTable };

/**
 * An article body: markdown prose written ahead of time, with placeholder
 * tags (src/lib/content-tags.js — `<Tag attr="v" />` or `{{live:alias attr=v}}`)
 * rendered as SERVER components that read Supabase at request time — the
 * render-live half of the content architecture.
 *
 * Each markdown segment goes through the untouched escape-first renderer
 * (nothing from the body is ever injected as raw HTML); heading depth is
 * normalised against the WHOLE body so a segment that starts with "###" still
 * renders at the right level. An unknown {{live:…}} tag renders nothing and is
 * logged; an unknown <Tag /> never reaches here — the parser leaves it in the
 * text. The gate refuses both before a post is ever scheduled.
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
        if (seg.type === 'unknown') {
          console.warn(`[ArticleBody] unknown live tag ignored: ${seg.raw}`);
          return null;
        }
        const Tag = COMPONENTS[seg.name];
        return Tag ? <Tag key={i} {...seg.attrs} locale={locale} /> : null;
      })}
    </div>
  );
}
