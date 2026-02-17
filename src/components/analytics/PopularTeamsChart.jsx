import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#232323', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function PopularTeamsChart({ teams, results, dateRange }) {
  const chartData = useMemo(() => {
    // Count results per team
    const teamStats = {};
    
    results.forEach(result => {
      if (!result.team_name) return;
      
      const resultDate = new Date(result.created_date);
      if (resultDate >= dateRange.from && resultDate <= dateRange.to) {
        if (!teamStats[result.team_name]) {
          teamStats[result.team_name] = { count: 0, wins: 0 };
        }
        teamStats[result.team_name].count++;
        if (result.position === 1) teamStats[result.team_name].wins++;
      }
    });

    // Sort by count
    const data = Object.entries(teamStats)
      .map(([name, stats]) => ({
        name,
        races: stats.count,
        wins: stats.wins,
      }))
      .sort((a, b) => b.races - a.races)
      .slice(0, 10);

    return data;
  }, [teams, results, dateRange]);

  const disciplineData = useMemo(() => {
    const counts = {};
    teams.forEach(team => {
      const discipline = team.primary_discipline || 'Unknown';
      counts[discipline] = (counts[discipline] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [teams]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Active Teams</CardTitle>
          <CardDescription>Teams with the most race entries</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="races" fill="#232323" name="Total Races" />
              <Bar dataKey="wins" fill="#10b981" name="Wins" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Teams by Discipline</CardTitle>
            <CardDescription>Distribution across racing categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={disciplineData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {disciplineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Statistics Summary</CardTitle>
            <CardDescription>Key metrics across all teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Teams</p>
                <p className="text-2xl font-bold">{teams.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Teams</p>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.status === 'Active').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">National Level Teams</p>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.team_level === 'National').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">International Teams</p>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.team_level === 'International').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}