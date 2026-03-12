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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Save, LogOut, Lock, ChevronRight, CheckCircle2, AlertCircle, KeyRound, Users, Gauge, Star, ExternalLink, Shield, Edit, Clock, XCircle } from 'lucide-react';
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
import {
  getResolvedManagedEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
  getRaceCoreEntities,
} from '@/components/entities/entityResolver';
import { getValidPrimaryEntity, isPrimaryEntityStale, setPrimaryEntityOnUser } from '@/components/entities/entityPrimary';

const ENTITY_TYPE_COLORS = {
  Driver: 'bg-blue-50 text-blue-700 border-blue-200',
  Team: 'bg-purple-50 text-purple-700 border-purple-200',
  Track: 'bg-green-50 text-green-700 border-green-200',
  Series: 'bg-orange-50 text-orange-700 border-orange-200',
};

function resolveTab(param) {
  const map = {
    general: 'general', my_entities: 'my_entities', access_codes: 'access_codes', story: 'story',
    account: 'general', entities: 'my_entities', access: 'access_codes', racecore: 'access_codes', fan: 'general',
  };
  return map[param] || 'general';
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);
  const [activityFilter, setActivityFilter] = useState('all');
  const [settingPrimary, setSettingPrimary] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: QueryKeys.auth.me(),
    queryFn: () => base44.auth.me(),
  });

  const { data: drivers = [] } = useQuery({ queryKey: QueryKeys.drivers.list(), queryFn: () => base44.entities.Driver.list() });
  const { data: teams = [] } = useQuery({ queryKey: QueryKeys.teams.list(), queryFn: () => base44.entities.Team.list() });
  const { data: series = [] } = useQuery({ queryKey: QueryKeys.series.list(), queryFn: () => base44.entities.Series.list() });
  const { data: tracks = [] } = useQuery({ queryKey: QueryKeys.tracks.list(), queryFn: () => base44.entities.Track.list() });

  const { data: resolvedEntities = [] } = useQuery({
    queryKey: QueryKeys.managedCollaborations.byUser(user?.id),
    queryFn: () => getResolvedManagedEntities(user),
    enabled: !!user?.id,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: QueryKeys.profile.invitations(user?.email),
    queryFn: () => base44.entities.Invitation.filter({ email: user.email, status: 'pending' }),
    enabled: !!user?.email,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: QueryKeys.profile.operationLogs(user?.email),
    queryFn: () => base44.entities.OperationLog.filter({ user_email: user.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        display_name: user.display_name || '',
        birth_date: user.birth_date || null,
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
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
        display_name: data.display_name,
        birth_date: data.birth_date,
        city: data.city,
        state: data.state,
        country: data.country,
        newsletter_subscriber: data.newsletter_subscriber,
        // Include favorites so they persist
        favorite_drivers: data.favorite_drivers || [],
        favorite_teams: data.favorite_teams || [],
        favorite_series: data.favorite_series || [],
        favorite_tracks: data.favorite_tracks || [],
      });
      // Non-critical secondary update — soft-fail so it never blocks a profile save
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
  const toggleFavorite = (type, id) => {
    const key = `favorite_${type}`;
    const current = formData[key] || [];
    const updated = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
    setFormData({ ...formData, [key]: updated });
  };
  const handleLogout = () => base44.auth.logout(createPageUrl('Home'));

  const primaryEntity = getValidPrimaryEntity(user, resolvedEntities);
  const primaryStale = isPrimaryEntityStale(user, resolvedEntities);
  const hasCollaborations = resolvedEntities.length > 0;
  const raceCoreEntities = getRaceCoreEntities(resolvedEntities);
  const raceCoreTarget = (primaryEntity?.is_racecore_entity ? primaryEntity : null) || raceCoreEntities[0] || null;

  const defaultTab = tabFromUrl ? resolveTab(tabFromUrl) : (hasCollaborations ? 'my_entities' : 'general');

  if (userLoading || !formData) {
    return (
      <PageShell className="bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  const filteredLogs = activityFilter === 'all' ? operationLogs : operationLogs.filter(l => l.status === activityFilter);

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">Profile</p>
            <h1 className="text-2xl font-bold text-gray-900">Account & Access</h1>
            <p className="text-sm text-gray-500 mt-0.5">Settings, entity access, and preferences</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to={createPageUrl('MyDashboard')}>
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-3 h-3 rotate-180" /> Dashboard
              </button>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Access state banners */}
        <AccessSuccessBanner
          raceCoreTarget={raceCoreTarget}
          primaryEntity={primaryEntity}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {/* Account Status Card */}
        <AccountStatusCard
          user={user}
          collaborators={resolvedEntities}
          mediaProfile={null}
          primaryEntity={primaryEntity}
          raceCoreTarget={raceCoreTarget}
          buildRaceCoreLaunchUrl={buildRaceCoreLaunchUrl}
          buildEditorUrl={buildEditorUrl}
        />

        {/* Email/role status strip */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
          <span className="truncate max-w-[200px]">{user.email}</span>
          <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
            {user.role || 'user'}
          </Badge>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <Users className="w-3 h-3 mr-1 inline" />
            {resolvedEntities.length} {resolvedEntities.length === 1 ? 'entity' : 'entities'}
          </Badge>
          {primaryEntity && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200">
              <Star className="w-3 h-3 mr-1 inline" />Primary: {primaryEntity.entity_name}
            </Badge>
          )}
        </div>

        {/* Save feedback */}
        {updateMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Profile saved successfully.
          </div>
        )}
        {updateMutation.isError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> Save failed. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <div className="bg-white border-b border-gray-200 -mx-4 px-4 overflow-x-auto">
              <TabsList className="inline-flex flex-wrap sm:flex-nowrap gap-0 bg-transparent border-0 p-0 rounded-none shadow-none w-auto min-w-full sm:min-w-0">
                {[
                  { value: 'general', label: 'Account' },
                  { value: 'my_entities', label: hasCollaborations ? `My Entities (${resolvedEntities.length})` : 'My Entities' },
                  { value: 'access_codes', label: 'Access & Setup' },
                  { value: 'story', label: 'Story' },
                ].map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value}
                    className="rounded-none px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-b-[#232323] data-[state=active]:bg-transparent data-[state=active]:text-[#232323] text-gray-500 hover:text-gray-900">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Account Tab ──────────────────────────────────────────────── */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account Details</CardTitle>
                  <CardDescription>Update your name, location, and basic info.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GeneralTab user={user} formData={formData} setFormData={setFormData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fan Preferences</CardTitle>
                  <CardDescription>Follow drivers, teams, tracks, and series.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FavoritesTab formData={formData} drivers={drivers} teams={teams} series={series} tracks={tracks} toggleFavorite={toggleFavorite} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Switch id="newsletter_subscriber" checked={formData.newsletter_subscriber || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, newsletter_subscriber: checked })} />
                    <Label htmlFor="newsletter_subscriber" className="cursor-pointer text-sm">Subscribe to the Index46 newsletter</Label>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" disabled={updateMutation.isPending}
                className="bg-[#232323] hover:bg-black text-white gap-2 w-full sm:w-auto">
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </TabsContent>

            {/* ── My Entities Tab ──────────────────────────────────────────── */}
            <TabsContent value="my_entities" className="space-y-5">

              {/* Fan mode — no collaborations, no invitations */}
              {!hasCollaborations && invitations.length === 0 && (
                <Card className="border-2 border-dashed border-gray-200">
                  <CardContent className="py-10 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Star className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">You are in Fan Mode</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                      Favorites, stories, and motorsports browsing are ready now. Link an entity if you manage a driver, team, track, or series.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link to={createPageUrl('MyDashboard')}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">Go to Dashboard</Button>
                      </Link>
                      <Link to={createPageUrl('DriverDirectory')}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">Browse Drivers</Button>
                      </Link>
                      <Link to={createPageUrl('Profile') + '?tab=access_codes'}>
                        <Button size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs">
                          <KeyRound className="w-3.5 h-3.5" /> Link an Entity
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Primary entity */}
              {hasCollaborations && (
                <Card className={primaryEntity ? 'border-2 border-[#232323]' : ''}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" /> Primary Entity
                    </CardTitle>
                    <CardDescription>Your default Race Core launch target.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {primaryStale && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Your primary entity is no longer linked. Choose a new one below.
                      </div>
                    )}
                    {!primaryEntity && !primaryStale && (
                      <p className="text-sm text-gray-500">Choose a primary entity below for faster Race Core access.</p>
                    )}
                    {primaryEntity && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{primaryEntity.entity_name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[primaryEntity.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                              {primaryEntity.entity_type}
                            </Badge>
                            <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                              <Star className="w-3 h-3 mr-1 inline" />Primary
                            </Badge>
                            <Badge className="text-xs bg-gray-100 text-gray-600">{primaryEntity.role}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                          {primaryEntity.is_racecore_entity && (
                            <Button type="button" size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                              onClick={() => window.location.href = buildRaceCoreLaunchUrl(primaryEntity)}>
                              <Gauge className="w-3 h-3" /> Open Race Core
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => window.location.href = buildEditorUrl(primaryEntity)}>
                            <ExternalLink className="w-3 h-3" /> Open Editor
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* All collaborations */}
              {hasCollaborations && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Entities I Manage</CardTitle>
                    <CardDescription>Your managed racing profiles with quick actions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resolvedEntities.map(entity => {
                      const isThisPrimary = entity.entity_id === primaryEntity?.entity_id;
                      return (
                        <div key={entity.collaboration_id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 transition-shadow hover:shadow-sm ${isThisPrimary ? 'border-[#232323] bg-gray-50' : 'border-gray-100 bg-white'}`}>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 text-sm">{entity.entity_name}</p>
                              {isThisPrimary && (
                                <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                                  <Star className="w-3 h-3 mr-1 inline" />Primary
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[entity.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                {entity.entity_type}
                              </Badge>
                              <Badge className={`text-xs px-2 py-0.5 ${entity.role === 'owner' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {entity.role}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 flex-shrink-0">
                            {!isThisPrimary && (
                              <Button type="button" size="sm" variant="ghost"
                                disabled={settingPrimary === entity.entity_id}
                                className="gap-1.5 text-xs text-gray-400 hover:text-amber-600"
                                onClick={() => handleSetPrimary(entity)}>
                                <Star className="w-3 h-3" />
                                {settingPrimary === entity.entity_id ? 'Setting...' : 'Set Primary'}
                              </Button>
                            )}
                            {entity.is_racecore_entity && (
                              <Button type="button" size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                                onClick={() => window.location.href = buildRaceCoreLaunchUrl(entity)}>
                                <Gauge className="w-3 h-3" /> Open Race Core
                              </Button>
                            )}
                            <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs"
                              onClick={() => window.location.href = buildEditorUrl(entity)}>
                              Open Editor
                            </Button>
                            {entity.role === 'owner' && (
                              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs"
                                onClick={() => window.location.href = createPageUrl('Profile') + '?tab=access_codes'}>
                                <Lock className="w-3 h-3" /> Manage Access
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pending Invitations</CardTitle>
                    <CardDescription>Accept to gain access to these entities.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {invitations.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-4 border border-amber-100 bg-amber-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{inv.entity_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[inv.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                              {inv.entity_type}
                            </Badge>
                            {inv.expiration_date && (() => {
                              try { return <span className="text-xs text-gray-500">Expires {format(new Date(inv.expiration_date), 'MMM d')}</span>; }
                              catch { return <span className="text-xs text-gray-500">Expires soon</span>; }
                            })()}
                          </div>
                        </div>
                        <Button type="button" size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                          onClick={() => window.location.href = `${createPageUrl('AcceptInvitation')}?code=${inv.code}`}>
                          Accept <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              {operationLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                        <CardDescription>Your personal activity log.</CardDescription>
                      </div>
                      <Select value={activityFilter} onValueChange={setActivityFilter}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="error">Errors</SelectItem>
                          <SelectItem value="success">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {filteredLogs.map(log => (
                        <div key={log.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-lg bg-slate-50">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-xs">{log.operation_type}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{(() => { try { return format(new Date(log.created_date), 'MMM d, HH:mm'); } catch { return '—'; } })()}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-3 flex-shrink-0">{log.status || 'completed'}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Access & Setup Tab ───────────────────────────────────────── */}
            <TabsContent value="access_codes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manage Access</CardTitle>
                  <CardDescription>If you own an entity, invite editors and manage who has access.</CardDescription>
                </CardHeader>
                <CardContent><ManageTab user={user} /></CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enter Access Code</CardTitle>
                  <CardDescription>Have a code? Link a driver, team, track, or series to your account.</CardDescription>
                </CardHeader>
                <CardContent><CodeInputTab user={user} /></CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Race Core Access</CardTitle>
                  <CardDescription>Quick launch Race Core for your managed tracks and series.</CardDescription>
                </CardHeader>
                <CardContent><RaceCoreAccessTab user={user} /></CardContent>
              </Card>
            </TabsContent>

            {/* ── Story Tab ─────────────────────────────────────────────────── */}
            <TabsContent value="story" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Submit a Story</CardTitle>
                  <CardDescription>Share your story with our editorial team for review.</CardDescription>
                </CardHeader>
                <CardContent><StorySubmissionForm user={user} /></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Submissions</CardTitle>
                  <CardDescription>View the status of your submitted stories.</CardDescription>
                </CardHeader>
                <CardContent><ManageStorySubmissions user={user} /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </PageShell>
  );
}