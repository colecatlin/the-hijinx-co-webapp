import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#232323', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function SeriesGrowthChart({ series, events, dateRange }) {
  const growthData = useMemo(() => {
    // Track series creation over time
    const monthlyGrowth = {};
    
    series.forEach(s => {
      const createdDate = new Date(s.created_date);
      if (createdDate >= dateRange.from && createdDate <= dateRange.to) {
        const month = format(createdDate, 'MMM yyyy');
        monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
      }
    });

    // Convert to cumulative
    let cumulative = 0;
    return Object.entries(monthlyGrowth)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([month, count]) => {
        cumulative += count;
        return { month, new: count, total: cumulative };
      });
  }, [series, dateRange]);

  const popularityData = useMemo(() => {
    // Count events per series
    const seriesEvents = {};
    
    events.forEach(event => {
      if (!event.series) return;
      
      const eventDate = new Date(event.event_date);
      if (eventDate >= dateRange.from && eventDate <= dateRange.to) {
        seriesEvents[event.series] = (seriesEvents[event.series] || 0) + 1;
      }
    });

    return Object.entries(seriesEvents)
      .map(([name, count]) => ({ name, events: count }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);
  }, [events, dateRange]);

  const disciplineData = useMemo(() => {
    const disciplineCounts = {};
    series.forEach(s => {
      const discipline = s.discipline || 'Unknown';
      disciplineCounts[discipline] = (disciplineCounts[discipline] || 0) + 1;
    });
    return Object.entries(disciplineCounts).map(([name, value]) => ({ name, value }));
  }, [series]);

  const levelData = useMemo(() => {
    const levelCounts = {};
    series.forEach(s => {
      const level = s.series_level || 'Unknown';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    return Object.entries(levelCounts).map(([name, value]) => ({ name, value }));
  }, [series]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Series Growth Over Time</CardTitle>
          <CardDescription>New series additions and total count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new" stroke="#3b82f6" name="New Series" strokeWidth={2} />
              <Line type="monotone" dataKey="total" stroke="#232323" name="Total Series" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most Popular Series</CardTitle>
          <CardDescription>Series with the most events scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={popularityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="events" fill="#232323" name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Series by Discipline</CardTitle>
            <CardDescription>Distribution across racing disciplines</CardDescription>
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
            <CardTitle>Series by Level</CardTitle>
            <CardDescription>Competition level distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {levelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Series Statistics</CardTitle>
          <CardDescription>Key metrics across all series</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Series</p>
              <p className="text-2xl font-bold">{series.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Series</p>
              <p className="text-2xl font-bold">
                {series.filter(s => s.status === 'Active').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">National Level</p>
              <p className="text-2xl font-bold">
                {series.filter(s => s.series_level === 'National').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">International</p>
              <p className="text-2xl font-bold">
                {series.filter(s => s.series_level === 'International').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}