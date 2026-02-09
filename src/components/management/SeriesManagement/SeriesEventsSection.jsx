import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Pencil } from 'lucide-react';

export default function SeriesEventsSection({ seriesId }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    event_name: '',
    start_date: '',
    is_championship_decider: false
  });

  const { data: events = [] } = useQuery({
    queryKey: ['seriesEvents', seriesId],
    queryFn: () => base44.entities.SeriesEvent.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesEvent.create({ series_id: seriesId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesEvents', seriesId] });
      setEditing(null);
      setFormData({ event_name: '', start_date: '', is_championship_decider: false });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesEvent.update(editing, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesEvents', seriesId] });
      setEditing(null);
      setFormData({ event_name: '', start_date: '', is_championship_decider: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SeriesEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesEvents', seriesId] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Edit Event' : 'Add Event'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Event Name" value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} required />
            <Input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
            <div className="flex items-center gap-2">
              <Checkbox checked={formData.is_championship_decider} onCheckedChange={(checked) => setFormData({...formData, is_championship_decider: checked})} />
              <label className="text-sm">Championship Decider</label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-[#232323]">Save Event</Button>
              <Button type="button" variant="outline" onClick={() => {
                setEditing(null);
                setFormData({ event_name: '', start_date: '', is_championship_decider: false });
              }}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Calendar</CardTitle>
        <Button size="sm" onClick={() => {
          setFormData({ event_name: '', start_date: '', is_championship_decider: false });
          setEditing('new');
        }}>
          <Plus className="w-4 h-4 mr-1" />
          Add Event
        </Button>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{event.event_name}</p>
                  <p className="text-sm text-gray-600">{event.start_date}</p>
                  {event.is_championship_decider && <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">Championship Decider</span>}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setFormData(event);
                    setEditing(event.id);
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(event.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No events added yet</p>
        )}
      </CardContent>
    </Card>
  );
}