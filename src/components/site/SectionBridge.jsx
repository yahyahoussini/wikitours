/**
 * Soft transition between background temperatures (LAWS §7: no hard edges).
 * A blurred vertical gradient with faint gold/blue radial glows.
 */
const SURFACES = {
  light: '#fdfdfc',
  dark: '#0d0d0d',
};

export default function SectionBridge({ from = 'light', to = 'dark' }) {
  return (
    <div aria-hidden="true" className="relative h-24 overflow-hidden sm:h-32">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, ${SURFACES[from]}, ${SURFACES[to]})` }}
      />
      <div
        className="absolute -inset-x-1/4 inset-y-0 blur-2xl"
        style={{
          background:
            'radial-gradient(40% 80% at 25% 50%, rgb(212 175 55 / 0.10), transparent 70%), radial-gradient(40% 80% at 75% 50%, rgb(19 152 201 / 0.08), transparent 70%)',
        }}
      />
    </div>
  );
}
