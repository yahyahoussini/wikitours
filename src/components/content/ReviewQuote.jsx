import { pickLang } from '@/lib/i18n';
import { getTestimonials } from '@/lib/data/content';

/**
 * <ReviewQuote id="…" /> — ONE published text testimonial, verbatim, from the
 * testimonials table (the site's reviews table; Google review text is never
 * stored). Hard constraint 7: the text is mixed FR/AR/Darija by design and is
 * rendered exactly as stored — never edited, translated or tidied. An id that
 * is unpublished or unknown renders nothing (RLS hides it from the anon client).
 */
export default async function ReviewQuote({ id, locale }) {
  const items = await getTestimonials();
  const item = items.find((r) => r.id === id && (r.kind ?? 'text') === 'text');
  const text = item ? pickLang(item, 'content', locale) : null;
  if (!item || !text) return null;
  const meta = [item.author_name, item.author_city, pickLang(item, 'trip_label', locale)].filter(Boolean).join(' · ');
  return (
    <figure className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline" data-review-quote={item.id}>
      {item.rating ? <p className="text-sm tracking-widest text-bm-gold" aria-hidden="true">{'★'.repeat(item.rating)}</p> : null}
      <blockquote className="mt-2 whitespace-pre-line leading-relaxed text-bm-black/85">{text}</blockquote>
      {meta ? <figcaption className="mt-3 text-xs font-semibold text-bm-black/60">{meta}</figcaption> : null}
    </figure>
  );
}
