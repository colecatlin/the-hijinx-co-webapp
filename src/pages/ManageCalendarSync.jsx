import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EventDuplicateScanner from '@/components/management/EventDuplicateScanner';

const DEFAULT_CALENDARS = [
  {
    id: 'nascar-default',
    name: 'NASCAR 2026',
    url: 'https://ics.ecal.com/ecal-sub/69962d012067a000022ac699/NASCAR.ics',
    seriesName: 'NASCAR Cup Series',
  },
];

export default function ManageCalendarSync() {
  const [calendars, setCalendars] = useState(() => {
    try {
      const stored = localStorage.getItem('hijinx_sync_calendars');
      return stored ? JSON.parse(stored) : DEFAULT_CALENDARS;
    } catch {
      return DEFAULT_CALENDARS;
    }
  });

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  const [syncResults, setSyncResults] = useState({});

  const saveCalendars = (updated) => {
    setCalendars(updated);
    localStorage.setItem('hijinx_sync_calendars', JSON.stringify(updated));
  };

  const addCalendar = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const normalizedUrl = newUrl.trim().replace(/^webcal:\/\//i, 'https://');
    const updated = [...calendars, { id: Date.now().toString(), name: newName.trim(), url: normalizedUrl, seriesName: newSeriesName.trim() || null }];
    saveCalendars(updated);
    setNewName('');
    setNewUrl('');
    setNewSeriesName('');
  };

  const removeCalendar = (id) => {
    saveCalendars(calendars.filter(c => c.id !== id));
  };

  const [syncingId, setSyncingId] = useState(null);

  const syncCalendar = async (cal) => {
    setSyncingId(cal.id);
    setSyncResults(r => ({ ...r, [cal.id]: null }));
    try {
      const res = await base44.functions.invoke('syncIcsCalendar', {
        icsUrl: cal.url,
        calendarName: cal.name,
        seriesName: cal.seriesName || null,
      });
      setSyncResults(r => ({ ...r, [cal.id]: { success: true, stats: res.data.stats, message: res.data.message } }));
    } catch (err) {
      setSyncResults(r => ({ ...r, [cal.id]: { success: false, error: err.message } }));
    } finally {
      setSyncingId(null);
    }
  };

  const syncAll = async () => {
    for (const cal of calendars) {
      await syncCalendar(cal);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#232323]">Schedule Sync</h1>
          <p className="text-sm text-gray-500 mt-1">Sync ICS/webcal schedules into Events.</p>
        </div>
        <Button onClick={syncAll} disabled={!!syncingId} className="bg-[#232323] text-white gap-2">
          {syncingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync All
        </Button>
      </div>

      {/* Calendar list */}
      <div className="space-y-4 mb-8">
        {calendars.map(cal => {
          const result = syncResults[cal.id];
          const isSyncing = syncingId === cal.id;
          return (
            <div key={cal.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-[#232323]">{cal.name}</div>
                    {cal.seriesName && <div className="text-xs text-blue-500 font-medium">{cal.seriesName}</div>}
                    <div className="text-xs text-gray-400 truncate max-w-sm">{cal.url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncCalendar(cal)}
                    disabled={isSyncing}
                  >
                    {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="ml-1">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCalendar(cal.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {result && (
                <div className={`mt-3 p-3 rounded text-sm flex items-start gap-2 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {result.success ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div>
                    {result.success ? (
                      <>
                        <div className="font-medium">{result.message}</div>
                        <div className="flex gap-3 mt-1 text-xs">
                        <span>+{result.stats.tracks} tracks</span>
                        <span>+{result.stats.events} events</span>
                        <span>{result.stats.skipped} skipped</span>
                        </div>
                      </>
                    ) : (
                      <div>{result.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {calendars.length === 0 && (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No schedules added yet.</p>
          </div>
        )}
      </div>

      {/* Duplicate Scanner */}
      <div className="mb-8">
        <EventDuplicateScanner />
      </div>

      {/* Add new calendar */}
      <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
        <h2 className="font-semibold text-[#232323] mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Schedule
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="space-y-1">
          <Label>Schedule Name</Label>
          <Input
            placeholder="e.g. NASCAR Cup Series 2026"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Series Name <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            placeholder="e.g. NASCAR Cup Series"
            value={newSeriesName}
            onChange={e => setNewSeriesName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>ICS / Webcal URL</Label>
          <Input
            placeholder="webcal:// or https://"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
          />
        </div>
        </div>
        <Button
          onClick={addCalendar}
          disabled={!newName.trim() || !newUrl.trim()}
          className="bg-[#232323] text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Schedule
        </Button>
      </div>
    </div>
  );
}