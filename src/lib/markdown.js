/**
 * Minimal markdown → HTML renderer (no dependency, LAWS §2): headings,
 * bold, italic, links, unordered/ordered lists, paragraphs. Input is
 * HTML-escaped FIRST, so DB content can never inject markup. Styling comes
 * from the wrapper's design-system classes (see markdownClass).
 */

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (m, label, href) =>
        /^(https?:\/\/|\/)/.test(href)
          ? `<a href="${href}">${label}</a>`
          : m,
    );
}

/**
 * The smallest heading depth used in a body (1 when it has no heading). The
 * page H1 belongs to the layout, so that depth renders as <h2> — whatever hash
 * depth the author typed — and the hierarchy stays gap-free (audit: no skipped
 * levels). Exported so a body split into segments (placeholder tags between
 * them, src/components/content/ArticleBody.jsx) normalises every segment
 * against the WHOLE body, not against the segment it happens to sit in.
 */
export function minHeadingDepth(md) {
  let minHashes = Infinity;
  for (const block of String(md ?? '').replaceAll('\r\n', '\n').split(/\n{2,}/)) {
    const m = block.match(/^(#{1,4})\s+/);
    if (m && m[1].length < minHashes) minHashes = m[1].length;
  }
  return Number.isFinite(minHashes) ? minHashes : 1;
}

export function renderMarkdown(md, { minHashes = null } = {}) {
  if (!md) return '';
  const blocks = escapeHtml(md.replaceAll('\r\n', '\n')).split(/\n{2,}/);
  const html = [];
  if (minHashes == null) minHashes = minHeadingDepth(md);

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;

    const heading = lines[0].match(/^(#{1,4})\s+(.*)$/);
    if (heading && lines.length === 1) {
      const level = Math.min(6, heading[1].length - minHashes + 2);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      html.push(
        `<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`,
      );
      continue;
    }
    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      html.push(
        `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`,
      );
      continue;
    }
    html.push(`<p>${lines.map(inline).join('<br/>')}</p>`);
  }

  return html.join('\n');
}

/** Design-system typography for rendered markdown (logical props via Tailwind). */
export const markdownClass = [
  'space-y-4 leading-relaxed',
  '[&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold',
  '[&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-bold',
  '[&_h4]:mt-4 [&_h4]:font-bold',
  '[&_a]:font-medium [&_a]:text-wiki-blue [&_a]:underline [&_a]:underline-offset-4',
  '[&_ul]:list-disc [&_ul]:ps-6 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:space-y-1',
].join(' ');
