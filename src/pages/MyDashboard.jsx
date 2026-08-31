import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/components/utils';
import HijinxPageShell from '@/components/shared/HijinxPageShell';
import PullToRefresh from '@/components/shared/PullToRefresh';
import DashboardProfileCard from '@/components/mydashboard/DashboardProfileCard';
import RaceCoreTiles from '@/components/mydashboard/RaceCoreTiles';
import DashboardSummaryWidgets from '@/components/mydashboard/DashboardSummaryWidgets';
import DashboardAdaptiveModules from '@/components/mydashboard/DashboardAdaptiveModules';
import DashboardIdentitySwitcher from '@/components/mydashboard/DashboardIdentitySwitcher';
import AccessSuccessBanner from '@/components/mydashboard/AccessSuccessBanner';
import PendingAccessSection from '@/components/mydashboard/PendingAccessSection';
import OnboardingGuard from '@/components/onboarding/OnboardingGuard';
import {
  getResolvedManagedEntities,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity } from '@/components/entities/entityPrimary';
import { getUserMode, getPublicProfileType } from '@/components/system/userModeResolver';
import {
  ChevronRight, Gauge, KeyRound, Star, Shield,
  BarChart3, AlertCircle, ListChecks, ShieldCheck, HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOTION = 'hsl(var(--motion))';
const MOTION_HOVER = 'hsl(var(--motion-hover))';
const ENTITY_TYPE_LABELS = {
  Driver: 'Driver Page',
  Team: 'Team Page',
  Track: 'Track Page',
  Series: 'Series Page',
};

// ─── Racing Profile Card ──────────────────────────────────────────────────────

function RacingProfileCard({ entity, isPrimary, index }) {
  const label = ENTITY_TYPE_LABELS[entity.entity_type] || entity.entity_type;
  const isOwner = entity.permission_level === 'admin' || entity.role === 'owner';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-4 rounded-xl transition-all duration-200 gap-2"
      style={{
        background: isPrimary ? `${MOTION} / 0.08)` : 'hsl(var(--surface-interactive) / 0.3)',
        border: isPrimary ? `1px solid ${MOTION} / 0.25)` : '1px solid hsl(var(--divider) / 0.6)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isPrimary ? `${MOTION} / 0.2)` : 'hsl(var(--surface-interactive) / 0.5)' }}>
          <Star className="w-4 h-4" style={{ color: isPrimary ? MOTION : 'hsl(var(--foreground-quiet))' }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{entity.entity_name}</p>
            {isPrimary && <Star className="w-3 h-3 flex-shrink-0" style={{ color: MOTION }} />}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {label} · {isOwner ? 'Page Owner' : 'Page Editor'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
        {entity.is_racecore_entity && (
          <button
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
            style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
            onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}
            onMouseEnter={e => e.currentTarget.style.background = MOTION_HOVER}
            onMouseLeave={e => e.currentTarget.style.background = MOTION}
          >
            <Gauge className="w-3 h-3" /> Race Core
          </button>
        )}
        <button
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
          style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
          onClick={() => window.location.href = buildEditorUrl(entity)}
          onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive))'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
        >
          Edit <ChevronRight className="w-3 h-3 inline" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Admin Control Center ─────────────────────────────────────────────────────

function AdminControlCenter() {
  return (
    <div className="rounded-2xl p-5 space-y-3"
      style={{
        background: `${MOTION} / 0.06)`,
        border: `1px solid ${MOTION} / 0.2)`,
      }}>
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5" style={{ color: MOTION }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: MOTION }}>
          Control Center
        </p>
      </div>
      <p className="text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>
        Full platform admin access active.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Management', to: createPageUrl('Management'), icon: Shield },
          { label: 'Review Queue', to: '/management/editorial/review-queue', icon: ListChecks },
          { label: 'Diagnostics', to: createPageUrl('Diagnostics'), icon: AlertCircle },
          { label: 'Analytics', to: createPageUrl('AnalyticsDashboard'), icon: BarChart3 },
        ].map(({ label, to, icon: Icon }) => (
          <Link key={label} to={to}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{ background: 'hsl(var(--surface-interactive) / 0.4)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive))'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.4)'; }}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MyDashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Local-only identity view toggle. When set, overrides primaryProfileType
  // for the adaptive modules section — does NOT write to the user's profile.
  const [identityOverride, setIdentityOverride] = useState(null);

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

  const queryClient = useQueryClient();
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
      queryClient.invalidateQueries({ queryKey: ['resolvedEntities'] }),
      queryClient.invalidateQueries({ queryKey: ['mediaProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_upcoming_events'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_recent_results'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_media_assignments'] }),
    ]);
  };

  const isLoading = userLoading || resolvedLoading;
  const hasEntities = resolvedEntities.length > 0;
  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const raceCoreTarget = (primaryEntity?.is_racecore_entity ? primaryEntity : null) || raceCoreEntities[0] || null;
  const mode = getUserMode({ user, collaborators: resolvedEntities, mediaProfile });
  const primaryProfileType = getPublicProfileType(user);
  const hasRaceCoreAccess = raceCoreEntities.length > 0 || user?.role === 'admin';
  const hasMediaAccess = !!mediaProfile && mediaProfile.status !== 'rejected';

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

  if (isLoading) {
    return (
      <HijinxPageShell>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-48 rounded-xl opacity-20" />
          <Skeleton className="h-16 w-full rounded-2xl opacity-20" />
          <Skeleton className="h-32 w-full rounded-2xl opacity-10" />
        </div>
      </HijinxPageShell>
    );
  }

  return (
    <OnboardingGuard>
      <HijinxPageShell>
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Page heading ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Welcome back
          </p>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
            My Dashboard
          </h1>
        </motion.div>

        {/* ── Compact profile entry card ────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <DashboardProfileCard user={user} />
        </motion.div>

        {/* Access banners */}
        <AccessSuccessBanner
          raceCoreTarget={raceCoreTarget}
          primaryEntity={primaryEntity}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {/* ── Admin Control Center ─────────────────────────────────── */}
        {mode === 'admin' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <AdminControlCenter />
          </motion.div>
        )}

        {/* ── RaceCore quick-access tiles ──────────────────────────── */}
        {hasRaceCoreAccess && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <RaceCoreTiles user={user} collaborators={resolvedEntities} />
          </motion.div>
        )}

        {/* ── My Racing Profiles ───────────────────────────────────── */}
        {hasEntities && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="px-5 py-5 rounded-2xl space-y-3"
            style={{ background: 'hsl(var(--surface-elevated) / 0.7)', backdropFilter: 'blur(20px)', border: '1px solid hsl(var(--divider) / 0.6)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                My Racing Profiles
              </p>
              <Link to={createPageUrl('Profile') + '?tab=racing_profiles'}>
                <span className="text-xs transition-colors flex items-center gap-1"
                  style={{ color: 'hsl(var(--foreground-quiet))' }}
                  onMouseEnter={e => e.currentTarget.style.color = MOTION}
                  onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}
                >
                  Manage <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {resolvedEntities.map((entity, i) => (
                <RacingProfileCard
                  key={entity.collaboration_id || entity.entity_id}
                  entity={entity}
                  isPrimary={entity.entity_id === primaryEntity?.entity_id}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Summary widgets ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <DashboardSummaryWidgets
            user={user}
            hasRaceCoreAccess={hasRaceCoreAccess}
            hasMediaAccess={hasMediaAccess}
          />
        </motion.div>

        {/* ── Welcome education (no entities, non-admin) ───────────── */}
        {!hasEntities && mode !== 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="px-5 py-5 rounded-2xl space-y-3"
            style={{ background: 'hsl(var(--surface-elevated) / 0.7)', backdropFilter: 'blur(20px)', border: '1px solid hsl(var(--divider) / 0.6)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Welcome to Hijinx
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              This is your dashboard. Once you claim a racing profile — or connect with an invite code — your entities,
              claims, and tools will appear here. Not sure where to start?
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to={createPageUrl('JoinIndex46')}>
                <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all"
                  style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
                  onMouseEnter={e => e.currentTarget.style.background = MOTION_HOVER}
                  onMouseLeave={e => e.currentTarget.style.background = MOTION}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Claim a Profile
                </button>
              </Link>
              <Link to={createPageUrl('Help')}>
                <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive))'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}>
                  <HelpCircle className="w-3.5 h-3.5" /> Help Center
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── Invite code prompt (no entities, non-admin) ──────────── */}
        {!hasEntities && mode !== 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="flex items-start sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl"
            style={{ background: `${MOTION} / 0.05)`, border: `1px dashed ${MOTION} / 0.2)` }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{(() => {
                const t = primaryProfileType;
                if (t === 'driver') return 'Race under HIJINX?';
                if (t === 'team') return 'Running a team?';
                if (t === 'track') return 'Manage a track?';
                if (t === 'series') return 'Run a series?';
                if (['media', 'photographer', 'creator'].includes(t)) return 'Got media access?';
                return 'Have an invite code?';
              })()}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>{(() => {
                const t = primaryProfileType;
                if (t === 'driver') return 'Enter your invite code or claim your driver profile.';
                if (t === 'team') return 'Enter your invite code to connect your team profile.';
                if (t === 'track') return 'Enter your invite code to connect your venue profile.';
                if (t === 'series') return 'Enter your invite code to connect your series profile.';
                if (['media', 'photographer', 'creator'].includes(t)) return 'Enter your invite code to connect your profile.';
                return 'Connect your profile to a driver, team, track, or series.';
              })()}</p>
            </div>
            <Link to={createPageUrl('Profile') + '?tab=racing_profiles'}>
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all flex-shrink-0"
                style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
                onMouseEnter={e => e.currentTarget.style.background = MOTION_HOVER}
                onMouseLeave={e => e.currentTarget.style.background = MOTION}
              >
                <KeyRound className="w-3.5 h-3.5" /> Enter Code
              </button>
            </Link>
          </motion.div>
        )}

        {/* ── Adaptive discovery modules ───────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-3">
          <DashboardIdentitySwitcher
            user={user}
            activeIdentity={identityOverride || primaryProfileType}
            onSelect={setIdentityOverride}
          />
          <DashboardAdaptiveModules
            primaryProfileType={primaryProfileType}
            mode={mode}
            identityOverride={identityOverride}
          />
        </motion.div>

        {/* ── Pending invitations ──────────────────────────────────── */}
        {user && <PendingAccessSection user={user} />}

      </div>
        </PullToRefresh>
    </HijinxPageShell>
    </OnboardingGuard>
  );
}