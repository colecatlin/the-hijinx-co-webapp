import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#232323', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function TrackUsageChart({ tracks, events, dateRange }) {
  const usageData = useMemo(() => {
    // Count events per track
    const trackUsage = {};
    
    events.forEach(event => {
      if (!event.track_id) return;
      
      const eventDate = new Date(event.event_date);
      if (eventDate >= dateRange.from && eventDate <= dateRange.to) {
        trackUsage[event.track_id] = (trackUsage[event.track_id] || 0) + 1;
      }
    });

    // Map to track names and sort
    const data = Object.entries(trackUsage)
      .map(([trackId, count]) => {
        const track = tracks.find(t => t.id === trackId);
        return {
          name: track?.name || 'Unknown',
          events: count,
          location: track ? `${track.location_city}, ${track.location_state}` : '',
        };
      })
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);

    return data;
  }, [tracks, events, dateRange]);

  const trackTypeData = useMemo(() => {
    const typeCounts = {};
    tracks.forEach(track => {
      const type = track.track_type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  }, [tracks]);

  const surfaceData = useMemo(() => {
    const surfaceCounts = {};
    tracks.forEach(track => {
      const surface = track.surface_type || 'Unknown';
      surfaceCounts[surface] = (surfaceCounts[surface] || 0) + 1;
    });
    return Object.entries(surfaceCounts).map(([name, value]) => ({ name, value }));
  }, [tracks]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Used Tracks</CardTitle>
          <CardDescription>Tracks hosting the most events</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="events" fill="#232323" name="Events Hosted" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tracks by Type</CardTitle>
            <CardDescription>Distribution of track types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={trackTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {trackTypeData.map((entry, index) => (
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
            <CardTitle>Tracks by Surface</CardTitle>
            <CardDescription>Surface type distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={surfaceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {surfaceData.map((entry, index) => (
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
          <CardTitle>Track Statistics</CardTitle>
          <CardDescription>Key metrics across all tracks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Tracks</p>
              <p className="text-2xl font-bold">{tracks.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Tracks</p>
              <p className="text-2xl font-bold">
                {tracks.filter(t => t.status === 'Active').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Seasonal Tracks</p>
              <p className="text-2xl font-bold">
                {tracks.filter(t => t.status === 'Seasonal').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactive Tracks</p>
              <p className="text-2xl font-bold">
                {tracks.filter(t => t.status === 'Inactive').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}