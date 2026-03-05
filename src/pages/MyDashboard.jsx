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
  Shield, Edit, Plus, KeyRound, LayoutDashboard, ExternalLink, Star, Heart, Link2
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

const EDITOR_PAGES = {
  Driver: 'DriverEditor',
  Team: 'EntityEditor',
  Track: 'EntityEditor',
  Series: 'EntityEditor',
};

function EntityCard({ collaborator, onManage, onRaceCore }) {
  const Icon = ENTITY_ICONS[collaborator.entity_type] || User;
  const colorClass = ENTITY_COLORS[collaborator.entity_type] || 'bg-gray-50 border-gray-200 text-gray-700';
  const isOwner = collaborator.role === 'owner';
  const showRaceCore = collaborator.entity_type === 'Track' || collaborator.entity_type === 'Series';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-base">{collaborator.entity_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${colorClass}`}>
              {collaborator.entity_type}
            </Badge>
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
        {showRaceCore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRaceCore(collaborator)}
            className="gap-1.5 text-xs border-gray-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Race Core
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onManage(collaborator)}
          className="gap-2 hover:bg-[#232323] hover:text-white hover:border-[#232323] transition-colors"
        >
          {collaborator.entity_type === 'Driver' ? 'Edit Profile' : 'Open Console'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onEnterCode }) {
  return (
    <div className="text-center py-16 px-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <div className="w-16 h-16 bg-white rounded-2xl border border-gray-200 flex items-center justify-center mx-auto mb-4">
        <Star className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">You are in Fan Mode</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
        Follow drivers, save favorites, and explore events. If you manage a driver, team, track, or series, link it using an access code.
      </p>
      <Button
        onClick={onEnterCode}
        className="bg-[#232323] hover:bg-[#1A3249] text-white gap-2"
      >
        <KeyRound className="w-4 h-4" />
        Enter Access Code
      </Button>
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

  // Group by entity type
  const grouped = useMemo(() => {
    return collaborators.reduce((acc, collab) => {
      const type = collab.entity_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(collab);
      return acc;
    }, {});
  }, [collaborators]);

  const handleManage = (collaborator) => {
    if (collaborator.entity_type === 'Driver') {
      navigate(createPageUrl('DriverEditor') + `?id=${collaborator.entity_id}`);
    } else {
      navigate(createPageUrl('EntityEditor') + `?id=${collaborator.access_code}`);
    }
  };

  const handleRaceCore = (collaborator) => {
    const orgType = collaborator.entity_type.toLowerCase();
    const orgId = collaborator.entity_id;
    navigate(createPageUrl('RegistrationDashboard') + `?orgType=${orgType}&orgId=${orgId}`);
  };

  const handleEnterCode = () => {
    navigate(createPageUrl('Profile') + '?tab=access');
  };

  // Compute the Race Core deep link URL
  const raceCoreUrl = useMemo(() => {
    const first = collaborators.find(c => c.entity_type === 'Track' || c.entity_type === 'Series');
    if (first) {
      return createPageUrl('RegistrationDashboard') + `?orgType=${first.entity_type.toLowerCase()}&orgId=${first.entity_id}`;
    }
    return createPageUrl('RegistrationDashboard');
  }, [collaborators]);

  const hasCols = collaborators.length > 0;

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Hero Card ─────────────────────────────────────────────── */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#232323] rounded-xl flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">My Dashboard</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {hasCols
                    ? 'Your operations hub — manage profiles and Race Core.'
                    : 'Fan hub, favorites, and registration.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => navigate(createPageUrl('Profile'))}
              >
                <Edit className="w-3.5 h-3.5" /> Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => navigate(createPageUrl('Profile') + '?tab=access')}
              >
                <KeyRound className="w-3.5 h-3.5" /> Enter Access Code
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Fan Hub Section ────────────────────────────────────────── */}
        {user && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Fan Hub</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(createPageUrl('Profile') + '?tab=fan')}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="text-2xl font-bold text-gray-900">{(user.favorite_drivers || []).length}</div>
                  <p className="text-xs text-gray-600 font-medium">Favorite Drivers</p>
                  <Button variant="ghost" size="sm" className="text-xs mt-auto">
                    Manage
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(createPageUrl('Profile') + '?tab=fan')}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="text-2xl font-bold text-gray-900">{(user.favorite_teams || []).length}</div>
                  <p className="text-xs text-gray-600 font-medium">Favorite Teams</p>
                  <Button variant="ghost" size="sm" className="text-xs mt-auto">
                    Manage
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(createPageUrl('Profile') + '?tab=fan')}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="text-2xl font-bold text-gray-900">{(user.favorite_series || []).length}</div>
                  <p className="text-xs text-gray-600 font-medium">Favorite Series</p>
                  <Button variant="ghost" size="sm" className="text-xs mt-auto">
                    Manage
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(createPageUrl('Profile') + '?tab=fan')}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="text-2xl font-bold text-gray-900">{(user.favorite_tracks || []).length}</div>
                  <p className="text-xs text-gray-600 font-medium">Favorite Tracks</p>
                  <Button variant="ghost" size="sm" className="text-xs mt-auto">
                    Manage
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── My Entries Section ─────────────────────────────────────── */}
        <MyEntriesSection user={user} isLoading={userLoading} />

        {/* ── Loading ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>

        ) : !hasCols ? (
          /* ── Fan View ──────────────────────────────────────────────── */
          <>
            <EmptyState onEnterCode={handleEnterCode} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('Profile') + '?tab=fan')}>
                <CardContent className="p-6 flex flex-col items-start gap-3">
                  <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Favorites</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Manage your followed drivers, teams, and series.</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 mt-auto">
                    Go to Favorites <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('Profile') + '?tab=access')}>
                <CardContent className="p-6 flex flex-col items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Link a Profile</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Enter an access code to manage a driver, team, track, or series.</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 mt-auto">
                    Link Profile <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>

        ) : (
          /* ── Entity Owner / Race Core View ─────────────────────────── */
          <div className="space-y-6">

            {/* Race Core Shortcuts strip */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                onClick={() => navigate(raceCoreUrl)}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Race Core
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => navigate(createPageUrl('Profile') + '?tab=entities')}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> My Entities
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => navigate(createPageUrl('Profile') + '?tab=access')}
              >
                <KeyRound className="w-3.5 h-3.5" /> Link Access
              </Button>
            </div>

            {/* Grouped entity cards */}
            {Object.entries(grouped).map(([entityType, items]) => {
              const Icon = ENTITY_ICONS[entityType] || User;
              return (
                <div key={entityType}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {entityType}s
                    </h2>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </div>
                  <div className="space-y-3">
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

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={handleEnterCode} className="gap-2 text-sm">
                <Plus className="w-4 h-4" /> Link Another Profile
              </Button>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}