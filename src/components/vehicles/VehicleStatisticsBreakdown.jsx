import React, { useState } from 'react';
import { Trophy, Flag, Award, TrendingUp, Users, Truck, Building } from 'lucide-react';

export default function VehicleStatisticsBreakdown({ statistics }) {
  const [activeBreakdown, setActiveBreakdown] = useState('series');

  if (!statistics || !statistics.career) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No statistics available yet. Statistics will appear as the vehicle competes.</p>
      </div>
    );
  }

  const career = statistics.career;
  const careerCards = [
    { label: 'Starts', value: career.starts, icon: Flag },
    { label: 'Wins', value: career.wins, icon: Trophy },
    { label: 'Podiums', value: career.podiums, icon: Award },
    { label: 'Top 5', value: career.top5, icon: TrendingUp },
    { label: 'Top 10', value: career.top10, icon: TrendingUp },
    { label: 'Championships', value: career.championships, icon: Trophy },
    { label: 'Drivers', value: career.drivers_count, icon: Users },
    { label: 'Teams', value: career.teams_count, icon: Building },
  ];

  const breakdowns = [
    { id: 'series', label: 'By Series', data: statistics.by_series },
    { id: 'track', label: 'By Track', data: statistics.by_track },
    { id: 'driver', label: 'By Driver', data: statistics.by_driver },
    { id: 'team', label: 'By Team', data: statistics.by_team },
    { id: 'season', label: 'By Season', data: statistics.by_season },
    { id: 'class', label: 'By Class', data: statistics.by_class },
  ];

  const activeBreakdownData = breakdowns.find(b => b.id === activeBreakdown);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {careerCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <Icon className="w-5 h-5 text-[#00BFA5] mx-auto mb-2" />
            <div className="text-2xl font-black text-[#232323]">{value ?? 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-4">
          {breakdowns.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBreakdown(b.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeBreakdown === b.id
                  ? 'text-[#232323] border-b-2 border-[#00FFDA] -mb-px'
                  : 'text-gray-500 hover:text-[#232323]'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {activeBreakdownData && activeBreakdownData.data && activeBreakdownData.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Name</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Starts</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Wins</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Podiums</th>
                  {activeBreakdown === 'season' && <th className="text-center py-2 px-3 font-semibold text-gray-600">Points</th>}
                  {activeBreakdown === 'track' && <th className="text-center py-2 px-3 font-semibold text-gray-600">Best</th>}
                  {activeBreakdown === 'driver' && <th className="text-center py-2 px-3 font-semibold text-gray-600">Points</th>}
                </tr>
              </thead>
              <tbody>
                {activeBreakdownData.data.map((item, idx) => {
                  const name = item.series_name || item.track_name || item.driver_name || item.team_name || item.class_name || item.season || 'Unknown';
                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-[#232323]">{name}</td>
                      <td className="text-center py-2 px-3 text-gray-600">{item.starts ?? 0}</td>
                      <td className="text-center py-2 px-3 text-gray-600">{item.wins ?? 0}</td>
                      <td className="text-center py-2 px-3 text-gray-600">{item.podiums ?? 0}</td>
                      {activeBreakdown === 'season' && <td className="text-center py-2 px-3 text-gray-600">{item.points ?? 0}</td>}
                      {activeBreakdown === 'track' && <td className="text-center py-2 px-3 text-gray-600">{item.best_finish ? `P${item.best_finish}` : '—'}</td>}
                      {activeBreakdown === 'driver' && <td className="text-center py-2 px-3 text-gray-600">{item.points ?? 0}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">No {activeBreakdownData?.label.toLowerCase()} data available.</p>
        )}
      </div>
    </div>
  );
}