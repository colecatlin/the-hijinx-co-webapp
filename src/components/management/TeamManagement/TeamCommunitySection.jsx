import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function TeamCommunitySection({ teamId }) {
  const [formData, setFormData] = useState({
    social_facebook: '',
    social_instagram: '',
    social_x: '',
    social_youtube: '',
    social_tiktok: '',
    social_discord: '',
    website_url: '',
    newsletter_signup_url: '',
    community_notes: '',
    has_fan_club: false,
    fan_club_url: '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: teamCommunity, isLoading } = useQuery({
    queryKey: ['teamCommunity', teamId],
    queryFn: () => base44.entities.TeamCommunity.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamCommunity && teamCommunity.length > 0) {
      setFormData(teamCommunity[0]);
    }
  }, [teamCommunity]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (formData.id) {
        return base44.entities.TeamCommunity.update(formData.id, data);
      } else {
        return base44.entities.TeamCommunity.create({ ...data, team_id: teamId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamCommunity', teamId] });
      setIsSaved(true);
      toast.success('Team community updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community</CardTitle>
        <CardDescription>Manage team's social media and community channels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <Label htmlFor="website_url">Team Website</Label>
          <Input
            id="website_url"
            type="url"
            value={formData.website_url || ''}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            placeholder="https://teamwebsite.com"
            className="mt-2"
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-sm mb-4">Social Media</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="social_facebook">Facebook</Label>
              <Input
                id="social_facebook"
                value={formData.social_facebook || ''}
                onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                placeholder="https://facebook.com/team"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="social_instagram">Instagram</Label>
              <Input
                id="social_instagram"
                value={formData.social_instagram || ''}
                onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                placeholder="@teamhandle or https://instagram.com/team"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="social_x">X / Twitter</Label>
              <Input
                id="social_x"
                value={formData.social_x || ''}
                onChange={(e) => setFormData({ ...formData, social_x: e.target.value })}
                placeholder="@teamhandle or https://twitter.com/team"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="social_youtube">YouTube</Label>
              <Input
                id="social_youtube"
                value={formData.social_youtube || ''}
                onChange={(e) => setFormData({ ...formData, social_youtube: e.target.value })}
                placeholder="https://youtube.com/@team"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="social_tiktok">TikTok</Label>
              <Input
                id="social_tiktok"
                value={formData.social_tiktok || ''}
                onChange={(e) => setFormData({ ...formData, social_tiktok: e.target.value })}
                placeholder="@teamhandle or https://tiktok.com/@team"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="social_discord">Discord</Label>
              <Input
                id="social_discord"
                value={formData.social_discord || ''}
                onChange={(e) => setFormData({ ...formData, social_discord: e.target.value })}
                placeholder="https://discord.gg/team"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-sm mb-4">Community & Engagement</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="newsletter_signup_url">Newsletter Signup URL</Label>
              <Input
                id="newsletter_signup_url"
                type="url"
                value={formData.newsletter_signup_url || ''}
                onChange={(e) => setFormData({ ...formData, newsletter_signup_url: e.target.value })}
                placeholder="https://newsletter.team.com"
                className="mt-2"
              />
            </div>

            <div className="flex items-center gap-3 border rounded-lg p-3 bg-gray-50">
              <Checkbox
                id="has_fan_club"
                checked={formData.has_fan_club || false}
                onCheckedChange={(checked) => setFormData({ ...formData, has_fan_club: checked })}
              />
              <Label htmlFor="has_fan_club" className="flex-1 cursor-pointer">
                <span className="font-medium">Has Official Fan Club</span>
                <p className="text-xs text-gray-500 mt-1">Check if team has an official fan club or membership program</p>
              </Label>
            </div>

            {formData.has_fan_club && (
              <div>
                <Label htmlFor="fan_club_url">Fan Club URL</Label>
                <Input
                  id="fan_club_url"
                  type="url"
                  value={formData.fan_club_url || ''}
                  onChange={(e) => setFormData({ ...formData, fan_club_url: e.target.value })}
                  placeholder="https://fanclub.team.com"
                  className="mt-2"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="community_notes">Community Notes</Label>
          <Textarea
            id="community_notes"
            value={formData.community_notes || ''}
            onChange={(e) => setFormData({ ...formData, community_notes: e.target.value })}
            placeholder="Information about team community initiatives, events, or engagement strategies"
            className="mt-2"
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}