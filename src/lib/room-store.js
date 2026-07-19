/**
 * Selected tier (gamme) and room type on an offer page — a tiny pub/sub shared
 * between the gamme comparison cards, the TierAndRoomSelector and the LeadForm.
 * These are siblings across a server boundary, so React state can't connect
 * them. The LeadForm reads it once at submit time; the selectors subscribe so a
 * choice made in one place (a card) reflects in the others (the booking form).
 */
let current = { tierLabel: null, roomType: null };
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(current);
}

export const roomStore = {
  get: () => current,
  set: (value) => {
    current = { ...current, ...value };
    notify();
  },
  // Legacy compat: set just the room type (single-gamme pages).
  setRoomType: (roomType) => {
    current = { ...current, roomType };
    notify();
  },
  /** Subscribe to selection changes; returns an unsubscribe function. */
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
