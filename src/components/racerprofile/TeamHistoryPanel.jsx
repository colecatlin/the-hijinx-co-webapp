/**
 * TeamHistoryPanel.jsx — Phase 10
 *
 * Renders automatically-generated team history from computed experience
 * data. Shows current and previous teams with per-team statistics.
 * No manual editing. No duplicated storage.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Crown } from 'lucide-react';

export default function TeamHistoryPanel({ teamHistory = [] }) {
  if (!teamHistory || teamHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No team history yet. Team relationships are built automatically from race entries.</p>
      </div>
    );
  }

  const current = teamHistory.find(t => t.is_current);
  const previous = teamHistory.filter(t => !t.is_current);

  return (
    <div className="space-y-6">
      {current && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Current Team</h3>
          <TeamCard team={current} isCurrent />
        </div>
      )}

      {previous.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Previous Teams</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {previous.map(team => <TeamCard key={team.team_id} team={team} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, isCurrent = false }) {
  const teamLink = team.team_slug ? `/TeamProfile?slug=${team.team_slug}` : `/TeamProfile?id=${team.team_id}`;
  return (
    <Link to={teamLink} className="block border border-gray-200 rounded-xl p-4 hover:border-[#00FFDA] hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 mb-3">
        {team.team_logo_url ? (
          <img src={team.team_logo_url} alt={team.team_name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#232323] truncate">{team.team_name}</span>
            {isCurrent && <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">Current</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Starts" value={team.starts} />
        <Stat label="Wins" value={team.wins} />
        <Stat label="Podiums" value={team.podiums} />
        <Stat label="Pts" value={team.points} />
      </div>
      {team.championships > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
          <Crown className="w-3 h-3" /> {team.championships} Championship{team.championships > 1 ? 's' : ''}
        </div>
      )}
    </Link>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg py-1.5">
      <div className="text-sm font-black text-[#232323]">{value}</div>
      <div className="text-[9px] text-gray-400 uppercase">{label}</div>
    </div>
  );
}