import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/components/utils';
import MyEntriesSection from '@/components/mydashboard/MyEntriesSection';
import DashboardModeBanner from '@/components/mydashboard/DashboardModeBanner';
import MediaPortalCard from '@/components/mydashboard/MediaPortalCard';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity, isPrimaryEntityStale, setPrimaryEntityOnUser } from '@/components/entities/entityPrimary';
import { invalidateDataGroups } from '@/components/data/invalidationContract';
import OnboardingEntryCards from '@/components/onboarding/OnboardingEntryCards';
import OnboardingIntercept from '@/components/onboarding/OnboardingIntercept';
import DriverCompletionPrompt from '@/components/mydashboard/DriverCompletionPrompt';
import PendingClaimsNotice from '@/components/onboarding/PendingClaimsNotice';
import PendingAccessSection from '@/components/mydashboard/PendingAccessSection';
import AccessSuccessBanner from '@/components/mydashboard/AccessSuccessBanner';
import PrimaryEntityPrompt from '@/components/mydashboard/PrimaryEntityPrompt';
import { getUserMode } from '@/components/system/userModeResolver';
import { getUserQuickActions } from '@/components/system/userQuickActions';
import {
  User, Users, MapPin, Trophy, ChevronRight,
  Shield, Edit, Edit2, Plus, KeyRound, ExternalLink, Star,
  Flag, Gauge, Calendar, Heart, Camera, Lock, ShieldCheck
} from 'lucide-react';

const ENTITY_ICONS = { Driver: User, Team: Users, Track: MapPin, Series: Trophy };
const ENTITY_COLORS = {
  Driver: 'bg-blue-50 border-blue-200 text-blue-700',
  Team: 'bg-purple-50 border-purple-200 text-purple-700',
  Track: 'bg-green-50 border-green-200 text-green-700',
  Series: 'bg-orange-50 border-orange-200 text-orange-700',
};
const SECTION_LABELS = { Driver: 'Drivers', Team: 'Teams', Track: 'Tracks', Series: 'Series' };

function EntityCard({ collaborator, onManage, onRaceCore, isPrimary, onSetPrimary, settingPrimary }) {
  const Icon = ENTITY_ICONS[collaborator.entity_type] || User;
  const colorClass = ENTITY_COLORS[collaborator.entity_type] || 'bg-gray-50 border-gray-200 text-gray-700';
  const isOwner = collaborator.role === 'owner';

  return (
    <div className={`bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-md transition-shadow border-2 ${isPrimary ? 'border-[#232323]' : 'border-transparent border border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">{collaborator.entity_name}</h3>
            {isPrimary && (
              <Badge className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200">
                <Star className="w-3 h-3 mr-1 inline" />Primary
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`text-xs px-2 py-0.5 ${isOwner ? 'bg-[#232323] text-white' : 'bg-gray-100 text-gray-600'}`}>
              {isOwner ? <><Shield className="w-3 h-3 mr-1 inline" />Owner</> : <><Edit className="w-3 h-3 mr-1 inline" />Editor</>}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {!isPrimary && (
          <Button variant="ghost" size="sm" disabled={settingPrimary === collaborator.entity_id}
            onClick={() => onSetPrimary(collaborator)}
            className="gap-1.5 text-xs text-gray-400 hover:text-amber-600">
            <Star className="w-3.5 h-3.5" />
            {settingPrimary === collaborator.entity_id ? 'Setting...' : 'Set Primary'}
          </Button>
        )}
        {collaborator.is_racecore_entity && (
          <Button variant="outline" size="sm" onClick={() => onRaceCore(collaborator)} className="gap-1.5 text-xs">
            <Gauge className="w-3.5 h-3.5" /> Open Race Core
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onManage(collaborator)}
          className="gap-1.5 text-xs hover:bg-[#232323] hover:text-white hover:border-[#232323] transition-colors">
          Open Editor
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        {isOwner && (
          <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-gray-400 hover:text-gray-700">
              <Lock className="w-3.5 h-3.5" /> Manage Access
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function FanHub({ mode }) {
  const isEditor = mode === 'entity_editor';
  return (
    <div className="space-y-4">
      <div className="text-center py-8 px-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <div className="w-14 h-14 bg-white rounded-2xl border border-gray-200 flex items-center justify-center mx-auto mb-4">
          {isEditor ? <Edit2 className="w-6 h-6 text-blue-400" /> : <Heart className="w-6 h-6 text-gray-400" />}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {isEditor ? 'You are set up as an Editor' : 'Fan Hub'}
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mx-auto mb-5">
          {isEditor
            ? 'You have editor access. Open the editor to update profiles, or launch Race Core if your track/series is linked.'
            : 'Follow drivers, save favorites, and explore events. Link a racing entity if you manage one.'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to={createPageUrl('DriverDirectory')}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"><User className="w-3.5 h-3.5" /> Browse Drivers</Button>
          </Link>
          <Link to={createPageUrl('EventDirectory')}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Calendar className="w-3.5 h-3.5" /> Browse Events</Button>
          </Link>
          {!isEditor && (
            <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
              <Button size="sm" className="bg-[#232323] hover:bg-black text-white gap-1.5 text-xs">
                <KeyRound className="w-3.5 h-3.5" /> Link an Entity
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [settingPrimary, setSettingPrimary] = React.useState(false);

  const [onboardingDismissed, setOnboardingDismissed] = React.useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: resolvedEntities = [], isLoading: resolvedLoading } = useQuery({
    queryKey: ['resolvedEntities', user?.id],   // matches QueryKeys.managedCollaborations.byUser(user?.id)
    queryFn: () => getResolvedManagedEntities(user),
    enabled: !!user?.id,
  });

  const { data: mediaProfile } = useQuery({
    queryKey: ['mediaProfile', user?.id],
    queryFn: () => base44.entities.MediaUser.filter({ user_id: user.id }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.id,
  });

  const isLoading = userLoading || resolvedLoading;
  const hasEntities = resolvedEntities.length > 0;
  const isAdmin = user?.role === 'admin';
  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const primaryStale = isPrimaryEntityStale(user, resolvedEntities);
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const mode = getUserMode({ user, collaborators: resolvedEntities, mediaProfile });

  // Race Core hero target: primary if Track/Series, else first Track/Series
  const raceCoreTarget = useMemo(() => {
    if (primaryEntity?.is_racecore_entity) return primaryEntity;
    return raceCoreEntities[0] || null;
  }, [primaryEntity, raceCoreEntities]);

  const quickActions = useMemo(() => getUserQuickActions({
    mode,
    raceCoreTarget,
    primaryEntity,
    buildRaceCoreLaunchUrl,
    buildEditorUrl,
  }), [mode, raceCoreTarget, primaryEntity]);

  const grouped = useMemo(() => {
    return resolvedEntities.reduce((acc, entity) => {
      if (!acc[entity.entity_type]) acc[entity.entity_type] = [];
      acc[entity.entity_type].push(entity);
      return acc;
    }, {});
  }, [resolvedEntities]);

  const handleSetPrimary = async (collaborator) => {
    setSettingPrimary(collaborator.entity_id);
    await setPrimaryEntityOnUser({ currentUser: user, entityType: collaborator.entity_type, entityId: collaborator.entity_id });
    invalidateDataGroups(queryClient, ['profile', 'collaborators']);
    setSettingPrimary(false);
  };

  const handleManage = (collaborator) => navigate(buildEditorUrl(collaborator));
  const handleRaceCore = (collaborator) => navigate(buildRaceCoreLaunchUrl(collaborator));
  const handleEnterCode = () => navigate(createPageUrl('Profile') + '?tab=access_codes');

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

  // First-time onboarding intercept — only for non-admin, zero-entity, incomplete users
  const showOnboarding =
    !isLoading &&
    !!user &&
    user.role !== 'admin' &&
    resolvedEntities.length === 0 &&
    !user.onboarding_complete &&
    !onboardingDismissed;

  if (showOnboarding) {
    return <OnboardingIntercept onSkip={() => setOnboardingDismissed(true)} />;
  }

  const welcomeName = user?.full_name || user?.email || '';

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8 space-y-8">

          {/* Access updated success banner — shows new actions on fan→entity transition */}
          <AccessSuccessBanner
            raceCoreTarget={raceCoreTarget}
            primaryEntity={primaryEntity}
            buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
            buildEditorUrl={buildEditorUrl}
          />

          {/* Driver profile completion prompt — shown to driver owners with incomplete profiles */}
          {!isLoading && user && user.primary_entity_type === 'Driver' && user.primary_entity_id && (
            <DriverCompletionPrompt user={user} />
          )}

          {/* Pending claims + invitations — shown for all users, fan or entity */}
          {user && !isLoading && <PendingAccessSection user={user} />}

          {/* Primary entity prompt — shown when user has entities but no primary set */}
          {!isLoading && hasEntities && !primaryEntity && !primaryStale && (
            <PrimaryEntityPrompt user={user} entities={resolvedEntities} />
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Index46</h1>
              {welcomeName && <p className="text-sm text-gray-500 mt-1">Welcome back, {welcomeName}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <Link to="/ClaimsCenter">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" /> Claims Center
                </Button>
              </Link>
              <Link to={createPageUrl('MotorsportsHome')}>
                <Button size="sm" className="gap-1.5 text-xs bg-[#232323] hover:bg-black text-white">
                  <Flag className="w-3.5 h-3.5" /> Browse Motorsports
                </Button>
              </Link>
              {isAdmin && (
                <Link to={createPageUrl('Management')}>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50">
                    <Shield className="w-3.5 h-3.5" /> Management
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Actions — mode-aware */}
          {!isLoading && (
            <div className="flex flex-wrap gap-2">
              {quickActions.map(action => (
                <Link key={action.label} to={action.to}>
                  <Button
                    size="sm"
                    variant={action.isPrimary ? 'default' : 'outline'}
                    className={`gap-1.5 text-xs ${action.isPrimary ? 'bg-[#232323] hover:bg-black text-white' : ''} ${action.isAdmin ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                  >
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100" />

          {/* Fan Shortcuts */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Fan Shortcuts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: 'Drivers', page: 'DriverDirectory', Icon: User, color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' },
                { label: 'Teams', page: 'TeamDirectory', Icon: Users, color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700' },
                { label: 'Tracks', page: 'TrackDirectory', Icon: MapPin, color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700' },
                { label: 'Series', page: 'SeriesHome', Icon: Trophy, color: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700' },
                { label: 'Events', page: 'EventDirectory', Icon: Calendar, color: 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700' },
              ].map(({ label, page, Icon, color }) => (
                <Link key={page} to={createPageUrl(page)}>
                  <button className={`w-full flex flex-col items-center gap-1.5 py-4 px-3 border rounded-xl transition-colors ${color}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Onboarding section — shown only when user has zero managed entities */}
          {!isLoading && !hasEntities && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Get Started</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose how you want to enter the HIJINX ecosystem.</p>
              </div>
              <OnboardingEntryCards />
              <PendingClaimsNotice userId={user?.id} />
            </div>
          )}

          {!isLoading && !hasEntities && <div className="border-t border-gray-100" />}

          {/* Mode-aware dashboard banner */}
          {!isLoading && (
            <DashboardModeBanner
              user={user}
              collaborators={resolvedEntities}
              mediaProfile={mediaProfile}
              raceCoreTarget={raceCoreTarget}
              primaryEntity={primaryEntity}
              buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
              buildEditorUrl={buildEditorUrl}
            />
          )}

          {/* Media Portal card — shown for fans and media users */}
          {!isLoading && (mode === 'media_user' || mode === 'fan' || mode === 'entity_owner' || mode === 'entity_editor') && (
            <MediaPortalCard mediaProfile={mediaProfile} />
          )}

          {/* My Activity */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">My Activity</h2>
            <MyEntriesSection user={user} isLoading={userLoading} />
          </div>

          <div className="border-t border-gray-100" />

          {/* Managed Profiles + Race Core */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : !hasEntities ? (
            <FanHub mode={mode} />
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

                {/* Entities I Own */}
                {resolvedEntities.filter(e => e.role === 'owner').length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entities I Own</span>
                    </div>
                    {resolvedEntities.filter(e => e.role === 'owner').map(entity => (
                      <EntityCard
                        key={entity.collaboration_id}
                        collaborator={entity}
                        onManage={handleManage}
                        onRaceCore={handleRaceCore}
                        isPrimary={entity.entity_id === primaryEntity?.entity_id}
                        onSetPrimary={handleSetPrimary}
                        settingPrimary={settingPrimary}
                      />
                    ))}
                  </div>
                )}
                {/* Entities I Edit */}
                {resolvedEntities.filter(e => e.role !== 'owner').length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entities I Edit</span>
                    </div>
                    {resolvedEntities.filter(e => e.role !== 'owner').map(entity => (
                      <EntityCard
                        key={entity.collaboration_id}
                        collaborator={entity}
                        onManage={handleManage}
                        onRaceCore={handleRaceCore}
                        isPrimary={entity.entity_id === primaryEntity?.entity_id}
                        onSetPrimary={handleSetPrimary}
                        settingPrimary={settingPrimary}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Race Core section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Race Core</h2>
                </div>

                {primaryStale && (
                  <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    Your primary entity is no longer linked. Choose a new one from the list above.
                  </div>
                )}

                {raceCoreEntities.length === 0 ? (
                  <div className="py-5 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
                    <p className="text-sm text-gray-500">Race Core appears once you manage a track or series.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {raceCoreEntities.map(collab => {
                      const isThisPrimary = collab.entity_id === primaryEntity?.entity_id;
                      return (
                        <button key={collab.collaboration_id || collab.entity_id}
                          onClick={() => handleRaceCore(collab)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 text-white rounded-xl transition-colors group ${isThisPrimary ? 'bg-[#232323] ring-2 ring-amber-400/50' : 'bg-[#232323] hover:bg-black'}`}>
                          <div className="flex items-center gap-3">
                            <Gauge className="w-4 h-4 text-gray-300" />
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">Open Race Core</p>
                                {isThisPrimary && (
                                  <span className="text-xs px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">Primary</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{collab.entity_name}</p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
                        </button>
                      );
                    })}
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