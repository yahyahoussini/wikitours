'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { BLUR_DATA_URL } from '@/lib/blur';

const INTERVAL_MS = 5000;
const HOVER_INTERVAL_MS = 1500;
const SLIDE_MS = 600;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const SWIPE_THRESHOLD_PX = 48;

/**
 * Direction-aware auto-advancing carousel (client side of <SmartGallery>).
 *
 * In LTR the track flows left→right and auto-advance slides RIGHT→LEFT; with
 * dir="rtl" the flex track is natively mirrored, so flipping the transform
 * sign makes motion advance left→right — it always reads "inward". Swipe,
 * arrows and keyboard follow the same logical direction.
 *
 * Zero CLS: the wrapper's aspect-ratio is locked from the first slide.
 * variant="hover" (destination cards): no timer, cycles while hovered.
 */
export default function Carousel({
  slides,
  rtl = false,
  variant = 'auto',
  aspect,
  sizes = '100vw',
  className = '',
  labels = { prev: 'Previous slide', next: 'Next slide', goTo: 'Go to slide' },
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0); // remounts the progress fill on manual nav
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef(null);
  const videoRefs = useRef({});
  const touchStart = useRef(null);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const playing =
    variant === 'auto' && !paused && inView && !reducedMotion && count > 1;

  // Auto-advance: one timeout per slide, restarted by index/cycle changes.
  useEffect(() => {
    if (variant === 'hover') {
      if (!hovering || count < 2) return undefined;
      const t = setInterval(() => setIndex((i) => (i + 1) % count), HOVER_INTERVAL_MS);
      return () => clearInterval(t);
    }
    if (!playing) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [variant, hovering, playing, index, cycle, count]);

  // Videos: play only while their slide is active and the carousel is on
  // screen (muted autoplay on view); pause otherwise.
  useEffect(() => {
    slides.forEach((slide, i) => {
      const video = videoRefs.current[slide.id];
      if (!video) return;
      if (i === index && inView) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [index, inView, slides]);

  function goTo(i) {
    setIndex(((i % count) + count) % count);
    setCycle((c) => c + 1);
  }
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX;
    setPaused(true);
  }
  function onTouchEnd(e) {
    const start = touchStart.current;
    touchStart.current = null;
    setPaused(hovering);
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    // LTR: swipe toward the start (dx<0) pulls the next slide in; mirrored in RTL.
    const forward = rtl ? dx > 0 : dx < 0;
    if (forward) next();
    else prev();
  }

  function onKeyDown(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const forward = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    if (forward) next();
    else prev();
  }

  const aspectRatio =
    aspect ??
    (slides[0]?.width && slides[0]?.height
      ? `${slides[0].width} / ${slides[0].height}`
      : '16 / 10');

  const showDots = count < 6; // ≥6 items: dots hidden in favor of bars
  const isHover = variant === 'hover';

  return (
    <section
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => {
        setHovering(true);
        setPaused(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
        setPaused(false);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`group/carousel relative overflow-hidden outline-none ${className}`}
      style={{ aspectRatio }}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(${(rtl ? 1 : -1) * index * 100}%)`,
          transition: `transform ${SLIDE_MS}ms ${EASE}`,
        }}
      >
        {slides.map((slide, i) => (
          <div key={slide.id} className="relative h-full w-full flex-none" aria-hidden={i !== index}>
            {slide.kind === 'video' ? (
              <video
                ref={(el) => {
                  videoRefs.current[slide.id] = el;
                }}
                src={slide.src}
                poster={slide.poster}
                muted
                loop
                playsInline
                preload="none"
                className="size-full object-cover"
              />
            ) : (
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes={sizes}
                priority={i === 0 && !isHover}
                loading={i === 0 && !isHover ? undefined : 'lazy'}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {!isHover && count > 1 ? (
        <>
          <button
            type="button"
            aria-label={labels.prev}
            onClick={prev}
            className="absolute start-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-bm-black/40 text-white opacity-0 backdrop-blur-sm transition hover:bg-bm-black/60 focus-visible:opacity-100 group-hover/carousel:opacity-100"
          >
            <Chevron className={rtl ? '-scale-x-100' : ''} />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            onClick={next}
            className="absolute end-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-bm-black/40 text-white opacity-0 backdrop-blur-sm transition hover:bg-bm-black/60 focus-visible:opacity-100 group-hover/carousel:opacity-100"
          >
            <Chevron className={rtl ? '' : '-scale-x-100'} />
          </button>
        </>
      ) : null}

      {!isHover && count > 1 ? (
        <div className="absolute bottom-0 start-0 end-0 z-10 px-4 pb-3">
          {showDots ? (
            <div className="flex items-center justify-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`${labels.goTo} ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => goTo(i)}
                  className={`h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                    i === index ? 'w-7 bg-white/40' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                >
                  {i === index ? (
                    <span
                      key={`${index}-${cycle}`}
                      className="block h-full bg-white"
                      style={{
                        animation: playing ? `carousel-progress ${INTERVAL_MS}ms linear` : 'none',
                        width: playing ? undefined : '100%',
                      }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`${labels.goTo} ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => goTo(i)}
                  className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
                >
                  {i < index ? (
                    <span className="block h-full w-full bg-white" />
                  ) : i === index ? (
                    <span
                      key={`${index}-${cycle}`}
                      className="block h-full bg-white"
                      style={{
                        animation: playing ? `carousel-progress ${INTERVAL_MS}ms linear` : 'none',
                        width: playing ? undefined : '100%',
                      }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Chevron({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 ${className}`}
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
