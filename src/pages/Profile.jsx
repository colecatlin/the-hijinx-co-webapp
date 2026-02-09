import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Building2, Save, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

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
        full_name: user.full_name || '',
        bio: user.bio || '',
        account_type: user.account_type || 'individual',
        association: user.association || '',
        company_name: user.company_name || '',
        car_number: user.car_number || '',
        team_affiliation: user.team_affiliation || '',
        vehicle_type: user.vehicle_type || '',
        role_on_team: user.role_on_team || '',
        owned_team_name: user.owned_team_name || '',
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
    mutationFn: (data) => base44.auth.updateMe(data),
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

  return (
    <PageShell className="bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <SectionHeader
          label="Your Profile"
          title="Manage Your Account"
          subtitle="Update your information and favorites"
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 p-6 rounded-lg"
          >
            <h2 className="text-xl font-bold text-[#232323] mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={user.email} disabled className="bg-gray-100" />
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Account Type</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Individual
                      </span>
                    </SelectItem>
                    <SelectItem value="business">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Business
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Association</Label>
                <Select
                  value={formData.association}
                  onValueChange={(value) => setFormData({ ...formData, association: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fan">Fan</SelectItem>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Team Member">Team Member</SelectItem>
                    <SelectItem value="Team Owner">Team Owner</SelectItem>
                    <SelectItem value="Sponsor">Sponsor</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Track Official">Track Official</SelectItem>
                    <SelectItem value="Crew Chief">Crew Chief</SelectItem>
                    <SelectItem value="Mechanic">Mechanic</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.account_type === 'business' && (
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            {/* Association-specific fields */}
            {formData.association === 'Driver' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Driver Information</h3>
                <div>
                  <Label>Car Number</Label>
                  <Input
                    value={formData.car_number}
                    onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                    placeholder="e.g., 44"
                  />
                </div>
                <div>
                  <Label>Team Affiliation</Label>
                  <Input
                    value={formData.team_affiliation}
                    onChange={(e) => setFormData({ ...formData, team_affiliation: e.target.value })}
                    placeholder="Your team name"
                  />
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Input
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    placeholder="e.g., Late Model, Sprint Car"
                  />
                </div>
              </div>
            )}

            {formData.association === 'Team Member' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Team Member Information</h3>
                <div>
                  <Label>Team Name</Label>
                  <Input
                    value={formData.team_affiliation}
                    onChange={(e) => setFormData({ ...formData, team_affiliation: e.target.value })}
                    placeholder="Your team name"
                  />
                </div>
                <div>
                  <Label>Role on Team</Label>
                  <Input
                    value={formData.role_on_team}
                    onChange={(e) => setFormData({ ...formData, role_on_team: e.target.value })}
                    placeholder="e.g., Pit Crew, Manager"
                  />
                </div>
              </div>
            )}

            {formData.association === 'Team Owner' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Team Owner Information</h3>
                <div>
                  <Label>Team Name</Label>
                  <Input
                    value={formData.owned_team_name}
                    onChange={(e) => setFormData({ ...formData, owned_team_name: e.target.value })}
                    placeholder="Your team name"
                  />
                </div>
              </div>
            )}

            {formData.association === 'Crew Chief' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Crew Chief Information</h3>
                <div>
                  <Label>Team Name</Label>
                  <Input
                    value={formData.team_affiliation}
                    onChange={(e) => setFormData({ ...formData, team_affiliation: e.target.value })}
                    placeholder="Your team name"
                  />
                </div>
              </div>
            )}

            {formData.association === 'Mechanic' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Mechanic Information</h3>
                <div>
                  <Label>Team Name</Label>
                  <Input
                    value={formData.team_affiliation}
                    onChange={(e) => setFormData({ ...formData, team_affiliation: e.target.value })}
                    placeholder="Your team name"
                  />
                </div>
              </div>
            )}

            {formData.association === 'Sponsor' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Sponsor Information</h3>
                <div>
                  <Label>Sponsorship Interests</Label>
                  <Textarea
                    value={formData.sponsorship_interests}
                    onChange={(e) => setFormData({ ...formData, sponsorship_interests: e.target.value })}
                    rows={3}
                    placeholder="What are you interested in sponsoring?"
                  />
                </div>
              </div>
            )}

            {formData.association === 'Media' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Media Information</h3>
                <div>
                  <Label>Media Outlet</Label>
                  <Input
                    value={formData.media_outlet}
                    onChange={(e) => setFormData({ ...formData, media_outlet: e.target.value })}
                    placeholder="Your media outlet or publication"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input
                    value={formData.media_role}
                    onChange={(e) => setFormData({ ...formData, media_role: e.target.value })}
                    placeholder="e.g., Reporter, Photographer, Editor"
                  />
                </div>
              </div>
            )}

            {formData.association === 'Track Official' && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#232323]">Track Official Information</h3>
                <div>
                  <Label>Track Name</Label>
                  <Input
                    value={formData.track_name}
                    onChange={(e) => setFormData({ ...formData, track_name: e.target.value })}
                    placeholder="Your track name"
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Favorites */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-50 p-6 rounded-lg space-y-6"
          >
            <h2 className="text-xl font-bold text-[#232323]">Your Favorites</h2>

            {/* Favorite Drivers */}
            <div>
              <Label className="text-base mb-3 block">Favorite Drivers</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.favorite_drivers.includes(driver.id)}
                      onCheckedChange={() => toggleFavorite('drivers', driver.id)}
                    />
                    <label className="text-sm text-[#232323] cursor-pointer">
                      {driver.name} {driver.number ? `#${driver.number}` : ''}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Favorite Teams */}
            <div>
              <Label className="text-base mb-3 block">Favorite Teams</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.favorite_teams.includes(team.id)}
                      onCheckedChange={() => toggleFavorite('teams', team.id)}
                    />
                    <label className="text-sm text-[#232323] cursor-pointer">
                      {team.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Favorite Series */}
            <div>
              <Label className="text-base mb-3 block">Favorite Series</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {series.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.favorite_series.includes(s.id)}
                      onCheckedChange={() => toggleFavorite('series', s.id)}
                    />
                    <label className="text-sm text-[#232323] cursor-pointer">
                      {s.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Favorite Tracks */}
            <div>
              <Label className="text-base mb-3 block">Favorite Tracks</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.favorite_tracks.includes(track.id)}
                      onCheckedChange={() => toggleFavorite('tracks', track.id)}
                    />
                    <label className="text-sm text-[#232323] cursor-pointer">
                      {track.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

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
            <p className="text-sm text-green-600">Profile updated successfully!</p>
          )}
        </form>
      </div>
    </PageShell>
  );
}