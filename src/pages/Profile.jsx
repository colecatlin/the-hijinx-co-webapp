import React, { useState } from 'react';
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
import { Save, LogOut, ExternalLink, Lock, Users, Trophy, Rocket, CheckCircle2, AlertCircle, ChevronRight, KeyRound, Heart } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import GeneralTab from '@/components/profile/GeneralTab';
import ManageTab from '@/components/profile/ManageTab';
import CodeInputTab from '@/components/profile/CodeInputTab';
import StorySubmissionForm from '@/components/profile/StorySubmissionForm';
import ManageStorySubmissions from '@/components/profile/ManageStorySubmissions';
import RaceCoreAccessTab from '@/components/profile/RaceCoreAccessTab';
import FavoritesTab from '@/components/profile/FavoritesTab';

// ─── Helper functions ─────────────────────────────────────────────────────────
function getRegistrationDashboardUrl(entityType, entityId) {
  return createPageUrl('RegistrationDashboard') + `?orgType=${entityType.toLowerCase()}&orgId=${entityId}`;
}

function getEditorUrl(entityType, entityId, accessCode) {
  if (entityType === 'Driver') {
    return createPageUrl('DriverEditor') + `?id=${entityId}`;
  }
  return createPageUrl('EntityEditor') + `?id=${accessCode}`;
}

// ─── Entity type colors ───────────────────────────────────────────────────────
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

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);
  const [activityFilter, setActivityFilter] = useState('all');
  const urlParams = new URLSearchParams(window.location.search);
  const seasonYear = urlParams.get('seasonYear');
  const eventId = urlParams.get('eventId');

  // Compute defaultTab after data loads — use a ref to avoid re-renders
  // We compute it once at render time; collaborations/invitations may not be loaded yet on first render
  // so we fall back to urlParams first, then re-evaluate when data settles via key on Tabs
  const tabFromUrl = urlParams.get('tab');
  // map legacy 'general' param to new 'account' tab
  const normalizedTab = tabFromUrl === 'general' ? 'account' : tabFromUrl;

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
      });
      const response = await base44.functions.invoke('updateUserProfile', { formData: data });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

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

  const isFan = collaborations.length === 0 && invitations.length === 0;
  const isEntityManager = collaborations.length > 0;

  // Smart default tab: only override when no explicit tab in URL
  const computedDefaultTab = normalizedTab
    ? normalizedTab
    : collaborations.length === 0 && invitations.length > 0
      ? 'entities'
      : collaborations.length === 0 && invitations.length === 0
        ? 'access'
        : 'account';

  // Build Race Core URL with optional season/event passthrough
  function getRaceCoreUrl(entityType, entityId) {
    let url = createPageUrl('RegistrationDashboard') + `?orgType=${entityType.toLowerCase()}&orgId=${entityId}`;
    if (seasonYear) url += `&seasonYear=${seasonYear}`;
    if (eventId) url += `&eventId=${eventId}`;
    return url;
  }

  if (userLoading || !formData) {
    return (
      <PageShell className="bg-slate-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-20 w-full mb-8 rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Profile</h1>
              <Badge className={`text-xs px-2 py-0.5 ${
                user?.role === 'admin'
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : collaborations.length > 0
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {user?.role === 'admin' ? 'Admin' : collaborations.length > 0 ? 'Entity Access' : 'Fan'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">Your account and access across Index46</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* ── Save feedback strip ──────────────────────────────────────────── */}
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

        {/* ── Account Status Strip ─────────────────────────────────────────── */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6 divide-x divide-gray-100">
              <div className="pr-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Account Type</p>
                <p className="font-bold text-gray-900 text-lg">{isEntityManager ? 'Entity Manager' : 'Fan'}</p>
              </div>
              <div className="px-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Entities Linked</p>
                <p className="font-bold text-gray-900 text-lg">{collaborations.length}</p>
              </div>
              <div className="pl-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Pending Invites</p>
                <p className="font-bold text-gray-900 text-lg">{invitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Profile Summary Card ─────────────────────────────────────────── */}
        <Card className="border border-gray-200 rounded-xl bg-white">
          <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">
                {(user.display_name || user.full_name || user.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">{user.display_name || user.full_name || user.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={`text-xs px-2 py-0.5 ${isEntityManager ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {isEntityManager ? 'Entity Account' : 'Fan Account'}
                  </Badge>
                  {invitations.length > 0 && (
                    <Badge className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200">
                      Invites: {invitations.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div>
              {isEntityManager ? (
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                  onClick={() => window.location.href = getRaceCoreUrl(collaborations[0].entity_type, collaborations[0].entity_id)}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Race Core
                </Button>
              ) : (
                <Link to={createPageUrl('Profile') + '?tab=access'}>
                  <Button size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs">
                    <KeyRound className="w-3.5 h-3.5" /> Link an Entity
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Global Quick Actions ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to={createPageUrl('MyDashboard')}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Rocket className="w-3.5 h-3.5" /> My Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('DriverDirectory')}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" /> Browse Drivers
            </Button>
          </Link>
          <Link to={createPageUrl('EventDirectory')}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Trophy className="w-3.5 h-3.5" /> Browse Events
            </Button>
          </Link>
          {isFan && (
            <Link to={createPageUrl('Profile') + '?tab=access'}>
              <Button size="sm" className="gap-1.5 text-xs bg-[#232323] text-white hover:bg-black">
                <KeyRound className="w-3.5 h-3.5" /> Link an Entity
              </Button>
            </Link>
          )}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue={computedDefaultTab} className="space-y-6">
            <div className="overflow-x-auto -mx-4 px-4">
              <TabsList className="inline-flex w-auto min-w-full gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                <TabsTrigger value="account" className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-[#232323] data-[state=active]:text-white">Account</TabsTrigger>
                <TabsTrigger value="fan" className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-[#232323] data-[state=active]:text-white">Fan</TabsTrigger>
                <TabsTrigger value="entities" className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-[#232323] data-[state=active]:text-white">My Entities</TabsTrigger>
                <TabsTrigger value="access" className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-[#232323] data-[state=active]:text-white">Link Access</TabsTrigger>
                <TabsTrigger value="racecore" className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-[#232323] data-[state=active]:text-white">Race Core</TabsTrigger>
                <TabsTrigger value="story" className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-[#232323] data-[state=active]:text-white">Story</TabsTrigger>
              </TabsList>
            </div>

            {/* ── Account Tab ─────────────────────────────────────────────── */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <GeneralTab user={user} formData={formData} setFormData={setFormData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preferences</CardTitle>
                  <CardDescription>Manage your communication preferences.</CardDescription>
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

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={updateMutation.isPending}
                  className="bg-[#232323] hover:bg-black text-white gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </TabsContent>

            {/* ── Entities Tab ─────────────────────────────────────────────── */}
            <TabsContent value="entities" className="space-y-6">

              {/* Fan Mode card – only when truly no entities and no invitations */}
              {collaborations.length === 0 && invitations.length === 0 && (
                <Card className="border border-gray-200 rounded-xl bg-white">
                  <CardHeader>
                    <CardTitle className="text-base">Fan Mode</CardTitle>
                    <CardDescription>You are not linked to a driver, team, track, or series yet. You can still follow favorites and explore motorsports.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Link to={createPageUrl('DriverDirectory')}>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Explore Drivers
                      </Button>
                    </Link>
                    <Link to={createPageUrl('EventDirectory')}>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5">
                        <Trophy className="w-3.5 h-3.5" /> Explore Events
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* My Entities */}
              {collaborations.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">My Entities</CardTitle>
                    <CardDescription>Entities you manage on Index46.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {collaborations.map(collab => (
                      <div key={collab.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-100 rounded-xl bg-slate-50 hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{collab.entity_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`text-xs border px-2 py-0.5 ${ENTITY_TYPE_COLORS[collab.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                {collab.entity_type}
                              </Badge>
                              <Badge className={`text-xs px-2 py-0.5 ${ROLE_COLORS[collab.role] || 'bg-gray-100 text-gray-700'}`}>
                                {collab.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {collab.role === 'owner' ? 'You can invite editors and manage access.' : 'You can edit what the owner allows.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs"
                            onClick={() => window.location.href = getRaceCoreUrl(collab.entity_type, collab.entity_id)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Launch Race Core
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => window.location.href = getEditorUrl(collab.entity_type, collab.entity_id, collab.access_code)}
                          >
                            Open Editor
                          </Button>
                          {collab.role === 'owner' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              onClick={() => window.location.href = createPageUrl('Profile') + '?tab=access'}
                            >
                              <Lock className="w-3 h-3" />
                              Manage Access
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-gray-200 rounded-xl bg-white">
                  <CardContent className="py-12 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">You are set up as a fan</h3>
                    <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">Follow drivers, teams, series, and tracks, and keep your favorites here. If you manage a driver, team, track, or series, link it using an access code.</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Link to={createPageUrl('Profile') + '?tab=general'}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          Go to Favorites
                        </Button>
                      </Link>
                      <Link to={createPageUrl('Profile') + '?tab=access'}>
                        <Button size="sm" className="bg-[#232323] text-white hover:bg-black gap-1.5 text-xs">
                          <KeyRound className="w-3.5 h-3.5" /> Link an Entity
                        </Button>
                      </Link>
                    </div>
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
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {operationLogs.map(log => (
                        <div key={log.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-lg text-sm bg-slate-50">
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

            {/* ── Access Tab ───────────────────────────────────────────────── */}
            <TabsContent value="access" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manage Access</CardTitle>
                  <CardDescription>Owners can invite editors and revoke access. Editors can view their assigned entities.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ManageTab user={user} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enter Access Code</CardTitle>
                  <CardDescription>Use the 8-digit code provided by the entity owner.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeInputTab user={user} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Race Core Tab ────────────────────────────────────────────── */}
            <TabsContent value="racecore" className="space-y-6">
              <RaceCoreAccessTab user={user} />
            </TabsContent>

            {/* ── Stories Tab ──────────────────────────────────────────────── */}
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

        {/* ── CorePass Placeholder ──────────────────────────────────────────── */}
        <Card className="border border-gray-200 bg-white opacity-60">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">CorePass</h3>
              <p className="text-sm text-gray-500 mt-0.5">Coming soon. Tickets, access, and identity across Index46.</p>
            </div>
            <Button disabled size="sm" variant="outline" className="text-xs shrink-0">
              Coming Soon
            </Button>
          </CardContent>
        </Card>

      </div>
    </PageShell>
  );
}