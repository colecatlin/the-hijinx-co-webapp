import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, LogOut, ExternalLink, Lock } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import GeneralTab from '@/components/profile/GeneralTab';
import ManageTab from '@/components/profile/ManageTab';
import TeamOwnerTab from '@/components/profile/TeamOwnerTab';
import SeriesOwnerTab from '@/components/profile/SeriesOwnerTab';
import TrackOwnerTab from '@/components/profile/TrackOwnerTab';
import FavoritesTab from '@/components/profile/FavoritesTab';
import CodeInputTab from '@/components/profile/CodeInputTab';
import StorySubmissionForm from '@/components/profile/StorySubmissionForm';
import ManageStorySubmissions from '@/components/profile/ManageStorySubmissions';
import RaceCoreAccessTab from '@/components/profile/RaceCoreAccessTab';

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('tab') || 'general';

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

  if (userLoading || !formData) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageShell>
    );
  }

  const getRoleSpecificTab = () => {
    return null;
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  return (
    <PageShell className="bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <SectionHeader
              label="Your Profile"
              title="Manage Your Account"
              subtitle="Update your information and preferences"
            />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="entities">My Entities</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="story">Story</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab user={user} formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="entities" className="space-y-8">
              {/* My Entities Section */}
              {collaborations.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Entities I Manage</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {collaborations.map(collab => (
                      <Card key={collab.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{collab.entity_name}</CardTitle>
                            <Badge className={collab.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                              {collab.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{collab.entity_type}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.location.href = `${createPageUrl('RegistrationDashboard')}?orgType=${collab.entity_type.toLowerCase()}&orgId=${collab.entity_id}`;
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Race Core
                            </Button>
                            {collab.role === 'owner' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  window.location.href = `${createPageUrl('Profile')}?tab=access`;
                                }}
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Manage
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Invitations Section */}
              {invitations.length > 0 && (
                <div className="pt-6 border-t">
                  <h2 className="text-2xl font-bold mb-4">Pending Invitations</h2>
                  <div className="space-y-3">
                    {invitations.map(inv => (
                      <Card key={inv.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{inv.entity_name}</p>
                              <p className="text-xs text-gray-600">{inv.entity_type}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                window.location.href = `${createPageUrl('AcceptInvitation')}?code=${inv.code}`;
                              }}
                            >
                              Accept
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Section */}
              {operationLogs.length > 0 && (
                <div className="pt-6 border-t">
                  <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {operationLogs.map(log => (
                      <div key={log.id} className="flex items-start justify-between p-3 border border-gray-200 rounded text-sm">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{log.operation_type}</p>
                          <p className="text-xs text-gray-600">{log.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{format(new Date(log.created_date), 'MMM d, HH:mm')}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{log.status || 'completed'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {collaborations.length === 0 && invitations.length === 0 && (
                <div className="p-8 text-center border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-600 mb-4">No entities yet. Use the access tab to request access.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="access" className="space-y-8">
              <ManageTab user={user} />
              <div className="pt-6 border-t">
                <CodeInputTab user={user} />
              </div>
            </TabsContent>

            <TabsContent value="story" className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-2">Submit a Story</h2>
                <p className="text-gray-600 mb-6">Share your story with our editorial team for review</p>
                <StorySubmissionForm user={user} />
              </div>

              <div className="pt-6 border-t">
                <h2 className="text-2xl font-bold mb-2">Your Submissions</h2>
                <p className="text-gray-600 mb-6">View the status of your submitted stories</p>
                <ManageStorySubmissions user={user} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 mt-8">
            <Button
              type="submit"
              size="lg"
              disabled={updateMutation.isPending}
              className="bg-[#232323] hover:bg-[#1A3249]"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>

            {updateMutation.isSuccess && (
              <p className="text-sm text-green-600 flex items-center">Profile updated successfully!</p>
            )}
          </div>
        </form>
      </div>
    </PageShell>
  );
}