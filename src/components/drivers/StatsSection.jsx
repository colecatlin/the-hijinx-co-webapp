import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function calculateOverallPerformance(results, sessions, events) {
  // Filter out DNS and Practice
  let validResults = results.filter(r => {
    const session = sessions.find(s => s.id === r.session_id);
    return session && r.status_text !== 'DNS' && session.session_type !== 'Practice';
  });

  // Auto detect session types
  const hasMainOrRace = validResults.some(r => {
    const session = sessions.find(s => s.id === r.session_id);
    return session && (session.session_type === 'Main' || session.session_type === 'Race');
  });

  const hasHeat = validResults.some(r => {
    const session = sessions.find(s => s.id === r.session_id);
    return session && session.session_type === 'Heat';
  });

  let basisType = null;
  if (hasMainOrRace) {
    basisType = 'Finals';
    validResults = validResults.filter(r => {
      const session = sessions.find(s => s.id === r.session_id);
      return session && (session.session_type === 'Main' || session.session_type === 'Race');
    });
  } else if (hasHeat) {
    basisType = 'Heats';
    validResults = validResults.filter(r => {
      const session = sessions.find(s => s.id === r.session_id);
      return session && session.session_type === 'Heat';
    });
  }

  if (!basisType) {
    return { available: false };
  }

  // Count only rows with position, not DNF, not DSQ
  const countableResults = validResults.filter(r => 
    r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ'
  );

  const wins = countableResults.filter(r => r.position === 1).length;
  const podiums = countableResults.filter(r => r.position >= 1 && r.position <= 3).length;
  const top5 = countableResults.filter(r => r.position >= 1 && r.position <= 5).length;
  const top10 = countableResults.filter(r => r.position >= 1 && r.position <= 10).length;

  return {
    available: true,
    basisType,
    wins,
    podiums,
    top5,
    top10
  };
}

function calculateFilteredStats(results, sessions, events, filters) {
  let filtered = results.filter(r => {
    const session = sessions.find(s => s.id === r.session_id);
    if (!session) return false;

    const event = events.find(e => e.id === session.event_id);
    if (!event) return false;

    // Apply filters
    if (filters.season && event.season !== filters.season) return false;
    if (filters.series && r.series !== filters.series) return false;
    if (filters.class && r.class !== filters.class) return false;
    if (filters.team && r.team_name !== filters.team) return false;

    return true;
  });

  const getSessionTypeResults = (sessionType) => {
    return filtered.filter(r => {
      const session = sessions.find(s => s.id === r.session_id);
      return session && session.session_type === sessionType;
    });
  };

  const heatResults = getSessionTypeResults('Heat');
  const mainResults = [...getSessionTypeResults('Main'), ...getSessionTypeResults('Race')];
  const lcqResults = getSessionTypeResults('LCQ');

  const countableMain = mainResults.filter(r => r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ');
  const wins = countableMain.filter(r => r.position === 1).length;
  const podiums = countableMain.filter(r => r.position >= 1 && r.position <= 3).length;
  const top5s = countableMain.filter(r => r.position >= 1 && r.position <= 5).length;
  const top10s = countableMain.filter(r => r.position >= 1 && r.position <= 10).length;

  const dnfCount = mainResults.filter(r => r.status_text === 'DNF').length;
  const dnfPercent = mainResults.length > 0 ? ((dnfCount / mainResults.length) * 100).toFixed(1) : 0;

  const heatFinishes = heatResults.filter(r => r.position).length;
  const heatFinishPercent = heatResults.length > 0 ? ((heatFinishes / heatResults.length) * 100).toFixed(1) : 0;

  const finalFinishes = mainResults.filter(r => r.position).length;
  const finalFinishPercent = mainResults.length > 0 ? ((finalFinishes / mainResults.length) * 100).toFixed(1) : 0;

  const lcqFinishes = lcqResults.filter(r => r.position).length;
  const lcqFinishPercent = lcqResults.length > 0 ? ((lcqFinishes / lcqResults.length) * 100).toFixed(1) : 0;

  return {
    wins,
    podiums,
    top5s,
    top10s,
    dnfPercent,
    heatFinishPercent,
    finalFinishPercent,
    lcqFinishPercent
  };
}

function calculateProgramBreakdown(results, sessions) {
  const programs = {};

  results.forEach(r => {
    const session = sessions.find(s => s.id === r.session_id);
    if (!session) return;

    // Skip DNS and Practice
    if (r.status_text === 'DNS' || session.session_type === 'Practice') return;

    const key = r.team_name
      ? `${r.team_name}|${r.series}|${r.class}`
      : `${r.series}|${r.class}`;

    if (!programs[key]) {
      programs[key] = {
        team: r.team_name || null,
        series: r.series,
        class: r.class,
        starts: 0,
        wins: 0,
        podiums: 0,
        top5s: 0,
        top10s: 0,
        dnfs: 0,
        heats: 0,
        heatFinishes: 0,
        finals: 0,
        finalFinishes: 0,
        lcqs: 0,
        lcqFinishes: 0
      };
    }

    programs[key].starts++;

    if (session.session_type === 'Heat') {
      programs[key].heats++;
      if (r.position) programs[key].heatFinishes++;
    }

    if (session.session_type === 'Main' || session.session_type === 'Race') {
      programs[key].finals++;
      if (r.position) programs[key].finalFinishes++;
      if (r.status_text === 'DNF') programs[key].dnfs++;

      if (r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ') {
        if (r.position === 1) programs[key].wins++;
        if (r.position >= 1 && r.position <= 3) programs[key].podiums++;
        if (r.position >= 1 && r.position <= 5) programs[key].top5s++;
        if (r.position >= 1 && r.position <= 10) programs[key].top10s++;
      }
    }

    if (session.session_type === 'LCQ') {
      programs[key].lcqs++;
      if (r.position) programs[key].lcqFinishes++;
    }
  });

  return Object.values(programs)
    .map(p => ({
      ...p,
      dnfPercent: p.finals > 0 ? ((p.dnfs / p.finals) * 100).toFixed(1) : 0,
      heatFinishPercent: p.heats > 0 ? ((p.heatFinishes / p.heats) * 100).toFixed(1) : 0,
      finalFinishPercent: p.finals > 0 ? ((p.finalFinishes / p.finals) * 100).toFixed(1) : 0,
      lcqFinishPercent: p.lcqs > 0 ? ((p.lcqFinishes / p.lcqs) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.starts - a.starts);
}

export default function StatsSection({ driver, results, sessions, events }) {
  const [filters, setFilters] = useState({
    season: 'all',
    series: 'all',
    class: 'all',
    team: 'all'
  });

  const overall = useMemo(() => 
    calculateOverallPerformance(results, sessions, events),
    [results, sessions, events]
  );

  const stats = useMemo(() =>
    calculateFilteredStats(results, sessions, events, filters),
    [results, sessions, events, filters]
  );

  const programBreakdown = useMemo(() =>
    calculateProgramBreakdown(results, sessions),
    [results, sessions]
  );

  const seasons = useMemo(() => {
    const unique = [...new Set(events.map(e => e.season))].filter(Boolean);
    return unique.sort().reverse();
  }, [events]);

  const allSeries = useMemo(() => {
    const unique = [...new Set(results.map(r => r.series))].filter(Boolean);
    return unique.sort();
  }, [results]);

  const classes = useMemo(() => {
    const unique = [...new Set(results.map(r => r.class))].filter(Boolean);
    return unique.sort();
  }, [results]);

  const teams = useMemo(() => {
    const unique = [...new Set(results.map(r => r.team_name))].filter(Boolean);
    return unique.sort();
  }, [results]);

  if (!results.length) {
    return <p className="text-gray-500">No results available.</p>;
  }

  return (
    <div className="space-y-8">
      {overall.available && (
        <div>
          <h3 className="text-lg font-bold text-[#232323] mb-2">Overall Performance</h3>
          <p className="text-sm text-gray-600 mb-4">Basis {overall.basisType}</p>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="text-2xl font-black text-[#232323]">{overall.wins}</div>
              <div className="text-sm text-gray-600">Wins</div>
            </div>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="text-2xl font-black text-[#232323]">{overall.podiums}</div>
              <div className="text-sm text-gray-600">Podiums</div>
            </div>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="text-2xl font-black text-[#232323]">{overall.top5}</div>
              <div className="text-sm text-gray-600">Top 5</div>
            </div>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="text-2xl font-black text-[#232323]">{overall.top10}</div>
              <div className="text-sm text-gray-600">Top 10</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-[#232323] mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Select value={filters.season} onValueChange={(v) => setFilters({...filters, season: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.series} onValueChange={(v) => setFilters({...filters, series: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {allSeries.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.class} onValueChange={(v) => setFilters({...filters, class: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.team} onValueChange={(v) => setFilters({...filters, team: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.wins}</div>
            <div className="text-xs text-gray-600">Wins</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.podiums}</div>
            <div className="text-xs text-gray-600">Podiums</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.top5s}</div>
            <div className="text-xs text-gray-600">Top 5s</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.top10s}</div>
            <div className="text-xs text-gray-600">Top 10s</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.dnfPercent}%</div>
            <div className="text-xs text-gray-600">DNF percent</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.heatFinishPercent}%</div>
            <div className="text-xs text-gray-600">Heat finish percent</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.finalFinishPercent}%</div>
            <div className="text-xs text-gray-600">Final finish percent</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-xl font-black text-[#232323]">{stats.lcqFinishPercent}%</div>
            <div className="text-xs text-gray-600">LCQ finish percent</div>
          </div>
        </div>
      </div>

      {programBreakdown.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-[#232323] mb-4">Per Program Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Program</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Starts</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Wins</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Podiums</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Top 5s</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Top 10s</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">DNF %</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Heat %</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">Final %</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700">LCQ %</th>
                </tr>
              </thead>
              <tbody>
                {programBreakdown.map((prog, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#232323]">
                        {prog.team || prog.series}
                      </div>
                      <div className="text-xs text-gray-600">
                        {prog.team ? `${prog.series} • ${prog.class}` : prog.class}
                      </div>
                    </td>
                    <td className="text-center px-3 py-2">{prog.starts}</td>
                    <td className="text-center px-3 py-2">{prog.wins}</td>
                    <td className="text-center px-3 py-2">{prog.podiums}</td>
                    <td className="text-center px-3 py-2">{prog.top5s}</td>
                    <td className="text-center px-3 py-2">{prog.top10s}</td>
                    <td className="text-center px-3 py-2">{prog.dnfPercent}%</td>
                    <td className="text-center px-3 py-2">{prog.heatFinishPercent}%</td>
                    <td className="text-center px-3 py-2">{prog.finalFinishPercent}%</td>
                    <td className="text-center px-3 py-2">{prog.lcqFinishPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}