import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, LogOut } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import GeneralTab from '@/components/profile/GeneralTab';

import TeamOwnerTab from '@/components/profile/TeamOwnerTab';
import SeriesOwnerTab from '@/components/profile/SeriesOwnerTab';
import TrackOwnerTab from '@/components/profile/TrackOwnerTab';
import FavoritesTab from '@/components/profile/FavoritesTab';
import CodeInputTab from '@/components/profile/CodeInputTab';

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);

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
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="code-input">Code Input</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab user={user} formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="code-input">
              <CodeInputTab user={user} />
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