import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Loader2, Flag, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
}));

const defaultSeriesForm = { name: '', discipline: '', website_url: '' };
const defaultEventForm = { name: '', event_date: '', track_name: '', location_city: '', location_state: '' };

const emptyForm = () => ({
  program_type: 'series',
  series_id: '',
  series_name: '',
  event_id: '',
  event_name: '',
  event_date: '',
  track_name: '',
  team_id: '',
  class_name: '',
  car_number: '',
  start_month: new Date().getMonth() + 1,
  start_year: new Date().getFullYear(),
  end_month: null,
  end_year: null,
  status: 'active',
  is_rookie: false,
  notes: '',
});

export default function DriverProgramsSection({ driverId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  // Inline create states
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesForm, setNewSeriesForm] = useState(defaultSeriesForm);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventForm, setNewEventForm] = useState(defaultEventForm);
  const [creatingInline, setCreatingInline] = useState(false);

  const queryClient = useQueryClient();

  const { data: programs = [] } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }, '-updated_date', 100),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('-name', 200),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('-name', 200),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', formData.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: formData.series_id }),
    enabled: !!formData.series_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.create({ ...data, driver_id: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverProgram.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm());
    setShowNewSeries(false);
    setShowNewEvent(false);
    setNewSeriesForm(defaultSeriesForm);
    setNewEventForm(defaultEventForm);
  };

  const handleEdit = (program) => {
    setFormData({
      program_type: program.program_type || 'series',
      series_id: program.series_id || '',
      series_name: program.series_name || '',
      event_id: program.event_id || '',
      event_name: program.event_name || '',
      event_date: program.event_date || '',
      track_name: program.track_name || '',
      team_id: program.team_id || '',
      class_name: program.class_name || '',
      car_number: program.car_number || '',
      start_month: program.start_month || new Date().getMonth() + 1,
      start_year: program.start_year || new Date().getFullYear(),
      end_month: program.end_month || null,
      end_year: program.end_year || null,
      status: program.status || 'active',
      is_rookie: program.is_rookie || false,
      notes: program.notes || '',
    });
    setEditingId(program.id);
    setShowForm(true);
  };

  const handleSeriesChange = (seriesId) => {
    const s = series.find((x) => x.id === seriesId);
    setFormData({ ...formData, series_id: seriesId, series_name: s?.name || '', class_name: '' });
  };

  const handleEventChange = (eventId) => {
    const e = events.find((x) => x.id === eventId);
    setFormData({
      ...formData,
      event_id: eventId,
      event_name: e?.name || '',
      event_date: e?.event_date || '',
      track_name: e?.location_note || '',
    });
  };

  const handleCreateNewSeries = async () => {
    if (!newSeriesForm.name.trim()) return;
    setCreatingInline(true);
    const created = await base44.entities.Series.create(newSeriesForm);
    queryClient.invalidateQueries({ queryKey: ['series'] });
    setFormData({ ...formData, series_id: created.id, series_name: created.name });
    setShowNewSeries(false);
    setNewSeriesForm(defaultSeriesForm);
    setCreatingInline(false);
  };

  const handleCreateNewEvent = async () => {
    if (!newEventForm.name.trim()) return;
    setCreatingInline(true);
    const created = await base44.entities.Event.create({
      ...newEventForm,
      status: 'upcoming',
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setFormData({
      ...formData,
      event_id: created.id,
      event_name: created.name,
      event_date: created.event_date || '',
      track_name: newEventForm.track_name,
    });
    setShowNewEvent(false);
    setNewEventForm(defaultEventForm);
    setCreatingInline(false);
  };

  const handleSubmit = () => {
    const data = { ...formData };
    if (data.program_type === 'series' && !data.series_name && !data.series_id) {
      alert('Please select or create a series.');
      return;
    }
    if (data.program_type === 'single_event' && !data.event_name && !data.event_id) {
      alert('Please select or create an event.');
      return;
    }
    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const getTeamName = (teamId) => teams.find((t) => t.id === teamId)?.name || '';

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Racing Programs</CardTitle>
        <CardDescription>Series participation or standalone event appearances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Programs list */}
        <div className="space-y-3">
          {programs.map((program) => (
            <div key={program.id} className="flex items-start justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {program.program_type === 'single_event' ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      <Calendar className="w-3 h-3" /> Single Event
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      <Flag className="w-3 h-3" /> Series
                    </span>
                  )}
                </div>
                <p className="font-medium mt-1">
                 {program.program_type === 'single_event' ? (program.event_name || 'Unnamed Event') : (series.find((s) => s.id === program.series_id)?.name || program.series_name || 'Unknown Series')}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 flex-wrap">
                  {program.class_name && (
                    <span className="flex items-center gap-1">
                      {program.class_name}
                      {program.is_rookie && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-yellow-400 text-black font-black text-xs leading-none">R</span>
                      )}
                       •{' '}
                    </span>
                  )}
                  {program.car_number && `#${program.car_number} • `}
                  {program.program_type === 'single_event'
                    ? program.event_date
                    : `${program.start_month}/${program.start_year}${program.status === 'inactive' && program.end_year ? ` – ${program.end_month}/${program.end_year}` : ' – Present'}`}
                  {program.track_name && ` • ${program.track_name}`}
                </p>
                {program.team_id && <p className="text-xs text-gray-400">Team: {getTeamName(program.team_id)}</p>}
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleEdit(program)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(program.id)} disabled={deleteMutation.isPending}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {programs.length === 0 && <p className="text-gray-500 text-sm">No programs added yet.</p>}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="border rounded-lg p-5 space-y-5 bg-gray-50">
            <h3 className="font-semibold text-sm">{editingId ? 'Edit Program' : 'Add Program'}</h3>

            {/* Program type toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...emptyForm(), program_type: 'series' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  formData.program_type === 'series'
                    ? 'bg-[#232323] text-white border-[#232323]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                <Flag className="w-4 h-4" /> Series Program
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...emptyForm(), program_type: 'single_event' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  formData.program_type === 'single_event'
                    ? 'bg-[#232323] text-white border-[#232323]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                <Calendar className="w-4 h-4" /> Single Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SERIES fields */}
              {formData.program_type === 'series' && (
                <div className="space-y-2 col-span-full">
                  <Label>Series</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={formData.series_id} onValueChange={handleSeriesChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select series" />
                        </SelectTrigger>
                        <SelectContent>
                          {series.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setShowNewSeries(!showNewSeries)}
                    >
                      {showNewSeries ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                      New Series
                    </Button>
                  </div>
                  {showNewSeries && (
                    <div className="mt-2 p-3 border rounded-lg bg-white space-y-3">
                      <p className="text-xs font-medium text-gray-600">Create New Series</p>
                      <Input
                        placeholder="Series name *"
                        value={newSeriesForm.name}
                        onChange={(e) => setNewSeriesForm({ ...newSeriesForm, name: e.target.value })}
                      />
                      <Input
                        placeholder="Website URL (optional)"
                        value={newSeriesForm.website_url}
                        onChange={(e) => setNewSeriesForm({ ...newSeriesForm, website_url: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateNewSeries} disabled={creatingInline || !newSeriesForm.name.trim()}>
                          {creatingInline ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Create & Select
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewSeries(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SINGLE EVENT fields */}
              {formData.program_type === 'single_event' && (
                <div className="space-y-2 col-span-full">
                  <Label>Event</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={formData.event_id} onValueChange={handleEventChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select existing event" />
                        </SelectTrigger>
                        <SelectContent>
                          {events.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}{e.event_date ? ` (${e.event_date})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setShowNewEvent(!showNewEvent)}
                    >
                      {showNewEvent ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                      New Event
                    </Button>
                  </div>
                  {showNewEvent && (
                    <div className="mt-2 p-3 border rounded-lg bg-white space-y-3">
                      <p className="text-xs font-medium text-gray-600">Create New Event</p>
                      <Input
                        placeholder="Event name *"
                        value={newEventForm.name}
                        onChange={(e) => setNewEventForm({ ...newEventForm, name: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Event Date</Label>
                          <Input
                            type="date"
                            value={newEventForm.event_date}
                            onChange={(e) => setNewEventForm({ ...newEventForm, event_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Track Name</Label>
                          <Input
                            placeholder="e.g., Crandon International"
                            value={newEventForm.track_name}
                            onChange={(e) => setNewEventForm({ ...newEventForm, track_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">City</Label>
                          <Input
                            placeholder="City"
                            value={newEventForm.location_city}
                            onChange={(e) => setNewEventForm({ ...newEventForm, location_city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">State</Label>
                          <Input
                            placeholder="State"
                            value={newEventForm.location_state}
                            onChange={(e) => setNewEventForm({ ...newEventForm, location_state: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateNewEvent} disabled={creatingInline || !newEventForm.name.trim()}>
                          {creatingInline ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Create & Select
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewEvent(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Show selected event summary */}
                  {formData.event_id && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formData.event_name}{formData.event_date ? ` • ${formData.event_date}` : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Shared fields */}
              <div className="space-y-2">
                <Label>Team (Optional)</Label>
                <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>— None —</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Car / Bib Number</Label>
                <Input
                  value={formData.car_number}
                  onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                  placeholder="e.g., 42"
                />
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                {formData.program_type === 'series' && seriesClasses.length > 0 ? (
                  <Select value={formData.class_name} onValueChange={(value) => setFormData({ ...formData, class_name: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.class_name}>{cls.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    placeholder="e.g., Pro 4, Super Stock"
                  />
                )}
              </div>

              {/* Series-only: date range */}
              {formData.program_type === 'series' && (
                <div className="col-span-full space-y-4">
                  {/* Start */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Month</Label>
                      <Select value={String(formData.start_month)} onValueChange={(v) => setFormData({ ...formData, start_month: parseInt(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Year</Label>
                      <Input
                        type="number"
                        value={formData.start_year}
                        onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Present checkbox */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="is_present"
                      checked={formData.status === 'active'}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        status: checked ? 'active' : 'inactive',
                        end_month: checked ? null : formData.end_month,
                        end_year: checked ? null : formData.end_year,
                      })}
                    />
                    <label htmlFor="is_present" className="text-sm font-medium cursor-pointer select-none">
                      Present — driver is currently active in this program
                    </label>
                  </div>

                  {/* End fields — shown only when not present */}
                  {formData.status === 'inactive' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>End Month</Label>
                        <Select value={String(formData.end_month || '')} onValueChange={(v) => setFormData({ ...formData, end_month: parseInt(v) })}>
                          <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>End Year</Label>
                        <Input
                          type="number"
                          value={formData.end_year || ''}
                          onChange={(e) => setFormData({ ...formData, end_year: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="e.g., 2024"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rookie checkbox */}
              <div className="flex items-center gap-3 col-span-full">
                <Checkbox
                  id="is_rookie"
                  checked={!!formData.is_rookie}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_rookie: !!checked })}
                />
                <label htmlFor="is_rookie" className="text-sm font-medium cursor-pointer select-none flex items-center gap-2">
                  Rookie Year — mark this as a rookie season for this class
                  {formData.is_rookie && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-yellow-400 text-black font-black text-xs">R</span>
                  )}
                </label>
              </div>

              <div className="space-y-2 col-span-full">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId ? 'Update' : 'Add'} Program
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
        )}
      </CardContent>
    </Card>
  );
}