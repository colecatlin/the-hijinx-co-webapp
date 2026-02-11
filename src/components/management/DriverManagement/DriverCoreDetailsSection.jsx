import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import MediaUploader from '@/components/shared/MediaUploader';
import ImageCropModal from '@/components/shared/ImageCropModal';

const DISCIPLINES = [
  'Open Wheel',
  'Stock Car',
  'Off Road',
  'Snowmobile',
  'Rallycross',
  'Other'
];

const COUNTRIES = [
  'USA',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Australia',
  'Brazil',
  'France',
  'Germany',
  'Italy',
  'Spain',
  'Japan',
  'China',
  'India',
  'Russia',
  'Sweden',
  'Norway',
  'Finland',
  'Netherlands',
  'Belgium',
  'Austria',
  'Switzerland',
  'Denmark',
  'Poland',
  'Argentina',
  'Chile',
  'New Zealand',
  'South Africa'
];

export default function DriverCoreDetailsSection({ driverId, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    contact_email: '',
    hometown_city: '',
    hometown_state: '',
    hometown_country: 'USA',
    location_city: '',
    location_state: '',
    location_country: '',
    primary_number: '',
    primary_discipline: '',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempHeadshotUrl, setTempHeadshotUrl] = useState(null);
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [programForm, setProgramForm] = useState({
    series_id: '',
    team_id: '',
    class_name: '',
    bib_number: '',
    season_start_year: new Date().getFullYear(),
    season_end_year: null,
    program_status: 'Active',
    is_primary: false,
  });
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => base44.entities.Driver.filter({ id: driverId }),
    enabled: driverId && driverId !== 'new',
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['driverPrograms', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }, '-updated_date', 100),
    enabled: driverId && driverId !== 'new',
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: mediaRecords = [] } = useQuery({
    queryKey: ['driverMedia', driverId],
    queryFn: () => base44.entities.DriverMedia.filter({ driver_id: driverId }),
    enabled: driverId && driverId !== 'new',
  });

  useEffect(() => {
    if (driverId === 'new') {
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        contact_email: '',
        represented_by: '',
        hometown_city: '',
        hometown_state: '',
        hometown_country: 'USA',
        location_city: '',
        location_state: '',
        location_country: '',
        primary_number: '',
        primary_discipline: '',
      });
      setHeadshotUrl('');
    } else if (driver && driver.length > 0) {
      const driverData = driver[0];
      if (driverData) {
        setFormData({
          first_name: driverData.first_name || '',
          last_name: driverData.last_name || '',
          date_of_birth: driverData.date_of_birth || '',
          contact_email: driverData.contact_email || '',
          represented_by: driverData.represented_by || '',
          hometown_city: driverData.hometown_city || '',
          hometown_state: driverData.hometown_state || '',
          hometown_country: driverData.hometown_country || 'USA',
          location_city: driverData.location_city || '',
          location_state: driverData.location_state || '',
          location_country: driverData.location_country || '',
          primary_number: driverData.primary_number || '',
          primary_discipline: driverData.primary_discipline || '',
        });
      }
    }
  }, [driver, driverId]);

  useEffect(() => {
    if (mediaRecords.length > 0) {
      setHeadshotUrl(mediaRecords[0].headshot_url || '');
    }
  }, [mediaRecords]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (driverId === 'new') {
        return base44.entities.Driver.create(data);
      }
      return base44.functions.invoke('updateEntitySafely', {
        entity_type: 'Driver',
        entity_id: driverId,
        data
      });
    },
    onSuccess: (data) => {
      const idToInvalidate = driverId === 'new' ? data.id : driverId;
      queryClient.invalidateQueries({ queryKey: ['driver', idToInvalidate] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast.success('Driver details saved');
      if (driverId === 'new' && onSaveSuccess) {
        onSaveSuccess(data.id);
      } else if (onSaveSuccess) {
        onSaveSuccess();
      }
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = () => {
    if (!formData.first_name || !formData.last_name) {
      toast.error('First and last name are required');
      return;
    }
    updateMutation.mutate(formData);
  };

  const createProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.create({ ...data, driver_id: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      resetProgramForm();
      toast.success('Program added');
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.update(editingProgramId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      resetProgramForm();
      toast.success('Program updated');
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverProgram.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPrograms', driverId] });
      toast.success('Program deleted');
    },
  });

  const createSeriesMutation = useMutation({
    mutationFn: (name) => base44.entities.Series.create({
      name,
      discipline: formData.primary_discipline || 'Other',
      competition_level: 'Regional',
      description_summary: 'New series',
      status: 'Active'
    }),
    onSuccess: (newSeries) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setProgramForm({ ...programForm, series_id: newSeries.id });
      setNewSeriesName('');
      setShowAddSeries(false);
      toast.success('Series created');
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (name) => base44.entities.Team.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description_summary: 'New team',
      primary_discipline: formData.primary_discipline || 'Other',
      team_level: 'Regional',
      status: 'Active'
    }),
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setProgramForm({ ...programForm, team_id: newTeam.id });
      setNewTeamName('');
      setShowAddTeam(false);
      toast.success('Team created');
    },
  });

  const resetProgramForm = () => {
    setShowProgramForm(false);
    setEditingProgramId(null);
    setProgramForm({
      series_id: '',
      team_id: '',
      class_name: '',
      bib_number: '',
      season_start_year: new Date().getFullYear(),
      season_end_year: null,
      program_status: 'Active',
      is_primary: false,
    });
  };

  const handleEditProgram = (program) => {
    setProgramForm({
      series_id: program.series_id,
      team_id: program.team_id || '',
      class_name: program.class_name,
      bib_number: program.bib_number,
      season_start_year: program.season_start_year,
      season_end_year: program.season_end_year,
      program_status: program.program_status,
      is_primary: program.is_primary,
    });
    setEditingProgramId(program.id);
    setShowProgramForm(true);
  };

  const handleSubmitProgram = () => {
    if (!programForm.series_id || !programForm.class_name || !programForm.bib_number) {
      toast.error('Series, class, and bib number are required');
      return;
    }
    if (editingProgramId) {
      updateProgramMutation.mutate(programForm);
    } else {
      createProgramMutation.mutate(programForm);
    }
  };

  const getSeriesName = (seriesId) => series.find((s) => s.id === seriesId)?.name || 'Unknown';
  const getTeamName = (teamId) => teams.find((t) => t.id === teamId)?.name || 'Unknown';

  const handleHeadshotUpload = (url) => {
    setTempHeadshotUrl(url);
    setCropModalOpen(true);
  };

  const handleCropSave = async (croppedUrl) => {
    setHeadshotUrl(croppedUrl);
    setTempHeadshotUrl(null);
    
    if (driverId !== 'new') {
      const mediaRecord = mediaRecords[0];
      if (mediaRecord) {
        await base44.entities.DriverMedia.update(mediaRecord.id, { headshot_url: croppedUrl });
      } else {
        await base44.entities.DriverMedia.create({ driver_id: driverId, headshot_url: croppedUrl });
      }
      queryClient.invalidateQueries({ queryKey: ['driverMedia', driverId] });
      toast.success('Headshot updated');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Details</CardTitle>
        <CardDescription>Edit basic driver information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="mb-6">
          <MediaUploader 
            label="Driver Photo" 
            value={headshotUrl} 
            onChange={handleHeadshotUpload} 
            accept="image/*"
          />
          {driverId === 'new' && (
            <p className="text-xs text-gray-500 mt-2">Save driver details first to upload photo</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="First name"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Last name"
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date_of_birth">Date of Birth (mm/dd/yyyy)</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Age</Label>
            <div className="mt-2 h-9 px-3 py-2 rounded-md border border-input bg-gray-50 flex items-center text-sm">
              {calculateAge(formData.date_of_birth) || '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              placeholder="Contact email address"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="represented_by">Represented By</Label>
            <Input
              id="represented_by"
              value={formData.represented_by}
              onChange={(e) => handleInputChange('represented_by', e.target.value)}
              placeholder="Agent, manager, or agency name"
              className="mt-2"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Hometown</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hometown_city">City</Label>
              <Input
                id="hometown_city"
                value={formData.hometown_city}
                onChange={(e) => handleInputChange('hometown_city', e.target.value)}
                placeholder="City"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="hometown_state">State/Region</Label>
              <Input
                id="hometown_state"
                value={formData.hometown_state}
                onChange={(e) => handleInputChange('hometown_state', e.target.value)}
                placeholder="State"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="hometown_country">Country</Label>
              <Select value={formData.hometown_country} onValueChange={(value) => handleInputChange('hometown_country', value)}>
                <SelectTrigger id="hometown_country" className="mt-2">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Location</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="location_city">City</Label>
              <Input
                id="location_city"
                value={formData.location_city}
                onChange={(e) => handleInputChange('location_city', e.target.value)}
                placeholder="City"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="location_state">State/Region</Label>
              <Input
                id="location_state"
                value={formData.location_state}
                onChange={(e) => handleInputChange('location_state', e.target.value)}
                placeholder="State"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="location_country">Country</Label>
              <Select value={formData.location_country} onValueChange={(value) => handleInputChange('location_country', value)}>
                <SelectTrigger id="location_country" className="mt-2">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary_number">Car/Bib Number</Label>
            <Input
              id="primary_number"
              value={formData.primary_number}
              onChange={(e) => handleInputChange('primary_number', e.target.value)}
              placeholder="Car/bib number"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="primary_discipline">Primary Discipline</Label>
            <Select value={formData.primary_discipline} onValueChange={(value) => handleInputChange('primary_discipline', value)}>
              <SelectTrigger id="primary_discipline" className="mt-2">
                <SelectValue placeholder="Select discipline" />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINES.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Racing Programs</h3>
            {driverId !== 'new' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProgramForm(!showProgramForm)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Program
              </Button>
            )}
          </div>

          {driverId === 'new' && (
            <p className="text-sm text-gray-500 mb-4">Save driver details first to add programs</p>
          )}

          {driverId !== 'new' && showProgramForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Series *</Label>
                  {showAddSeries ? (
                    <div className="flex gap-1">
                      <Input
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        placeholder="New series name"
                        className="h-9 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => createSeriesMutation.mutate(newSeriesName)}
                        disabled={!newSeriesName || createSeriesMutation.isPending}
                        className="h-9"
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowAddSeries(false);
                          setNewSeriesName('');
                        }}
                        className="h-9"
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Select value={programForm.series_id} onValueChange={(value) => setProgramForm({ ...programForm, series_id: value })}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select series" />
                        </SelectTrigger>
                        <SelectContent>
                          {series.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setShowAddSeries(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        + Add new series
                      </button>
                    </>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Team</Label>
                  {showAddTeam ? (
                    <div className="flex gap-1">
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="New team name"
                        className="h-9 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => createTeamMutation.mutate(newTeamName)}
                        disabled={!newTeamName || createTeamMutation.isPending}
                        className="h-9"
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowAddTeam(false);
                          setNewTeamName('');
                        }}
                        className="h-9"
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Select value={programForm.team_id} onValueChange={(value) => setProgramForm({ ...programForm, team_id: value })}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select team (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>None</SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setShowAddTeam(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        + Add new team
                      </button>
                    </>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Class *</Label>
                  <Input
                    value={programForm.class_name}
                    onChange={(e) => setProgramForm({ ...programForm, class_name: e.target.value })}
                    placeholder="e.g., Pro 4"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Number *</Label>
                  <Input
                    value={programForm.bib_number}
                    onChange={(e) => setProgramForm({ ...programForm, bib_number: e.target.value })}
                    placeholder="Car number"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Start Year</Label>
                  <Input
                    type="number"
                    value={programForm.season_start_year}
                    onChange={(e) => setProgramForm({ ...programForm, season_start_year: parseInt(e.target.value) })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Year</Label>
                  <Input
                    type="number"
                    value={programForm.season_end_year || ''}
                    onChange={(e) => setProgramForm({ ...programForm, season_end_year: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ongoing"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={programForm.program_status} onValueChange={(value) => setProgramForm({ ...programForm, program_status: value })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={programForm.is_primary}
                      onCheckedChange={(checked) => setProgramForm({ ...programForm, is_primary: checked })}
                    />
                    <span className="text-xs">Primary Program</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitProgram}
                  disabled={createProgramMutation.isPending || updateProgramMutation.isPending}
                >
                  {editingProgramId ? 'Update' : 'Add'} Program
                </Button>
                <Button size="sm" variant="outline" onClick={resetProgramForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {driverId !== 'new' && programs.length > 0 && (
            <div className="space-y-2">
              {programs.map((program) => (
                <div key={program.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{getSeriesName(program.series_id)}</span>
                      {program.is_primary && (
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {program.class_name} • #{program.bib_number} • {program.season_start_year}–{program.season_end_year || 'Present'}
                      {program.team_id && ` • ${getTeamName(program.team_id)}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditProgram(program)} className="h-8 px-2">
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this program?')) {
                          deleteProgramMutation.mutate(program.id);
                        }
                      }}
                      className="h-8 px-2"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {driverId !== 'new' && programs.length === 0 && !showProgramForm && (
            <p className="text-sm text-gray-500">No programs added yet</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-gray-900 hover:bg-gray-800"
          >
            {updateMutation.isPending ? 'Saving...' : isSaved ? '✓ Saved' : 'Save Changes'}
          </Button>
        </div>

        <ImageCropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setTempHeadshotUrl(null);
          }}
          imageUrl={tempHeadshotUrl}
          onSave={handleCropSave}
          aspectRatio={3/4}
        />
      </CardContent>
    </Card>
  );
}