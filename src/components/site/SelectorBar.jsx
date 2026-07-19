'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MONTH_SLUGS } from '@/lib/months';

/** Floating Occasion · Mois · Voir les offres selector under the hero. */
export default function SelectorBar({ locale, occasions, monthNames, labels }) {
  const router = useRouter();
  const [occasion, setOccasion] = useState('');
  const [month, setMonth] = useState('');

  function go() {
    if (month !== '') {
      router.push(`/${locale}/omra-${MONTH_SLUGS[Number(month)]}`);
    } else if (occasion) {
      router.push(`/${locale}/omra-${occasion}`);
    } else {
      router.push(`/${locale}/bab-makka`);
    }
  }

  // Stacked card on phone/tablet (a wrapped rounded-full pill reads as a blob
  // and squeezes the controls); the floating pill row only from md up, where
  // both selects + the CTA genuinely fit on one line.
  const select =
    'w-full rounded-full border border-bm-black/10 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-wiki-blue md:flex-1 md:py-2.5';

  return (
    <div className="relative z-20 mx-auto -mt-6 flex w-full max-w-2xl flex-col gap-2 rounded-panel border border-bm-black/10 bg-white/95 p-2.5 shadow-float backdrop-blur md:-mt-9 md:flex-row md:items-center md:rounded-full md:p-2">
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
        className="w-full rounded-full bg-bm-black px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-bm-black-soft md:w-auto md:py-2.5"
      >
        {labels.go}
      </button>
    </div>
  );
}
