'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 9:16 reels strip — center-snapped so the current ("main") reel sits in the
 * middle of the screen. Muted autoplay while on screen; CLICKING a reel turns
 * its sound on and hands it native controls (pause/seek/volume). Only one reel
 * has sound at a time. preload="metadata" paints the first video frame as the
 * thumbnail when the reel has no poster. No captions by design.
 */
export default function ReelsRow({ reels }) {
  const rootRef = useRef(null);
  const [activeId, setActiveId] = useState(null); // reel with sound + controls

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        }
      },
      { threshold: 0.6 },
    );
    root.querySelectorAll('video').forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-7rem)] pb-3"
    >
      {reels.map((reel) => (
        <figure key={reel.id} className="w-56 flex-none snap-center">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- decorative social reels */}
          <video
            src={reel.src}
            poster={reel.poster ?? undefined}
            muted={activeId !== reel.id}
            controls={activeId === reel.id}
            loop
            playsInline
            preload="metadata"
            onClick={(e) => {
              if (activeId === reel.id) return; // native controls own the clicks now
              setActiveId(reel.id);
              e.currentTarget.play().catch(() => {});
            }}
            className="aspect-[9/16] w-full cursor-pointer rounded-card object-cover shadow-lift"
          />
        </figure>
      ))}
    </div>
  );
}
