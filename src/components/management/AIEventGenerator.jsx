import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, MapPin, Calendar, Trophy, ArrowRight, RotateCcw } from 'lucide-react';

const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
};

export default function AIEventGenerator({ tracks = [], onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [generated, setGenerated] = useState(null);
  const [edited, setEdited] = useState(null);
  const [step, setStep] = useState('input'); // 'input' | 'review' | 'saving'

  const generateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('generateEventDetails', { description }),
    onSuccess: (res) => {
      const event = res.data?.event;
      if (event) {
        setGenerated(event);
        setEdited({ ...event });
        setStep('review');
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Event.create({
      name: edited.event_name,
      event_date: edited.event_date,
      end_date: edited.end_date || null,
      series: edited.series,
      season: edited.season,
      round_number: edited.round_number || null,
      track_id: edited.track_id || null,
      status: 'upcoming',
    }),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onSuccess(newEvent);
    },
  });

  const handleReset = () => {
    setGenerated(null);
    setEdited(null);
    setStep('input');
  };

  if (step === 'input') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#232323]">AI Event Generator</h3>
            <p className="text-xs text-gray-500">Describe an event and AI will fill in the details</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Describe the event</Label>
          <Textarea
            rows={4}
            placeholder="e.g. 'NASCAR Cup race at Daytona in February 2026' or 'Round 3 of IndyCar at Long Beach' or just 'Brickyard 400'"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="resize-none"
          />
          <p className="text-xs text-gray-400">Be as specific or vague as you like — AI will look it up and fill in the gaps.</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!description.trim() || generateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Details</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'review' && edited) {
    const matchedTrack = tracks.find(t => t.id === edited.track_id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#232323]">Review Generated Event</h3>
              <p className="text-xs text-gray-500">Edit any details before saving</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={CONFIDENCE_STYLES[generated?.confidence] || 'bg-gray-100 text-gray-700'}>
              {generated?.confidence} confidence
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Start over
            </Button>
          </div>
        </div>

        {generated?.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">{generated.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1">
            <Label>Event Name</Label>
            <Input value={edited.event_name || ''} onChange={e => setEdited(p => ({ ...p, event_name: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>Start Date</Label>
            <Input type="date" value={edited.event_date || ''} onChange={e => setEdited(p => ({ ...p, event_date: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>End Date <span className="text-gray-400 text-xs">(optional)</span></Label>
            <Input type="date" value={edited.end_date || ''} onChange={e => setEdited(p => ({ ...p, end_date: e.target.value || null }))} />
          </div>

          <div className="space-y-1">
            <Label>Series</Label>
            <Input value={edited.series || ''} onChange={e => setEdited(p => ({ ...p, series: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>Season</Label>
            <Input value={edited.season || ''} onChange={e => setEdited(p => ({ ...p, season: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>Round #</Label>
            <Input type="number" value={edited.round_number || ''} onChange={e => setEdited(p => ({ ...p, round_number: e.target.value ? Number(e.target.value) : null }))} />
          </div>

          <div className="space-y-1">
            <Label>Track</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={edited.track_id || ''}
              onChange={e => setEdited(p => ({ ...p, track_id: e.target.value || null }))}
            >
              <option value="">— No track assigned —</option>
              {tracks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.location_city ? `(${t.location_city}${t.location_state ? ', ' + t.location_state : ''})` : ''}
                </option>
              ))}
            </select>
            {!edited.track_id && generated?.track_name && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                AI suggested: <strong>{generated.track_name}</strong> — not in system yet
              </p>
            )}
            {matchedTrack && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Matched: {matchedTrack.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!edited.event_name || !edited.event_date || saveMutation.isPending}
            className="bg-[#232323] text-white"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><ArrowRight className="w-4 h-4 mr-2" /> Save Event</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}