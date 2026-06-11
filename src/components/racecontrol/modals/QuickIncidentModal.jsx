/**
 * R9CQ — QuickIncidentModal
 * 2-field fast incident creation. Auto-attaches event + active session.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const INCIDENT_TYPES = [
  'On-Track Contact',
  'Mechanical Failure',
  'Safety Violation',
  'Conduct Violation',
  'Technical Infraction',
  'Medical',
  'Property Damage',
  'Environmental',
  'Other',
];

const SEVERITIES = ['Informational', 'Minor', 'Significant', 'Major', 'Serious'];

export default function QuickIncidentModal({ open, onClose, eventId, activeSessionId }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('On-Track Contact');
  const [severity, setSeverity] = useState('Minor');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createIncident', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', eventId] });
      toast.success('Incident logged');
      setDescription('');
      setType('On-Track Contact');
      onClose();
    },
    onError: () => toast.error('Failed to log incident'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    createMutation.mutate({
      event_id: eventId,
      session_id: activeSessionId || undefined,
      incident_type: type,
      description: description.trim(),
      severity,
      status: 'Open',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        style={{ background: '#141818', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-red-400" />
            Log Incident
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          {/* Type */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">
              Incident Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded text-[12px] text-gray-200 px-3 py-2 outline-none focus:border-teal-600/50"
            >
              {INCIDENT_TYPES.map(t => (
                <option key={t} value={t} className="bg-[#141818]">{t}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">
              Severity
            </label>
            <div className="flex gap-1 flex-wrap">
              {SEVERITIES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                    severity === s
                      ? s === 'Major' || s === 'Serious'
                        ? 'bg-red-800/60 border-red-600/50 text-red-100'
                        : 'bg-teal-800/50 border-teal-600/40 text-teal-200'
                      : 'bg-white/[0.03] border-white/[0.07] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe what happened…"
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded text-[12px] text-gray-200 placeholder-gray-600 px-3 py-2 outline-none focus:border-teal-600/50 resize-none"
              autoFocus
            />
          </div>

          {activeSessionId && (
            <p className="text-[10px] text-gray-600">
              Will be attached to the active session automatically.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded border border-white/[0.08] text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim() || createMutation.isPending}
              className="flex-1 px-3 py-2 rounded bg-red-700/70 hover:bg-red-600/80 border border-red-600/40 text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Logging…' : 'Log Incident'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}