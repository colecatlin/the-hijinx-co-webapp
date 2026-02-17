import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLocation, useNavigate } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { ArrowLeft, TrendingUp, Award, Target, BarChart3 } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

function calculateDriverStats(results, sessions) {
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
  }

  const countableResults = validResults.filter(r => 
    r.position && r.status_text !== 'DNF' && r.status_text !== 'DSQ'
  );

  const totalRaces = countableResults.length;
  const wins = countableResults.filter(r => r.position === 1).length;
  const podiums = countableResults.filter(r => r.position >= 1 && r.position <= 3).length;
  const top5 = countableResults.filter(r => r.position >= 1 && r.position <= 5).length;
  const top10 = countableResults.filter(r => r.position >= 1 && r.position <= 10).length;
  const dnfs = validResults.filter(r => r.status_text === 'DNF').length;

  const avgFinish = totalRaces > 0 
    ? (countableResults.reduce((sum, r) => sum + r.position, 0) / totalRaces)
    : 0;

  return {
    totalRaces,
    wins,
    podiums,
    top5,
    top10,
    dnfs,
    avgFinish: avgFinish.toFixed(2),
    winRate: totalRaces > 0 ? ((wins / totalRaces) * 100).toFixed(1) : 0,
    podiumRate: totalRaces > 0 ? ((podiums / totalRaces) * 100).toFixed(1) : 0,
    top5Rate: totalRaces > 0 ? ((top5 / totalRaces) * 100).toFixed(1) : 0,
    top10Rate: totalRaces > 0 ? ((top10 / totalRaces) * 100).toFixed(1) : 0,
  };
}

export default function DriverComparison() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  const [driver1Id, setDriver1Id] = useState(searchParams.get('driver1') || '');
  const [driver2Id, setDriver2Id] = useState(searchParams.get('driver2') || '');

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: driver1 } = useQuery({
    queryKey: ['driver', driver1Id],
    queryFn: () => base44.entities.Driver.filter({ id: driver1Id }),
    enabled: !!driver1Id,
    select: (data) => data[0],
  });

  const { data: driver2 } = useQuery({
    queryKey: ['driver', driver2Id],
    queryFn: () => base44.entities.Driver.filter({ id: driver2Id }),
    enabled: !!driver2Id,
    select: (data) => data[0],
  });

  const { data: results1 = [] } = useQuery({
    queryKey: ['driverResults', driver1Id],
    queryFn: () => base44.entities.Results.filter({ driver_id: driver1Id }),
    enabled: !!driver1Id,
  });

  const { data: results2 = [] } = useQuery({
    queryKey: ['driverResults', driver2Id],
    queryFn: () => base44.entities.Results.filter({ driver_id: driver2Id }),
    enabled: !!driver2Id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const stats1 = useMemo(() => 
    driver1Id ? calculateDriverStats(results1, sessions) : null,
    [driver1Id, results1, sessions]
  );

  const stats2 = useMemo(() => 
    driver2Id ? calculateDriverStats(results2, sessions) : null,
    [driver2Id, results2, sessions]
  );

  const comparisonData = useMemo(() => {
    if (!stats1 || !stats2) return [];
    return [
      { metric: 'Win Rate %', driver1: parseFloat(stats1.winRate), driver2: parseFloat(stats2.winRate) },
      { metric: 'Podium Rate %', driver1: parseFloat(stats1.podiumRate), driver2: parseFloat(stats2.podiumRate) },
      { metric: 'Top 5 Rate %', driver1: parseFloat(stats1.top5Rate), driver2: parseFloat(stats2.top5Rate) },
      { metric: 'Top 10 Rate %', driver1: parseFloat(stats1.top10Rate), driver2: parseFloat(stats2.top10Rate) },
    ];
  }, [stats1, stats2]);

  const radarData = useMemo(() => {
    if (!stats1 || !stats2) return [];
    return [
      { metric: 'Win Rate', driver1: parseFloat(stats1.winRate), driver2: parseFloat(stats2.winRate) },
      { metric: 'Podiums', driver1: parseFloat(stats1.podiumRate), driver2: parseFloat(stats2.podiumRate) },
      { metric: 'Top 5', driver1: parseFloat(stats1.top5Rate), driver2: parseFloat(stats2.top5Rate) },
      { metric: 'Top 10', driver1: parseFloat(stats1.top10Rate), driver2: parseFloat(stats2.top10Rate) },
      { metric: 'Consistency', driver1: Math.max(0, 100 - parseFloat(stats1.avgFinish) * 10), driver2: Math.max(0, 100 - parseFloat(stats2.avgFinish) * 10) },
    ];
  }, [stats1, stats2]);

  const handleDriver1Change = (id) => {
    setDriver1Id(id);
    const params = new URLSearchParams(location.search);
    params.set('driver1', id);
    if (driver2Id) params.set('driver2', driver2Id);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleDriver2Change = (id) => {
    setDriver2Id(id);
    const params = new URLSearchParams(location.search);
    if (driver1Id) params.set('driver1', driver1Id);
    params.set('driver2', id);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('DriverDirectory'))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Drivers
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Driver Comparison</h1>
          <p className="text-gray-600">Compare performance metrics between two drivers</p>
        </div>

        {/* Driver Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Driver 1</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={driver1Id} onValueChange={handleDriver1Change}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.id !== driver2Id).map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {driver1 && (
                <div className="mt-4 text-sm text-gray-600">
                  <p><span className="font-semibold">Discipline:</span> {driver1.primary_discipline}</p>
                  <p><span className="font-semibold">Number:</span> {driver1.primary_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Driver 2</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={driver2Id} onValueChange={handleDriver2Change}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.id !== driver1Id).map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {driver2 && (
                <div className="mt-4 text-sm text-gray-600">
                  <p><span className="font-semibold">Discipline:</span> {driver2.primary_discipline}</p>
                  <p><span className="font-semibold">Number:</span> {driver2.primary_number}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {stats1 && stats2 && driver1 && driver2 ? (
          <>
            {/* Key Metrics Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Award className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Win Rate</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver1.first_name}</span>
                      <span className="text-xl font-bold text-green-600">{stats1.winRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver2.first_name}</span>
                      <span className="text-xl font-bold text-blue-600">{stats2.winRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Podium Rate</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver1.first_name}</span>
                      <span className="text-xl font-bold text-green-600">{stats1.podiumRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver2.first_name}</span>
                      <span className="text-xl font-bold text-blue-600">{stats2.podiumRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Target className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Avg Finish</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver1.first_name}</span>
                      <span className="text-xl font-bold text-green-600">{stats1.avgFinish}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver2.first_name}</span>
                      <span className="text-xl font-bold text-blue-600">{stats2.avgFinish}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                    <span className="text-sm font-medium text-gray-600">Total Races</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver1.first_name}</span>
                      <span className="text-xl font-bold text-green-600">{stats1.totalRaces}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{driver2.first_name}</span>
                      <span className="text-xl font-bold text-blue-600">{stats2.totalRaces}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Rates Comparison</CardTitle>
                  <CardDescription>Win, podium, and top finish percentages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" angle={-15} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="driver1" fill="#10b981" name={`${driver1.first_name} ${driver1.last_name}`} />
                      <Bar dataKey="driver2" fill="#3b82f6" name={`${driver2.first_name} ${driver2.last_name}`} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Performance Profile</CardTitle>
                  <CardDescription>Multi-dimensional comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name={`${driver1.first_name} ${driver1.last_name}`} dataKey="driver1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                      <Radar name={`${driver2.first_name} ${driver2.last_name}`} dataKey="driver2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Metric</th>
                        <th className="text-center px-4 py-3 font-semibold">{driver1.first_name} {driver1.last_name}</th>
                        <th className="text-center px-4 py-3 font-semibold">{driver2.first_name} {driver2.last_name}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">Total Races</td>
                        <td className="text-center px-4 py-3">{stats1.totalRaces}</td>
                        <td className="text-center px-4 py-3">{stats2.totalRaces}</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">Wins</td>
                        <td className="text-center px-4 py-3">{stats1.wins}</td>
                        <td className="text-center px-4 py-3">{stats2.wins}</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">Podiums</td>
                        <td className="text-center px-4 py-3">{stats1.podiums}</td>
                        <td className="text-center px-4 py-3">{stats2.podiums}</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">Top 5 Finishes</td>
                        <td className="text-center px-4 py-3">{stats1.top5}</td>
                        <td className="text-center px-4 py-3">{stats2.top5}</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">Top 10 Finishes</td>
                        <td className="text-center px-4 py-3">{stats1.top10}</td>
                        <td className="text-center px-4 py-3">{stats2.top10}</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">DNFs</td>
                        <td className="text-center px-4 py-3">{stats1.dnfs}</td>
                        <td className="text-center px-4 py-3">{stats2.dnfs}</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">Average Finish</td>
                        <td className="text-center px-4 py-3">{stats1.avgFinish}</td>
                        <td className="text-center px-4 py-3">{stats2.avgFinish}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium mb-2">Select Two Drivers to Compare</p>
                <p className="text-sm">Choose drivers from the dropdowns above to see their performance comparison</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}