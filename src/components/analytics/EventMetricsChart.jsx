import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';

export default function EventMetricsChart({ events, results, dateRange }) {
  const timelineData = useMemo(() => {
    const filteredEvents = events.filter(e => {
      const eventDate = new Date(e.event_date);
      return eventDate >= dateRange.from && eventDate <= dateRange.to;
    });

    // Group by month
    const monthlyData = {};
    filteredEvents.forEach(event => {
      const month = format(new Date(event.event_date), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { month, events: 0, completed: 0 };
      }
      monthlyData[month].events++;
      if (event.status === 'completed') monthlyData[month].completed++;
    });

    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.month) - new Date(b.month)
    );
  }, [events, dateRange]);

  const statusData = useMemo(() => {
    const statusCounts = {};
    events.forEach(event => {
      const status = event.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      status: name.charAt(0).toUpperCase() + name.slice(1),
      count: value,
    }));
  }, [events]);

  const participationData = useMemo(() => {
    // Count results per event
    const eventParticipation = {};
    results.forEach(result => {
      if (!result.session_id) return;
      eventParticipation[result.session_id] = (eventParticipation[result.session_id] || 0) + 1;
    });

    const avgParticipation = Object.values(eventParticipation).length > 0
      ? Object.values(eventParticipation).reduce((a, b) => a + b, 0) / Object.values(eventParticipation).length
      : 0;

    return {
      totalEvents: events.length,
      eventsWithResults: Object.keys(eventParticipation).length,
      averageParticipation: Math.round(avgParticipation),
    };
  }, [events, results]);

  return (
    <div className="grid gap-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-3xl">{participationData.totalEvents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Events with Results</CardDescription>
            <CardTitle className="text-3xl">{participationData.eventsWithResults}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Participants</CardDescription>
            <CardTitle className="text-3xl">{participationData.averageParticipation}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
          <CardDescription>Events scheduled over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="events" stroke="#232323" name="Total Events" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Status Distribution</CardTitle>
          <CardDescription>Current status of all events</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#232323" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}