import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DriverPerformanceCharts from './DriverPerformanceCharts';

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

  if (!results.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Dashboard</CardTitle>
          <CardDescription>No results available for this driver</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <DriverPerformanceCharts results={results} sessions={sessions} events={events} />;
}