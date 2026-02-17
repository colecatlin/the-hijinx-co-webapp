import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FINAL_SESSION_TYPES = new Set(['Final']);
const HEAT_SESSION_TYPES = new Set(['Heat', 'Heat 1', 'Heat 2', 'Heat 3', 'Heat 4']);

function getResultEvent(result, sessions, events) {
  if (result.session_id) {
    const session = sessions.find(s => s.id === result.session_id);
    if (session) {
      const event = events.find(e => e.id === session.event_id);
      return { session, event };
    }
  }
  if (result.event_id) {
    const event = events.find(e => e.id === result.event_id);
    return { session: null, event };
  }
  return { session: null, event: null };
}

function isCountable(result, session) {
  if (result.status_text === 'DNS') return false;
  if (session && session.session_type === 'Practice') return false;
  return true;
}

function isFinalResult(session) {
  if (!session) return true; // no session = treat as a race result
  return FINAL_SESSION_TYPES.has(session.session_type);
}

function calculateOverallPerformance(results, sessions, events) {
  const validResults = results
    .map(r => ({ r, ...getResultEvent(r, sessions, events) }))
    .filter(({ r, session }) => isCountable(r, session));

  const hasMainOrRace = validResults.some(({ session }) => session && FINAL_SESSION_TYPES.has(session.session_type));
  const hasNoSession = validResults.some(({ session }) => !session);
  const hasHeat = validResults.some(({ session }) => session && HEAT_SESSION_TYPES.has(session.session_type));

  let finalResults, basisType;

  if (hasMainOrRace || hasNoSession) {
    basisType = 'Finals';
    finalResults = validResults.filter(({ session }) => isFinalResult(session));
  } else if (hasHeat) {
    basisType = 'Heats';
    finalResults = validResults.filter(({ session }) => session && HEAT_SESSION_TYPES.has(session.session_type));
  } else {
    return { available: false };
  }

  const countable = finalResults.filter(({ r }) =>
    r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ'
  );

  return {
    available: true,
    basisType,
    wins: countable.filter(({ r }) => r.position === 1).length,
    podiums: countable.filter(({ r }) => r.position <= 3).length,
    top5: countable.filter(({ r }) => r.position <= 5).length,
    top10: countable.filter(({ r }) => r.position <= 10).length,
  };
}

function calculateFilteredStats(results, sessions, events, filters) {
  const enriched = results
    .map(r => ({ r, ...getResultEvent(r, sessions, events) }))
    .filter(({ r, session, event }) => {
      if (!isCountable(r, session)) return false;
      if (!event) return false;
      if (filters.season !== 'all' && event.season !== filters.season) return false;
      if (filters.series !== 'all' && r.series !== filters.series) return false;
      if (filters.class !== 'all' && r.class !== filters.class) return false;
      if (filters.team !== 'all' && r.team_name !== filters.team) return false;
      return true;
    });

  const heatResults = enriched.filter(({ session }) => session && HEAT_SESSION_TYPES.has(session.session_type));
  const mainResults = enriched.filter(({ session }) => isFinalResult(session));
  const lcqResults = enriched.filter(({ session }) => session && session.session_type === 'LCQ');

  const countableMain = mainResults.filter(({ r }) =>
    r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ'
  );
  const dnfCount = mainResults.filter(({ r }) => r.status_text === 'DNF').length;

  return {
    wins: countableMain.filter(({ r }) => r.position === 1).length,
    podiums: countableMain.filter(({ r }) => r.position <= 3).length,
    top5s: countableMain.filter(({ r }) => r.position <= 5).length,
    top10s: countableMain.filter(({ r }) => r.position <= 10).length,
    dnfPercent: mainResults.length > 0 ? ((dnfCount / mainResults.length) * 100).toFixed(1) : 0,
    heatFinishPercent: heatResults.length > 0
      ? ((heatResults.filter(({ r }) => r.position).length / heatResults.length) * 100).toFixed(1) : 0,
    finalFinishPercent: mainResults.length > 0
      ? ((mainResults.filter(({ r }) => r.position).length / mainResults.length) * 100).toFixed(1) : 0,
    lcqFinishPercent: lcqResults.length > 0
      ? ((lcqResults.filter(({ r }) => r.position).length / lcqResults.length) * 100).toFixed(1) : 0,
  };
}

function calculateProgramBreakdown(results, sessions, events) {
  const programs = {};

  results.forEach(r => {
    const { session } = getResultEvent(r, sessions, events);
    if (!isCountable(r, session)) return;

    const key = r.team_name
      ? `${r.team_name}|${r.series}|${r.class}`
      : `${r.series}|${r.class}`;

    if (!programs[key]) {
      programs[key] = {
        team: r.team_name || null,
        series: r.series,
        class: r.class,
        starts: 0, wins: 0, podiums: 0, top5s: 0, top10s: 0,
        dnfs: 0, heats: 0, heatFinishes: 0, finals: 0, finalFinishes: 0, lcqs: 0, lcqFinishes: 0
      };
    }

    programs[key].starts++;

    if (session?.session_type === 'Heat') {
      programs[key].heats++;
      if (r.position) programs[key].heatFinishes++;
    } else if (isFinalResult(session)) {
      programs[key].finals++;
      if (r.position) programs[key].finalFinishes++;
      if (r.status_text === 'DNF') programs[key].dnfs++;
      if (r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ') {
        if (r.position === 1) programs[key].wins++;
        if (r.position <= 3) programs[key].podiums++;
        if (r.position <= 5) programs[key].top5s++;
        if (r.position <= 10) programs[key].top10s++;
      }
    } else if (session?.session_type === 'LCQ') {
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
      lcqFinishPercent: p.lcqs > 0 ? ((p.lcqFinishes / p.lcqs) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.starts - a.starts);
}

export default function StatsSection({ driver, results, sessions, events }) {
  const [filters, setFilters] = useState({ season: 'all', series: 'all', class: 'all', team: 'all' });

  const overall = useMemo(() => calculateOverallPerformance(results, sessions, events), [results, sessions, events]);
  const stats = useMemo(() => calculateFilteredStats(results, sessions, events, filters), [results, sessions, events, filters]);
  const programBreakdown = useMemo(() => calculateProgramBreakdown(results, sessions, events), [results, sessions, events]);

  const seasons = useMemo(() => {
    return [...new Set(events.map(e => e.season))].filter(Boolean).sort().reverse();
  }, [events]);

  const allSeries = useMemo(() => [...new Set(results.map(r => r.series))].filter(Boolean).sort(), [results]);
  const classes = useMemo(() => [...new Set(results.map(r => r.class))].filter(Boolean).sort(), [results]);
  const teams = useMemo(() => [...new Set(results.map(r => r.team_name))].filter(Boolean).sort(), [results]);

  if (!results.length) {
    return <p className="text-gray-500">No results available.</p>;
  }

  return (
    <div className="space-y-8">
      {overall.available && (
        <div>
          <h3 className="text-lg font-bold text-[#232323] mb-2">Overall Performance</h3>
          <p className="text-sm text-gray-600 mb-4">Basis: {overall.basisType}</p>
          <div className="grid grid-cols-4 gap-4">
            {[['Wins', overall.wins], ['Podiums', overall.podiums], ['Top 5', overall.top5], ['Top 10', overall.top10]].map(([label, val]) => (
              <div key={label} className="bg-gray-50 p-4 rounded border border-gray-200">
                <div className="text-2xl font-black text-[#232323]">{val}</div>
                <div className="text-sm text-gray-600">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-[#232323] mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Select value={filters.season} onValueChange={v => setFilters(f => ({ ...f, season: v }))}>
            <SelectTrigger><SelectValue placeholder="Season" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.series} onValueChange={v => setFilters(f => ({ ...f, series: v }))}>
            <SelectTrigger><SelectValue placeholder="Series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {allSeries.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.class} onValueChange={v => setFilters(f => ({ ...f, class: v }))}>
            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.team} onValueChange={v => setFilters(f => ({ ...f, team: v }))}>
            <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Wins', stats.wins], ['Podiums', stats.podiums], ['Top 5s', stats.top5s], ['Top 10s', stats.top10s],
            ['DNF %', `${stats.dnfPercent}%`], ['Heat Finish %', `${stats.heatFinishPercent}%`],
            ['Final Finish %', `${stats.finalFinishPercent}%`], ['LCQ Finish %', `${stats.lcqFinishPercent}%`],
          ].map(([label, val]) => (
            <div key={label} className="bg-gray-50 p-3 rounded border border-gray-200">
              <div className="text-xl font-black text-[#232323]">{val}</div>
              <div className="text-xs text-gray-600">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {programBreakdown.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-[#232323] mb-4">Per Program Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Program', 'Starts', 'Wins', 'Podiums', 'Top 5s', 'Top 10s', 'DNF %', 'Heat %', 'Final %', 'LCQ %'].map(h => (
                    <th key={h} className={`px-3 py-2 font-semibold text-gray-700 ${h === 'Program' ? 'text-left' : 'text-center'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {programBreakdown.map((prog, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#232323]">{prog.team || prog.series}</div>
                      <div className="text-xs text-gray-600">{prog.team ? `${prog.series} • ${prog.class}` : prog.class}</div>
                    </td>
                    {[prog.starts, prog.wins, prog.podiums, prog.top5s, prog.top10s,
                      `${prog.dnfPercent}%`, `${prog.heatFinishPercent}%`, `${prog.finalFinishPercent}%`, `${prog.lcqFinishPercent}%`
                    ].map((val, i) => (
                      <td key={i} className="text-center px-3 py-2">{val}</td>
                    ))}
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