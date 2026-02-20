import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanSearch, Trash2, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

function groupDuplicates(events) {
  const groups = {};
  for (const event of events) {
    // Key: series + location_note + event_date (all lowercased/trimmed for robustness)
    const series = (event.series || '').trim().toLowerCase();
    const location = (event.location_note || '').trim().toLowerCase();
    const date = (event.event_date || '').trim();
    if (!date) continue;
    const key = `${series}||${location}||${date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  // Only return groups with more than 1 event
  return Object.values(groups).filter(g => g.length > 1);
}

export default function EventDuplicateScanner() {
  const [scanned, setScanned] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const queryClient = useQueryClient();

  const { isLoading: isScanning, refetch: runScan } = useQuery({
    queryKey: ['eventDuplicateScan'],
    queryFn: async () => {
      const events = await base44.entities.Event.list('event_date', 1000);
      const groups = groupDuplicates(events);
      setDuplicateGroups(groups);
      setScanned(true);
      return groups;
    },
    enabled: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      // Re-scan after deletion
      runScan();
    },
  });

  const toggleGroup = (idx) => {
    setExpandedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDelete = (id, name) => {
    if (confirm(`Delete event "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0);

  return (
    <div className="border border-amber-200 rounded-lg bg-amber-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-amber-900 flex items-center gap-2">
            <ScanSearch className="w-4 h-4" />
            Duplicate Event Scanner
          </h2>
          <p className="text-xs text-amber-700 mt-0.5">Finds events sharing the same Series, Location, and Date.</p>
        </div>
        <Button
          size="sm"
          onClick={() => runScan()}
          disabled={isScanning}
          className="bg-amber-700 hover:bg-amber-800 text-white gap-2"
        >
          {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </Button>
      </div>

      {scanned && !isScanning && (
        <>
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-6 text-amber-700 text-sm">
              ✅ No duplicates found! All events have unique Series + Location + Date combinations.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span className="text-sm font-medium text-amber-900">
                  Found {duplicateGroups.length} duplicate group{duplicateGroups.length !== 1 ? 's' : ''} ({totalDuplicates} extra record{totalDuplicates !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="space-y-3">
                {duplicateGroups.map((group, idx) => {
                  const rep = group[0];
                  const isExpanded = expandedGroups[idx];
                  return (
                    <div key={idx} className="border border-amber-300 bg-white rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-50 transition-colors"
                        onClick={() => toggleGroup(idx)}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {rep.series || <span className="text-gray-400 italic">No series</span>}
                            {' · '}
                            {rep.event_date ? format(new Date(rep.event_date + 'T12:00:00'), 'MMM d, yyyy') : 'No date'}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {rep.location_note || <span className="italic">No location</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <Badge variant="destructive" className="text-xs">{group.length} dupes</Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-amber-200 divide-y divide-gray-100">
                          {group.map((event) => (
                            <div key={event.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">{event.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5 font-mono">{event.id}</div>
                                {event.external_uid && (
                                  <div className="text-xs text-green-600 mt-0.5 truncate">uid: {event.external_uid}</div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                onClick={() => handleDelete(event.id, event.name)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}