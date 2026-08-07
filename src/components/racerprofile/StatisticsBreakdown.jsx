/**
 * StatisticsBreakdown.jsx — Phase 10
 *
 * Renders comprehensive statistics from computed experience data.
 * Career totals, by-series, by-class, by-track, by-manufacturer,
 * by-team, by-season, and by-session-type breakdowns.
 */
import React, { useState } from 'react';
import { BarChart3, TrendingUp, MapPin, Users, Car, Calendar } from 'lucide-react';

const TABS = [
  { id: 'career', label: 'Career', icon: BarChart3 },
  { id: 'series', label: 'By Series', icon: TrendingUp },
  { id: 'tracks', label: 'By Track', icon: MapPin },
  { id: 'teams', label: 'By Team', icon: Users },
  { id: 'seasons', label: 'By Season', icon: Calendar },
];

export default function StatisticsBreakdown({ statistics }) {
  const [activeTab, setActiveTab] = useState('career');
  if (!statistics) return null;

  const career = statistics.career || {};

  return (
    <div className="space-y-4">
      {/* Career totals — always visible */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <CareerStat label="Starts" value={career.starts} />
        <CareerStat label="Wins" value={career.wins} highlight />
        <CareerStat label="Podiums" value={career.podiums} />
        <CareerStat label="Top 5" value={career.top5} />
        <CareerStat label="Top 10" value={career.top10} />
        <CareerStat label="Pts" value={career.points} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CareerStat label="Championships" value={career.championships} highlight />
        <CareerStat label="Avg Finish" value={career.avg_finish ? `P${career.avg_finish}` : '—'} />
        <CareerStat label="Best Finish" value={career.best_finish ? `P${career.best_finish}` : '—'} highlight />
        <CareerStat label="DNFs" value={career.dnf} />
      </div>

      {/* Breakdown tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === tab.id ? 'text-[#232323] border-b-2 border-[#00FFDA] -mb-px' : 'text-gray-400 hover:text-[#232323]'
              }`}>
              <Icon className="w-3 h-3" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'career' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <CareerStat label="Seasons" value={career.seasons_count} />
          <CareerStat label="Series" value={career.series_count} />
          <CareerStat label="Worst Finish" value={career.worst_finish ? `P${career.worst_finish}` : '—'} />
          <CareerStat label="DNS" value={career.dns} />
        </div>
      )}

      {activeTab === 'series' && (
        <BreakdownTable
          data={statistics.by_series}
          columns={[
            { key: 'series_name', label: 'Series' },
            { key: 'starts', label: 'Starts' },
            { key: 'wins', label: 'Wins' },
            { key: 'podiums', label: 'Podiums' },
            { key: 'points', label: 'Points' },
            { key: 'championships', label: 'Champ' },
          ]}
        />
      )}

      {activeTab === 'tracks' && (
        <BreakdownTable
          data={statistics.by_track}
          columns={[
            { key: 'track_name', label: 'Track' },
            { key: 'starts', label: 'Starts' },
            { key: 'wins', label: 'Wins' },
            { key: 'podiums', label: 'Podiums' },
            { key: 'best_finish', label: 'Best', format: v => v ? `P${v}` : '—' },
          ]}
        />
      )}

      {activeTab === 'teams' && (
        <BreakdownTable
          data={statistics.by_team}
          columns={[
            { key: 'team_name', label: 'Team' },
            { key: 'starts', label: 'Starts' },
            { key: 'wins', label: 'Wins' },
            { key: 'podiums', label: 'Podiums' },
            { key: 'points', label: 'Points' },
          ]}
        />
      )}

      {activeTab === 'seasons' && (
        <BreakdownTable
          data={statistics.by_season}
          columns={[
            { key: 'season_year', label: 'Season' },
            { key: 'starts', label: 'Starts' },
            { key: 'wins', label: 'Wins' },
            { key: 'podiums', label: 'Podiums' },
            { key: 'points', label: 'Points' },
          ]}
        />
      )}
    </div>
  );
}

function CareerStat({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${highlight ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-100'}`}>
      <div className={`text-xl font-black ${highlight ? 'text-yellow-700' : 'text-[#232323]'}`}>{value}</div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function BreakdownTable({ data = [], columns = [] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No data available for this breakdown yet.</p>;
  }
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map(col => (
              <th key={col.key} className={`py-2 px-3 font-semibold text-gray-600 text-xs ${col.key === columns[0].key ? 'text-left' : 'text-center'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className={`py-2 px-3 ${col.key === columns[0].key ? 'text-left font-medium text-[#232323]' : 'text-center text-gray-600'}`}>
                  {col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}