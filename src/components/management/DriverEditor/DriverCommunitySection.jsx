import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';

export default function DriverCommunitySection({ driverId, community }) {
  const communityRecord = community;
  const [data, setData] = useState({
    youth_programs: communityRecord?.youth_programs || '',
    charity_involvement: communityRecord?.charity_involvement || '',
    mentoring: communityRecord?.mentoring || '',
    legacy_notes: communityRecord?.legacy_notes || '',
    community_notes: communityRecord?.community_notes || '',
  });

  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (communityRecord?.id) {
        return base44.entities.DriverCommunity.update(communityRecord.id, data);
      } else {
        return base44.entities.DriverCommunity.create({ ...data, driver_id: driverId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverCommunity', driverId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Involvement</CardTitle>
        <CardDescription>Track community service, mentoring, and charitable work</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Youth Programs</Label>
          <Textarea
            value={data.youth_programs}
            onChange={(e) => handleChange('youth_programs', e.target.value)}
            placeholder="Describe youth development programs involvement..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Charitable Work</Label>
          <Textarea
            value={data.charity_involvement}
            onChange={(e) => handleChange('charity_involvement', e.target.value)}
            placeholder="Detail charitable involvement and community service..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Mentoring & Coaching</Label>
          <Textarea
            value={data.mentoring}
            onChange={(e) => handleChange('mentoring', e.target.value)}
            placeholder="Describe mentoring and coaching activities..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Legacy & Impact</Label>
          <Textarea
            value={data.legacy_notes}
            onChange={(e) => handleChange('legacy_notes', e.target.value)}
            placeholder="Notes about long-term legacy and impact..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Additional Notes</Label>
          <Textarea
            value={data.community_notes}
            onChange={(e) => handleChange('community_notes', e.target.value)}
            placeholder="Any other community involvement notes..."
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}