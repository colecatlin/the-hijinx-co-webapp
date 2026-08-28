import React from 'react';
import { Link } from 'react-router-dom';
import { getRaceCoreNavForIdentity } from '@/components/registrationdashboard/raceCoreNavConfig';

const MOTION = 'hsl(var(--motion))';

/**
 * Quick-access tile grid for RaceCore sections the user has access to.
 * Uses getRaceCoreNavForIdentity to filter by admin role / collaborator access.
 */
export default function RaceCoreTiles({ user, collaborators }) {
  const identity = { is_admin: user?.role === 'admin' };
  const navGroups = getRaceCoreNavForIdentity({ identity, collaborators });

  // Flatten all visible items into tiles
  const tiles = navGroups.flatMap(g => g.items);

  if (tiles.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
        Race Core
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {tiles.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={item.href + i} to={item.href}>
              <div
                className="flex flex-col gap-2 p-4 rounded-2xl transition-all duration-200 h-full"
                style={{
                  background: 'hsl(var(--surface-interactive) / 0.3)',
                  border: '1px solid hsl(var(--divider) / 0.6)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${MOTION} / 0.08)`;
                  e.currentTarget.style.borderColor = `${MOTION} / 0.25)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.3)';
                  e.currentTarget.style.borderColor = 'hsl(var(--divider) / 0.6)';
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${MOTION} / 0.12)`, color: MOTION }}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{item.label}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}