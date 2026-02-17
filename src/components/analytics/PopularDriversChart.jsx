import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PopularDriversChart({ drivers, results, dateRange }) {
  const chartData = useMemo(() => {
    // Count results per driver
    const driverStats = {};
    
    results.forEach(result => {
      if (!result.driver_id) return;
      
      const resultDate = new Date(result.created_date);
      if (resultDate >= dateRange.from && resultDate <= dateRange.to) {
        if (!driverStats[result.driver_id]) {
          driverStats[result.driver_id] = {
            count: 0,
            wins: 0,
            podiums: 0,
          };
        }
        driverStats[result.driver_id].count++;
        if (result.position === 1) driverStats[result.driver_id].wins++;
        if (result.position <= 3) driverStats[result.driver_id].podiums++;
      }
    });

    // Map to driver names and sort by count
    const data = Object.entries(driverStats)
      .map(([driverId, stats]) => {
        const driver = drivers.find(d => d.id === driverId);
        return {
          name: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
          races: stats.count,
          wins: stats.wins,
          podiums: stats.podiums,
        };
      })
      .sort((a, b) => b.races - a.races)
      .slice(0, 10);

    return data;
  }, [drivers, results, dateRange]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Active Drivers</CardTitle>
          <CardDescription>Drivers with the most race entries</CardDescription>
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
              <Bar dataKey="podiums" fill="#3b82f6" name="Podiums" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Driver Statistics Summary</CardTitle>
          <CardDescription>Key metrics across all drivers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Active Drivers</p>
              <p className="text-2xl font-bold">
                {drivers.filter(d => d.status === 'Active').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Part Time Drivers</p>
              <p className="text-2xl font-bold">
                {drivers.filter(d => d.status === 'Part Time').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactive Drivers</p>
              <p className="text-2xl font-bold">
                {drivers.filter(d => d.status === 'Inactive').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Results</p>
              <p className="text-2xl font-bold">{results.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}