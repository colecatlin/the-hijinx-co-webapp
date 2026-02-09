import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

export default function SeriesFormatSection({ seriesId }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    race_weekend_format: '',
    points_system_summary: '',
    playoff_format: '',
    vehicle_rules_summary: ''
  });

  const { data: format } = useQuery({
    queryKey: ['seriesFormat', seriesId],
    queryFn: () => base44.entities.SeriesFormat.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const formatItem = format?.[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesFormat.create({ series_id: seriesId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesFormat', seriesId] });
      setEditing(false);
      setFormData({ race_weekend_format: '', points_system_summary: '', playoff_format: '', vehicle_rules_summary: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesFormat.update(formatItem.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesFormat', seriesId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.SeriesFormat.delete(formatItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesFormat', seriesId] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formatItem) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Race Format Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Race Weekend Format</label>
              <Textarea value={formData.race_weekend_format} onChange={(e) => setFormData({...formData, race_weekend_format: e.target.value})} placeholder="Describe the race weekend format..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Points System</label>
              <Textarea value={formData.points_system_summary} onChange={(e) => setFormData({...formData, points_system_summary: e.target.value})} placeholder="Explain the points system..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Playoff Format</label>
              <Textarea value={formData.playoff_format} onChange={(e) => setFormData({...formData, playoff_format: e.target.value})} placeholder="Describe the playoff format if applicable..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vehicle Rules</label>
              <Textarea value={formData.vehicle_rules_summary} onChange={(e) => setFormData({...formData, vehicle_rules_summary: e.target.value})} placeholder="Summarize vehicle rules..." />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-[#232323]">Save Format</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Race Format</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => {
            setFormData(formatItem || { race_weekend_format: '', points_system_summary: '', playoff_format: '', vehicle_rules_summary: '' });
            setEditing(true);
          }}>
            {formatItem ? 'Edit' : 'Add Format'}
          </Button>
          {formatItem && (
            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {formatItem ? (
          <div className="space-y-4">
            {formatItem.race_weekend_format && <div><p className="font-semibold mb-1">Race Weekend Format</p><p className="text-gray-600">{formatItem.race_weekend_format}</p></div>}
            {formatItem.points_system_summary && <div><p className="font-semibold mb-1">Points System</p><p className="text-gray-600">{formatItem.points_system_summary}</p></div>}
            {formatItem.playoff_format && <div><p className="font-semibold mb-1">Playoff Format</p><p className="text-gray-600">{formatItem.playoff_format}</p></div>}
            {formatItem.vehicle_rules_summary && <div><p className="font-semibold mb-1">Vehicle Rules</p><p className="text-gray-600">{formatItem.vehicle_rules_summary}</p></div>}
          </div>
        ) : (
          <p className="text-gray-500">No format details added yet</p>
        )}
      </CardContent>
    </Card>
  );
}