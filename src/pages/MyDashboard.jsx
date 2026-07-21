import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/components/utils';
import HijinxPageShell from '@/components/shared/HijinxPageShell';
import ProfileIdentityHero from '@/components/profile/ProfileIdentityHero';
import GarageAdaptiveModules from '@/components/mydashboard/GarageAdaptiveModules';
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
  ChevronRight, Gauge, KeyRound, Star, Shield, Flag,
  BarChart3, AlertCircle, ListChecks
} from 'lucide-react';
import { motion } from 'framer-motion';

const TEAL = '#1DA1A1';
const ENTITY_TYPE_LABELS = {
  Driver: 'Driver Page',
  Team: 'Team Page',
  Track: 'Track Page',
  Series: 'Series Page',
};

function computeProfileCompletion(user) {
  const fields = [
    user?.first_name, user?.last_name, user?.username,
    user?.bio, user?.profile_photo_url, user?.location_display,
    user?.website_url || (user?.social_links || []).length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

// ─── Racing Profile Card (dark) ───────────────────────────────────────────────

function RacingProfileCard({ entity, isPrimary, index }) {
  const label = ENTITY_TYPE_LABELS[entity.entity_type] || entity.entity_type;
  const isOwner = entity.role === 'owner';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-4 rounded-xl transition-all duration-200 gap-2"
      style={{
        background: isPrimary ? 'rgba(29,161,161,0.08)' : 'rgba(255,255,255,0.03)',
        border: isPrimary ? '1px solid rgba(29,161,161,0.25)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isPrimary ? 'rgba(29,161,161,0.2)' : 'rgba(255,255,255,0.05)' }}>
          <Flag className="w-4 h-4" style={{ color: isPrimary ? TEAL : 'rgba(255,255,255,0.4)' }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-white truncate">{entity.entity_name}</p>
            {isPrimary && <Star className="w-3 h-3 flex-shrink-0" style={{ color: '#00FFDA' }} />}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {label} · {isOwner ? 'Page Owner' : 'Page Editor'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
        {entity.is_racecore_entity && (
          <button
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
            style={{ background: TEAL, color: '#fff' }}
            onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}
            onMouseEnter={e => e.currentTarget.style.background = '#158080'}
            onMouseLeave={e => e.currentTarget.style.background = TEAL}
          >
            <Gauge className="w-3 h-3" /> Race Core
          </button>
        )}
        <button
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => window.location.href = buildEditorUrl(entity)}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
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
    <div className="px-5 py-5 rounded-2xl"
      style={{
        background: 'rgba(139,0,255,0.06)',
        border: '1px solid rgba(139,0,255,0.2)',
        boxShadow: '0 0 40px rgba(139,0,255,0.05)',
      }}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-3.5 h-3.5" style={{ color: 'rgba(200,150,255,0.7)' }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'rgba(200,150,255,0.7)' }}>
          Control Center
        </p>
      </div>
      <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
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
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
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
  const primaryProfileType = getPublicProfileType(user);
  const completionPct = user ? computeProfileCompletion(user) : null;

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('MyDashboard'));
    return null;
  }

  if (isLoading) {
    return (
      <HijinxPageShell>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl opacity-20" />
          <Skeleton className="h-28 w-full rounded-2xl opacity-10" />
        </div>
      </HijinxPageShell>
    );
  }

  return (
    <OnboardingGuard>
    <HijinxPageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Access banners */}
        <AccessSuccessBanner
          raceCoreTarget={raceCoreTarget}
          primaryEntity={primaryEntity}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {/* ── Identity Hero ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <ProfileIdentityHero
            user={user}
            isOwner={true}
            completionPct={completionPct}
          />
        </motion.div>

        {/* ── Admin Control Center ─────────────────────────────────── */}
        {mode === 'admin' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <AdminControlCenter />
          </motion.div>
        )}

        {/* ── My Racing Profiles ───────────────────────────────────── */}
        {hasEntities && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="px-5 py-5 rounded-2xl space-y-3"
            style={{ background: 'rgba(8,12,14,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                My Racing Profiles
              </p>
              <Link to={createPageUrl('Profile') + '?tab=racing_profiles'}>
                <span className="text-xs transition-colors flex items-center gap-1"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => e.currentTarget.style.color = TEAL}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
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

        {/* ── Invite code prompt (no entities, non-admin) ──────────── */}
        {!hasEntities && mode !== 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex items-start sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl"
            style={{ background: 'rgba(29,161,161,0.05)', border: '1px dashed rgba(29,161,161,0.2)' }}
          >
            <div>
              <p className="text-sm font-bold text-white">{(() => {
                const t = primaryProfileType;
                if (t === 'driver') return 'Race under HIJINX?';
                if (t === 'team') return 'Running a team?';
                if (t === 'track') return 'Manage a track?';
                if (t === 'series') return 'Run a series?';
                if (['media', 'photographer', 'creator'].includes(t)) return 'Got media access?';
                return 'Have an invite code?';
              })()}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{(() => {
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
                style={{ background: TEAL, color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = '#158080'}
                onMouseLeave={e => e.currentTarget.style.background = TEAL}
              >
                <KeyRound className="w-3.5 h-3.5" /> Enter Code
              </button>
            </Link>
          </motion.div>
        )}

        {/* ── Adaptive discovery modules ───────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GarageAdaptiveModules primaryProfileType={primaryProfileType} mode={mode} />
        </motion.div>

        {/* ── Pending invitations ──────────────────────────────────── */}
        {user && <PendingAccessSection user={user} />}

      </div>
    </HijinxPageShell>
    </OnboardingGuard>
  );
}