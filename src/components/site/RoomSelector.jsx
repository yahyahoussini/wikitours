'use client';

import { useEffect, useState } from 'react';
import { roomStore } from '@/lib/room-store';

/**
 * Segmented room-type control (only non-null rooms). Selecting a room flips
 * data-selected-room on #offer-root — CSS swaps the server-rendered price
 * spans and highlights the matching table row — and stores the choice in the
 * room store, silently posted as leads.room_type on submit. The server
 * renders the default (cheapest) room, so the page is complete without JS.
 */
export default function RoomSelector({ rooms, defaultRoom, label }) {
  const [selected, setSelected] = useState(defaultRoom);

  useEffect(() => {
    roomStore.set(selected);
    const root = document.getElementById('offer-root');
    if (root) root.dataset.selectedRoom = selected;
  }, [selected]);

  if (rooms.length < 2) return null;

  return (
    <fieldset className="border-0 p-0">
      <legend className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</legend>
      <div className="mt-2 flex rounded-ctrl border border-white/15 bg-white/5 p-1" role="group">
        {rooms.map((room) => (
          <button
            key={room.key}
            type="button"
            aria-pressed={selected === room.key}
            onClick={() => setSelected(room.key)}
            data-wt="room_select"
            data-wt-label={room.key}
            className={`flex-1 rounded-[7px] px-2 py-1.5 text-xs font-semibold transition ${
              selected === room.key
                ? 'bg-bm-gold text-bm-black'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            {room.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
