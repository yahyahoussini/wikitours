/**
 * Content freshness — ONE expression behind both the visible "Mis à jour le" /
 * "آخر تحديث" line and the sitemap's <lastmod>.
 *
 * Why this module exists: the month hubs rendered a real "Mis à jour le" date
 * derived from their offers, while the sitemap emitted the same URL with no
 * <lastmod> at all, because only the page computed it. Page and sitemap
 * disagreed about the same fact. Both now call this.
 *
 * Every table in this schema carries `updated_at`, auto-touched by a trigger
 * (supabase/schema.sql), so a page's freshness is always derivable from the
 * rows that compose it — never from build time, which would re-date every URL
 * on every deploy and tell crawlers nothing true.
 */

/**
 * Latest timestamp across the rows (or ISO strings) that compose a page.
 * Accepts rows, arrays of rows, ISO strings and nullish values, at any nesting.
 * Returns an ISO string, or null when there is genuinely nothing to date —
 * callers omit <lastmod> rather than invent one.
 *
 * Compared as instants, not strings: a lexicographic compare is only correct
 * while every row shares one UTC offset, which is a property of today's data
 * rather than a guarantee.
 */
export function lastModifiedOf(...sources) {
  let best = null;
  let bestTime = -Infinity;

  const visit = (item) => {
    if (!item) return;
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    const value =
      typeof item === 'string'
        ? item
        : item instanceof Date
          ? item.toISOString()
          : (item.updated_at ?? item.published_at ?? null);
    if (!value) return;
    const time = Date.parse(value);
    if (Number.isFinite(time) && time > bestTime) {
      bestTime = time;
      best = value;
    }
  };

  visit(sources);
  return best;
}
