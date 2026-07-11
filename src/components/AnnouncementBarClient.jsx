'use client';

import { useEffect, useState } from 'react';

/** Dismissible bar; the dismissal persists per-announcement via cookie. */
export default function AnnouncementBarClient({ id, text, link, variant }) {
  const cookieName = `wt_ann_${id}`;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (document.cookie.includes(`${cookieName}=1`)) setVisible(false);
  }, [cookieName]);

  if (!visible) return null;

  const styles =
    variant === 'gold'
      ? 'bg-bm-black text-bm-gold-light'
      : 'bg-wiki-blue text-white';

  const content = link ? (
    <a href={link} className="underline-offset-4 hover:underline">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );

  return (
    <div className={`relative px-10 py-2 text-center text-sm font-medium ${styles}`}>
      {content}
      <button
        type="button"
        aria-label="✕"
        onClick={() => {
          document.cookie = `${cookieName}=1; path=/; max-age=${60 * 60 * 24 * 30}`;
          setVisible(false);
        }}
        className="absolute end-3 top-1/2 -translate-y-1/2 opacity-70 transition hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
