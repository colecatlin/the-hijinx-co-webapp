import React from 'react';

/**
 * RacerViewNav — secondary navigation for the public racer profile.
 *
 * The five sections are CLIENT-SIDE views inside the canonical /racers/:slug
 * route. They are not routes, do not create canonical URLs, and never trigger
 * a new profile resolution (all data comes from the single experience fetch).
 */

export const RACER_VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'racing', label: 'Racing' },
  { id: 'career', label: 'Career' },
  { id: 'media', label: 'Media' },
  { id: 'partners', label: 'Partners' },
];

export default function RacerViewNav({ active, onChange }) {
  return (
    <nav
      aria-label="Racer profile sections"
      className="sticky top-14 lg:top-16 z-30 border-b border-divider bg-canvas"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-6 sm:gap-9 overflow-x-auto scrollbar-hide">
          {RACER_VIEWS.map((view) => {
            const isActive = active === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => onChange(view.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`relative flex-shrink-0 py-4 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                  isActive ? 'text-motion' : 'text-foreground-quiet hover:text-foreground'
                }`}
              >
                {view.label}
                {isActive && <span className="absolute left-0 right-0 -bottom-px h-px bg-motion" />}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}