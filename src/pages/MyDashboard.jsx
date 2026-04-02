import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/components/utils';
import AccessSuccessBanner from '@/components/mydashboard/AccessSuccessBanner';
import PendingAccessSection from '@/components/mydashboard/PendingAccessSection';
import OnboardingIntercept from '@/components/onboarding/OnboardingIntercept';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity } from '@/components/entities/entityPrimary';
import { getUserMode } from '@/components/system/userModeResolver';
import {
  User, Users, MapPin, Trophy, Calendar, BookOpen,
  Camera, Shield, Edit, ChevronRight, Gauge, KeyRound, ExternalLink, Star
} from 'lucide-react';

// ─── Primary Actions by mode ─────────────────────────────────────────────────

function getPrimaryActions({ mode, primaryEntity, raceCoreTarget, user }) {
  const mediaIncomplete = mode === 'media_user' && !(user?.portfolio_url || user?.instagram_url);

  if (mode === 'admin' || mode === 'entity_owner' || mode === 'entity_editor') {
    const actions = [];
    if (primaryEntity) {
      actions.push({
        label: 'Open Editor',
        to: buildEditorUrl(primaryEntity),
        icon: Edit,
        primary: true,
      });
    }
    if (raceCoreTarget) {
      actions.push({
        label: 'Open Race Core',
        to: buildRaceCoreLaunchUrl(raceCoreTarget),
        icon: Gauge,
        primary: !primaryEntity,
      });
    }
    actions.push({
      label: 'Manage Access',
      to: createPageUrl('Profile') + '?tab=access_codes',
      icon: KeyRound,
    });
    if (mode === 'admin') {
      actions.push({ label: 'Management', to: createPageUrl('Management'), icon: Shield });
    }
    return actions.slice(0, 4);
  }

  if (mode === 'media_user') {
    const actions = [
      { label: 'Media Portal', to: createPageUrl('MediaPortal'), icon: Camera, primary: true },
      { label: 'Browse Events', to: createPageUrl('EventDirectory'), icon: Calendar },
      { label: 'Read Stories', to: createPageUrl('OutletHome'), icon: BookOpen },
    ];
    if (mediaIncomplete) {
      actions.push({ label: 'Complete Media Profile', to: createPageUrl('Profile') + '?tab=media', icon: User });
    }
    return actions.slice(0, 4);
  }

  // fan (default)
  return [
    { label: 'Browse Drivers', to: createPageUrl('DriverDirectory'), icon: User, primary: true },
    { label: 'Browse Events', to: createPageUrl('EventDirectory'), icon: Calendar },
    { label: 'Read Stories', to: createPageUrl('OutletHome'), icon: BookOpen },
    { label: 'Enter Access Code', to: createPageUrl('Profile') + '?tab=access_codes', icon: KeyRound },
  ];
}

// ─── Simplified Entity Row ────────────────────────────────────────────────────

function EntityRow({ entity, isPrimary }) {
  const isOwner = entity.role === 'owner';
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-shadow hover:shadow-sm ${isPrimary ? 'border-[#232323] bg-gray-50' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{entity.entity_name}</p>
            {isPrimary && <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600">{entity.entity_type}</Badge>
            <Badge className={`text-[10px] px-1.5 py-0 ${isOwner ? 'bg-gray-900 text-white' : 'bg-blue-50 text-blue-700'}`}>
              {isOwner ? 'Owner' : 'Editor'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {entity.is_racecore_entity && (
          <Button size="sm" className="text-xs gap-1 bg-[#232323] hover:bg-black text-white h-7 px-2.5"
            onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}>
            <Gauge className="w-3 h-3" /> Race Core
          </Button>
        )}
        <Button size="sm" variant="outline" className="text-xs gap-1 h-7 px-2.5"
          onClick={() => window.location.href = buildEditorUrl(entity)}>
          Editor <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Content Discovery Block ──────────────────────────────────────────────────

const CONTENT_LINKS = [
  { label: 'Featured Drivers', sub: 'Browse the driver directory', to: createPageUrl('DriverDirectory'), icon: User, color: 'bg-blue-50 text-blue-600' },
  { label: 'Upcoming Events', sub: 'View the race calendar', to: createPageUrl('EventDirectory'), icon: Calendar, color: 'bg-green-50 text-green-600' },
  { label: 'Latest Stories', sub: 'The Outlet — racing coverage', to: createPageUrl('OutletHome'), icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyDashboard() {
  const navigate = useNavigate();
  const [onboardingDismissed, setOnboardingDismissed] = React.useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: resolvedEntities = [], isLoading: resolvedLoading } = useQuery({
    queryKey: ['resolvedEntities', user?.id],
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
  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const raceCoreTarget = (primaryEntity?.is_racecore_entity ? primaryEntity : null) || raceCoreEntities[0] || null;
  const mode = getUserMode({ user, collaborators: resolvedEntities, mediaProfile });

  const primaryActions = useMemo(() =>
    getPrimaryActions({ mode, primaryEntity, raceCoreTarget, user }),
    [mode, primaryEntity, raceCoreTarget, user]
  );

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

  // First-time onboarding intercept
  const showOnboarding =
    !isLoading && !!user &&
    user.role !== 'admin' &&
    resolvedEntities.length === 0 &&
    !user.onboarding_complete &&
    !onboardingDismissed;

  if (showOnboarding) {
    return <OnboardingIntercept user={user} onSkip={() => setOnboardingDismissed(true)} />;
  }

  const welcomeName = user?.first_name || user?.full_name?.split(' ')[0] || '';

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Access success banners — kept but unobtrusive */}
        <AccessSuccessBanner
          raceCoreTarget={raceCoreTarget}
          primaryEntity={primaryEntity}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {/* ── Zone 1: Header ──────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">Dashboard</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {welcomeName ? `Hi, ${welcomeName}` : 'Index46'}
          </h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'admin' && 'Platform administrator'}
              {mode === 'entity_owner' && `Managing ${resolvedEntities.filter(e => e.role === 'owner').length} ${resolvedEntities.filter(e => e.role === 'owner').length === 1 ? 'entity' : 'entities'}`}
              {mode === 'entity_editor' && 'Editor access'}
              {mode === 'media_user' && 'Media / Creator'}
              {mode === 'fan' && 'Motorsports fan'}
            </p>
          )}
        </div>

        {/* ── Zone 2: Primary Actions ──────────────────────────────────── */}
        {!isLoading && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {primaryActions.map(action => {
                const Icon = action.icon;
                return (
                  <Link key={action.label} to={action.to}>
                    <Button
                      size="sm"
                      variant={action.primary ? 'default' : 'outline'}
                      className={`gap-1.5 text-xs ${action.primary ? 'bg-[#232323] hover:bg-black text-white' : ''}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {action.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Zone 3: Content Discovery ────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Explore</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CONTENT_LINKS.map(({ label, sub, to, icon: Icon, color }) => (
              <Link key={label} to={to}>
                <div className="flex items-start gap-3 p-3.5 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all h-full">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Zone 4: Personal — entities (only if they exist) ─────────── */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : hasEntities ? (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">My Entities</p>
              <Link to={createPageUrl('Profile') + '?tab=my_entities'}>
                <span className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1">
                  Manage <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {resolvedEntities.map(entity => (
                <EntityRow
                  key={entity.collaboration_id || entity.entity_id}
                  entity={entity}
                  isPrimary={entity.entity_id === primaryEntity?.entity_id}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Pending invitations / access — inline, not a full banner */}
        {user && !isLoading && <PendingAccessSection user={user} />}

      </div>
    </PageShell>
  );
}