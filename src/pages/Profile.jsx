import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Save, LogOut, ExternalLink, Lock, ChevronRight, CheckCircle2, AlertCircle, Heart, KeyRound, Users, Gauge } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import GeneralTab from '@/components/profile/GeneralTab';
import ManageTab from '@/components/profile/ManageTab';
import CodeInputTab from '@/components/profile/CodeInputTab';
import StorySubmissionForm from '@/components/profile/StorySubmissionForm';
import ManageStorySubmissions from '@/components/profile/ManageStorySubmissions';
import RaceCoreAccessTab from '@/components/profile/RaceCoreAccessTab';
import FavoritesTab from '@/components/profile/FavoritesTab';
import { Star as StarIcon, Gauge as GaugeIcon } from 'lucide-react';
import {
  getResolvedManagedEntities,
  getPrimaryResolvedEntity,
  getRaceCoreEntities,
  buildRaceCoreLaunchUrl,
  buildEditorUrl,
} from '@/components/entities/entityResolver';


const ENTITY_TYPE_COLORS = {
  Driver: 'bg-blue-50 text-blue-700 border-blue-200',
  Team: 'bg-purple-50 text-purple-700 border-purple-200',
  Track: 'bg-green-50 text-green-700 border-green-200',
  Series: 'bg-orange-50 text-orange-700 border-orange-200',
};

const ROLE_COLORS = {
  owner: 'bg-gray-900 text-white',
  editor: 'bg-gray-100 text-gray-700',
};

// ─── Tab alias mapping ────────────────────────────────────────────────────────
function resolveTab(param) {
  const map = {
    // new tab names
    general: 'general',
    my_entities: 'my_entities',
    access_codes: 'access_codes',
    story: 'story',
    // legacy aliases
    account: 'general',
    entities: 'my_entities',
    access: 'access_codes',
    racecore: 'access_codes',
    fan: 'general',
  };
  return map[param] || 'general';
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);
  const [activityFilter, setActivityFilter] = useState('all');

  const urlParams = new URLSearchParams(window.location.search);
  const seasonYear = urlParams.get('seasonYear');
  const eventId = urlParams.get('eventId');
  const tabFromUrl = urlParams.get('tab');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: collaborations = [] } = useQuery({
    queryKey: ['myCollaborations', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return base44.entities.EntityCollaborator.filter({ user_id: user.id });
    },
    enabled: !!user?.id,
  });

  const { data: resolvedEntities = [] } = useQuery({
    queryKey: ['resolvedEntities', user?.id],
    queryFn: () => getManagedEntitiesResolved(user),
    enabled: !!user?.id,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['myInvitations', user?.email],
    queryFn: () => {
      if (!user?.email) return [];
      return base44.entities.Invitation.filter({ email: user.email, status: 'pending' });
    },
    enabled: !!user?.email,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['myOperationLogs', user?.email],
    queryFn: () => {
      if (!user?.email) return [];
      return base44.entities.OperationLog.filter({ user_email: user.email }, '-created_date', 20);
    },
    enabled: !!user?.email,
  });

  React.useEffect(() => {
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
        driver_id: user.driver_id || '',
        team_id: user.team_id || '',
        series_id: user.series_id || '',
        track_id: user.track_id || '',
        car_number: user.car_number || '',
        team_affiliation: user.team_affiliation || '',
        vehicle_type: user.vehicle_type || '',
        role_on_team: user.role_on_team || '',
        owned_team_name: user.owned_team_name || '',
        owned_series_name: user.owned_series_name || '',
        owned_track_name: user.owned_track_name || '',
        sponsorship_interests: user.sponsorship_interests || '',
        media_outlet: user.media_outlet || '',
        media_role: user.media_role || '',
        track_name: user.track_name || '',
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
        primary_entity_type: data.primary_entity_type,
        primary_entity_id: data.primary_entity_id,
      });
      const response = await base44.functions.invoke('updateUserProfile', { formData: data });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const setPrimaryEntity = (entity) => {
    const updated = {
      ...formData,
      primary_entity_type: entity.entity_type,
      primary_entity_id: entity.entity_id,
    };
    setFormData(updated);
    updateMutation.mutate(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const toggleFavorite = (type, id) => {
    const key = `favorite_${type}`;
    const current = formData[key] || [];
    const updated = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];
    setFormData({ ...formData, [key]: updated });
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  const defaultTab = tabFromUrl
    ? resolveTab(tabFromUrl)
    : resolvedEntities.length > 0 ? 'my_entities' : 'general';

  if (userLoading || !formData) {
    return (
      <PageShell className="bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-16 w-full mb-6 rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  const filteredLogs = activityFilter === 'all'
    ? operationLogs
    : operationLogs.filter(l => l.status === activityFilter || (activityFilter === 'errors' && l.status === 'error'));

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-sm text-gray-500 mt-0.5">Account settings, entity access, and fan preferences</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* ── Status strip ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
          <span className="truncate max-w-[200px]">{user.email}</span>
          <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
            {user.role || 'user'}
          </Badge>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <Users className="w-3 h-3 mr-1 inline" />
            {resolvedEntities.length} {resolvedEntities.length === 1 ? 'entity' : 'entities'}
          </Badge>
        </div>

        {/* ── Save feedback ──────────────────────────────────────────────────── */}
        {updateMutation.isSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Profile saved successfully.
          </div>
        )}
        {updateMutation.isError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Save failed. Please try again.
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue={defaultTab} className="space-y-6">

            {/* Tab bar — wraps on mobile, single row on desktop */}
            <div className="bg-white border-b border-gray-200 -mx-4 px-4 overflow-x-auto">
              <TabsList className="inline-flex flex-wrap sm:flex-nowrap gap-0 bg-transparent border-0 p-0 rounded-none shadow-none w-auto min-w-full sm:min-w-0">
                {[
                  { value: 'general', label: 'Account' },
                  { value: 'my_entities', label: 'My Entities' },
                  { value: 'access_codes', label: 'Access & Setup' },
                  { value: 'story', label: 'Story' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-b-[#232323] data-[state=active]:bg-transparent data-[state=active]:text-[#232323] text-gray-500 hover:text-gray-900"
                  >
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
                  <FavoritesTab
                    formData={formData}
                    drivers={drivers}
                    teams={teams}
                    series={series}
                    tracks={tracks}
                    toggleFavorite={toggleFavorite}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="newsletter_subscriber"
                      checked={formData.newsletter_subscriber || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, newsletter_subscriber: checked })}
                    />
                    <Label htmlFor="newsletter_subscriber" className="cursor-pointer text-sm">
                      Subscribe to the Index46 newsletter
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="lg"
                disabled={updateMutation.isPending}
                className="bg-[#232323] hover:bg-black text-white gap-2 w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </TabsContent>

            {/* ── My Entities Tab ──────────────────────────────────────────── */}
            <TabsContent value="my_entities" className="space-y-6">

              {/* Primary Entity Section */}
              {resolvedEntities.length > 0 && (() => {
                const primaryEntity = getPrimaryManagedEntity(user, resolvedEntities);
                const explicitPrimary = user.primary_entity_id
                  ? resolvedEntities.find(e => e.entity_id === user.primary_entity_id)
                  : null;
                const primaryStale = user.primary_entity_id && !explicitPrimary && resolvedEntities.length > 0;
                const displayEntity = explicitPrimary;
                return (
                  <Card className={displayEntity ? 'border-2 border-[#232323]' : ''}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <StarIcon className="w-4 h-4 text-amber-500" /> Primary Entity
                      </CardTitle>
                      <CardDescription>Your main operational home for Race Core.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {primaryStale && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Your primary entity is no longer linked. Choose a new one below.
                        </p>
                      )}
                      {!displayEntity && !primaryStale && (
                        <p className="text-sm text-gray-500">Choose a primary entity below for faster Race Core access.</p>
                      )}
                      {displayEntity && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{displayEntity.entity_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                                <StarIcon className="w-3 h-3 mr-1 inline" />{displayEntity.entity_type}
                              </Badge>
                              <Badge className="text-xs bg-gray-100 text-gray-600">{displayEntity.role}</Badge>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                            onClick={() => window.location.href = getRaceCoreUrl(displayEntity, { seasonYear, eventId })}
                          >
                            <GaugeIcon className="w-3 h-3" /> Open Race Core
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Entities I Manage */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Entities I Manage</CardTitle>
                  <CardDescription>
                    {resolvedEntities.length === 0
                      ? 'No entities linked yet. Go to Access & Setup to add one.'
                      : 'Your managed racing profiles with quick actions.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resolvedEntities.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-3">You haven't linked any entities yet.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => window.location.href = createPageUrl('Profile') + '?tab=access_codes'}
                      >
                        <KeyRound className="w-4 h-4" /> Go to Access & Setup
                      </Button>
                    </div>
                  ) : (
                    resolvedEntities.map(entity => {
                      const isThisPrimary = entity.entity_id === user.primary_entity_id;
                      return (
                        <div key={entity.collaboration_id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white hover:shadow-sm transition-shadow border-2 ${isThisPrimary ? 'border-[#232323]' : 'border-transparent border border-gray-100'}`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm">{entity.entity_name}</p>
                              {isThisPrimary && (
                                <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                                  <StarIcon className="w-3 h-3 mr-1 inline" />Primary
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[entity.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                {entity.entity_type}
                              </Badge>
                              <Badge className={`text-xs px-2 py-0.5 ${ROLE_COLORS[entity.role] || 'bg-gray-100 text-gray-700'}`}>
                                {entity.role}
                              </Badge>
                            </div>
                            {entity.access_code && (
                              <p className="text-xs text-gray-400 mt-1 font-mono">Code: {entity.access_code}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 flex-shrink-0">
                            {!isThisPrimary && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 text-xs text-gray-400 hover:text-amber-600"
                                onClick={() => setPrimaryEntity(entity)}
                              >
                                <StarIcon className="w-3 h-3" /> Set Primary
                              </Button>
                            )}
                            {(entity.entity_type === 'Track' || entity.entity_type === 'Series') && (
                              <Button
                                type="button"
                                size="sm"
                                className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                                onClick={() => window.location.href = getRaceCoreUrl(entity, { seasonYear, eventId })}
                              >
                                <GaugeIcon className="w-3 h-3" />
                                Race Core
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              onClick={() => window.location.href = getEntityEditorUrl(entity)}
                            >
                              Editor
                            </Button>
                            {entity.role === 'owner' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() => window.location.href = createPageUrl('Profile') + '?tab=access_codes'}
                              >
                                <Lock className="w-3 h-3" />
                                Manage
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

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
                            {inv.expiration_date && (
                              <span className="text-xs text-gray-500">Expires {format(new Date(inv.expiration_date), 'MMM d')}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                          onClick={() => window.location.href = `${createPageUrl('AcceptInvitation')}?code=${inv.code}`}
                        >
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
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="errors">Errors</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
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
                            <p className="text-xs text-gray-400 mt-1">{format(new Date(log.created_date), 'MMM d, HH:mm')}</p>
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

              {/* Section A: Manage Access */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manage Access</CardTitle>
                  <CardDescription>If you own an entity, invite editors and manage who has access.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ManageTab user={user} />
                </CardContent>
              </Card>

              {/* Section B: Enter Access Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enter Access Code</CardTitle>
                  <CardDescription>Have a code? Link a driver, team, track, or series to your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeInputTab user={user} />
                </CardContent>
              </Card>

              {/* Section C: Race Core Access */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Race Core Access</CardTitle>
                  <CardDescription>Quick launch Race Core for your managed tracks and series.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RaceCoreAccessTab user={user} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Story Tab ─────────────────────────────────────────────────── */}
            <TabsContent value="story" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Submit a Story</CardTitle>
                  <CardDescription>Share your story with our editorial team for review.</CardDescription>
                </CardHeader>
                <CardContent>
                  <StorySubmissionForm user={user} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Submissions</CardTitle>
                  <CardDescription>View the status of your submitted stories.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ManageStorySubmissions user={user} />
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </form>

      </div>
    </PageShell>
  );
}