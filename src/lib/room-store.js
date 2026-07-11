/**
 * Selected room type on an offer page — a module-scope value shared between
 * the RoomSelector and the LeadForm (siblings across a server boundary, so
 * React state can't connect them). Read once at submit time; never rendered,
 * so no subscription machinery is needed.
 */
let current = null;

export const roomStore = {
  get: () => current,
  set: (value) => {
    current = value;
  },
};
