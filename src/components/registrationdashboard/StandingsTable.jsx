import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function StandingsTable({ rows, sessions, previousRows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        No standings data. Select a class and click Recalculate.
      </div>
    );
  }

  // Build session short labels for round columns (show up to 6 rounds)
  const sessionCols = sessions
    ? sessions
        .filter((s) => rows.some((r) => r.round_points?.[s.id] != null))
        .slice(0, 6)
    : [];

  const getChange = (row) => {
    if (!previousRows || !previousRows.length) return null;
    const prev = previousRows.find((p) => p.driver_id === row.driver_id);
    if (!prev) return null;
    return prev.rank - row.rank; // positive = moved up
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-xs min-w-[600px]">
        <thead className="bg-gray-900/60 border-b border-gray-800">
          <tr>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold w-12">Rank</th>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Driver</th>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold w-16">Car #</th>
            <th className="px-3 py-2 text-right text-gray-400 font-semibold w-20">Points</th>
            <th className="px-3 py-2 text-center text-gray-400 font-semibold w-16">Events</th>
            {sessionCols.map((s) => (
              <th key={s.id} className="px-2 py-2 text-center text-gray-400 font-semibold w-14 whitespace-nowrap">
                {s.session_type?.slice(0, 3)}{s.session_number ? ` ${s.session_number}` : ''}
              </th>
            ))}
            <th className="px-2 py-2 text-center text-gray-400 font-semibold w-16">+/-</th>
            <th className="px-2 py-2 text-left text-gray-400 font-semibold">Tie</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const change = getChange(row);
            return (
              <tr key={row.driver_id} className="border-b border-gray-800 hover:bg-gray-800/20 transition-colors">
                <td className="px-3 py-2">
                  <span className={`font-mono font-bold ${row.rank <= 3 ? 'text-yellow-400' : 'text-white'}`}>
                    {row.rank}
                  </span>
                </td>
                <td className="px-3 py-2 text-white font-medium">{row.driver_name}</td>
                <td className="px-3 py-2 text-gray-300 font-mono">{row.car_number || '—'}</td>
                <td className="px-3 py-2 text-right">
                  <span className="text-white font-bold font-mono">{row.total_points}</span>
                </td>
                <td className="px-3 py-2 text-center text-gray-400">{row.events_counted}</td>
                {sessionCols.map((s) => (
                  <td key={s.id} className="px-2 py-2 text-center text-gray-400 font-mono">
                    {row.round_points?.[s.id] ?? '—'}
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  {change === null ? (
                    <span className="text-gray-600">—</span>
                  ) : change > 0 ? (
                    <span className="text-green-400 flex items-center justify-center gap-0.5">
                      <ArrowUp className="w-3 h-3" />{change}
                    </span>
                  ) : change < 0 ? (
                    <span className="text-red-400 flex items-center justify-center gap-0.5">
                      <ArrowDown className="w-3 h-3" />{Math.abs(change)}
                    </span>
                  ) : (
                    <span className="text-gray-500"><Minus className="w-3 h-3 inline" /></span>
                  )}
                </td>
                <td className="px-2 py-2 text-gray-500 text-xs">{row.tie_breaker_note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}