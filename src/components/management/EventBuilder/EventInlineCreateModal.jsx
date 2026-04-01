import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TRACK_TYPES = ['Oval', 'Road Course', 'Street Circuit', 'Short Track', 'Speedway', 'Off-Road', 'Dirt Track', 'Other'];

export default function EventInlineCreateModal({ type, open, onClose, onCreated }) {
  const queryClient = useQueryClient();

  const [trackData, setTrackData] = useState({ name: '', location_city: '', location_state: '', track_type: '' });
  const [seriesData, setSeriesData] = useState({ name: '', sanctioning_body: '' });

  const trackMutation = useMutation({
    mutationFn: (data) => base44.entities.Track.create({
      ...data,
      operational_status: 'Active',
      visibility_status: 'live',
    }),
    onSuccess: (newTrack) => {
      queryClient.invalidateQueries({ queryKey: ['tracks-active'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success(`Track "${newTrack.name}" created`);
      setTrackData({ name: '', location_city: '', location_state: '', track_type: '' });
      onCreated(newTrack);
      onClose();
    },
    onError: (err) => toast.error('Failed to create track: ' + err.message),
  });

  const seriesMutation = useMutation({
    mutationFn: (data) => base44.entities.Series.create({
      ...data,
      discipline: 'Stock Car',
      operational_status: 'Active',
      visibility_status: 'live',
    }),
    onSuccess: (newSeries) => {
      queryClient.invalidateQueries({ queryKey: ['series-active'] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      toast.success(`Series "${newSeries.name}" created`);
      setSeriesData({ name: '', sanctioning_body: '' });
      onCreated(newSeries);
      onClose();
    },
    onError: (err) => toast.error('Failed to create series: ' + err.message),
  });

  const isPending = trackMutation.isPending || seriesMutation.isPending;

  const handleSubmit = () => {
    if (type === 'track') {
      if (!trackData.name.trim() || !trackData.location_city.trim()) {
        toast.error('Name and city are required');
        return;
      }
      trackMutation.mutate(trackData);
    } else {
      if (!seriesData.name.trim()) {
        toast.error('Series name is required');
        return;
      }
      seriesMutation.mutate(seriesData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#1e1e1e] border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {type === 'track' ? '+ Add New Track' : '+ Add New Series'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {type === 'track' ? (
            <>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Track Name <span className="text-red-400">*</span></Label>
                <Input
                  value={trackData.name}
                  onChange={e => setTrackData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Lucas Oil Speedway"
                  className="bg-[#262626] border-gray-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">City <span className="text-red-400">*</span></Label>
                  <Input
                    value={trackData.location_city}
                    onChange={e => setTrackData(p => ({ ...p, location_city: e.target.value }))}
                    placeholder="City"
                    className="bg-[#262626] border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">State</Label>
                  <Input
                    value={trackData.location_state}
                    onChange={e => setTrackData(p => ({ ...p, location_state: e.target.value }))}
                    placeholder="State / Region"
                    className="bg-[#262626] border-gray-700 text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Track Type</Label>
                <Select value={trackData.track_type} onValueChange={v => setTrackData(p => ({ ...p, track_type: v }))}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder="Select type (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {TRACK_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Series Name <span className="text-red-400">*</span></Label>
                <Input
                  value={seriesData.name}
                  onChange={e => setSeriesData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., AMSOIL Championship Off Road"
                  className="bg-[#262626] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Sanctioning Body</Label>
                <Input
                  value={seriesData.sanctioning_body}
                  onChange={e => setSeriesData(p => ({ ...p, sanctioning_body: e.target.value }))}
                  placeholder="e.g., SCORE International"
                  className="bg-[#262626] border-gray-700 text-white"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
            <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-700 hover:bg-blue-600 text-white">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create {type === 'track' ? 'Track' : 'Series'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}