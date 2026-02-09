import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

export default function SeriesGovernanceSection({ seriesId }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    sanctioning_body: '',
    ownership: '',
    leadership: '',
    rulebook_url: ''
  });

  const { data: governance } = useQuery({
    queryKey: ['seriesGovernance', seriesId],
    queryFn: () => base44.entities.SeriesGovernance.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const govItem = governance?.[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesGovernance.create({ series_id: seriesId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesGovernance', seriesId] });
      setEditing(false);
      setFormData({ sanctioning_body: '', ownership: '', leadership: '', rulebook_url: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesGovernance.update(govItem.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesGovernance', seriesId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.SeriesGovernance.delete(govItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesGovernance', seriesId] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (govItem) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Governance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Sanctioning Body" value={formData.sanctioning_body} onChange={(e) => setFormData({...formData, sanctioning_body: e.target.value})} />
            <Textarea placeholder="Ownership" value={formData.ownership} onChange={(e) => setFormData({...formData, ownership: e.target.value})} />
            <Textarea placeholder="Leadership" value={formData.leadership} onChange={(e) => setFormData({...formData, leadership: e.target.value})} />
            <Input placeholder="Rulebook URL" value={formData.rulebook_url} onChange={(e) => setFormData({...formData, rulebook_url: e.target.value})} />
            <div className="flex gap-2">
              <Button type="submit" className="bg-[#232323]">Save Governance</Button>
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
        <CardTitle>Governance</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => {
            setFormData(govItem || { sanctioning_body: '', ownership: '', leadership: '', rulebook_url: '' });
            setEditing(true);
          }}>
            {govItem ? 'Edit' : 'Add Governance'}
          </Button>
          {govItem && (
            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {govItem ? (
          <div className="space-y-4">
            {govItem.sanctioning_body && <div><p className="font-semibold mb-1">Sanctioning Body</p><p className="text-gray-600">{govItem.sanctioning_body}</p></div>}
            {govItem.ownership && <div><p className="font-semibold mb-1">Ownership</p><p className="text-gray-600">{govItem.ownership}</p></div>}
            {govItem.leadership && <div><p className="font-semibold mb-1">Leadership</p><p className="text-gray-600">{govItem.leadership}</p></div>}
            {govItem.rulebook_url && <div><p className="font-semibold mb-1">Rulebook</p><a href={govItem.rulebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{govItem.rulebook_url}</a></div>}
          </div>
        ) : (
          <p className="text-gray-500">No governance details added yet</p>
        )}
      </CardContent>
    </Card>
  );
}