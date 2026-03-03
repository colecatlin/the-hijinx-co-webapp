/**
 * ResultsApiSyncPanel
 * Placeholder for timing provider API sync.
 * Creates an OperationLog entry on sync attempt.
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const PROVIDERS = [
  { id: 'mylaps', name: 'MyLaps / Orbits' },
  { id: 'raceresult', name: 'Race Result' },
  { id: 'timing_solutions', name: 'Timing Solutions' },
  { id: 'custom', name: 'Custom API' },
];

export default function ResultsApiSyncPanel({ session, selectedEvent, locked }) {
  const [provider, setProvider] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(null);

  const handleSync = async () => {
    if (!provider) { toast.error('Select a timing provider'); return; }
    setSyncing(true);
    try {
      await base44.entities.OperationLog.create({
        operation_type: 'results_api_sync_attempt',
        status: 'pending',
        entity_name: 'Results',
        event_id: selectedEvent?.id,
        message: `API sync attempt via ${provider} for session ${session?.name || session?.id}`,
        metadata: {
          provider,
          session_id: session?.id,
          series_class_id: session?.series_class_id,
        },
      });
      setLastAttempt(new Date().toLocaleString());
      toast.info('Sync request logged. Provider integration coming soon.');
    } catch (e) {
      toast.error('Failed to log sync attempt');
    } finally {
      setSyncing(false);
    }
  };

  if (locked) return <div className="py-8 text-center text-gray-500 text-sm">Session is locked. API sync disabled.</div>;

  return (
    <div className="space-y-4">
      <div className="bg-blue-950/20 border border-blue-800/40 rounded-lg p-4 text-sm text-blue-300">
        <div className="flex items-center gap-2 mb-1 font-semibold"><Zap className="w-4 h-4" /> API Sync — Coming Soon</div>
        <p className="text-xs text-blue-400/80">Connect a timing provider to automatically pull results into this session. Select a provider below and click Sync to log a pending request.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Timing Provider</label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs max-w-xs">
              <SelectValue placeholder="Select provider…" />
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-gray-700">
              {PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" onClick={handleSync} disabled={syncing || !provider} className="bg-blue-700 hover:bg-blue-600">
          <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Logging sync…' : 'Sync Now'}
        </Button>

        {lastAttempt && <p className="text-xs text-gray-500">Last attempt logged: {lastAttempt}</p>}
      </div>
    </div>
  );
}