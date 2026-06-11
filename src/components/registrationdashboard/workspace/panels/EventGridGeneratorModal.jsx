/**
 * R9CZ-R1 — EventGridGeneratorModal
 * Exposes all backend-supported grid generation methods.
 * Methods: Manual, Random Draw, Qualifying Order, Inverted Qualifying, Advancement from Heat
 */
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GENERATION_METHODS = [
  { value: 'Manual',              label: 'Manual',               needsSource: false, description: 'Empty grid — fill positions manually' },
  { value: 'Random Draw',         label: 'Random Draw',          needsSource: false, description: 'Randomly shuffle all active entries' },
  { value: 'Qualifying Order',    label: 'Qualifying Order',     needsSource: true,  description: 'Fastest lap time from qualifying session' },
  { value: 'Inverted Qualifying', label: 'Inverted Qualifying',  needsSource: true,  description: 'Qualifying order with top-N inversion' },
  { value: 'Advancement from Heat', label: 'Heat Advancement',  needsSource: false, description: 'Aggregate heat finishes, deduplicate by driver' },
];

export default function EventGridGeneratorModal({ open, onClose, session, allSessions = [], onGenerate, isPending }) {
  const [method, setMethod] = useState('Manual');
  const [sourceSessionId, setSourceSessionId] = useState('');
  const [inversionCount, setInversionCount] = useState(0);

  const selectedMethod = GENERATION_METHODS.find(m => m.value === method);

  // Candidate source sessions: Qualifying or Practice sessions
  const sourceSessions = useMemo(() =>
    allSessions.filter(s => s.id !== session?.id && ['Qualifying', 'Practice', 'Heat'].includes(s.session_type)),
    [allSessions, session]
  );

  const canSubmit = !selectedMethod?.needsSource || !!sourceSessionId;

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({
      session_id: session?.id,
      generation_method: method,
      source_session_id: selectedMethod?.needsSource ? sourceSessionId : undefined,
      inversion_count: method === 'Inverted Qualifying' ? (parseInt(inversionCount) || 0) : 0,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm"
        style={{ background: '#141818', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-sm">Generate Grid — {session?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Method selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
              Generation Method
            </label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-gray-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1e1e] border-white/[0.08]">
                {GENERATION_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-gray-200 text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMethod && (
              <p className="text-[10px] text-gray-600 mt-1">{selectedMethod.description}</p>
            )}
          </div>

          {/* Source session picker — shown for Qualifying Order / Inverted Qualifying */}
          {selectedMethod?.needsSource && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Source Session <span className="text-red-400">*</span>
              </label>
              {sourceSessions.length === 0 ? (
                <p className="text-[11px] text-amber-400">No qualifying or heat sessions found for this event.</p>
              ) : (
                <Select value={sourceSessionId} onValueChange={setSourceSessionId}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-gray-200 text-xs">
                    <SelectValue placeholder="Select source session…" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1e1e] border-white/[0.08]">
                    {sourceSessions.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-gray-200 text-xs">
                        {s.name} ({s.session_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Inversion count — only for Inverted Qualifying */}
          {method === 'Inverted Qualifying' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Inversion Count (top N reversed)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={inversionCount}
                onChange={e => setInversionCount(e.target.value)}
                className="w-24 bg-white/[0.04] border border-white/[0.08] rounded text-[12px] text-gray-200 px-2 py-1.5 outline-none focus:border-teal-600/50"
              />
            </div>
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
              disabled={isPending || !canSubmit}
              className="flex-1 px-3 py-2 rounded bg-teal-700/70 hover:bg-teal-600/80 border border-teal-600/40 text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
            >
              {isPending ? 'Generating…' : 'Generate Grid'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}