'use client';

import { useEffect, useState } from 'react';
import { roomStore } from '@/lib/room-store';

const ROOM_KEYS = ['double', 'triple', 'quad', 'quint'];

/**
 * 2D selector: first pick a Gamme (tier), then a room type within that tier.
 * Flipping either sets data attributes on #offer-root so CSS swaps prices.
 */
export default function TierAndRoomSelector({ tiers, t, defaultTier, defaultRoom }) {
  const [tierLabel, setTierLabel] = useState(defaultTier ?? tiers[0]?.label ?? null);
  const currentTier = tiers.find((tr) => tr.label === tierLabel) ?? tiers[0] ?? null;
  const rooms = currentTier
    ? ROOM_KEYS.map((k) => ({ key: k, price: currentTier[`price_${k}`] })).filter((r) => r.price != null)
    : [];
  const [selectedRoom, setSelectedRoom] = useState(
    defaultRoom && rooms.some((r) => r.key === defaultRoom) ? defaultRoom : (rooms[0]?.key ?? null),
  );

  useEffect(() => {
    roomStore.set({ tierLabel, roomType: selectedRoom });
    const root = document.getElementById('offer-root');
    if (root) {
      root.dataset.selectedTier = tierLabel ?? '';
      root.dataset.selectedRoom = selectedRoom ?? '';
    }
  }, [tierLabel, selectedRoom]);

  // Follow selections made elsewhere (a gamme comparison card). Guarded so it
  // only reacts to genuine external changes, not its own echoes.
  useEffect(() => {
    return roomStore.subscribe((v) => {
      if (v.tierLabel && v.tierLabel !== tierLabel) setTierLabel(v.tierLabel);
      if (v.roomType && v.roomType !== selectedRoom) setSelectedRoom(v.roomType);
    });
  }, [tierLabel, selectedRoom]);

  if (!currentTier || rooms.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      {/* Tier selector */}
      {tiers.length > 1 ? (
        <div>
          <legend className="text-xs font-semibold uppercase tracking-wide text-bm-black/50">
            {t.chooseTier ?? 'Gamme'}
          </legend>
          <div className="mt-2 flex rounded-ctrl border border-bm-black/10 bg-bm-black/5 p-1" role="group">
            {tiers.map((tr) => (
              <button
                key={tr.label}
                type="button"
                aria-pressed={tierLabel === tr.label}
                onClick={() => {
                  setTierLabel(tr.label);
                  const newRooms = ROOM_KEYS.map((k) => ({ key: k, price: tr[`price_${k}`] })).filter((r) => r.price != null);
                  if (selectedRoom && !newRooms.some((r) => r.key === selectedRoom)) {
                    setSelectedRoom(newRooms[0]?.key ?? null);
                  }
                }}
                data-wt="tier_select"
                data-wt-label={tr.label}
                className={`flex-1 rounded-[7px] px-2 py-1.5 text-xs font-semibold transition ${
                  tierLabel === tr.label
                    ? 'bg-bm-gold text-bm-black'
                    : 'text-bm-black/60 hover:bg-bm-black/10 hover:text-bm-black'
                }`}
              >
                {t.tier?.[tr.label] ?? tr.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Room selector within current tier */}
      {rooms.length >= 2 ? (
        <div>
          <legend className="text-xs font-semibold uppercase tracking-wide text-bm-black/50">
            {t.chooseRoom}
          </legend>
          <div className="mt-2 flex rounded-ctrl border border-bm-black/10 bg-bm-black/5 p-1" role="group">
            {rooms.map((room) => (
              <button
                key={room.key}
                type="button"
                aria-pressed={selectedRoom === room.key}
                onClick={() => setSelectedRoom(room.key)}
                data-wt="room_select"
                data-wt-label={room.key}
                className={`flex-1 rounded-[7px] px-2 py-1.5 text-xs font-semibold transition ${
                  selectedRoom === room.key
                    ? 'bg-bm-gold text-bm-black'
                    : 'text-bm-black/60 hover:bg-bm-black/10 hover:text-bm-black'
                }`}
              >
                {t.roomShort[room.key]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
