'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BLUR_DATA_URL } from '@/lib/blur';

/** Case- and accent-insensitive so "omra" matches "Omra" and "Médine"/"Medine". */
const DIACRITICS = /[̀-ͯ]/g;
const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(DIACRITICS, '');

/**
 * Article cards + client-side search. Every card stays in the served HTML
 * (LAWS §3) — a non-match is only hidden, never unmounted, so crawlers still
 * see every article and the shared reveal observer keeps working.
 */
export default function BlogGrid({ locale, articles, labels }) {
  const [query, setQuery] = useState('');

  // null = no query, everything matches; otherwise the set of matching ids.
  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return null;
    return new Set(
      articles
        .filter((a) => norm(`${a.title} ${a.excerpt} ${a.category}`).includes(q))
        .map((a) => a.id),
    );
  }, [articles, query]);

  const visibleCount = matches ? matches.size : articles.length;

  return (
    <>
      <div className="relative mt-6 max-w-md">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-bm-black/40"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={labels.search}
          placeholder={labels.search}
          className="w-full rounded-full border border-bm-black/10 bg-white py-3 pe-4 ps-11 text-sm shadow-hairline outline-none transition focus:border-bm-gold"
        />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            data-reveal
            suppressHydrationWarning
            href={`/${locale}/blog/${article.slug}`}
            className={`group flex flex-col overflow-hidden rounded-card bg-white shadow-hairline transition hover:shadow-lift ${
              matches && !matches.has(article.id) ? 'hidden' : ''
            }`}
          >
            <div className="relative aspect-[16/10] bg-bm-black/5">
              {article.cover ? (
                <Image
                  src={article.cover.src}
                  alt={article.cover.alt ?? article.title ?? ''}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover transition duration-500 ease-luxe group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-wiki-blue">{article.category}</p>
              <h2 className="mt-2 font-bold leading-snug text-bm-black group-hover:text-wiki-blue">
                {article.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-bm-black/60">{article.excerpt}</p>
              <p className="mt-auto pt-3 text-xs text-bm-black/40">
                {article.author}
                {article.date ? ` · ${article.date}` : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {visibleCount === 0 ? (
        <p className="mt-8 text-sm text-bm-black/50">{articles.length ? labels.noResults : '—'}</p>
      ) : null}
    </>
  );
}
