'use client';

import { useState } from 'react';
import Image from 'next/image';

/** Masonry wall of WhatsApp/review screenshots with a simple lightbox. */
export default function ScreenshotWall({ shots, closeLabel }) {
  const [open, setOpen] = useState(null);

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>button]:mb-3">
        {shots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => setOpen(shot)}
            className="block w-full overflow-hidden rounded-card shadow-hairline transition hover:shadow-lift"
          >
            <Image
              src={shot.src}
              alt={shot.alt ?? ''}
              width={shot.width ?? 400}
              height={shot.height ?? 700}
              loading="lazy"
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="h-auto w-full"
            />
          </button>
        ))}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bm-black/85 p-6"
          onClick={() => setOpen(null)}
        >
          <Image
            src={open.src}
            alt={open.alt ?? ''}
            width={open.width ?? 800}
            height={open.height ?? 1400}
            sizes="90vw"
            className="max-h-[85vh] w-auto rounded-card shadow-float"
          />
          <button
            type="button"
            aria-label={closeLabel}
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
