import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';

/**
 * Compact profile entry card for the My Dashboard page.
 * Shows avatar + name + handle + "View Profile" link to /Profile.
 * The full profile hero lives on the Profile settings page.
 */
export default function DashboardProfileCard({ user }) {
  const displayName = user?.display_name || user?.full_name || user?.first_name || user?.username || 'Anonymous';
  const initials = displayName?.[0]?.toUpperCase() || '?';

  return (
    <Link to="/Profile" className="block">
      <div
        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200"
        style={{
          background: 'hsl(var(--surface-elevated) / 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid hsl(var(--divider) / 0.6)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${MOTION} / 0.3)`; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--divider) / 0.6)'; }}
      >
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: `1.5px solid ${MOTION}` }}>
          {user?.profile_photo_url
            ? <img src={user.profile_photo_url} alt={displayName} className="w-full h-full object-cover" />
            : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${MOTION}, hsl(var(--motion-active)))` }}>
                <span className="text-lg font-black" style={{ color: 'hsl(var(--canvas))' }}>{initials}</span>
              </div>
            )
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{displayName}</p>
          {user?.username && (
            <p className="text-xs font-mono truncate" style={{ color: 'hsl(var(--foreground-quiet))' }}>@{user.username}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs font-medium flex-shrink-0" style={{ color: MOTION }}>
          View Profile <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}