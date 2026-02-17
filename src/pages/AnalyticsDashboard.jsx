import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import PopularDriversChart from '@/components/analytics/PopularDriversChart';
import PopularTeamsChart from '@/components/analytics/PopularTeamsChart';
import EventMetricsChart from '@/components/analytics/EventMetricsChart';
import TrackUsageChart from '@/components/analytics/TrackUsageChart';
import SeriesGrowthChart from '@/components/analytics/SeriesGrowthChart';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    to: new Date(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-updated_date', 1000),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('-updated_date', 1000),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 1000),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-updated_date', 500),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('-updated_date', 500),
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Results.list('-created_date', 2000),
  });

  const handleExportReport = () => {
    const report = {
      date_range: {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd'),
      },
      summary: {
        total_drivers: drivers.length,
        total_teams: teams.length,
        total_events: events.length,
        total_tracks: tracks.length,
        total_series: series.length,
        total_results: results.length,
      },
      generated_at: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Management')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Insights and metrics across all motorsports data</p>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <div>
                    <label className="text-xs font-medium">From</label>
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">To</label>
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Drivers</CardDescription>
              <CardTitle className="text-3xl">{drivers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Teams</CardDescription>
              <CardTitle className="text-3xl">{teams.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Events</CardDescription>
              <CardTitle className="text-3xl">{events.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tracks</CardDescription>
              <CardTitle className="text-3xl">{tracks.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Series</CardDescription>
              <CardTitle className="text-3xl">{series.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Results</CardDescription>
              <CardTitle className="text-3xl">{results.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Visualizations */}
        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
            <TabsTrigger value="series">Series</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="mt-6">
            <PopularDriversChart drivers={drivers} results={results} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            <PopularTeamsChart teams={teams} results={results} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <EventMetricsChart events={events} results={results} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="tracks" className="mt-6">
            <TrackUsageChart tracks={tracks} events={events} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="series" className="mt-6">
            <SeriesGrowthChart series={series} events={events} dateRange={dateRange} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}