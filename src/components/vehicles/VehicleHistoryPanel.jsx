import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Building, Trophy, Flag } from 'lucide-react';

export default function VehicleHistoryPanel({ history }) {
  if (!history) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Flag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No history data available yet.</p>
      </div>
    );
  }

  const { drivers = [], teams = [], series = [], classes = [], seasons = [], championships = [], ownership, total_drivers = 0, total_teams = 0, total_series = 0, total_championships = 0 } = history;

  const summaryCards = [
    { label: 'Drivers', value: total_drivers, icon: Users },
    { label: 'Teams', value: total_teams, icon: Building },
    { label: 'Series', value: total_series, icon: Flag },
    { label: 'Championships', value: total_championships, icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <Icon className="w-5 h-5 text-[#00BFA5] mx-auto mb-2" />
            <div className="text-2xl font-black text-[#232323]">{value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</div>
          </div>
        ))}
      </div>

      {ownership && (ownership.current_driver_name || ownership.current_team_name) && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Current Assignment</h3>
          <div className="flex flex-wrap gap-4">
            {ownership.current_driver_name && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-[#232323]">{ownership.current_driver_name}</span>
              </div>
            )}
            {ownership.current_team_name && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-[#232323]">{ownership.current_team_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {drivers.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Driver History ({drivers.length})</h3>
          <div className="space-y-2">
            {drivers.map(d => (
              <div key={d.driver_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  {d.profile_url ? (
                    <Link to={d.profile_url} className="font-semibold text-[#232323] text-sm hover:text-[#00BFA5]">{d.display_name}</Link>
                  ) : (
                    <span className="font-semibold text-[#232323] text-sm">{d.display_name}</span>
                  )}
                  <span className="text-xs text-gray-400">{d.entries} starts · {d.wins}W · {d.podiums}P</span>
                </div>
                <span className="text-xs text-gray-400">
                  {d.first_seen ? new Date(d.first_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : ''} — {d.last_seen ? new Date(d.last_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Team History ({teams.length})</h3>
          <div className="space-y-2">
            {teams.map(t => (
              <div key={t.team_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  {t.logo_url && <img src={t.logo_url} alt={t.team_name} className="w-6 h-6 rounded object-contain" />}
                  {t.profile_url ? (
                    <Link to={t.profile_url} className="font-semibold text-[#232323] text-sm hover:text-[#00BFA5]">{t.team_name}</Link>
                  ) : (
                    <span className="font-semibold text-[#232323] text-sm">{t.team_name}</span>
                  )}
                  <span className="text-xs text-gray-400">{t.entries} entries</span>
                </div>
                <span className="text-xs text-gray-400">
                  {t.first_seen ? new Date(t.first_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : ''} — {t.last_seen ? new Date(t.last_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {championships.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Championship History ({championships.length})</h3>
          <div className="space-y-2">
            {championships.map((c, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#FFD700]/10 to-transparent rounded-lg border border-[#FFD700]/30">
                <Trophy className="w-5 h-5 text-[#FFD700]" />
                <div>
                  <div className="font-semibold text-[#232323] text-sm">{c.series_name}{c.season_year ? ` ${c.season_year}` : ''}</div>
                  {c.driver_name && <div className="text-xs text-gray-500">Driver: {c.driver_name}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {drivers.length === 0 && teams.length === 0 && championships.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-sm">
          No history data available yet. History will appear as the vehicle enters events.
        </div>
      )}
    </div>
  );
}