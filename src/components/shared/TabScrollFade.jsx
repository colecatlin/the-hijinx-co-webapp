/**
 * TabScrollFade — right-side gradient fade overlay for horizontal-scrolling tab bars.
 * Gives mobile users a visual cue that more tabs exist beyond the visible edge.
 *
 * Place inside a `relative` positioned scroll container.
 * The fade stays fixed at the right edge while tabs scroll underneath.
 *
 * @param {string} tone - 'light' (white bg) or 'dark' (canvas bg) to match the tab bar background.
 */
export default function TabScrollFade({ tone = 'light' }) {
  const fromColor = tone === 'dark' ? 'from-canvas' : 'from-white';
  return (
    <div
      className={`pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l ${fromColor} to-transparent z-10`}
      aria-hidden="true"
    />
  );
}