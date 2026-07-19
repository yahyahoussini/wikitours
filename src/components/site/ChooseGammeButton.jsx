'use client';

import { useEffect, useState } from 'react';
import { roomStore } from '@/lib/room-store';

/**
 * CTA on a gamme comparison card. Selecting a gamme flips the shared selection
 * (roomStore + #offer-root data attributes) so the sticky booking card's price
 * and room selector follow along, keeps the visitor's current room type when
 * this gamme also offers it, and scrolls to the form. Its own selected state is
 * driven by the store so it reflects choices made in the booking selector too.
 */
export default function ChooseGammeButton({ tier, rooms = [], defaultRoom, chooseLabel, selectedLabel }) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    const root = document.getElementById('offer-root');
    const initial = roomStore.get().tierLabel ?? root?.dataset.selectedTier ?? null;
    setSelected(initial === tier);
    return roomStore.subscribe((v) => setSelected(v.tierLabel === tier));
  }, [tier]);

  function choose() {
    const current = roomStore.get();
    const room = current.roomType && rooms.includes(current.roomType) ? current.roomType : defaultRoom ?? null;
    const root = document.getElementById('offer-root');
    if (root) {
      root.dataset.selectedTier = tier;
      root.dataset.selectedRoom = room ?? '';
    }
    roomStore.set({ tierLabel: tier, roomType: room });
    document.getElementById('reserver')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <button
      type="button"
      onClick={choose}
      aria-pressed={selected}
      data-wt="tier_select"
      data-wt-label={tier}
      className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-ctrl px-4 py-2.5 text-sm font-semibold transition ${
        selected
          ? 'bg-bm-gold text-bm-black shadow-lift'
          : 'border border-bm-gold/45 text-bm-gold hover:bg-bm-gold/10'
      }`}
    >
      {selected ? `✓ ${selectedLabel}` : chooseLabel}
    </button>
  );
}
