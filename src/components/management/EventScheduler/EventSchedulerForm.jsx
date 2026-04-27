import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SESSION_TYPES = [
  'Practice', 'Qualifying', 'Heat', 'LCQ', 'Feature', 'Final', 'Time Attack', 'Other'
];

export default function EventSchedulerForm({ seriesId, onSuccess }) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      event_name: '',
      event_date: '',
      end_date: '',
      track_id: '',
      series_id: seriesId,
      sessions: [{ session_type: 'Practice', name: '', session_number: 1, scheduled_time: '', laps: '', duration_minutes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'sessions' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const eventName = watch('event_name');

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks-for-scheduler'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: series } = useQuery({
    queryKey: ['series-for-scheduler', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId,
  });

  const createEventMutation = useMutation({
    mutationFn: async (formData) => {
      const eventPayload = {
        name: formData.event_name,
        event_date: formData.event_date,
        end_date: formData.end_date || formData.event_date,
        track_id: formData.track_id,
        series_id: formData.series_id,
        status: 'Draft',
        public_status: 'draft',
      };

      const event = await base44.entities.Event.create(eventPayload);

      // Create sessions
      const sessionPromises = formData.sessions.map((session) =>
        base44.entities.Session.create({
          event_id: event.id,
          session_type: session.session_type,
          name: session.name,
          session_number: session.session_number ? parseInt(session.session_number) : undefined,
          scheduled_time: session.scheduled_time,
          laps: session.laps ? parseInt(session.laps) : undefined,
          duration_minutes: session.duration_minutes ? parseInt(session.duration_minutes) : undefined,
          status: 'Draft',
        })
      );

      await Promise.all(sessionPromises);
      return event;
    },
    onSuccess: (event) => {
      toast.success(`Event "${event.name}" created with ${fields.length} session(s)`);
      if (onSuccess) onSuccess(event);
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    createEventMutation.mutate(data);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_name">Event Name *</Label>
              <Input
                id="event_name"
                placeholder="e.g., Show Me Off Road ShootOut Round 1"
                {...register('event_name', { required: 'Event name is required' })}
              />
              {errors.event_name && <p className="text-xs text-red-600">{errors.event_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="track_id">Track *</Label>
              <select
                id="track_id"
                {...register('track_id', { required: 'Track is required' })}
                className="w-full border border-input rounded-md px-3 py-2"
              >
                <option value="">Select a track</option>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
              {errors.track_id && <p className="text-xs text-red-600">{errors.track_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Start Date *</Label>
              <Input
                id="event_date"
                type="date"
                {...register('event_date', { required: 'Start date is required' })}
              />
              {errors.event_date && <p className="text-xs text-red-600">{errors.event_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (optional)</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions/Rounds */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sessions & Rounds</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              append({
                session_type: 'Practice',
                name: '',
                session_number: fields.length + 1,
                scheduled_time: '',
                laps: '',
                duration_minutes: '',
              })
            }
            className="gap-2"
          >
            <Plus className="w-3 h-3" />
            Add Round
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Round {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`session_type_${index}`}>Session Type *</Label>
                  <select
                    id={`session_type_${index}`}
                    {...register(`sessions.${index}.session_type`, { required: true })}
                    className="w-full border border-input rounded-md px-3 py-2"
                  >
                    {SESSION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`name_${index}`}>Session Name *</Label>
                  <Input
                    id={`name_${index}`}
                    placeholder="e.g., Heat 1, Final"
                    {...register(`sessions.${index}.name`, { required: 'Session name required' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`scheduled_time_${index}`}>Scheduled Time</Label>
                  <Input
                    id={`scheduled_time_${index}`}
                    type="datetime-local"
                    {...register(`sessions.${index}.scheduled_time`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`session_number_${index}`}>Order</Label>
                  <Input
                    id={`session_number_${index}`}
                    type="number"
                    placeholder="1, 2, 3..."
                    {...register(`sessions.${index}.session_number`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`laps_${index}`}>Laps</Label>
                  <Input
                    id={`laps_${index}`}
                    type="number"
                    placeholder="e.g., 100"
                    {...register(`sessions.${index}.laps`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`duration_${index}`}>Duration (minutes)</Label>
                  <Input
                    id={`duration_${index}`}
                    type="number"
                    placeholder="e.g., 60"
                    {...register(`sessions.${index}.duration_minutes`)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Event with {fields.length} Round{fields.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </form>
  );
}