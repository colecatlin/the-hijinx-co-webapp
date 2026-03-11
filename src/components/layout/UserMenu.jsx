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
        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors outline-none focus:outline-none">
          <div className="w-7 h-7 rounded-full bg-[#232323] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
            {initials}
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="pb-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge className={`text-xs px-1.5 py-0 h-5 ${USER_MODE_COLORS[userMode]}`}>
              {USER_MODE_LABELS[userMode]}
            </Badge>
            {user?.full_name && (
              <span className="text-xs text-gray-400 truncate max-w-[120px]">{user.email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {menuItems.map((item, i) => {
          if (item.type === 'divider') return <DropdownMenuSeparator key={`sep-${i}`} />;
          const Icon = ICON_MAP[item.icon];
          if (item.type === 'action' && item.action === 'logout') {
            return (
              <DropdownMenuItem key={i}
                onClick={() => base44.auth.logout(createPageUrl('Home'))}
                className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span>{item.label}</span>
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuItem key={i} asChild>
              <Link to={item.to}
                className={`flex items-center gap-2 cursor-pointer w-full ${item.adminOnly ? 'text-purple-700' : ''}`}>
                {Icon && (
                  <Icon className={`w-4 h-4 flex-shrink-0 ${
                    item.highlight ? 'text-[#232323]' : item.adminOnly ? 'text-purple-500' : 'text-gray-400'
                  }`} />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`text-sm truncate ${item.highlight ? 'font-semibold text-[#232323]' : ''}`}>
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="text-xs text-gray-400 truncate">{item.sublabel}</span>
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