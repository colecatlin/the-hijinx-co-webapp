import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/components/utils';
import MyEntriesSection from '@/components/mydashboard/MyEntriesSection';
import {
  User, Users, MapPin, Trophy, ChevronRight,
  Shield, Edit, Plus, KeyRound, ExternalLink, Star,
  Flag, Gauge, Car, Calendar
} from 'lucide-react';

const ENTITY_ICONS = {
  Driver: User,
  Team: Users,
  Track: MapPin,
  Series: Trophy,
};

const ENTITY_COLORS = {
  Driver: 'bg-blue-50 border-blue-200 text-blue-700',
  Team: 'bg-purple-50 border-purple-200 text-purple-700',
  Track: 'bg-green-50 border-green-200 text-green-700',
  Series: 'bg-orange-50 border-orange-200 text-orange-700',
};

const SECTION_LABELS = {
  Driver: 'Drivers',
  Team: 'Teams',
  Track: 'Tracks',
  Series: 'Series',
};

function EntityCard({ collaborator, onManage, onRaceCore }) {
  const Icon = ENTITY_ICONS[collaborator.entity_type] || User;
  const colorClass = ENTITY_COLORS[collaborator.entity_type] || 'bg-gray-50 border-gray-200 text-gray-700';
  const isOwner = collaborator.role === 'owner';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{collaborator.entity_name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              className={`text-xs px-2 py-0.5 ${isOwner ? 'bg-[#232323] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {isOwner ? (
                <><Shield className="w-3 h-3 mr-1 inline" />Owner</>
              ) : (
                <><Edit className="w-3 h-3 mr-1 inline" />Editor</>
              )}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onManage(collaborator)}
          className="gap-1.5 text-xs hover:bg-[#232323] hover:text-white hover:border-[#232323] transition-colors"
        >
          {collaborator.entity_type === 'Driver' ? 'Edit Profile' : 'Open Console'}
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onEnterCode }) {
  return (
    <div className="text-center py-14 px-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <div className="w-14 h-14 bg-white rounded-2xl border border-gray-200 flex items-center justify-center mx-auto mb-4">
        <Star className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">You are in Fan Mode</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
        Follow drivers, save favorites, and explore events. If you manage a driver, team, track, or series, link it using an access code.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={onEnterCode}
          className="bg-[#232323] hover:bg-black text-white gap-2"
        >
          <KeyRound className="w-4 h-4" />
          Enter Access Code
        </Button>
        <Link to={createPageUrl('Profile') + '?tab=fan'}>
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <User className="w-4 h-4" />
            Go to Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function MyDashboard() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: collaborators = [], isLoading: collabLoading } = useQuery({
    queryKey: ['entityCollaborators', user?.email],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const isLoading = userLoading || collabLoading;

  const grouped = useMemo(() => {
    return collaborators.reduce((acc, collab) => {
      const type = collab.entity_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(collab);
      return acc;
    }, {});
  }, [collaborators]);

  const raceCoreCollabs = useMemo(
    () => collaborators.filter(c => c.entity_type === 'Track' || c.entity_type === 'Series'),
    [collaborators]
  );

  const handleManage = (collaborator) => {
    if (collaborator.entity_type === 'Driver') {
      navigate(createPageUrl('DriverEditor') + `?id=${collaborator.entity_id}`);
    } else {
      navigate(createPageUrl('EntityEditor') + `?id=${collaborator.access_code}`);
    }
  };

  const handleRaceCore = (collaborator) => {
    navigate(createPageUrl('RegistrationDashboard') + `?orgType=${collaborator.entity_type.toLowerCase()}&orgId=${collaborator.entity_id}`);
  };

  const handleEnterCode = () => {
    navigate(createPageUrl('Profile') + '?tab=access');
  };

  const hasCols = collaborators.length > 0;
  const isAdmin = user?.role === 'admin';
  const hasEntities = collaborators.length > 0;

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

  const welcomeName = user?.full_name || user?.email || '';

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Dashboard Shell ─────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8 space-y-8">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Index46 Dashboard</h1>
              {welcomeName && (
                <p className="text-sm text-gray-500 mt-1">Welcome back, {welcomeName}</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link to={createPageUrl('Profile')}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5" /> Profile
                </Button>
              </Link>
              <Link to={createPageUrl('MotorsportsHome')}>
                <Button size="sm" className="gap-1.5 text-xs bg-[#232323] hover:bg-black text-white">
                  <Flag className="w-3.5 h-3.5" /> Browse Motorsports
                </Button>
              </Link>
            </div>
          </div>

          {/* ── Quick Actions row ───────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <Link to={createPageUrl('DriverDirectory')}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <User className="w-3.5 h-3.5" /> Browse Drivers
              </Button>
            </Link>
            <Link to={createPageUrl('EventDirectory')}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" /> Browse Events
              </Button>
            </Link>
            {hasEntities && (
              <Link to={createPageUrl('RegistrationDashboard')}>
                <Button size="sm" className="gap-1.5 text-xs bg-[#232323] hover:bg-black text-white">
                  <Gauge className="w-3.5 h-3.5" /> Open Race Core
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to={createPageUrl('Management')}>
                <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white">
                  <Shield className="w-3.5 h-3.5" /> Management
                </Button>
              </Link>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Fan Shortcuts ───────────────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Fan Shortcuts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Link to={createPageUrl('DriverDirectory')}>
                <button className="w-full flex flex-col items-center gap-1.5 py-4 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Drivers</span>
                </button>
              </Link>
              <Link to={createPageUrl('TeamDirectory')}>
                <button className="w-full flex flex-col items-center gap-1.5 py-4 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Teams</span>
                </button>
              </Link>
              <Link to={createPageUrl('TrackDirectory')}>
                <button className="w-full flex flex-col items-center gap-1.5 py-4 px-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Tracks</span>
                </button>
              </Link>
              <Link to={createPageUrl('SeriesHome')}>
                <button className="w-full flex flex-col items-center gap-1.5 py-4 px-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors">
                  <Trophy className="w-5 h-5 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700">Series</span>
                </button>
              </Link>
              <Link to={createPageUrl('EventDirectory')}>
                <button className="w-full flex flex-col items-center gap-1.5 py-4 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">Events</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Context Card ────────────────────────────────────────── */}
          {!isLoading && (
            <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${hasEntities ? 'bg-[#232323] text-white border-[#232323]' : 'bg-blue-50 border-blue-200'}`}>
              <div>
                <h3 className={`font-semibold text-base ${hasEntities ? 'text-white' : 'text-blue-900'}`}>
                  {hasEntities ? 'You manage race entities' : 'You are set up as a fan'}
                </h3>
                <p className={`text-sm mt-1 ${hasEntities ? 'text-gray-300' : 'text-blue-700'}`}>
                  {hasEntities
                    ? 'Jump into Race Core for weekend operations, or edit long term profiles in the editors.'
                    : 'Follow drivers, teams, tracks, and series to build your feed. If you manage a racing entity, link it with an access code in Profile.'}
                </p>
              </div>
              <div className="flex-shrink-0">
                {hasEntities ? (
                  <Link to={createPageUrl('RegistrationDashboard')}>
                    <Button size="sm" className="gap-1.5 text-xs bg-white text-[#232323] hover:bg-gray-100 border-0">
                      <Gauge className="w-3.5 h-3.5" /> Open Race Core
                    </Button>
                  </Link>
                ) : (
                  <Link to={createPageUrl('Profile') + '?tab=entities'}>
                    <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0">
                      <KeyRound className="w-3.5 h-3.5" /> Go to Profile to link an entity
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── My Activity ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">My Activity</h2>
            <MyEntriesSection user={user} isLoading={userLoading} />
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Managed Profiles + Race Core ────────────────────────── */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : !hasCols ? (
            <EmptyState onEnterCode={handleEnterCode} />
          ) : (
            <div className="space-y-8">

              {/* Managed Profiles */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">Managed Profiles</h2>
                  <Button variant="ghost" size="sm" onClick={handleEnterCode} className="gap-1.5 text-xs text-gray-500">
                    <Plus className="w-3.5 h-3.5" /> Link Another
                  </Button>
                </div>

                {Object.entries(grouped).map(([entityType, items]) => {
                  const Icon = ENTITY_ICONS[entityType] || User;
                  return (
                    <div key={entityType}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {SECTION_LABELS[entityType] || entityType + 's'}
                        </span>
                        <span className="text-xs text-gray-300">({items.length})</span>
                      </div>
                      <div className="space-y-2">
                        {items.map(collab => (
                          <EntityCard
                            key={collab.id}
                            collaborator={collab}
                            onManage={handleManage}
                            onRaceCore={handleRaceCore}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Race Core */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Race Core</h2>
                </div>

                {raceCoreCollabs.length === 0 ? (
                  <div className="py-5 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
                    <p className="text-sm text-gray-500">Race Core appears once you manage a track or series.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {raceCoreCollabs.map(collab => (
                      <button
                        key={collab.id}
                        onClick={() => handleRaceCore(collab)}
                        className="w-full flex items-center justify-between px-4 py-3.5 bg-[#232323] hover:bg-black text-white rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Gauge className="w-4 h-4 text-gray-300" />
                          <div className="text-left">
                            <p className="text-sm font-semibold">Open Race Core</p>
                            <p className="text-xs text-gray-400">{collab.entity_name}</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </PageShell>
  );
}