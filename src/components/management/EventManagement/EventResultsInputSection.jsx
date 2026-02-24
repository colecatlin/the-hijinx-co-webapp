import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EventResultsInputSection({ eventId }) {
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState({
    driver_id: '',
    position: '',
    status_text: 'Running',
    session_type: 'Final',
    team_name: '',
    laps_completed: '',
  });
  const [uploadError, setUploadError] = useState('');
  const queryClient = useQueryClient();

  const { data: results = [] } = useQuery({
    queryKey: ['eventResults', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const createResultMutation = useMutation({
    mutationFn: (data) => base44.entities.Results.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] });
      setFormData({ driver_id: '', position: '', status_text: 'Running', session_type: 'Final', team_name: '', laps_completed: '' });
    },
  });

  const deleteResultMutation = useMutation({
    mutationFn: (id) => base44.entities.Results.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] }),
  });

  const handleAddResult = async (e) => {
    e.preventDefault();
    if (!formData.driver_id || !formData.position) {
      alert('Driver and position are required');
      return;
    }
    
    const { data: programs } = await base44.asServiceRole.entities.DriverProgram.filter({ driver_id: formData.driver_id });
    const program_id = programs?.[0]?.id || '';

    createResultMutation.mutate({
      ...formData,
      event_id: eventId,
      program_id,
      position: parseInt(formData.position),
      laps_completed: formData.laps_completed ? parseInt(formData.laps_completed) : undefined,
    });
  };

  const handleBulkUpload = async (file) => {
    setUploadError('');
    try {
      const { output } = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: (await base44.integrations.Core.UploadFile({ file })).file_url,
        json_schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              driver_id: { type: 'string' },
              position: { type: 'number' },
              status_text: { type: 'string' },
              session_type: { type: 'string' },
              team_name: { type: 'string' },
              laps_completed: { type: 'number' },
            },
            required: ['driver_id', 'position'],
          },
        },
      });

      const resultsToCreate = output.map(async (item) => {
        const { data: programs } = await base44.asServiceRole.entities.DriverProgram.filter({ driver_id: item.driver_id });
        return {
          ...item,
          event_id: eventId,
          program_id: programs?.[0]?.id || '',
        };
      });

      await Promise.all(resultsToCreate);
      queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] });
    } catch (error) {
      setUploadError(error.message || 'Failed to upload results');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="single">Add Single Result</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <form onSubmit={handleAddResult} className="bg-gray-50 p-6 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Driver</label>
                <Select value={formData.driver_id} onValueChange={(val) => setFormData({ ...formData, driver_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Position</label>
                <Input type="number" min="1" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="Finishing position" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Session Type</label>
                <Select value={formData.session_type} onValueChange={(val) => setFormData({ ...formData, session_type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Practice', 'Qualifying', 'Heat 1', 'Heat 2', 'Heat 3', 'Heat 4', 'LCQ', 'Final'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Status</label>
                <Select value={formData.status_text} onValueChange={(val) => setFormData({ ...formData, status_text: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Running', 'DNF', 'DNS', 'DSQ'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Team Name</label>
                <Input value={formData.team_name} onChange={(e) => setFormData({ ...formData, team_name: e.target.value })} placeholder="Team name" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Laps Completed</label>
                <Input type="number" value={formData.laps_completed} onChange={(e) => setFormData({ ...formData, laps_completed: e.target.value })} placeholder="Laps" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createResultMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Add Result
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-gray-600">Upload CSV or XLSX with columns: driver_id, position, status_text, session_type, team_name, laps_completed</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => e.target.files?.[0] && handleBulkUpload(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#232323] file:text-white hover:file:bg-gray-800"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Event Results ({results.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map(result => (
            <div key={result.id} className="flex items-center justify-between bg-white border border-gray-200 p-4 rounded">
              <div className="text-sm">
                <p className="font-medium">Position {result.position} - {result.team_name}</p>
                <p className="text-gray-600">{result.session_type} • {result.status_text}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteResultMutation.mutate(result.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}