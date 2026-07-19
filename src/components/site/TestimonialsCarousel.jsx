'use client';

import { useEffect, useRef, useState } from 'react';

const INTERVAL_MS = 5000;

/**
 * Text-testimonials strip: scroll-snap row that auto-advances every 5s and
 * loops. All cards are in the served HTML (LAWS §3). Auto-play pauses on
 * hover/touch/focus, while the reading modal is open, off-screen, and under
 * prefers-reduced-motion. Long quotes clamp to 3 lines — "Lire la suite"
 * appears only when the text actually overflows — and clicking a card opens
 * the full quote in a modal. scrollIntoView keeps the sliding RTL-safe.
 */
export default function TestimonialsCarousel({ items, labels }) {
  const rowRef = useRef(null);
  const cardRefs = useRef([]);
  const quoteRefs = useRef([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [open, setOpen] = useState(null); // item being read in the modal
  const [clamped, setClamped] = useState(() => new Set());

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Which quotes actually overflow their 3-line clamp (shows "Lire la suite").
  useEffect(() => {
    const overflowing = new Set();
    quoteRefs.current.forEach((el, i) => {
      if (el && el.scrollHeight > el.clientHeight + 1) overflowing.add(i);
    });
    setClamped(overflowing);
  }, [items]);

  // Only auto-play while the strip is actually on screen.
  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keep `index` in sync when the user swipes manually (RTL-safe: no offset math).
  useEffect(() => {
    const root = rowRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.6) {
            const i = cardRefs.current.indexOf(e.target);
            if (i !== -1) setIndex(i);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items]);

  function goTo(i, behavior = 'smooth') {
    setIndex(i);
    cardRefs.current[i]?.scrollIntoView({ behavior, inline: 'start', block: 'nearest' });
  }

  useEffect(() => {
    if (paused || reduced || !inView || open !== null || items.length < 2) return undefined;
    const t = setTimeout(() => goTo((index + 1) % items.length), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, paused, reduced, inView, open, items.length]);

  // Escape closes the reading modal.
  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          ref={rowRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
        >
          {items.map((item, i) => (
            <figure
              key={item.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              role="button"
              tabIndex={0}
              aria-label={labels.readMore}
              onClick={() => setOpen(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpen(item);
                }
              }}
              className="w-[min(85vw,340px)] flex-none cursor-pointer snap-start rounded-card bg-white p-5 shadow-hairline transition hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-bm-gold"
            >
              {item.rating ? (
                <p className="text-sm tracking-widest text-bm-gold">{'★'.repeat(item.rating)}</p>
              ) : null}
              <blockquote
                ref={(el) => {
                  quoteRefs.current[i] = el;
                }}
                className="mt-2 line-clamp-3 text-sm leading-relaxed text-bm-black/80"
              >
                {item.content}
              </blockquote>
              {clamped.has(i) ? (
                <p className="mt-1.5 text-xs font-semibold text-bm-gold-deep">{labels.readMore} →</p>
              ) : null}
              <figcaption className="mt-3 text-xs font-semibold text-bm-black/50">
                {item.author}
                {item.city ? ` · ${item.city}` : ''}
                {item.trip ? ` · ${item.trip}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>

        {items.length > 1 ? (
          <div className="mt-2 flex justify-center gap-1.5">
            {items.map((item, i) => (
              // 24px+ touch target (a11y); the visible dot stays small inside.
              <button
                key={item.id}
                type="button"
                aria-label={`${labels.goTo} ${i + 1}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className="flex size-6 items-center justify-center"
              >
                <span
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-5 bg-bm-gold' : 'w-1.5 bg-bm-black/15 hover:bg-bm-black/30'
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bm-black/85 p-6"
          onClick={() => setOpen(null)}
        >
          <figure
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-panel bg-white p-7 shadow-float"
          >
            {open.rating ? (
              <p className="text-base tracking-widest text-bm-gold">{'★'.repeat(open.rating)}</p>
            ) : null}
            <blockquote className="mt-3 whitespace-pre-line text-base leading-relaxed text-bm-black/85">
              {open.content}
            </blockquote>
            <figcaption className="mt-5 text-sm font-semibold text-bm-black/55">
              {open.author}
              {open.city ? ` · ${open.city}` : ''}
              {open.trip ? ` · ${open.trip}` : ''}
            </figcaption>
          </figure>
          <button
            type="button"
            aria-label={labels.close}
            onClick={() => setOpen(null)}
            className="absolute end-5 top-5 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}
