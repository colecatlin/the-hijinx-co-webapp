import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function TeamProgramsSection({ teamId }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    series_id: '',
    entry_year: new Date().getFullYear(),
    exit_year: '',
    status: 'Active',
  });
  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['teamPrograms', teamId],
    queryFn: () => base44.entities.TeamProgram.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const createProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamProgram.create({
      ...data,
      team_id: teamId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamPrograms', teamId] });
      setFormData({
        series_id: '',
        entry_year: new Date().getFullYear(),
        exit_year: '',
        status: 'Active',
      });
      setShowAddForm(false);
      toast.success('Program added');
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamProgram.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamPrograms', teamId] });
      toast.success('Program deleted');
    },
  });

  const handleAddProgram = () => {
    if (!formData.series_id) {
      toast.error('Series is required');
      return;
    }
    createProgramMutation.mutate({
      series_id: formData.series_id,
      entry_year: formData.entry_year,
      exit_year: formData.exit_year ? parseInt(formData.exit_year) : null,
      status: formData.status,
    });
  };

  const getSeriesName = (seriesId) => {
    const s = series.find(s => s.id === seriesId);
    return s ? s.name : 'Unknown Series';
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Racing Programs</CardTitle>
            <CardDescription>Manage team's participation in racing series</CardDescription>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-semibold text-sm">New Program</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="series_id">Series *</Label>
                <Select value={formData.series_id} onValueChange={(value) => setFormData({ ...formData, series_id: value })}>
                  <SelectTrigger id="series_id" className="mt-2">
                    <SelectValue placeholder="Select series" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entry_year">Entry Year *</Label>
                <Input
                  id="entry_year"
                  type="number"
                  min="1950"
                  max="2099"
                  value={formData.entry_year}
                  onChange={(e) => setFormData({ ...formData, entry_year: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="exit_year">Exit Year</Label>
                <Input
                  id="exit_year"
                  type="number"
                  min="1950"
                  max="2099"
                  value={formData.exit_year}
                  onChange={(e) => setFormData({ ...formData, exit_year: e.target.value })}
                  placeholder="blank = ongoing"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddProgram}
                disabled={createProgramMutation.isPending}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {createProgramMutation.isPending ? 'Adding...' : 'Add Program'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    series_id: '',
                    entry_year: new Date().getFullYear(),
                    exit_year: '',
                    status: 'Active',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {programs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No programs added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <div key={program.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{getSeriesName(program.series_id)}</h4>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div><span className="font-medium">Entry:</span> {program.entry_year}</div>
                      <div><span className="font-medium">Exit:</span> {program.exit_year || 'Ongoing'}</div>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          program.status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {program.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProgramMutation.mutate(program.id)}
                    disabled={deleteProgramMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}