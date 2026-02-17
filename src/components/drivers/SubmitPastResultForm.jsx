import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SubmitPastResultForm({ driverId, programContext, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    event_name_claimed: '',
    event_date_claimed: null,
    track_name_claimed: '',
    series_name_claimed: programContext?.series_name || '',
    class_name_claimed: programContext?.class_name || '',
    position_claimed: '',
    laps_completed_claimed: '',
    best_lap_time_claimed: '',
    evidence_url: '',
    notes: '',
  });

  const submitClaimMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.DriverClaim.create({
        ...data,
        driver_id: driverId,
        status: 'pending',
      });
    },
    onSuccess: () => {
      toast.success('Result submitted for review');
      queryClient.invalidateQueries({ queryKey: ['driverClaims', driverId] });
      onCancel();
    },
    onError: (error) => {
      toast.error('Failed to submit result: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.event_name_claimed || !formData.event_date_claimed || !formData.position_claimed) {
      toast.error('Please fill in all required fields');
      return;
    }

    submitClaimMutation.mutate({
      ...formData,
      event_date_claimed: format(formData.event_date_claimed, 'yyyy-MM-dd'),
      position_claimed: parseInt(formData.position_claimed),
      laps_completed_claimed: formData.laps_completed_claimed ? parseInt(formData.laps_completed_claimed) : undefined,
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">Submit Past Race Result</h3>
          {programContext && (
            <p className="text-sm text-gray-600 mt-1">
              For: {programContext.series_name} - {programContext.season}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Event Name *</Label>
            <Input
              value={formData.event_name_claimed}
              onChange={(e) => setFormData({ ...formData, event_name_claimed: e.target.value })}
              placeholder="e.g., Spring Championship Round 5"
              required
            />
          </div>

          <div>
            <Label>Event Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.event_date_claimed ? format(formData.event_date_claimed, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.event_date_claimed}
                  onSelect={(date) => setFormData({ ...formData, event_date_claimed: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Track Name</Label>
            <Input
              value={formData.track_name_claimed}
              onChange={(e) => setFormData({ ...formData, track_name_claimed: e.target.value })}
              placeholder="e.g., Thunder Valley Raceway"
            />
          </div>

          <div>
            <Label>Series Name</Label>
            <Input
              value={formData.series_name_claimed}
              onChange={(e) => setFormData({ ...formData, series_name_claimed: e.target.value })}
              placeholder="e.g., National Off-Road Series"
            />
          </div>

          <div>
            <Label>Class</Label>
            <Input
              value={formData.class_name_claimed}
              onChange={(e) => setFormData({ ...formData, class_name_claimed: e.target.value })}
              placeholder="e.g., Pro 4"
            />
          </div>

          <div>
            <Label>Finishing Position *</Label>
            <Input
              type="number"
              min="1"
              value={formData.position_claimed}
              onChange={(e) => setFormData({ ...formData, position_claimed: e.target.value })}
              placeholder="e.g., 1"
              required
            />
          </div>

          <div>
            <Label>Laps Completed</Label>
            <Input
              type="number"
              min="0"
              value={formData.laps_completed_claimed}
              onChange={(e) => setFormData({ ...formData, laps_completed_claimed: e.target.value })}
              placeholder="e.g., 25"
            />
          </div>

          <div>
            <Label>Best Lap Time</Label>
            <Input
              value={formData.best_lap_time_claimed}
              onChange={(e) => setFormData({ ...formData, best_lap_time_claimed: e.target.value })}
              placeholder="e.g., 1:23.456"
            />
          </div>
        </div>

        <div>
          <Label>Evidence URL (optional)</Label>
          <Input
            type="url"
            value={formData.evidence_url}
            onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
            placeholder="Link to results page, photo, or video"
          />
          <p className="text-xs text-gray-500 mt-1">
            Provide a link to official results, photos, or other supporting documentation
          </p>
        </div>

        <div>
          <Label>Additional Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional context or information..."
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={submitClaimMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            {submitClaimMutation.isPending ? 'Submitting...' : 'Submit for Review'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}