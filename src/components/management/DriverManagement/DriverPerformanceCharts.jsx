import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, Award, Target, BarChart3 } from 'lucide-react';

const COLORS = ['#82ca9d', '#8884d8', '#ffc658', '#ff7300', '#a4de6c', '#d084d0'];

export default function DriverPerformanceCharts({ results, sessions, events }) {
  // Calculate overall performance metrics
  const overallMetrics = useMemo(() => {
    let validResults = results.filter(r => {
      const session = sessions.find(s => s.id === r.session_id);
      return session && r.status_text !== 'DNS' && session.session_type !== 'Practice';
    });

    const hasMainOrRace = validResults.some(r => {
      const session = sessions.find(s => s.id === r.session_id);
      return session && (session.session_type === 'Main' || session.session_type === 'Race');
    });

    if (hasMainOrRace) {
      validResults = validResults.filter(r => {
        const session = sessions.find(s => s.id === r.session_id);
        return session && (session.session_type === 'Main' || session.session_type === 'Race');
      });
    } else {
      validResults = validResults.filter(r => {
        const session = sessions.find(s => s.id === r.session_id);
        return session && session.session_type === 'Heat';
      });
    }

    const countableResults = validResults.filter(r => 
      r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ'
    );

    const totalRaces = countableResults.length;
    const wins = countableResults.filter(r => r.position === 1).length;
    const podiums = countableResults.filter(r => r.position >= 1 && r.position <= 3).length;
    const top5 = countableResults.filter(r => r.position >= 1 && r.position <= 5).length;
    const top10 = countableResults.filter(r => r.position >= 1 && r.position <= 10).length;

    const avgFinish = totalRaces > 0 
      ? (countableResults.reduce((sum, r) => sum + r.position, 0) / totalRaces).toFixed(2)
      : 0;

    return {
      totalRaces,
      wins,
      podiums,
      top5,
      top10,
      avgFinish,
      winRate: totalRaces > 0 ? ((wins / totalRaces) * 100).toFixed(1) : 0,
      podiumRate: totalRaces > 0 ? ((podiums / totalRaces) * 100).toFixed(1) : 0,
      top5Rate: totalRaces > 0 ? ((top5 / totalRaces) * 100).toFixed(1) : 0,
      top10Rate: totalRaces > 0 ? ((top10 / totalRaces) * 100).toFixed(1) : 0,
    };
  }, [results, sessions]);

  // Performance by series/program
  const programPerformance = useMemo(() => {
    const programs = {};

    results.forEach(r => {
      const session = sessions.find(s => s.id === r.session_id);
      if (!session || r.status_text === 'DNS' || session.session_type === 'Practice') return;

      const key = `${r.series || 'Unknown'}`;

      if (!programs[key]) {
        programs[key] = {
          name: r.series || 'Unknown',
          starts: 0,
          wins: 0,
          podiums: 0,
          top5: 0,
          positions: [],
        };
      }

      if (session.session_type === 'Main' || session.session_type === 'Race' || session.session_type === 'Heat') {
        programs[key].starts++;

        if (r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ') {
          programs[key].positions.push(r.position);
          if (r.position === 1) programs[key].wins++;
          if (r.position <= 3) programs[key].podiums++;
          if (r.position <= 5) programs[key].top5++;
        }
      }
    });

    return Object.values(programs)
      .map(p => ({
        ...p,
        avgFinish: p.positions.length > 0 
          ? (p.positions.reduce((sum, pos) => sum + pos, 0) / p.positions.length).toFixed(2)
          : 0,
        winRate: p.starts > 0 ? ((p.wins / p.starts) * 100).toFixed(1) : 0,
        podiumRate: p.starts > 0 ? ((p.podiums / p.starts) * 100).toFixed(1) : 0,
      }))
      .filter(p => p.starts > 0)
      .sort((a, b) => b.starts - a.starts);
  }, [results, sessions]);

  // Performance over time (by event date)
  const performanceTrend = useMemo(() => {
    const eventPerformance = [];

    results.forEach(r => {
      const session = sessions.find(s => s.id === r.session_id);
      const event = events.find(e => e.id === session?.event_id);
      
      if (!session || !event || r.status_text === 'DNS' || session.session_type === 'Practice') return;
      if (session.session_type !== 'Main' && session.session_type !== 'Race') return;

      if (r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ') {
        eventPerformance.push({
          date: event.event_date,
          position: r.position,
          event: event.name,
          series: r.series,
        });
      }
    });

    return eventPerformance.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [results, sessions, events]);

  // Results distribution (pie chart)
  const resultsDistribution = useMemo(() => {
    const dist = [
      { name: 'Wins', value: overallMetrics.wins, fill: '#10b981' },
      { name: 'Podiums (2-3)', value: overallMetrics.podiums - overallMetrics.wins, fill: '#3b82f6' },
      { name: 'Top 5 (4-5)', value: overallMetrics.top5 - overallMetrics.podiums, fill: '#f59e0b' },
      { name: 'Top 10 (6-10)', value: overallMetrics.top10 - overallMetrics.top5, fill: '#6366f1' },
      { name: 'Outside Top 10', value: overallMetrics.totalRaces - overallMetrics.top10, fill: '#94a3b8' },
    ].filter(d => d.value > 0);

    return dist;
  }, [overallMetrics]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-3xl font-bold text-green-600">{overallMetrics.winRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{overallMetrics.wins} wins</p>
              </div>
              <Award className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Podium Rate</p>
                <p className="text-3xl font-bold text-blue-600">{overallMetrics.podiumRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{overallMetrics.podiums} podiums</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Finish</p>
                <p className="text-3xl font-bold text-purple-600">{overallMetrics.avgFinish}</p>
                <p className="text-xs text-gray-500 mt-1">{overallMetrics.totalRaces} races</p>
              </div>
              <Target className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top 5 Rate</p>
                <p className="text-3xl font-bold text-orange-600">{overallMetrics.top5Rate}%</p>
                <p className="text-xs text-gray-500 mt-1">{overallMetrics.top5} top 5s</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Charts */}
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="distribution">Results Distribution</TabsTrigger>
          <TabsTrigger value="series">By Series</TabsTrigger>
          <TabsTrigger value="trend">Performance Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Results Distribution</CardTitle>
              <CardDescription>Breakdown of finishing positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resultsDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {resultsDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-col justify-center space-y-3">
                  {resultsDistribution.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm font-medium">{entry.name}</span>
                      </div>
                      <span className="text-lg font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="series">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Series</CardTitle>
              <CardDescription>Average finish position and win rate per series</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={programPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgFinish" fill="#8884d8" name="Avg Finish" />
                  <Bar yAxisId="right" dataKey="wins" fill="#82ca9d" name="Wins" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Series</th>
                      <th className="text-center px-4 py-2 font-semibold">Starts</th>
                      <th className="text-center px-4 py-2 font-semibold">Wins</th>
                      <th className="text-center px-4 py-2 font-semibold">Podiums</th>
                      <th className="text-center px-4 py-2 font-semibold">Avg Finish</th>
                      <th className="text-center px-4 py-2 font-semibold">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programPerformance.map((prog, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{prog.name}</td>
                        <td className="text-center px-4 py-3">{prog.starts}</td>
                        <td className="text-center px-4 py-3">{prog.wins}</td>
                        <td className="text-center px-4 py-3">{prog.podiums}</td>
                        <td className="text-center px-4 py-3">{prog.avgFinish}</td>
                        <td className="text-center px-4 py-3">{prog.winRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trend Over Time</CardTitle>
              <CardDescription>Finishing position by event date</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis reversed domain={[1, 'dataMax + 5']} label={{ value: 'Position', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value, name, props) => [
                        `P${value} - ${props.payload.event}`,
                        props.payload.series
                      ]}
                    />
                    <Line type="monotone" dataKey="position" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No trend data available</p>
                  <p className="text-sm mt-2">Results need event dates to show performance trends</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}