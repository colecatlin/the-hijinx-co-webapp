/**
 * Diagnostics Platform Data Map
 * 
 * Displays a summary of the platform's entity structure and provides
 * a link to the full Platform Data Map visualization.
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DiagnosticsPlatformDataMap() {
  const categories = [
    { name: 'Source Entities', count: 6, color: 'bg-indigo-100 text-indigo-800', description: 'Driver, Team, Track, Series, Event, Session' },
    { name: 'Operational Entities', count: 5, color: 'bg-blue-100 text-blue-800', description: 'Entry, Results, Standings, SeriesClass, EventClass' },
    { name: 'Access System', count: 4, color: 'bg-purple-100 text-purple-800', description: 'User, EntityCollaborator, Invitation, Entity' },
    { name: 'Import Systems', count: 5, color: 'bg-green-100 text-green-800', description: 'CSV, API, Schedule, Calendar, Web Crawler' },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" /> Platform Data Map
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-600">
          Master blueprint showing the complete architecture of the HIJINX platform. Includes entity structure, relationships, import flows, and page dependencies.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div key={cat.name} className={`rounded-lg border px-3 py-3 text-center ${cat.color}`}>
              <p className="text-2xl font-bold">{cat.count}</p>
              <p className="text-xs font-semibold mt-1">{cat.name}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
          {categories.map((cat) => (
            <div key={cat.name} className="text-xs">
              <p className="font-semibold text-gray-700">{cat.name}</p>
              <p className="text-gray-600">{cat.description}</p>
            </div>
          ))}
        </div>

        <Link to="/PlatformDataMap">
          <Button className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50 bg-white" variant="outline">
            <Database className="w-4 h-4 mr-2" />
            View Full Platform Data Map
            <ExternalLink className="w-3 h-3 ml-auto" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}