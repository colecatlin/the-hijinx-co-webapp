import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Flag, BookOpen } from 'lucide-react';

export default function DriverCareerTab({ driverId }) {
  const [filterSeries, setFilterSeries] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  const { data: careerEntries = [], isLoading } = useQuery({
    queryKey: ['driverCareerEntries', driverId],
    queryFn: () => base44.entities.DriverCareerEntry.filter({ driver_id: driverId }, '-year'),
    enabled: !!driverId,
    staleTime: 5 * 60 * 1000,
  });

  const years = useMemo(() => [...new Set(careerEntries.map(e => e.year))].filter(Boolean).sort((a, b) => b - a), [careerEntries]);
  const seriesList = useMemo(() => [...new Set(careerEntries.map(e => e.series_id).filter(Boolean))], [careerEntries]);

  const filtered = useMemo(() => careerEntries.filter(e => {
    if (filterYear !== 'all' && String(e.year) !== filterYear) return false;
    if (filterSeries !== 'all' && e.series_id !== filterSeries) return false;
    return true;
  }), [careerEntries, filterYear, filterSeries]);

  // Aggregate career totals
  const totals = useMemo(() => careerEntries.reduce((acc, e) => ({
    starts: acc.starts + (e.starts || 0),
    wins: acc.wins + (e.wins || 0),
    podiums: acc.podiums + (e.podiums || 0),
    top_fives: acc.top_fives + (e.top_fives || 0),
    top_tens: acc.top_tens + (e.top_tens || 0),
  }), { starts: 0, wins: 0, podiums: 0, top_fives: 0, top_tens: 0 }), [careerEntries]);

  if (isLoading) return <div className="py-12 text-center text-gray-400 text-sm">Loading career history…</div>;

  if (careerEntries.length === 0) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
        <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500">No career history yet</p>
        <p className="text-sm text-gray-400 mt-1">Career entries will appear here when added.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Career Totals */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Career Totals</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            ['Starts', totals.starts],
            ['Wins', totals.wins],
            ['Podiums', totals.podiums],
            ['Top 5s', totals.top_fives],
            ['Top 10s', totals.top_tens],
          ].map(([label, val]) => (
            <div key={label} className="bg-[#232323] text-white rounded-lg p-4 text-center">
              <div className="text-2xl font-black">{val}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      {(years.length > 1 || seriesList.length > 1) && (
        <div className="flex flex-wrap gap-3">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Season entries */}
      <div className="space-y-4">
        {filtered.map(entry => (
          <div key={entry.id} className="border border-gray-200 rounded-xl p-5 hover:border-[#232323] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl font-black text-[#232323]">{entry.year}</span>
                  {entry.number && (
                    <span className="text-lg font-bold text-gray-500">#{entry.number}</span>
                  )}
                  {entry.championship_position && (
                    <Badge className="bg-[#00FFDA]/10 text-[#006B5A] border border-[#00FFDA]/30 text-xs">
                      <Trophy className="w-3 h-3 mr-1" />
                      P{entry.championship_position} Championship
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                  {entry.vehicle && <span className="font-medium">{entry.vehicle}</span>}
                  {entry.manufacturer && <span>· {entry.manufacturer}</span>}
                </div>
              </div>
              <Flag className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
            </div>

            {/* Stats row */}
            {(entry.starts || entry.wins || entry.podiums) ? (
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[
                  ['Starts', entry.starts],
                  ['Wins', entry.wins],
                  ['Podiums', entry.podiums],
                  ['Top 5', entry.top_fives],
                  ['Top 10', entry.top_tens],
                ].map(([label, val]) => val != null && (
                  <div key={label} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                    <div className="text-lg font-black text-[#232323]">{val}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {entry.notes && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border-l-2 border-[#00FFDA] leading-relaxed">
                {entry.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}