import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function calculateOverallPerformance(results, sessions, events) {
  let validResults = results.filter(r => {
    const session = sessions.find(s => s.id === r.session_id);
    return session && r.status_text !== 'DNS' && session.session_type !== 'Practice';
  });

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

function calculateProgramBreakdown(results, sessions) {
  const programs = {};

  results.forEach(r => {
    const session = sessions.find(s => s.id === r.session_id);
    if (!session) return;

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

export default function DriverStatsManagement({ driverId }) {
  const { data: results = [] } = useQuery({
    queryKey: ['driverResults', driverId],
    queryFn: () => base44.entities.Results.filter({ driver_id: driverId }),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
    enabled: results.length > 0,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    enabled: results.length > 0,
  });

  const overall = useMemo(() => 
    calculateOverallPerformance(results, sessions, events),
    [results, sessions, events]
  );

  const programBreakdown = useMemo(() =>
    calculateProgramBreakdown(results, sessions),
    [results, sessions]
  );

  if (!results.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Driver Stats</CardTitle>
          <CardDescription>No results available for this driver</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {overall.available && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
            <CardDescription>Basis {overall.basisType}</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {programBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per Program Breakdown</CardTitle>
            <CardDescription>Performance across all programs</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}