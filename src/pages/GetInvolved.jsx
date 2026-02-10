import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { toast } from 'sonner';

export default function GetInvolved() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state_region: '',
    country: 'USA',
    track_type: '',
    surface: '',
    website_url: '',
    contact_email: '',
    submission_notes: '',
  });

  const createTrackMutation = useMutation({
    mutationFn: async (data) => {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return base44.entities.Track.create({
        ...data,
        slug,
        status: 'Draft',
        summary: data.submission_notes || 'Submitted for review',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success('Track submitted successfully! We\'ll review it soon.');
      setFormData({
        name: '',
        city: '',
        state_region: '',
        country: 'USA',
        track_type: '',
        surface: '',
        website_url: '',
        contact_email: '',
        submission_notes: '',
      });
    },
    onError: (error) => {
      toast.error('Failed to submit track: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.state_region || !formData.track_type || !formData.surface) {
      toast.error('Please fill in all required fields');
      return;
    }

    createTrackMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <SectionHeader
          title="Get Involved"
          subtitle="Help us build the most comprehensive motorsports database"
        />

        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">Submit a Track</h2>
          <p className="text-gray-600 mb-6">
            Know a racing venue that should be featured? Submit the details below and we'll review it for inclusion.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Track Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Crandon International Raceway"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g., Crandon"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state_region">State or Region *</Label>
                <Input
                  id="state_region"
                  value={formData.state_region}
                  onChange={(e) => handleChange('state_region', e.target.value)}
                  placeholder="e.g., Wisconsin"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="track_type">Track Type *</Label>
                <Select value={formData.track_type} onValueChange={(value) => handleChange('track_type', value)}>
                  <SelectTrigger id="track_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Oval">Oval</SelectItem>
                    <SelectItem value="Road Course">Road Course</SelectItem>
                    <SelectItem value="Short Course">Short Course</SelectItem>
                    <SelectItem value="Ice Oval">Ice Oval</SelectItem>
                    <SelectItem value="Dirt Oval">Dirt Oval</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="surface">Surface *</Label>
                <Select value={formData.surface} onValueChange={(value) => handleChange('surface', value)}>
                  <SelectTrigger id="surface">
                    <SelectValue placeholder="Select surface" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asphalt">Asphalt</SelectItem>
                    <SelectItem value="Dirt">Dirt</SelectItem>
                    <SelectItem value="Ice">Ice</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://"
              />
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                placeholder="contact@track.com"
              />
            </div>

            <div>
              <Label htmlFor="submission_notes">Additional Notes</Label>
              <Textarea
                id="submission_notes"
                value={formData.submission_notes}
                onChange={(e) => handleChange('submission_notes', e.target.value)}
                placeholder="Any additional information about the track..."
                rows={4}
              />
            </div>

            <Button type="submit" disabled={createTrackMutation.isPending} className="w-full">
              {createTrackMutation.isPending ? 'Submitting...' : 'Submit Track'}
            </Button>
          </form>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Your submission will be reviewed by our team</li>
            <li>• We may reach out for additional information</li>
            <li>• Once approved, the track will appear in our directory</li>
            <li>• You'll be able to see it with "Active" or "Seasonal" status</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}