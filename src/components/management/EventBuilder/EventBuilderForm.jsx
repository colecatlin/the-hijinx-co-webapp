import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Save,
  Archive,
  Copy,
  Calendar,
  MapPin,
  Hash,
  Link,
  FileEdit,
  Shield,
  Loader2,
  Send,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Draft', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'Published', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function EventBuilderForm({ selectedEventId, onEventCreated, isAdmin }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    track_id: '',
    series_id: '',
    season: new Date().getFullYear().toString(),
    name: '',
    slug: '',
    event_date: '',
    end_date: '',
    timezone: 'America/Denver',
    status: 'upcoming',
    round_number: '',
    external_uid: '',
    location_note: '',
  });
  const [errors, setErrors] = useState({});
  const [slugEditedByUser, setSlugEditedByUser] = useState(false);

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks-active'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series-active'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', selectedEventId],
    queryFn: () => base44.entities.Event.get(selectedEventId),
    enabled: !!selectedEventId,
  });

  const activeTracks = useMemo(
    () => tracks.filter(t => t.status !== 'Inactive' || !t.status),
    [tracks]
  );

  const activeSeries = useMemo(
    () => seriesList.filter(s => s.status !== 'Inactive' || !s.status),
    [seriesList]
  );

  useEffect(() => {
    if (event && selectedEventId) {
      const tzMatch = event.location_note?.match(/^TZ:([^|]+)/);
      setFormData({
        track_id: event.track_id || '',
        series_id: event.series_id || '',
        season: event.season || new Date().getFullYear().toString(),
        name: event.name || '',
        slug: event.slug || '',
        event_date: event.event_date || '',
        end_date: event.end_date || '',
        timezone: tzMatch ? tzMatch[1] : 'America/Denver',
        status: event.status || 'upcoming',
        round_number: event.round_number?.toString() || '',
        external_uid: event.external_uid || '',
        location_note: event.location_note
          ?.replace(/^TZ:[^|]+/, '')
          .replace(/^\|/, '')
          .trim() || '',
      });
    } else if (!selectedEventId) {
      setFormData({
        track_id: '',
        series_id: '',
        season: new Date().getFullYear().toString(),
        name: '',
        slug: '',
        event_date: '',
        end_date: '',
        timezone: 'America/Denver',
        status: 'upcoming',
        round_number: '',
        external_uid: '',
        location_note: '',
      });
      setSlugEditedByUser(false);
    }
  }, [event, selectedEventId]);

  useEffect(() => {
    if (!slugEditedByUser && formData.name) {
      setFormData(prev => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, slugEditedByUser]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (field === 'slug') {
      setSlugEditedByUser(true);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.track_id) newErrors.track_id = 'Track is required';
    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.event_date) newErrors.event_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (
      formData.end_date &&
      formData.event_date &&
      formData.end_date < formData.event_date
    ) {
      newErrors.end_date = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Event.create(data),
    onSuccess: newEvent => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
      if (onEventCreated) {
        onEventCreated(newEvent.id);
      }
    },
    onError: error => {
      toast.error('Failed to create event: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', selectedEventId] });
      toast.success('Event updated successfully');
    },
    onError: error => {
      toast.error('Failed to update event: ' + error.message);
    },
  });

  const handleSave = (publish = false) => {
    if (!validate()) return;

    const selectedSeries = activeSeries.find(s => s.id === formData.series_id);

    const locationNoteWithTz = formData.location_note
      ? `TZ:${formData.timezone}|${formData.location_note}`
      : `TZ:${formData.timezone}`;

    const eventData = {
      track_id: formData.track_id,
      series_id: formData.series_id || null,
      series_name: selectedSeries?.name || null,
      season: formData.season,
      name: formData.name.trim(),
      slug: formData.slug || generateSlug(formData.name),
      event_date: formData.event_date,
      end_date: formData.end_date,
      status: publish ? 'in_progress' : formData.status,
      round_number: formData.round_number ? parseInt(formData.round_number) : null,
      external_uid: formData.external_uid || null,
      location_note: locationNoteWithTz,
    };

    if (selectedEventId) {
      updateMutation.mutate({ id: selectedEventId, data: eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  const handleArchive = () => {
    if (!selectedEventId) return;

    const archivedNote = `ARCHIVED|${formData.location_note || ''}`;
    updateMutation.mutate({
      id: selectedEventId,
      data: { status: 'completed', location_note: archivedNote },
    });
  };

  const handleDuplicate = () => {
    const duplicatedData = {
      track_id: formData.track_id,
      series_id: formData.series_id || null,
      series_name:
        activeSeries.find(s => s.id === formData.series_id)?.name || null,
      season: formData.season,
      name: `${formData.name} Copy`,
      slug: `${formData.slug}-copy`,
      event_date: null,
      end_date: null,
      status: 'upcoming',
      round_number: formData.round_number ? parseInt(formData.round_number) + 1 : null,
      external_uid: null,
      location_note: formData.location_note,
    };
    createMutation.mutate(duplicatedData);
  };

  const isEditing = !!selectedEventId;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const selectedTrack = activeTracks.find(t => t.id === formData.track_id);
  const selectedSeries = activeSeries.find(s => s.id === formData.series_id);
  const currentStatus = STATUS_OPTIONS.find(s => s.value === formData.status);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              {isEditing ? 'Edit Event' : 'Create New Event'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Track & Series */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Track <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.track_id}
                  onValueChange={v => handleChange('track_id', v)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger
                    className={`bg-[#262626] border-gray-700 text-white ${
                      errors.track_id ? 'border-red-500' : ''
                    }`}
                  >
                    <SelectValue placeholder="Select track..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {activeTracks.map(track => (
                      <SelectItem key={track.id} value={track.id} className="text-white">
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.track_id && (
                  <p className="text-red-400 text-xs">{errors.track_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Series</Label>
                <Select
                  value={formData.series_id}
                  onValueChange={v => handleChange('series_id', v)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder="Select series..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value={null} className="text-gray-400">
                      None
                    </SelectItem>
                    {activeSeries.map(series => (
                      <SelectItem key={series.id} value={series.id} className="text-white">
                        {series.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Season */}
            <div className="space-y-2">
              <Label className="text-gray-300">Season</Label>
              <Input
                value={formData.season}
                onChange={e => handleChange('season', e.target.value)}
                placeholder="e.g., 2024"
                disabled={!isAdmin}
                className="bg-[#262626] border-gray-700 text-white"
              />
            </div>

            {/* Name & Slug */}
            <div className="space-y-2">
              <Label className="text-gray-300">
                Event Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Enter event name"
                disabled={!isAdmin}
                className={`bg-[#262626] border-gray-700 text-white ${
                  errors.name ? 'border-red-500' : ''
                }`}
              />
              {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Slug</Label>
              <Input
                value={formData.slug}
                onChange={e => handleChange('slug', e.target.value)}
                placeholder="event-slug"
                disabled={!isAdmin}
                className="bg-[#262626] border-gray-700 text-white font-mono text-sm"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Start Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={e => handleChange('event_date', e.target.value)}
                  disabled={!isAdmin}
                  className={`bg-[#262626] border-gray-700 text-white ${
                    errors.event_date ? 'border-red-500' : ''
                  }`}
                />
                {errors.event_date && (
                  <p className="text-red-400 text-xs">{errors.event_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">
                  End Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={e => handleChange('end_date', e.target.value)}
                  disabled={!isAdmin}
                  className={`bg-[#262626] border-gray-700 text-white ${
                    errors.end_date ? 'border-red-500' : ''
                  }`}
                />
                {errors.end_date && (
                  <p className="text-red-400 text-xs">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-gray-300">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={v => handleChange('timezone', v)}
                disabled={!isAdmin}
              >
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz} className="text-white">
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status & Round */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={v => handleChange('status', v)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value} className="text-white">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Round Number</Label>
                <Input
                  type="number"
                  value={formData.round_number}
                  onChange={e => handleChange('round_number', e.target.value)}
                  placeholder="e.g., 1"
                  disabled={!isAdmin}
                  className="bg-[#262626] border-gray-700 text-white"
                />
              </div>
            </div>

            {/* External UID */}
            <div className="space-y-2">
              <Label className="text-gray-300">External UID</Label>
              <Input
                value={formData.external_uid}
                onChange={e => handleChange('external_uid', e.target.value)}
                placeholder="UID from external calendar"
                disabled={!isAdmin}
                className="bg-[#262626] border-gray-700 text-white font-mono text-sm"
              />
            </div>

            {/* Location Note */}
            <div className="space-y-2">
              <Label className="text-gray-300">Location Note</Label>
              <Textarea
                value={formData.location_note}
                onChange={e => handleChange('location_note', e.target.value)}
                placeholder="Additional location details..."
                disabled={!isAdmin}
                className="bg-[#262626] border-gray-700 text-white min-h-[80px]"
              />
            </div>

            {/* Action Buttons */}
            {isAdmin && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-800">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isEditing ? 'Update Draft' : 'Save Draft'}
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="bg-green-700 hover:bg-green-600 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish Event
                </Button>
                {isEditing && (
                  <>
                    <Button
                      onClick={handleDuplicate}
                      disabled={isSaving}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button
                      onClick={handleArchive}
                      disabled={isSaving}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                  </>
                )}
              </div>
            )}

            {!isAdmin && (
              <div className="pt-4 border-t border-gray-800">
                <p className="text-amber-500 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin access required to make changes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Preview */}
      <div className="space-y-6">
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white text-sm">Event Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {formData.name || 'Untitled Event'}
              </h3>
              {currentStatus && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white mt-2 ${currentStatus.color}`}
                >
                  {currentStatus.label}
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {selectedTrack && (
                <div className="flex items-start gap-2 text-gray-400">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-white">{selectedTrack.name}</span>
                  {selectedTrack.location_city && (
                    <span>, {selectedTrack.location_city}</span>
                  )}
                </div>
              )}

              {selectedSeries && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Hash className="w-4 h-4" />
                  <span className="text-white">{selectedSeries.name}</span>
                </div>
              )}

              {formData.season && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-white">Season {formData.season}</span>
                </div>
              )}

              {formData.event_date && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-white">
                    {formData.event_date}
                    {formData.end_date && formData.end_date !== formData.event_date && (
                      <> - {formData.end_date}</>
                    )}
                  </span>
                </div>
              )}

              {formData.round_number && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Hash className="w-4 h-4" />
                  <span className="text-white">Round {formData.round_number}</span>
                </div>
              )}

              {formData.external_uid && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Link className="w-4 h-4" />
                  <span className="text-white font-mono text-xs">
                    {formData.external_uid}
                  </span>
                </div>
              )}
            </div>

            {formData.location_note && (
              <div className="pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500">Location Note</p>
                <p className="text-sm text-gray-300 mt-1">{formData.location_note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}