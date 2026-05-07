import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  User, Calendar, BookOpen, Camera, Shield, Edit,
  ChevronRight, Gauge, KeyRound, ExternalLink, Star,
  Shirt, Compass, FileText, Users, ArrowRight, Flag
} from 'lucide-react';

// ─── Entity type labels ───────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS = {
  Driver: 'My Driver Page',
  Team: 'My Team Page',
  Track: 'My Track Page',
  Series: 'My Series Page',
};

// ─── Racing Profile Card ──────────────────────────────────────────────────────

function RacingProfileCard({ entity, isPrimary }) {
  const label = ENTITY_TYPE_LABELS[entity.entity_type] || entity.entity_type;
  const isOwner = entity.role === 'owner';

  return (
    <div className={`flex items-center justify-between px-4 py-4 rounded-2xl border transition-shadow hover:shadow-sm ${isPrimary ? 'border-[#1A1A1A] bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Flag className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">{entity.entity_name}</p>
            {isPrimary && <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{label} · {isOwner ? 'Owner' : 'Editor'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {entity.is_racecore_entity && (
          <Button size="sm" className="text-xs gap-1 bg-[#1A1A1A] hover:bg-black text-white h-7 px-3"
            onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}>
            <Gauge className="w-3 h-3" /> Race Core
          </Button>
        )}
        <Button size="sm" variant="outline" className="text-xs gap-1 h-7 px-3"
          onClick={() => window.location.href = buildEditorUrl(entity)}>
          Edit <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Mode-specific sections ───────────────────────────────────────────────────

function FanSection() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Explore</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'INDEX46', sub: 'Drivers, teams & tracks', to: createPageUrl('MotorsportsHome'), icon: Compass, color: 'bg-blue-50 text-blue-600' },
          { label: 'The Outlet', sub: 'Stories & coverage', to: createPageUrl('OutletHome'), icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
          { label: 'Events', sub: 'Races & schedules', to: createPageUrl('EventDirectory'), icon: Calendar, color: 'bg-green-50 text-green-600' },
          { label: 'Apparel', sub: 'Shop HIJINX CO.', to: createPageUrl('ApparelHome'), icon: Shirt, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, sub, to, icon: Icon, color }) => (
          <Link key={label} to={to}>
            <div className="flex flex-col gap-2 p-4 border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all h-full">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MediaSection() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Media & Content</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Media Portal', sub: 'Credentials, assets & assignments', to: createPageUrl('MediaPortal'), icon: Camera, color: 'bg-teal-50 text-teal-600' },
          { label: 'Submit a Story', sub: 'Pitch to The Outlet', to: createPageUrl('OutletSubmit'), icon: FileText, color: 'bg-amber-50 text-amber-600' },
          { label: 'The Outlet', sub: 'Browse all stories', to: createPageUrl('OutletHome'), icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
        ].map(({ label, sub, to, icon: Icon, color }) => (
          <Link key={label} to={to}>
            <div className="flex items-start gap-3 p-4 border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all h-full">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AdminSection() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-white/60" />
        <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Control Center</p>
      </div>
      <p className="text-sm text-white/80">You have full admin access to the platform.</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link to={createPageUrl('Management')}>
          <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Management
          </Button>
        </Link>
        <Link to={createPageUrl('Diagnostics')}>
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1.5 text-xs">
            Diagnostics
          </Button>
        </Link>
        <Link to={createPageUrl('AnalyticsDashboard')}>
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1.5 text-xs">
            Analytics
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyDashboard() {
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

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

  const modeLabel = {
    admin: 'Platform Administrator',
    entity_owner: 'Racing Profile Owner',
    entity_editor: 'Racing Profile Editor',
    media_user: 'Media & Creator',
    fan: 'Motorsports Fan',
  }[mode] || 'Motorsports Fan';

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <AccessSuccessBanner
          raceCoreTarget={raceCoreTarget}
          primaryEntity={primaryEntity}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {/* ── Identity Card ─────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">My Garage</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {welcomeName ? `Welcome back, ${welcomeName}` : 'My Garage'}
            </h1>
            {!isLoading && (
              <p className="text-sm text-gray-400 mt-1">{modeLabel}</p>
            )}
          </div>
          <Link to={createPageUrl('Profile')}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 flex-shrink-0">
              <User className="w-3.5 h-3.5" /> Profile
            </Button>
          </Link>
        </div>

        {/* ── Admin Control Center ───────────────────────────────────── */}
        {!isLoading && mode === 'admin' && <AdminSection />}

        {/* ── My Racing Profiles (entity owners/editors) ────────────── */}
        {!isLoading && hasEntities && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">My Racing Profiles</p>
              <Link to={createPageUrl('Profile') + '?tab=racing_profiles'}>
                <span className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1">
                  Manage <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {resolvedEntities.map(entity => (
                <RacingProfileCard
                  key={entity.collaboration_id || entity.entity_id}
                  entity={entity}
                  isPrimary={entity.entity_id === primaryEntity?.entity_id}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Media Section ─────────────────────────────────────────── */}
        {!isLoading && mode === 'media_user' && <MediaSection />}

        {/* ── Explore / Fan Section ─────────────────────────────────── */}
        {!isLoading && <FanSection />}

        {/* ── Access code prompt for fans with no entities ──────────── */}
        {!isLoading && !hasEntities && mode !== 'admin' && (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Have an invite code?</p>
              <p className="text-xs text-gray-400 mt-0.5">Link a driver, team, track, or series to your garage.</p>
            </div>
            <Link to={createPageUrl('Profile') + '?tab=racing_profiles'}>
              <Button size="sm" className="bg-[#1A1A1A] hover:bg-black text-white text-xs gap-1.5 flex-shrink-0">
                <KeyRound className="w-3.5 h-3.5" /> Enter Code
              </Button>
            </Link>
          </div>
        )}

        {/* ── Pending invitations ───────────────────────────────────── */}
        {user && !isLoading && <PendingAccessSection user={user} />}

      </div>
    </PageShell>
  );
}