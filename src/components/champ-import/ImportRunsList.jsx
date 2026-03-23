import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  partially_completed: 'bg-orange-100 text-orange-800',
};

export default function ImportRunsList({ selectedRunId, onSelect }) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['importRuns'],
    queryFn: () => base44.entities.ImportSourceRun.filter({ source_name: 'champoffroad' }, '-created_date', 50),
  });

  if (isLoading) return <div className="text-sm text-gray-400 p-4">Loading runs...</div>;
  if (runs.length === 0) return <div className="text-sm text-gray-400 p-4">No import runs yet. Start an import above.</div>;

  return (
    <div className="space-y-2">
      {runs.map(run => (
        <Card
          key={run.id}
          className={`cursor-pointer transition-all hover:shadow-md ${selectedRunId === run.id ? 'ring-2 ring-slate-800' : ''}`}
          onClick={() => onSelect(run.id)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {run.import_type} — Season {run.season_year}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{run.id}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {run.created_date ? formatDistanceToNow(new Date(run.created_date), { addSuffix: true }) : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>Found: <span className="font-medium text-gray-700">{run.records_found ?? 0}</span></div>
                <div>Created: <span className="font-medium text-green-700">{run.records_created ?? 0}</span></div>
                <div>Skipped: <span className="font-medium text-gray-500">{run.records_skipped ?? 0}</span></div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[run.status] || 'bg-gray-100 text-gray-600'}`}>
                {run.status}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}