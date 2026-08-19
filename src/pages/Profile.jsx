import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/components/utils/queryKeys';
import { invalidateDataGroups } from '@/components/data/invalidationContract';
import { Link } from 'react-router-dom';
import HijinxPageShell from '@/components/shared/HijinxPageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MediaProfileTab from '@/components/profile/MediaProfileTab';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Save, LogOut, ChevronRight, CheckCircle2, AlertCircle,
  KeyRound, Gauge, Star, Globe, Camera, FileText, Flag, Users, BookOpen,
  Clock, XCircle, AtSign
} from 'lucide-react';
import AccessSuccessBanner from '@/components/mydashboard/AccessSuccessBanner';
import { createPageUrl } from '@/components/utils';
import DeleteAccountModal from '@/components/profile/DeleteAccountModal';
import { format } from 'date-fns';
import ManageTab from '@/components/profile/ManageTab';
import CodeInputTab from '@/components/profile/CodeInputTab';
import StorySubmissionForm from '@/components/profile/StorySubmissionForm';
import ManageStorySubmissions from '@/components/profile/ManageStorySubmissions';
import RaceCoreAccessTab from '@/components/profile/RaceCoreAccessTab';
import FavoritesTab from '@/components/profile/FavoritesTab';
import MediaApplicationForm from '@/components/media/portal/MediaApplicationForm';
import MediaApplicationStatus from '@/components/media/portal/MediaApplicationStatus';
import SocialLinksEditor from '@/components/profile/SocialLinksEditor';
import IdentitySection from '@/components/profile/IdentitySection';
import { isApprovedContributor } from '@/components/media/mediaPermissions';
import { getUserMode } from '@/components/system/userModeResolver';
import { validateUsername, mapLegacyRoleToProfileType } from '@/components/system/userCapabilities';
import {
  getResolvedManagedEntities, buildRaceCoreLaunchUrl, buildEditorUrl, getRaceCoreEntities,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity, isPrimaryEntityStale, setPrimaryEntityOnUser } from '@/components/entities/entityPrimary';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const MOTION = 'hsl(var(--motion))';
const MOTION_HOVER = 'hsl(var(--motion-hover))';
const DANGER = 'hsl(var(--danger))';
const WARNING = 'hsl(var(--warning))';

const ENTITY_TYPE_LABELS = {
  Driver: 'Driver Page', Team: 'Team Page', Track: 'Track Page', Series: 'Series Page',
};

function resolveTab(param) {
  const map = {
    account: 'account', general: 'account',
    identity: 'identity',
    socials: 'socials', social: 'socials',
    follows: 'follows',
    racing_profiles: 'racing_profiles', access_codes: 'racing_profiles', racecore: 'racing_profiles', my_entities: 'racing_profiles',
    story: 'contributions', media: 'contributions', contributions: 'contributions',
  };
  return map[param] || 'account';
}

// ─── Shared section label ─────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
      {children}
    </p>
  );
}

// ─── Themed input ─────────────────────────────────────────────────────────────

function ThemedInput({ label, hint, id, ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>{label}</label>}
      <input
        id={id}
        className="flex h-9 w-full rounded-lg px-3 text-sm focus-visible:outline-none focus-visible:ring-1 transition-all"
        style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}
        {...props}
      />
      {hint && <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>{hint}</p>}
    </div>
  );
}

function ThemedTextarea({ label, id, ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>{label}</label>}
      <textarea
        id={id}
        className="flex w-full rounded-lg px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 transition-all"
        style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}
        {...props}
      />
    </div>
  );
}

// ─── Glass panel wrapper ──────────────────────────────────────────────────────

function GlassPanel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`}
      style={{
        background: 'hsl(var(--surface-elevated) / 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid hsl(var(--divider) / 0.6)',
        boxShadow: '0 4px 32px hsl(0 0% 0% / 0.15)',
      }}>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);
  const [settingPrimary, setSettingPrimary] = useState(false);
  const [mediaAppSubmitted, setMediaAppSubmitted] = useState(null);
  const [showAccountControls, setShowAccountControls] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: QueryKeys.auth.me(),
    queryFn: () => base44.auth.me(),
  });

  const { data: resolvedEntities = [] } = useQuery({
    queryKey: QueryKeys.managedCollaborations.byUser(user?.id),
    queryFn: () => getResolvedManagedEntities(user),
    enabled: !!user?.id,
  });

  const { data: claimRequests = [] } = useQuery({
    queryKey: ['claimRequests', user?.id],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ user_id: user.id }, '-created_date', 20),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: QueryKeys.profile.invitations(user?.email),
    queryFn: () => base44.entities.Invitation.filter({ email: user.email, status: 'pending' }),
    enabled: !!user?.email,
  });

  const { data: mediaApplication, refetch: refetchMediaApp } = useQuery({
    queryKey: ['myMediaApplication', user?.id],
    queryFn: () => base44.entities.MediaApplication.filter({ user_id: user.id }, '-created_date', 1),
    enabled: !!user?.id,
    select: data => data?.[0] || null,
  });

  useEffect(() => {
    if (user && !formData) {
      const profileTypes = user.profile_types?.length
        ? user.profile_types
        : [mapLegacyRoleToProfileType(user.role_interest_category)];
      const primaryProfileType = user.primary_profile_type || mapLegacyRoleToProfileType(user.role_interest_category);

      const existingSocials = user.social_links || [];
      const hasMigratedInstagram = existingSocials.some(l => l.platform === 'instagram');
      const hasMigratedPortfolio = existingSocials.some(l => l.platform === 'website');
      const migrated = [...existingSocials];
      if (!hasMigratedInstagram && user.instagram_url) {
        migrated.push({ platform: 'instagram', url: user.instagram_url, handle: '', public_enabled: true });
      }
      if (!hasMigratedPortfolio && (user.portfolio_url || user.website_url)) {
        migrated.push({ platform: 'website', url: user.portfolio_url || user.website_url, handle: '', public_enabled: true });
      }

      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        display_name: user.display_name || '',
        username: user.username || '',
        bio: user.bio || '',
        location_display: user.location_display || user.city || '',
        website_url: user.website_url || '',
        profile_photo_url: user.profile_photo_url || '',
        banner_image_url: user.banner_image_url || '',
        newsletter_subscriber: user.newsletter_subscriber || false,
        profile_visibility: user.profile_visibility || 'limited',
        primary_profile_type: primaryProfileType,
        profile_types: profileTypes,
        social_links: migrated,
        favorite_drivers: user.favorite_drivers || [],
        favorite_teams: user.favorite_teams || [],
        favorite_series: user.favorite_series || [],
        favorite_tracks: user.favorite_tracks || [],
        primary_entity_type: user.primary_entity_type || '',
        primary_entity_id: user.primary_entity_id || '',
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const usernameVal = data.username?.toLowerCase().trim() || '';
      if (usernameVal) {
        const err = validateUsername(usernameVal);
        if (err) throw new Error(err);
      }
      await base44.auth.updateMe({
        first_name: data.first_name,
        last_name: data.last_name,
        display_name: data.display_name,
        username: usernameVal || undefined,
        username_slug: usernameVal || undefined,
        bio: data.bio,
        location_display: data.location_display,
        website_url: data.website_url,
        profile_photo_url: data.profile_photo_url,
        banner_image_url: data.banner_image_url,
        newsletter_subscriber: data.newsletter_subscriber || false,
        profile_visibility: data.profile_visibility,
        primary_profile_type: data.primary_profile_type,
        profile_types: data.profile_types,
        social_links: data.social_links || [],
        favorite_drivers: data.favorite_drivers || [],
        favorite_teams: data.favorite_teams || [],
        favorite_series: data.favorite_series || [],
        favorite_tracks: data.favorite_tracks || [],
      });
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.auth.me() });
      const prev = queryClient.getQueryData(QueryKeys.auth.me());
      queryClient.setQueryData(QueryKeys.auth.me(), (old) => old ? {
        ...old,
        first_name: data.first_name,
        last_name: data.last_name,
        display_name: data.display_name,
        username: data.username || old.username,
        username_slug: data.username_slug || old.username_slug,
        bio: data.bio,
        location_display: data.location_display,
        website_url: data.website_url,
        profile_photo_url: data.profile_photo_url,
        banner_image_url: data.banner_image_url,
        newsletter_subscriber: data.newsletter_subscriber || false,
        profile_visibility: data.profile_visibility,
        primary_profile_type: data.primary_profile_type,
        profile_types: data.profile_types,
        social_links: data.social_links || [],
        favorite_drivers: data.favorite_drivers || [],
        favorite_teams: data.favorite_teams || [],
        favorite_series: data.favorite_series || [],
        favorite_tracks: data.favorite_tracks || [],
        full_name: [data.first_name, data.last_name].filter(Boolean).join(' '),
      } : old);
      return { prev };
    },
    onSuccess: () => setUsernameError(''),
    onError: (err, _data, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QueryKeys.auth.me(), ctx.prev);
      if (err.message?.includes('sername') || err.message?.includes('reserved')) {
        setUsernameError(err.message);
      }
    },
    onSettled: () => {
      invalidateDataGroups(queryClient, ['profile']);
    },
  });

  const handleSetPrimary = async (entity) => {
    setSettingPrimary(entity.entity_id);
    await setPrimaryEntityOnUser({ currentUser: user, entityType: entity.entity_type, entityId: entity.entity_id });
    invalidateDataGroups(queryClient, ['profile', 'collaborators']);
    setSettingPrimary(false);
  };

  const handleSubmit = (e) => { e.preventDefault(); updateMutation.mutate(formData); };
  const handleLogout = () => base44.auth.logout(createPageUrl('Home'));

  const mode = getUserMode({ user, collaborators: resolvedEntities, mediaProfile: null });
  const isMediaUser = mode === 'media_user'
    || (formData?.profile_types || []).some(t => ['media', 'photographer', 'creator'].includes(t));
  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const primaryStale = isPrimaryEntityStale(user, resolvedEntities);
  const hasCollaborations = resolvedEntities.length > 0;
  const hasRacingProfileSection = hasCollaborations || invitations.length > 0 || claimRequests.length > 0;
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const raceCoreTarget = (primaryEntity?.is_racecore_entity ? primaryEntity : null) || raceCoreEntities[0] || null;
  const defaultTab = tabFromUrl ? resolveTab(tabFromUrl) : 'account';

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('Profile'));
    return null;
  }

  if (userLoading || !formData) {
    return (
      <HijinxPageShell>
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-10 w-48 opacity-20" />
          <Skeleton className="h-80 w-full rounded-2xl opacity-10" />
        </div>
      </HijinxPageShell>
    );
  }

  const tabs = [
    { value: 'account', label: 'Account' },
    { value: 'identity', label: 'Identity' },
    { value: 'socials', label: 'Socials' },
    { value: 'follows', label: 'Follows' },
    { value: 'contributions', label: 'Contributions' },
    { value: 'racing_profiles', label: 'Racing Profiles' },
  ];

  const SaveButton = ({ label = 'Save Changes' }) => (
    <button type="submit" disabled={updateMutation.isPending}
      className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all"
      style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
      onMouseEnter={e => e.currentTarget.style.background = MOTION_HOVER}
      onMouseLeave={e => e.currentTarget.style.background = MOTION}
    >
      <Save className="w-4 h-4" />
      {updateMutation.isPending ? 'Saving…' : label}
    </button>
  );

  return (
    <HijinxPageShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>Profile</p>
            <h1 className="text-2xl font-black" style={{ color: 'hsl(var(--foreground))' }}>
              {formData.display_name || formData.first_name || user?.full_name?.split(' ')[0] || 'My Profile'}
            </h1>
            {user?.username && (
              <p className="text-sm font-mono mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>@{user.username}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {user?.username && (
              <Link to={`/u/${user.username}`}>
                <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.4)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
                  onMouseEnter={e => { e.currentTarget.style.color = MOTION; e.currentTarget.style.borderColor = `${MOTION} / 0.3)`; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; e.currentTarget.style.borderColor = 'hsl(var(--divider))'; }}
                >
                  <Globe className="w-3 h-3" /> Public Profile
                </button>
              </Link>
            )}
            <Link to={createPageUrl('MyDashboard')}>
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all"
                style={{ background: 'hsl(var(--surface-interactive) / 0.4)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'; }}
              >
                <ChevronRight className="w-3 h-3 rotate-180" /> My Garage
              </button>
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors"
              style={{ background: `hsl(var(--danger) / 0.08)`, color: DANGER, border: `1px solid ${DANGER} / 0.15)` }}
              onMouseEnter={e => { e.currentTarget.style.color = DANGER; }}
              onMouseLeave={e => { e.currentTarget.style.color = DANGER; }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        <AccessSuccessBanner
          raceCoreTarget={raceCoreTarget}
          primaryEntity={primaryEntity}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {/* Username prompt — only for users who skipped username at onboarding */}
        {user && !user.username && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{ background: `hsl(var(--motion) / 0.07)`, border: `1px solid ${MOTION} / 0.2)` }}>
            <div className="flex items-center gap-2.5">
              <AtSign className="w-4 h-4 flex-shrink-0" style={{ color: MOTION }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Claim your public username</p>
                <p className="text-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                  You skipped this at sign-up. Grab one so people can find you at /u/yourname.
                </p>
              </div>
            </div>
            <Link to="/ClaimUsername?return_to=/Profile&feature=set%20up%20your%20public%20profile"
              className="flex-shrink-0 px-3 py-2 text-xs font-bold rounded-lg transition-all"
              style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>
              Claim
            </Link>
          </motion.div>
        )}

        {/* Feedback */}
        {updateMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5"
            style={{ background: `hsl(var(--motion) / 0.1)`, color: MOTION, border: `1px solid ${MOTION} / 0.2)` }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Saved successfully.
          </div>
        )}
        {updateMutation.isError && (
          <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5"
            style={{ background: `hsl(var(--danger) / 0.1)`, color: DANGER, border: `1px solid ${DANGER} / 0.2)` }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {updateMutation.error?.message || 'Save failed. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue={defaultTab} className="space-y-5">

            {/* Tab bar */}
            <div className="overflow-x-auto whitespace-nowrap">
              <TabsList className="inline-flex gap-1 p-1 rounded-2xl w-auto"
                style={{ background: 'hsl(var(--surface-elevated) / 0.7)', backdropFilter: 'blur(16px)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                {tabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value}
                    className="flex-1 min-w-max rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap data-[state=active]:shadow-none"
                    style={{
                      '--tw-ring-shadow': 'none',
                      color: 'hsl(var(--foreground-quiet))',
                    }}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Account ─────────────────────────────────────────────── */}
            <TabsContent value="account">
              <GlassPanel>
                <SectionLabel>Your Identity</SectionLabel>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ThemedInput id="first_name" label="First Name" value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                    <ThemedInput id="last_name" label="Last Name" value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                  </div>
                  <ThemedInput id="display_name" label="Display Name" value={formData.display_name}
                    placeholder="How you want to be known publicly"
                    onChange={e => setFormData({ ...formData, display_name: e.target.value })} />
                  <div>
                    <label htmlFor="profile_username" className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                      Username {user?.username && <span style={{ color: MOTION }}>· @{user.username}</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>@</span>
                      <input
                        id="profile_username"
                        name="profile_username"
                        autoComplete="username"
                        value={formData.username}
                        onChange={e => { setFormData({ ...formData, username: e.target.value.toLowerCase() }); setUsernameError(''); }}
                        placeholder="yourhandle"
                        className="flex h-9 flex-1 rounded-lg px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 transition-all"
                        style={{
                          background: 'hsl(var(--surface-interactive) / 0.4)',
                          border: usernameError ? `1px solid ${DANGER} / 0.5)` : '1px solid hsl(var(--divider))',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                    </div>
                    {usernameError && <p className="text-xs mt-1" style={{ color: DANGER }}>{usernameError}</p>}
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      3–24 characters. Letters, numbers, underscores. Your URL: /u/yourhandle
                    </p>
                  </div>
                  <ThemedTextarea id="bio" label="Bio" value={formData.bio} rows={3}
                    placeholder="A quick line about you and your scene"
                    onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ThemedInput id="location_display" label="Location" value={formData.location_display}
                      placeholder="e.g. Phoenix, AZ"
                      onChange={e => setFormData({ ...formData, location_display: e.target.value })} />
                    <ThemedInput id="website_url" label="Website" value={formData.website_url}
                      placeholder="https://yoursite.com"
                      onChange={e => setFormData({ ...formData, website_url: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile_email" className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>Email</label>
                    <input id="profile_email" value={user?.email || ''} disabled
                      className="flex h-9 w-full rounded-lg px-3 text-sm"
                      style={{ background: 'hsl(var(--surface-interactive) / 0.2)', border: '1px solid hsl(var(--divider) / 0.6)', color: 'hsl(var(--foreground-quiet))' }} />
                  </div>

                  <div className="pt-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
                    <SectionLabel>Profile Visibility</SectionLabel>
                    <Label htmlFor="profile_visibility" className="sr-only">Profile visibility</Label>
                    <Select value={formData.profile_visibility} onValueChange={v => setFormData({ ...formData, profile_visibility: v })}>
                      <SelectTrigger id="profile_visibility" className="h-9 text-sm" style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public — anyone can discover and view your full profile</SelectItem>
                        <SelectItem value="limited">Limited — visible by direct link, but not discoverable or searchable</SelectItem>
                        <SelectItem value="private">Private — only you can view your profile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <Switch id="newsletter_subscriber" checked={formData.newsletter_subscriber || false}
                      onCheckedChange={checked => setFormData({ ...formData, newsletter_subscriber: checked })} />
                    <Label htmlFor="newsletter_subscriber" className="cursor-pointer text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                      Subscribe to the Index46 newsletter
                    </Label>
                  </div>

                  <SaveButton />

                  {/* Account controls */}
                  <div className="pt-3" style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)' }}>
                    <button type="button" onClick={() => setShowAccountControls(v => !v)}
                      className="text-xs transition-colors"
                      style={{ color: 'hsl(var(--foreground-quiet))' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'}
                      onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}
                    >
                      {showAccountControls ? 'Hide account controls ↑' : 'Account controls ↓'}
                    </button>
                    {showAccountControls && (
                      <div className="mt-4 space-y-3 p-4 rounded-xl" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Reset Onboarding</p>
                            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>Re-run setup to update your identity or role.</p>
                          </div>
                          <button type="button"
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex-shrink-0"
                            style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
                            onClick={async () => { await base44.auth.updateMe({ onboarding_complete: false }).catch(() => {}); window.location.href = createPageUrl('MyDashboard'); }}>
                            Reset
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3" style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)' }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Delete My Account</p>
                            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                              Permanently removes your driver, team, and operational associations.
                            </p>
                          </div>
                          <button type="button"
                            className="px-3 py-1.5 text-xs font-bold rounded-lg flex-shrink-0 transition-all"
                            style={{ background: `hsl(var(--danger) / 0.08)`, color: DANGER, border: `1px solid ${DANGER} / 0.25)` }}
                            onClick={() => setShowDeleteModal(true)}>
                            Delete Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </TabsContent>

            {/* ── Identity ─────────────────────────────────────────────── */}
            <TabsContent value="identity">
              <GlassPanel>
                <SectionLabel>Motorsports Identity</SectionLabel>
                <p className="text-xs mb-4" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  Select all that apply. Your primary identity shapes how your Garage is organized.
                </p>
                <IdentitySection formData={formData} setFormData={setFormData} />
                <div className="mt-6 pt-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
                  <SaveButton label="Save Identity" />
                </div>
              </GlassPanel>
            </TabsContent>

            {/* ── Socials ──────────────────────────────────────────────── */}
            <TabsContent value="socials">
              <GlassPanel>
                <SectionLabel>Social Links</SectionLabel>
                <p className="text-xs mb-4" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  Add your socials. Toggle visibility to control what appears on your public profile.
                </p>
                <SocialLinksEditor
                  links={formData.social_links || []}
                  onChange={links => setFormData({ ...formData, social_links: links })}
                />
                <div className="mt-5">
                  <SaveButton label="Save Social Links" />
                </div>
              </GlassPanel>
            </TabsContent>

            {/* ── Follows ──────────────────────────────────────────────── */}
            <TabsContent value="follows">
              <GlassPanel>
                <SectionLabel>My Follows</SectionLabel>
                <p className="text-xs mb-4" style={{ color: 'hsl(var(--foreground-quiet))' }}>Drivers, teams, tracks and series you follow.</p>
                <div className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                  <FavoritesTab formData={formData} />
                </div>
                <div className="mt-5">
                  <SaveButton label="Save Follows" />
                </div>
              </GlassPanel>
            </TabsContent>

            {/* ── Contributions ────────────────────────────────────────── */}
            <TabsContent value="contributions">
              <GlassPanel>
                <SectionLabel>Story Submissions</SectionLabel>
                <div className="rounded-xl p-4 mb-5" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                  <StorySubmissionForm user={user} />
                </div>
                <div className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Your Submissions</p>
                  <ManageStorySubmissions user={user} />
                </div>

                {isMediaUser && (
                  <div className="mt-5 space-y-3">
                    <div style={{ borderTop: '1px solid hsl(var(--divider))' }} className="pt-5">
                      <SectionLabel>Media Profile</SectionLabel>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                      <MediaProfileTab user={user} />
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                      <p className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>Contributor Access</p>
                      <p className="text-xs mb-4" style={{ color: 'hsl(var(--foreground-quiet))' }}>Apply to become an approved media contributor.</p>
                      {isApprovedContributor(user) ? (
                        <MediaApplicationStatus application={mediaApplication} isContributor={true} />
                      ) : (mediaAppSubmitted || mediaApplication) ? (
                        <MediaApplicationStatus application={mediaAppSubmitted || mediaApplication} isContributor={false} />
                      ) : (
                        <MediaApplicationForm user={user} onSubmitted={(app) => { setMediaAppSubmitted(app); refetchMediaApp(); }} />
                      )}
                    </div>
                  </div>
                )}
              </GlassPanel>
            </TabsContent>

            {/* ── Racing Profiles ──────────────────────────────────────── */}
            <TabsContent value="racing_profiles">
              <GlassPanel>
                <SectionLabel>Racing Profiles</SectionLabel>
                {!hasRacingProfileSection && (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                      style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))' }}>
                      <Flag className="w-5 h-5" style={{ color: 'hsl(var(--foreground-quiet))' }} />
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>No profiles linked yet</p>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>Enter your invite code to link a driver, team, track, or series.</p>
                    </div>
                    <div className="rounded-xl p-4 max-w-sm mx-auto text-left" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                      <CodeInputTab user={user} />
                    </div>
                  </div>
                )}

                {hasCollaborations && (
                  <div className="space-y-4">
                    {primaryStale && (
                      <div className="flex items-center gap-2 text-sm rounded-xl px-3 py-2"
                        style={{ background: `hsl(var(--warning) / 0.1)`, color: WARNING, border: `1px solid ${WARNING} / 0.2)` }}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Your primary profile is no longer linked.
                      </div>
                    )}
                    <div className="space-y-2">
                      {resolvedEntities.map(entity => {
                        const isThisPrimary = entity.entity_id === primaryEntity?.entity_id;
                        const isOwner = entity.permission_level === 'admin' || entity.role === 'owner';
                        const label = ENTITY_TYPE_LABELS[entity.entity_type] || entity.entity_type;
                        return (
                          <div key={entity.collaboration_id}
                            className="p-4 rounded-xl transition-all"
                            style={{
                              background: isThisPrimary ? `hsl(var(--motion) / 0.08)` : 'hsl(var(--surface-interactive) / 0.3)',
                              border: isThisPrimary ? `1px solid ${MOTION} / 0.25)` : '1px solid hsl(var(--divider) / 0.6)',
                            }}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{entity.entity_name}</p>
                                  {isThisPrimary && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                    style={{ background: `hsl(var(--motion) / 0.15)`, color: MOTION }}>Primary</span>}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                                  {label} · {isOwner ? 'Page Owner' : 'Page Editor'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 flex-shrink-0">
                                {!isThisPrimary && (
                                  <button type="button" disabled={settingPrimary === entity.entity_id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all"
                                    style={{ color: 'hsl(var(--foreground-quiet))', background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}
                                    onClick={() => handleSetPrimary(entity)}>
                                    <Star className="w-3 h-3" />
                                    {settingPrimary === entity.entity_id ? 'Setting…' : 'Set Primary'}
                                  </button>
                                )}
                                {entity.is_racecore_entity && (
                                  <button type="button"
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                                    style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
                                    onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}>
                                    <Gauge className="w-3 h-3" /> Race Core
                                  </button>
                                )}
                                <button type="button"
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                                  style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
                                  onClick={() => window.location.href = buildEditorUrl(entity)}>
                                  Open Editor
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {resolvedEntities.some(e => e.permission_level === 'admin' || e.role === 'owner') && (
                      <div className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                        <p className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>Manage Collaborators</p>
                        <p className="text-xs mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Invite others to help manage your profiles.</p>
                        <ManageTab user={user} />
                      </div>
                    )}

                    {raceCoreEntities.length > 0 && (
                      <div className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                        <RaceCoreAccessTab user={user} />
                      </div>
                    )}

                    <div className="pt-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
                      <p className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>Have another invite code?</p>
                      <p className="text-xs mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Link additional profiles to your account.</p>
                      <div className="rounded-xl p-4" style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                        <CodeInputTab user={user} />
                      </div>
                    </div>
                  </div>
                )}

                {claimRequests.length > 0 && (
                  <div className="space-y-3 pt-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
                    <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Claim Requests</p>
                    {claimRequests.map(claim => {
                      const statusMap = {
                        pending: { color: `hsl(var(--warning) / 0.15)`, text: WARNING, label: 'Under review', Icon: Clock },
                        approved: { color: `hsl(var(--motion) / 0.12)`, text: MOTION, label: 'Approved', Icon: CheckCircle2 },
                        rejected: { color: `hsl(var(--danger) / 0.1)`, text: DANGER, label: 'Not approved', Icon: XCircle },
                      }[claim.status] || { color: 'hsl(var(--surface-interactive) / 0.4)', text: 'hsl(var(--foreground-quiet))', label: claim.status, Icon: Clock };
                      const StatusIcon = statusMap.Icon;
                      return (
                        <div key={claim.id} className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: statusMap.color, border: `1px solid ${statusMap.text}33` }}>
                          <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: statusMap.text }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{claim.entity_name}</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>{claim.entity_type}</p>
                          </div>
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: statusMap.text }}>{statusMap.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {invitations.length > 0 && (
                  <div className="space-y-3 pt-4" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
                    <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Pending Invitations</p>
                    {invitations.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: `hsl(var(--warning) / 0.06)`, border: `1px solid ${WARNING} / 0.2)` }}>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{inv.entity_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>{inv.entity_type}</p>
                        </div>
                        <button type="button"
                          className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                          style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
                          onClick={() => window.location.href = `${createPageUrl('AcceptInvitation')}?code=${inv.code}`}>
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </GlassPanel>
            </TabsContent>

          </Tabs>
        </form>

        <DeleteAccountModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          user={user}
        />
      </div>
    </HijinxPageShell>
  );
}