'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OMRA_YEAR, MONTH_SLUGS } from '@/lib/months';

/** Floating Occasion · Mois · Voir les offres selector under the hero. */
export default function SelectorBar({ locale, occasions, monthNames, labels }) {
  const router = useRouter();
  const [occasion, setOccasion] = useState('');
  const [month, setMonth] = useState('');

  function go() {
    if (month !== '') {
      router.push(`/${locale}/omra-${MONTH_SLUGS[Number(month)]}-${OMRA_YEAR}`);
    } else if (occasion) {
      router.push(`/${locale}/omra-${occasion}`);
    } else {
      router.push(`/${locale}/bab-makkah`);
    }
  }

  const select =
    'flex-1 rounded-full border border-bm-black/10 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-wiki-blue';

  return (
    <div className="relative z-20 mx-auto -mt-9 flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-full border border-bm-black/10 bg-white/95 p-2 shadow-float backdrop-blur">
      <select value={occasion} onChange={(e) => setOccasion(e.target.value)} aria-label={labels.occasion} className={select}>
        <option value="">{labels.occasion} : {labels.all}</option>
        {occasions.map((o) => (
          <option key={o.slug} value={o.slug}>{o.name}</option>
        ))}
      </select>
      <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label={labels.month} className={select}>
        <option value="">{labels.month} : {labels.all}</option>
        {monthNames.map((name, i) => (
          <option key={name} value={i}>{name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={go}
        className="rounded-full bg-bm-black px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-bm-black-soft"
      >
        {labels.go}
      </button>
    </div>
  );
}
