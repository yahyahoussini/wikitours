import { SITE_URL, absoluteUrl, SPEAKABLE } from '@/lib/seo';
import { pickLang } from '@/lib/i18n';
import { stripContentTags } from '@/lib/content-tags';

/**
 * The article's structured data, built in ONE place so the page and the gate
 * (scripts/content-gate.mjs G13) emit and check the same nodes:
 *   BlogPosting (author @id → the /equipe Person or the organisation, publisher
 *   → #organization, speakable) + FAQPage from the body's FAQ section.
 * Every field is a DB value; absent ⇒ omitted (LAW §10).
 */

const FAQ_HEADING_RE = /^(#{2,3})\s+.*(questions fréquentes|faq|الأسئلة الشائعة|أسئلة شائعة|frequently asked)/i;

/** Markdown FAQ section → [{ question, answer }] (plain text, tags stripped). */
export function extractFaq(body) {
  const md = stripContentTags(body).replaceAll('\r\n', '\n');
  const lines = md.split('\n');
  const start = lines.findIndex((l) => FAQ_HEADING_RE.test(l));
  if (start < 0) return [];
  const level = lines[start].match(/^(#{2,3})/)[1].length;
  const items = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h && h[1].length <= level) break; // the next section of the same or higher level ends the FAQ
    if (h && h[1].length === level + 1) { current = { question: h[2].trim(), answer: '' }; items.push(current); continue; }
    if (current && line.trim()) current.answer += (current.answer ? ' ' : '') + line.trim();
  }
  return items.map((it) => ({ question: it.question, answer: it.answer.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim() })).filter((it) => it.question && it.answer);
}

export function faqPageJsonLd(items) {
  if (!items?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({ '@type': 'Question', name: it.question, acceptedAnswer: { '@type': 'Answer', text: it.answer } })),
  };
}

/** The BlogPosting node. `authorNode` / `reviewerNode` come from the page (personNode or the org @id). */
export function blogPostingJsonLd({ article, locale, authorNode, reviewerNode = null, coverUrl = null }) {
  const modifiedAt = [article.updated_at, article.published_at].filter(Boolean).sort().at(-1) ?? null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: pickLang(article, 'title', locale),
    ...(pickLang(article, 'excerpt', locale) ? { description: pickLang(article, 'excerpt', locale) } : {}),
    ...(coverUrl ? { image: coverUrl } : {}),
    inLanguage: locale,
    mainEntityOfPage: absoluteUrl(locale, `/blog/${article.slug}`),
    author: authorNode,
    ...(reviewerNode ? { reviewedBy: reviewerNode } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(modifiedAt ? { dateModified: modifiedAt } : {}),
    publisher: { '@id': `${SITE_URL}/#organization` },
    speakable: SPEAKABLE,
  };
}

/** The later of updated_at / published_at — what the page shows and emits as the modification date. */
export function articleModifiedAt(article) {
  return [article?.updated_at, article?.published_at].filter(Boolean).sort().at(-1) ?? null;
}
