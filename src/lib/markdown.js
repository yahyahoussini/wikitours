/**
 * Minimal markdown → HTML renderer (no dependency, LAWS §2): headings,
 * bold, italic, links, unordered/ordered lists, GFM tables, blockquotes,
 * paragraphs. Input is HTML-escaped FIRST, so DB content can never inject
 * markup. Styling comes from the wrapper's design-system classes (see
 * markdownClass).
 *
 * Tables (2026-11-01): content/ARTICLE-BRIEF.md asks every post for a
 * comparison table, but this renderer printed them as raw « | … |---| » text
 * on 36 live URLs, the two top posts among them. scripts/seo-suite.mjs now
 * fails any page that still shows one.
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

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/;
// The input is escaped before parsing, so a quote marker arrives as « &gt; ».
const QUOTE = /^\s*&gt;\s?/;

function tableCells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

/** A header row, its « |---| » separator, then the body rows. */
function renderTable(rows) {
  const head = tableCells(rows[0]);
  const body = rows.slice(2).map(tableCells);
  const th = head.map((c) => `<th scope="col">${inline(c)}</th>`).join('');
  const trs = body
    .map((r) => `<tr>${head.map((_, i) => `<td>${inline(r[i] ?? '')}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="md-table"><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

const UL_ITEM = /^[-*]\s+/;
const OL_ITEM = /^\d+\.\s+/;
// An indented line continues the list item above it (a nested quote, a
// second line): « - on récite :\n  > رَبَّنَا آتِنَا… » printed the dash and
// the « > » as text before 2026-11-01.
const CONTINUATION = /^\s{2,}\S/;

/** Quote lines (marker removed); an empty « > » line splits paragraphs. */
function renderQuote(lines) {
  const paras = [];
  let cur = [];
  for (const l of lines) {
    if (l.trim() === '') {
      if (cur.length) paras.push(cur);
      cur = [];
    } else cur.push(l);
  }
  if (cur.length) paras.push(cur);
  return `<blockquote>${paras.map((p) => `<p>${p.map(inline).join('<br/>')}</p>`).join('')}</blockquote>`;
}

function renderList(lines, itemRe, tag) {
  const items = [];
  for (const l of lines) {
    if (itemRe.test(l)) items.push({ first: l.replace(itemRe, ''), more: [] });
    else items[items.length - 1].more.push(l.trim());
  }
  const body = items.map(({ first, more }) => {
    let li = inline(first);
    let quote = [];
    const flush = () => {
      if (quote.length) li += renderQuote(quote);
      quote = [];
    };
    for (const m of more) {
      if (QUOTE.test(m)) quote.push(m.replace(QUOTE, ''));
      else {
        flush();
        li += `<br/>${inline(m)}`;
      }
    }
    flush();
    return `<li>${li}</li>`;
  });
  return `<${tag}>${body.join('')}</${tag}>`;
}

function renderLines(lines, minHashes, html) {
  const heading = lines[0].match(/^(#{1,4})\s+(.*)$/);
  if (heading && lines.length === 1) {
    const level = Math.min(6, heading[1].length - minHashes + 2);
    html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    return;
  }
  if (UL_ITEM.test(lines[0]) && lines.every((l) => UL_ITEM.test(l) || CONTINUATION.test(l))) {
    html.push(renderList(lines, UL_ITEM, 'ul'));
    return;
  }
  if (OL_ITEM.test(lines[0]) && lines.every((l) => OL_ITEM.test(l) || CONTINUATION.test(l))) {
    html.push(renderList(lines, OL_ITEM, 'ol'));
    return;
  }
  if (lines.every((l) => QUOTE.test(l))) {
    html.push(renderQuote(lines.map((l) => l.replace(QUOTE, ''))));
    return;
  }
  // A lead-in sentence followed by a list in the same block (« On récite :\n- … »).
  const start = lines.findIndex((l) => UL_ITEM.test(l) || OL_ITEM.test(l));
  if (start > 0) {
    const re = UL_ITEM.test(lines[start]) ? UL_ITEM : OL_ITEM;
    if (lines.slice(start).every((l) => re.test(l) || CONTINUATION.test(l))) {
      html.push(`<p>${lines.slice(0, start).map(inline).join('<br/>')}</p>`);
      html.push(renderList(lines.slice(start), re, re === UL_ITEM ? 'ul' : 'ol'));
      return;
    }
  }
  html.push(`<p>${lines.map(inline).join('<br/>')}</p>`);
}

export function renderMarkdown(md, { minHashes = null } = {}) {
  if (!md) return '';
  const blocks = escapeHtml(md.replaceAll('\r\n', '\n')).split(/\n{2,}/);
  const html = [];
  if (minHashes == null) minHashes = minHeadingDepth(md);

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;

    // A table may share its block with a lead-in line; the lines around it
    // render as they would on their own.
    let rest = [];
    for (let i = 0; i < lines.length; i++) {
      if (TABLE_ROW.test(lines[i]) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
        if (rest.length) renderLines(rest, minHashes, html);
        rest = [];
        let end = i + 2;
        while (end < lines.length && TABLE_ROW.test(lines[end])) end++;
        html.push(renderTable(lines.slice(i, end)));
        i = end - 1;
        continue;
      }
      rest.push(lines[i]);
    }
    if (rest.length) renderLines(rest, minHashes, html);
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
  '[&_.md-table]:my-6 [&_.md-table]:overflow-x-auto',
  '[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
  '[&_th]:border-b [&_th]:border-bm-black/20 [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:align-bottom [&_th]:font-semibold',
  '[&_td]:border-b [&_td]:border-bm-black/10 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
  '[&_blockquote]:border-s-4 [&_blockquote]:border-bm-gold [&_blockquote]:ps-4 [&_blockquote]:text-bm-black/75',
].join(' ');
