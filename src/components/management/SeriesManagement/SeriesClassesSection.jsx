import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Pencil } from 'lucide-react';

export default function SeriesClassesSection({ seriesId }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    class_name: '',
    level: '',
    vehicle_type: '',
    notes: '',
    active: true
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesClass.create({ series_id: seriesId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] });
      setEditing(null);
      setFormData({ class_name: '', level: '', vehicle_type: '', notes: '', active: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesClass.update(editing, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] });
      setEditing(null);
      setFormData({ class_name: '', level: '', vehicle_type: '', notes: '', active: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SeriesClass.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesClasses', seriesId] });
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
          <CardTitle>{editing ? 'Edit Class' : 'Add Class'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Class Name" value={formData.class_name} onChange={(e) => setFormData({...formData, class_name: e.target.value})} required />
            <Input placeholder="Level" value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})} />
            <Input placeholder="Vehicle Type" value={formData.vehicle_type} onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})} />
            <Textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
            <div className="flex items-center gap-2">
              <Checkbox checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
              <label className="text-sm">Active</label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-[#232323]">Save Class</Button>
              <Button type="button" variant="outline" onClick={() => {
                setEditing(null);
                setFormData({ class_name: '', level: '', vehicle_type: '', notes: '', active: true });
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
        <CardTitle>Racing Classes</CardTitle>
        <Button size="sm" onClick={() => {
          setFormData({ class_name: '', level: '', vehicle_type: '', notes: '', active: true });
          setEditing('new');
        }}>
          <Plus className="w-4 h-4 mr-1" />
          Add Class
        </Button>
      </CardHeader>
      <CardContent>
        {classes.length > 0 ? (
          <div className="space-y-3">
            {classes.map(cls => (
              <div key={cls.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{cls.class_name}</p>
                  {cls.level && <p className="text-sm text-gray-600">Level: {cls.level}</p>}
                  {cls.vehicle_type && <p className="text-sm text-gray-600">Vehicle: {cls.vehicle_type}</p>}
                  {cls.notes && <p className="text-sm mt-2">{cls.notes}</p>}
                  <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded ${cls.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {cls.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setFormData(cls);
                    setEditing(cls.id);
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(cls.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No classes added yet</p>
        )}
      </CardContent>
    </Card>
  );
}