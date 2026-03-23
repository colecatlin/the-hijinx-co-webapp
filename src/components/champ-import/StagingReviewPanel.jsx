import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  matched: 'bg-green-100 text-green-700',
  created: 'bg-blue-100 text-blue-700',
  skipped: 'bg-gray-100 text-gray-500',
  conflict: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

function DriverConflictResolver({ row, onResolved }) {
  const [driverId, setDriverId] = useState('');
  const qc = useQueryClient();
  const entity = row.mapped_driver_id !== undefined ? 'ImportedResultStaging' : 'ImportedStandingStaging';

  const resolve = async () => {
    if (!driverId.trim()) return;
    await base44.entities[entity].update(row.id, {
      mapped_driver_id: driverId.trim(),
      import_status: 'matched',
    });
    qc.invalidateQueries({ queryKey: ['staging', row.import_run_id] });
    toast.success('Driver mapping saved');
    onResolved?.();
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <Input
        placeholder="Enter Driver ID to map"
        value={driverId}
        onChange={e => setDriverId(e.target.value)}
        className="h-7 text-xs w-48"
      />
      <Button size="sm" className="h-7 text-xs" onClick={resolve}>Map</Button>
    </div>
  );
}

function ResultsTable({ rows }) {
  const [showConflict, setShowConflict] = useState(null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-slate-50 text-slate-500">
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Event</th>
            <th className="text-left p-2">Class</th>
            <th className="text-left p-2">Driver</th>
            <th className="text-left p-2">#</th>
            <th className="text-left p-2">Pos</th>
            <th className="text-left p-2">Pts</th>
            <th className="text-left p-2">Driver ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <React.Fragment key={row.id}>
              <tr className={`border-b hover:bg-slate-50 ${row.import_status === 'conflict' ? 'bg-red-50' : ''}`}>
                <td className="p-2"><StatusBadge status={row.import_status} /></td>
                <td className="p-2 max-w-[140px] truncate" title={row.event_name}>{row.event_name}</td>
                <td className="p-2">{row.class_name}</td>
                <td className="p-2 font-medium">{row.driver_name}</td>
                <td className="p-2">{row.driver_number}</td>
                <td className="p-2 font-bold">{row.finishing_position}</td>
                <td className="p-2">{row.points_awarded ?? '—'}</td>
                <td className="p-2 font-mono text-slate-400 text-[10px]">
                  {row.mapped_driver_id || <span className="text-red-400">unmapped</span>}
                  {row.import_status === 'conflict' && (
                    <button className="ml-1 text-blue-500 underline text-[10px]" onClick={() => setShowConflict(showConflict === row.id ? null : row.id)}>
                      resolve
                    </button>
                  )}
                </td>
              </tr>
              {showConflict === row.id && (
                <tr className="bg-amber-50">
                  <td colSpan={8} className="p-2">
                    <DriverConflictResolver row={row} onResolved={() => setShowConflict(null)} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StandingsTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-slate-50 text-slate-500">
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Class</th>
            <th className="text-left p-2">Pos</th>
            <th className="text-left p-2">Driver</th>
            <th className="text-left p-2">Points</th>
            <th className="text-left p-2">Wins</th>
            <th className="text-left p-2">Driver ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className={`border-b hover:bg-slate-50 ${row.import_status === 'conflict' ? 'bg-red-50' : ''}`}>
              <td className="p-2"><StatusBadge status={row.import_status} /></td>
              <td className="p-2">{row.class_name}</td>
              <td className="p-2 font-bold">{row.standing_position}</td>
              <td className="p-2 font-medium">{row.driver_name}</td>
              <td className="p-2 font-bold text-blue-700">{row.total_points}</td>
              <td className="p-2">{row.wins ?? '—'}</td>
              <td className="p-2 font-mono text-slate-400 text-[10px]">{row.mapped_driver_id || <span className="text-red-400">unmapped</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StagingReviewPanel({ importRunId }) {
  const { data: results = [] } = useQuery({
    queryKey: ['staging', importRunId, 'results'],
    queryFn: () => base44.entities.ImportedResultStaging.filter({ import_run_id: importRunId }, 'event_name', 500),
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['staging', importRunId, 'standings'],
    queryFn: () => base44.entities.ImportedStandingStaging.filter({ import_run_id: importRunId }, 'class_name', 500),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['staging', importRunId, 'events'],
    queryFn: () => base44.entities.ImportedEventStaging.filter({ import_run_id: importRunId }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['staging', importRunId, 'classes'],
    queryFn: () => base44.entities.ImportedClassStaging.filter({ import_run_id: importRunId }),
  });

  const conflictResults = results.filter(r => r.import_status === 'conflict');

  return (
    <div className="space-y-4">
      {conflictResults.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {conflictResults.length} result rows have conflicts. Resolve driver mappings before applying.
        </div>
      )}

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          <TabsTrigger value="standings">Standings ({standings.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="classes">Classes ({classes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          {results.length === 0
            ? <div className="text-sm text-gray-400 p-4">No results staged for this run.</div>
            : <ResultsTable rows={results} />
          }
        </TabsContent>

        <TabsContent value="standings">
          {standings.length === 0
            ? <div className="text-sm text-gray-400 p-4">No standings staged for this run.</div>
            : <StandingsTable rows={standings} />
          }
        </TabsContent>

        <TabsContent value="events">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500">
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Event Name</th>
                  <th className="text-left p-2">Date Start</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Mapped Event ID</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-b hover:bg-slate-50">
                    <td className="p-2"><StatusBadge status={e.import_status} /></td>
                    <td className="p-2 font-medium">{e.source_event_name}</td>
                    <td className="p-2">{e.source_event_date_start || '—'}</td>
                    <td className="p-2">{e.source_location || '—'}</td>
                    <td className="p-2 font-mono text-[10px] text-slate-400">{e.mapped_event_id || <span className="text-amber-500">unmatched</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="classes">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500">
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Source Class Name</th>
                  <th className="text-left p-2">Mapped SeriesClass ID</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-2"><StatusBadge status={c.import_status} /></td>
                    <td className="p-2 font-medium">{c.source_class_name}</td>
                    <td className="p-2 font-mono text-[10px] text-slate-400">{c.mapped_series_class_id || <span className="text-amber-500">unmatched</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}