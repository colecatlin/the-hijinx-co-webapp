import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';

/**
 * Local-only identity switcher for the dashboard. Lists Fan + each approved
 * identity the user holds. Selecting one re-renders the dashboard's adaptive
 * modules for that identity. This is purely a local view toggle — it does NOT
 * write to primary_profile_type or change the canonical profile.
 *
 * Props:
 *   user — the current user record (has profile_types array)
 *   activeIdentity — the currently selected identity key
 *   onSelect(identityKey) — called when the user picks an identity
 */
export default function DashboardIdentitySwitcher({ user, activeIdentity, onSelect }) {
  const [open, setOpen] = useState(false);

  // Build the list of available identities: Fan (always) + each approved capability
  const identities = React.useMemo(() => {
    const types = user?.profile_types || ['fan'];
    const labelMap = {
      fan: 'Fan',
      driver: 'Driver',
      team: 'Team',
      track: 'Track',
      series: 'Series',
      media: 'Media',
      brand: 'Brand',
      crew: 'Crew',
      builder: 'Builder',
      sponsor: 'Sponsor',
      photographer: 'Photographer',
      creator: 'Creator',
    };
    // Always include Fan first, then other approved types in a stable order
    const ordered = ['fan', 'driver', 'team', 'track', 'series', 'media', 'photographer', 'creator', 'brand', 'sponsor', 'crew', 'builder'];
    return ordered
      .filter((t) => types.includes(t))
      .map((t) => ({ key: t, label: labelMap[t] || t }));
  }, [user?.profile_types]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  // If only Fan is available, don't render the switcher
  if (identities.length <= 1) return null;

  const active = identities.find((i) => i.key === activeIdentity) || identities[0];

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] hidden sm:inline" style={{ color: 'hsl(var(--foreground-quiet))' }}>
        View as
      </span>
      {/* Desktop: pill row */}
      <div className="hidden sm:flex flex-wrap gap-1.5">
        {identities.map((identity) => {
          const isActive = identity.key === active.key;
          return (
            <button
              key={identity.key}
              type="button"
              onClick={() => onSelect(identity.key)}
              className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5"
              style={isActive ? {
                background: MOTION,
                color: 'hsl(var(--canvas))',
                border: `1px solid ${MOTION}`,
              } : {
                background: 'hsl(var(--surface-interactive) / 0.3)',
                color: 'hsl(var(--foreground-quiet))',
                border: '1px solid hsl(var(--divider) / 0.6)',
              }}
            >
              {isActive && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'hsl(var(--canvas))' }} />}
              {identity.label}
            </button>
          );
        })}
      </div>
      {/* Mobile: dropdown */}
      <div className="sm:hidden relative flex-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all"
          style={{
            background: `${MOTION} / 0.12)`,
            color: MOTION,
            border: `1px solid ${MOTION} / 0.3)`,
          }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: MOTION }} />
            {active.label}
          </span>
          <ChevronDown className="w-4 h-4" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
            style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))', boxShadow: '0 8px 32px hsl(0 0% 0% / 0.2)' }}>
            {identities.map((identity) => {
              const isActive = identity.key === active.key;
              return (
                <button
                  key={identity.key}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(identity.key); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left transition-colors"
                  style={isActive ? {
                    background: `${MOTION} / 0.12)`,
                    color: MOTION,
                  } : {
                    color: 'hsl(var(--foreground-secondary))',
                  }}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full" style={{ background: MOTION }} />}
                  {identity.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}