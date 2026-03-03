import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowUp, ArrowDown, Minus, AlertCircle, Trophy } from 'lucide-react';

function DriverDrawer({ row, sessions, results, open, onClose }) {
  if (!row) return null;
  const driverResults = (results || []).filter((r) => r.driver_id === row.driver_id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[380px] bg-[#171717] border-gray-700 text-white overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-white flex items-center gap-2">
            <span className="font-mono text-yellow-400 text-lg">#{row.rank}</span>
            {row.driver_name}
          </SheetTitle>
          {row.car_number && <p className="text-xs text-gray-400">Car #{row.car_number}</p>}
        </SheetHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white font-mono">{row.total_points}</p>
            <p className="text-xs text-gray-500">Total Pts</p>
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white font-mono">{row.wins ?? 0}</p>
            <p className="text-xs text-gray-500">Wins</p>
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white font-mono">{row.events_counted ?? 0}</p>
            <p className="text-xs text-gray-500">Events</p>
          </div>
        </div>

        {/* Round breakdown */}
        {row.round_points && Object.keys(row.round_points).length > 0 && (
          <div className="mb-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Points Per Round</p>
            <div className="space-y-1">
              {(sessions || []).map((s) => {
                const pts = row.round_points?.[s.id];
                if (pts == null) return null;
                return (
                  <div key={s.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-800">
                    <span className="text-gray-300">{s.name || `${s.session_type} ${s.session_number || ''}`}</span>
                    <span className="font-mono font-bold text-white">{pts}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results list */}
        {driverResults.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Results This Season</p>
            <div className="space-y-1">
              {driverResults.map((r) => (
                <div key={r.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-800">
                  <span className="text-gray-400">{r.session_type}{r.heat_number ? ` H${r.heat_number}` : ''}</span>
                  <div className="flex items-center gap-2">
                    {r.status !== 'Running' && (
                      <Badge className="text-xs bg-red-500/20 text-red-400">{r.status}</Badge>
                    )}
                    <span className="font-mono text-white">P{r.position ?? '—'}</span>
                    {r.points != null && <span className="text-yellow-400 font-mono">{r.points}pts</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {driverResults.length === 0 && (!row.round_points || Object.keys(row.round_points).length === 0) && (
          <div className="flex flex-col items-center py-8 text-gray-600">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm">No detailed breakdown available.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function StandingsTable({ rows, sessions, previousRows, results }) {
  const [selectedRow, setSelectedRow] = useState(null);

  if (!rows || rows.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        <Trophy className="w-6 h-6 mx-auto mb-2 text-gray-700" />
        No standings data. Select a class and click Recalculate.
      </div>
    );
  }

  // Build session columns for breakdown (up to 8)
  const sessionCols = sessions
    ? sessions
        .filter((s) => rows.some((r) => r.round_points?.[s.id] != null))
        .slice(0, 8)
    : [];

  const getChange = (row) => {
    if (!previousRows?.length) return null;
    const prev = previousRows.find((p) => p.driver_id === row.driver_id);
    if (!prev) return null;
    return prev.rank - row.rank; // positive = moved up
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-xs min-w-[540px]">
          <thead className="bg-gray-900/60 border-b border-gray-800">
            <tr>
              <th className="px-3 py-2 text-left text-gray-400 font-semibold w-12">Rank</th>
              <th className="px-3 py-2 text-left text-gray-400 font-semibold">Driver</th>
              <th className="px-3 py-2 text-left text-gray-400 font-semibold w-16 hidden sm:table-cell">Car #</th>
              <th className="px-3 py-2 text-right text-gray-400 font-semibold w-20">Points</th>
              <th className="px-3 py-2 text-center text-gray-400 font-semibold w-14 hidden md:table-cell">Events</th>
              {sessionCols.map((s) => (
                <th key={s.id} className="px-2 py-2 text-center text-gray-400 font-semibold w-12 hidden lg:table-cell whitespace-nowrap">
                  {s.session_type?.slice(0, 3)}{s.session_number ? ` ${s.session_number}` : ''}
                </th>
              ))}
              <th className="px-2 py-2 text-center text-gray-400 font-semibold w-12">+/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const change = getChange(row);
              return (
                <tr
                  key={row.driver_id || row.rank}
                  onClick={() => setSelectedRow(row)}
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-3 py-2">
                    <span className={`font-mono font-bold ${row.rank === 1 ? 'text-yellow-400' : row.rank <= 3 ? 'text-gray-300' : 'text-white'}`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-white font-medium">{row.driver_name}</span>
                    {row.tie_breaker_note && (
                      <span className="ml-1 text-gray-600 text-xs">(T)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-300 font-mono hidden sm:table-cell">{row.car_number || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-white font-bold font-mono">{row.total_points}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-400 hidden md:table-cell">{row.events_counted ?? '—'}</td>
                  {sessionCols.map((s) => (
                    <td key={s.id} className="px-2 py-2 text-center text-gray-400 font-mono hidden lg:table-cell">
                      {row.round_points?.[s.id] ?? '—'}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center">
                    {change === null ? (
                      <span className="text-gray-700">—</span>
                    ) : change > 0 ? (
                      <span className="text-green-400 flex items-center justify-center gap-0.5">
                        <ArrowUp className="w-3 h-3" />{change}
                      </span>
                    ) : change < 0 ? (
                      <span className="text-red-400 flex items-center justify-center gap-0.5">
                        <ArrowDown className="w-3 h-3" />{Math.abs(change)}
                      </span>
                    ) : (
                      <span className="text-gray-600"><Minus className="w-3 h-3 inline" /></span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DriverDrawer
        row={selectedRow}
        sessions={sessions}
        results={results}
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </>
  );
}