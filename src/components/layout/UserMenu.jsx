import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LayoutDashboard, User, Gauge, Camera, Settings, Activity, LogOut } from 'lucide-react';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity } from '@/components/entities/entityPrimary';
import { getUserMode, USER_MODE_LABELS, USER_MODE_COLORS } from '@/components/system/userModeResolver';
import { getUserMenuItems } from '@/components/system/navigationResolver';

const ICON_MAP = { LayoutDashboard, User, Gauge, Camera, Settings, Activity, LogOut };

/**
 * Top-right user avatar dropdown for logged-in users.
 * Shows role-appropriate items: Dashboard, Profile, Race Core (if valid),
 * Media Portal (if active), Management/Diagnostics (admin only), Sign Out.
 */
export default function UserMenu({ user }) {
  const { data: resolvedEntities = [] } = useQuery({
    queryKey: ['resolvedEntities', user?.id],
    queryFn: () => getResolvedManagedEntities(user),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const { data: mediaProfile } = useQuery({
    queryKey: ['mediaProfile', user?.id],
    queryFn: () => base44.entities.MediaUser.filter({ user_id: user.id }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  if (!user) return null;

  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const raceCoreTarget = (primaryEntity?.is_racecore_entity ? primaryEntity : null) || raceCoreEntities[0] || null;
  const hasRaceCoreAccess = raceCoreEntities.length > 0;
  const hasMediaAccess = !!mediaProfile && mediaProfile.status !== 'rejected';
  const userMode = getUserMode({ user, collaborators: resolvedEntities, mediaProfile });
  const raceCoreUrl = hasRaceCoreAccess && raceCoreTarget ? buildRaceCoreLaunchUrl(raceCoreTarget) : null;

  const menuItems = getUserMenuItems({
    user,
    userMode,
    raceCoreUrl,
    raceCoreEntityName: raceCoreTarget?.entity_name || null,
    hasRaceCoreAccess,
    hasMediaAccess,
  });

  const initials = user?.full_name
    ? user.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all outline-none focus:outline-none"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none"
            style={{
              background: 'rgba(29,161,161,0.2)',
              color: '#1DA1A1',
              border: '1px solid rgba(29,161,161,0.35)',
            }}
          >
            {initials}
          </div>
          <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-0"
        style={{
          background: 'rgba(5, 8, 10, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        <DropdownMenuLabel className="pb-2">
          <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{user?.full_name || user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge className={`text-xs px-1.5 py-0 h-5 ${USER_MODE_COLORS[userMode]}`}>
              {USER_MODE_LABELS[userMode]}
            </Badge>
            {user?.full_name && (
              <span className="text-xs truncate max-w-[120px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{user.email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.07)' }} />
        {menuItems.map((item, i) => {
          if (item.type === 'divider') return <DropdownMenuSeparator key={`sep-${i}`} style={{ background: 'rgba(255,255,255,0.07)' }} />;
          const Icon = ICON_MAP[item.icon];
          if (item.type === 'action' && item.action === 'logout') {
            return (
              <DropdownMenuItem key={i}
                onClick={() => base44.auth.logout(createPageUrl('Home'))}
                className="gap-2 cursor-pointer"
                style={{ color: 'rgba(239,68,68,0.8)' }}>
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span>{item.label}</span>
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuItem key={i} asChild>
              <Link to={item.to}
                className="flex items-center gap-2 cursor-pointer w-full"
                style={{ color: item.adminOnly ? 'rgba(167,139,250,0.85)' : 'rgba(255,255,255,0.7)' }}>
                {Icon && (
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: item.highlight ? '#1DA1A1' : item.adminOnly ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.35)' }} />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate" style={{ fontWeight: item.highlight ? 600 : 400, color: item.highlight ? '#1DA1A1' : 'inherit' }}>
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.sublabel}</span>
                  )}
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}