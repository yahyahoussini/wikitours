import { FALLBACK_LOCALE } from '@/lib/i18n';

/**
 * Authors (E-E-A-T, migration 024) — pure helpers over team_members rows.
 * The people behind the content are the client's team records; a profile is
 * rendered — byline link, /equipe card, Person node — ONLY when it is real:
 * published (RLS), not a placeholder, with a stable slug and a bio. Nothing
 * here fills a gap with invented text; a missing profile simply renders the
 * organisation as the author (what those 34 articles are signed with).
 */

/** A profile the public site may show. */
export function authorRenderable(member) {
  return Boolean(member && !member.is_placeholder && member.slug && (member.bio_fr || member.bio_ar));
}

/** /equipe indexes once at least one complete (fr + ar bio) profile is live. */
export function teamIndexable(team) {
  return (team ?? []).some((m) => authorRenderable(m) && m.bio_fr && m.bio_ar);
}

/** The article's author profile: by author_id, else by the legacy free-text name — renderable only. */
export function findAuthor(team, article, field = 'author') {
  const idKey = field === 'author' ? 'author_id' : 'reviewer_id';
  const nameKey = field === 'author' ? 'author_name' : 'reviewed_by';
  const byId = article?.[idKey] ? (team ?? []).find((m) => m.id === article[idKey]) : null;
  const byName = !byId && article?.[nameKey]
    ? (team ?? []).find((m) => m.name.trim().toLowerCase() === String(article[nameKey]).trim().toLowerCase())
    : null;
  const found = byId ?? byName ?? null;
  return authorRenderable(found) ? found : null;
}

/** Name in the page's script: name_ar on /ar, name_en on /en, else the entered name. */
export function authorName(member, locale) {
  if (!member) return null;
  if (locale === 'ar') return member.name_ar || member.name;
  if (locale === 'en') return member.name_en || member.name;
  return member.name;
}

/** "français, arabe, darija" → ['français', 'arabe', 'darija'] (Arabic comma too). */
export function languagesOf(member) {
  return String(member?.languages ?? '').split(/[,،;]/).map((s) => s.trim()).filter(Boolean);
}

/** True when the byline names the organisation itself rather than a person. */
export function isOrganisationByline(name, orgNames) {
  const low = String(name ?? '').trim().toLowerCase();
  return Boolean(low) && orgNames.some((n) => String(n).trim().toLowerCase() === low);
}

export const teamPagePath = (locale = FALLBACK_LOCALE) => `/${locale}/equipe`;
