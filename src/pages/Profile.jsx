import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/components/utils/queryKeys';
import { invalidateDataGroups } from '@/components/data/invalidationContract';
import { Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MediaProfileTab from '@/components/profile/MediaProfileTab';
import { Label } from '@/components/ui/label';
import {
  Save, LogOut, ChevronRight, CheckCircle2, AlertCircle,
  KeyRound, Gauge, Star, ExternalLink, Shield, Edit,
  Clock, XCircle, Camera, FileText, Flag, Users, BookOpen
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import AccessSuccessBanner from '@/components/mydashboard/AccessSuccessBanner';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import GeneralTab from '@/components/profile/GeneralTab';
import ManageTab from '@/components/profile/ManageTab';
import CodeInputTab from '@/components/profile/CodeInputTab';
import StorySubmissionForm from '@/components/profile/StorySubmissionForm';
import ManageStorySubmissions from '@/components/profile/ManageStorySubmissions';
import RaceCoreAccessTab from '@/components/profile/RaceCoreAccessTab';
import FavoritesTab from '@/components/profile/FavoritesTab';
import AccountStatusCard from '@/components/profile/AccountStatusCard';
import MediaApplicationForm from '@/components/media/portal/MediaApplicationForm';
import MediaApplicationStatus from '@/components/media/portal/MediaApplicationStatus';
import { isApprovedContributor } from '@/components/media/mediaPermissions';
import { getUserMode } from '@/components/system/userModeResolver';
import {
  getResolvedManagedEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
  getRaceCoreEntities,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity, isPrimaryEntityStale, setPrimaryEntityOnUser } from '@/components/entities/entityPrimary';

// ─── Entity type labels ───────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS = {
  Driver: 'My Driver Page',
  Team: 'My Team Page',
  Track: 'My Track Page',
  Series: 'My Series Page',
};

const ENTITY_TYPE_COLORS = {
  Driver: 'bg-blue-50 text-blue-700 border-blue-200',
  Team: 'bg-purple-50 text-purple-700 border-purple-200',
  Track: 'bg-green-50 text-green-700 border-green-200',
  Series: 'bg-orange-50 text-orange-700 border-orange-200',
};

// ─── Tab resolver ─────────────────────────────────────────────────────────────

function resolveTab(param) {
  const map = {
    general: 'account',
    account: 'account',
    my_entities: 'racing_profiles',
    racing_profiles: 'racing_profiles',
    access_codes: 'racing_profiles',
    racecore: 'racing_profiles',
    story: 'contributions',
    media: 'contributions',
    contributions: 'contributions',
    follows: 'follows',
    fan: 'account',
  };
  return map[param] || 'account';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);
  const [settingPrimary, setSettingPrimary] = useState(false);
  const [mediaAppSubmitted, setMediaAppSubmitted] = useState(null);
  const [showDangerZone, setShowDangerZone] = useState(false);

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
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role_interest_category: user.role_interest_category || '',
        newsletter_subscriber: user.newsletter_subscriber || false,
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
      await base44.auth.updateMe({
        first_name: data.first_name,
        last_name: data.last_name,
        role_interest_category: data.role_interest_category || undefined,
        newsletter_subscriber: data.newsletter_subscriber || false,
        favorite_drivers: data.favorite_drivers || [],
        favorite_teams: data.favorite_teams || [],
        favorite_series: data.favorite_series || [],
        favorite_tracks: data.favorite_tracks || [],
      });
      base44.functions.invoke('updateUserProfile', { formData: data }).catch(() => {});
    },
    onSuccess: () => invalidateDataGroups(queryClient, ['profile']),
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
  const isMediaUser = mode === 'media_user' || user?.role_interest_category === 'Media / Creator';
  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const primaryStale = isPrimaryEntityStale(user, resolvedEntities);
  const hasCollaborations = resolvedEntities.length > 0;
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const raceCoreTarget = (primaryEntity?.is_racecore_entity ? primaryEntity : null) || raceCoreEntities[0] || null;

  const defaultTab = tabFromUrl ? resolveTab(tabFromUrl) : (hasCollaborations ? 'racing_profiles' : 'account');

  if (!userLoading && !user) {
    base44.auth.redirectToLogin(createPageUrl('Profile'));
    return null;
  }

  if (userLoading || !formData) {
    return (
      <PageShell className="bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">Profile</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.first_name || user?.full_name?.split(' ')[0] || 'My Profile'}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to={createPageUrl('MyDashboard')}>
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-3 h-3 rotate-180" /> My Garage
              </button>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        <AccessSuccessBanner
          raceCoreTarget={raceCoreTarget}
          primaryEntity={primaryEntity}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {updateMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Saved successfully.
          </div>
        )}
        {updateMutation.isError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> Save failed. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue={defaultTab} className="space-y-6">
            {/* Tab bar */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex w-full bg-transparent border-0 p-0 rounded-none shadow-none">
                  {[
                    { value: 'account', label: 'Account' },
                    { value: 'follows', label: 'My Follows' },
                    { value: 'contributions', label: 'Contributions' },
                    ...(hasCollaborations ? [{ value: 'racing_profiles', label: 'Racing Profiles' }] : [{ value: 'racing_profiles', label: 'Racing Profiles' }]),
                  ].map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}
                      className="flex-1 rounded-none px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-b-[#1A1A1A] data-[state=active]:bg-transparent data-[state=active]:text-[#1A1A1A] text-gray-400 hover:text-gray-700">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* ── Account Tab ───────────────────────────────────────────── */}
              <TabsContent value="account" className="p-6 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">First Name</label>
                      <input
                        value={formData.first_name || ''}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="flex h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">Last Name</label>
                      <input
                        value={formData.last_name || ''}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="flex h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">Email</label>
                    <input
                      value={user?.email || ''}
                      disabled
                      className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Your Role on HIJINX</h2>
                  <GeneralTab user={user} formData={formData} setFormData={setFormData} roleOnly />
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <Switch
                    id="newsletter_subscriber"
                    checked={formData.newsletter_subscriber || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, newsletter_subscriber: checked })}
                  />
                  <Label htmlFor="newsletter_subscriber" className="cursor-pointer text-sm text-gray-700">
                    Subscribe to the Index46 newsletter
                  </Label>
                </div>

                <Button type="submit" disabled={updateMutation.isPending}
                  className="bg-[#1A1A1A] hover:bg-black text-white gap-2 w-full sm:w-auto">
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>

                {/* Account controls — tucked away */}
                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowDangerZone(v => !v)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showDangerZone ? 'Hide account controls ↑' : 'Account controls ↓'}
                  </button>
                  {showDangerZone && (
                    <div className="mt-4 space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Reset Onboarding</p>
                          <p className="text-xs text-gray-400 mt-0.5">Re-run setup to update your role or preferences.</p>
                        </div>
                        <Button
                          type="button" variant="outline" size="sm"
                          className="text-xs flex-shrink-0"
                          onClick={async () => {
                            await base44.auth.updateMe({ onboarding_complete: false }).catch(() => {});
                            window.location.href = createPageUrl('MyDashboard');
                          }}
                        >
                          Reset
                        </Button>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-200">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Request Account Deletion</p>
                          <p className="text-xs text-gray-400 mt-0.5">Handled manually by our team within 2 business days.</p>
                        </div>
                        <Button
                          type="button" variant="outline" size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs flex-shrink-0"
                          onClick={() => {
                            base44.entities.ContactMessage.create({
                              name: user.full_name || user.email,
                              email: user.email,
                              subject: 'Account Deletion Request',
                              message: `User ${user.email} (ID: ${user.id}) has requested account deletion.`,
                            }).catch(() => {});
                            alert('Your deletion request has been submitted. Our team will follow up via email within 2 business days.');
                          }}
                        >
                          Request
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── My Follows Tab ────────────────────────────────────────── */}
              <TabsContent value="follows" className="p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-1">Drivers, Teams, Tracks & Series</h2>
                  <p className="text-xs text-gray-400">The entities you follow show up in your garage and keep you updated.</p>
                </div>
                <FavoritesTab formData={formData} />
                <Button type="submit" disabled={updateMutation.isPending}
                  className="bg-[#1A1A1A] hover:bg-black text-white gap-2">
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Follows'}
                </Button>
              </TabsContent>

              {/* ── Contributions Tab ─────────────────────────────────────── */}
              <TabsContent value="contributions" className="p-6 space-y-6">

                {/* Story submissions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                    <h2 className="text-sm font-bold text-gray-900">Story Submissions</h2>
                  </div>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="p-4 bg-white">
                      <StorySubmissionForm user={user} />
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your Submissions</p>
                      <ManageStorySubmissions user={user} />
                    </div>
                  </div>
                </div>

                {/* Media profile — only if relevant */}
                {isMediaUser && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-500" />
                      <h2 className="text-sm font-bold text-gray-900">Media Profile</h2>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-white">
                      <MediaProfileTab user={user} />
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-white">
                      <p className="text-sm font-semibold text-gray-900 mb-1">Contributor Access</p>
                      <p className="text-xs text-gray-400 mb-4">Apply to become an approved media contributor.</p>
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
              </TabsContent>

              {/* ── Racing Profiles Tab ───────────────────────────────────── */}
              <TabsContent value="racing_profiles" className="p-6 space-y-6">

                {/* No collaborations state */}
                {!hasCollaborations && invitations.length === 0 && (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Flag className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">No racing profiles linked</h3>
                      <p className="text-sm text-gray-400 max-w-sm mx-auto">
                        Link a driver, team, track, or series to unlock editing tools and Race Core.
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl max-w-sm mx-auto">
                      <p className="text-sm font-semibold text-gray-800 mb-1">Have an invite code?</p>
                      <p className="text-xs text-gray-400 mb-3">Enter your code to link an entity to your profile.</p>
                      <CodeInputTab user={user} />
                    </div>
                  </div>
                )}

                {/* Active profiles */}
                {hasCollaborations && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-gray-900">Your Profiles</h2>

                    {primaryStale && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Your primary profile is no longer linked. Choose a new one below.
                      </div>
                    )}

                    <div className="space-y-3">
                      {resolvedEntities.map(entity => {
                        const isThisPrimary = entity.entity_id === primaryEntity?.entity_id;
                        const isOwner = entity.role === 'owner';
                        const label = ENTITY_TYPE_LABELS[entity.entity_type] || entity.entity_type;
                        return (
                          <div key={entity.collaboration_id}
                            className={`p-4 rounded-2xl border-2 transition-shadow hover:shadow-sm ${isThisPrimary ? 'border-[#1A1A1A] bg-gray-50' : 'border-gray-100 bg-white'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-gray-900 text-sm">{entity.entity_name}</p>
                                  {isThisPrimary && <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200"><Star className="w-3 h-3 mr-1 inline" />Primary</Badge>}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{label} · {isOwner ? 'Owner' : 'Editor'}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 flex-shrink-0">
                                {!isThisPrimary && (
                                  <Button type="button" size="sm" variant="ghost" disabled={settingPrimary === entity.entity_id}
                                    className="gap-1.5 text-xs text-gray-400 hover:text-amber-600 h-7 px-2"
                                    onClick={() => handleSetPrimary(entity)}>
                                    <Star className="w-3 h-3" />{settingPrimary === entity.entity_id ? 'Setting…' : 'Set Primary'}
                                  </Button>
                                )}
                                {entity.is_racecore_entity && (
                                  <Button type="button" size="sm" className="bg-[#1A1A1A] text-white hover:bg-black gap-1.5 text-xs h-7 px-3"
                                    onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}>
                                    <Gauge className="w-3 h-3" /> Race Core
                                  </Button>
                                )}
                                <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-3"
                                  onClick={() => window.location.href = buildEditorUrl(entity)}>
                                  Open Editor
                                </Button>
                                {isOwner && (
                                  <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-3"
                                    onClick={() => window.location.href = createPageUrl('Profile') + '?tab=racing_profiles&manage=' + entity.entity_id}>
                                    <Users className="w-3 h-3" /> Collaborators
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Manage access for owners */}
                    {resolvedEntities.some(e => e.role === 'owner') && (
                      <div className="border border-gray-100 rounded-xl p-4 bg-white space-y-3">
                        <p className="text-sm font-bold text-gray-900">Manage Collaborators</p>
                        <p className="text-xs text-gray-400">Invite editors to help manage your profiles.</p>
                        <ManageTab user={user} />
                      </div>
                    )}

                    {/* Race Core quick launch */}
                    {raceCoreEntities.length > 0 && (
                      <div className="border border-gray-100 rounded-xl p-4 bg-white">
                        <RaceCoreAccessTab user={user} />
                      </div>
                    )}
                  </div>
                )}

                {/* Enter code when no collaborations */}
                {hasCollaborations && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 mb-1">Have another invite code?</p>
                    <p className="text-xs text-gray-400 mb-3">Link additional profiles to your account.</p>
                    <CodeInputTab user={user} />
                  </div>
                )}

                {/* Claim Requests */}
                {claimRequests.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900">Claim Requests</h3>
                    <div className="space-y-2">
                      {claimRequests.map(claim => {
                        const statusConfig = {
                          pending: { badge: 'bg-amber-100 text-amber-700 border-amber-200', Icon: Clock, text: 'Under review' },
                          approved: { badge: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle2, text: 'Approved' },
                          rejected: { badge: 'bg-red-100 text-red-600 border-red-200', Icon: XCircle, text: 'Not approved' },
                        }[claim.status] || { badge: 'bg-gray-100 text-gray-600', Icon: Clock, text: claim.status };
                        const { Icon: StatusIcon } = statusConfig;
                        return (
                          <div key={claim.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl bg-white">
                            <StatusIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{claim.entity_name}</p>
                              <p className="text-xs text-gray-400">{claim.entity_type} · {(() => { try { return format(new Date(claim.created_date), 'MMM d, yyyy'); } catch { return ''; } })()}</p>
                            </div>
                            <Badge className={`text-xs border flex-shrink-0 ${statusConfig.badge}`}>{statusConfig.text}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pending Invitations */}
                {invitations.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900">Pending Invitations</h3>
                    <div className="space-y-2">
                      {invitations.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-4 border border-amber-100 bg-amber-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{inv.entity_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {inv.entity_type}
                              {inv.expiration_date && (() => { try { return ` · Expires ${format(new Date(inv.expiration_date), 'MMM d')}`; } catch { return ''; } })()}
                            </p>
                          </div>
                          <Button type="button" size="sm" className="bg-[#1A1A1A] text-white hover:bg-black gap-1.5 text-xs"
                            onClick={() => window.location.href = `${createPageUrl('AcceptInvitation')}?code=${inv.code}`}>
                            Accept <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

            </div>
          </Tabs>
        </form>
      </div>
    </PageShell>
  );
}