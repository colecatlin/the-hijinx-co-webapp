import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

export default function DataHealthPanel() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIssue, setExpandedIssue] = useState(null);

  const { data: drivers } = useQuery({
    queryKey: ['drivers-health'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-health'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: tracks } = useQuery({
    queryKey: ['tracks-health'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: results } = useQuery({
    queryKey: ['results-health'],
    queryFn: () => base44.entities.Results.list(),
  });

  const { data: events } = useQuery({
    queryKey: ['events-health'],
    queryFn: () => base44.entities.Event.list(),
  });

  useEffect(() => {
    if (!drivers || !teams || !tracks || !results || !events) return;

    const newIssues = [];

    // Check drivers with missing required fields
    const driversWithMissingFields = drivers.filter(
      d => !d.first_name || !d.last_name || !d.primary_discipline
    );
    if (driversWithMissingFields.length > 0) {
      newIssues.push({
        id: 'drivers-incomplete',
        severity: 'warning',
        title: `${driversWithMissingFields.length} drivers with missing required fields`,
        description: 'Drivers missing first name, last name, or discipline',
        count: driversWithMissingFields.length,
        type: 'drivers',
      });
    }

    // Check teams with missing required fields
    const teamsWithMissingFields = teams.filter(
      t => !t.name || !t.headquarters_city || !t.primary_discipline
    );
    if (teamsWithMissingFields.length > 0) {
      newIssues.push({
        id: 'teams-incomplete',
        severity: 'warning',
        title: `${teamsWithMissingFields.length} teams with missing required fields`,
        description: 'Teams missing name, city, or discipline',
        count: teamsWithMissingFields.length,
        type: 'teams',
      });
    }

    // Check tracks with missing required fields
    const tracksWithMissingFields = tracks.filter(
      t => !t.name || !t.location_city
    );
    if (tracksWithMissingFields.length > 0) {
      newIssues.push({
        id: 'tracks-incomplete',
        severity: 'warning',
        title: `${tracksWithMissingFields.length} tracks with missing required fields`,
        description: 'Tracks missing name or location',
        count: tracksWithMissingFields.length,
        type: 'tracks',
      });
    }

    // Check for orphaned results (results with non-existent driver references)
    const driverIds = new Set(drivers.map(d => d.id));
    const teamIds = new Set(teams.map(t => t.id));
    const orphanedResults = results.filter(
      r => !driverIds.has(r.driver_id) || (r.team_id && !teamIds.has(r.team_id))
    );
    if (orphanedResults.length > 0) {
      newIssues.push({
        id: 'orphaned-results',
        severity: 'critical',
        title: `${orphanedResults.length} results with invalid references`,
        description: 'Results pointing to deleted drivers or teams',
        count: orphanedResults.length,
        type: 'results',
      });
    }

    // Check for duplicate driver names
    const driverNameMap = {};
    const duplicateDrivers = drivers.filter(d => {
      const key = `${d.first_name}${d.last_name}`;
      if (driverNameMap[key]) {
        driverNameMap[key]++;
        return true;
      }
      driverNameMap[key] = 1;
      return false;
    });
    if (duplicateDrivers.length > 0) {
      newIssues.push({
        id: 'duplicate-drivers',
        severity: 'warning',
        title: `${duplicateDrivers.length} potential duplicate drivers`,
        description: 'Drivers with identical names',
        count: duplicateDrivers.length,
        type: 'drivers',
      });
    }

    // Check for duplicate team names
    const teamNameMap = {};
    const duplicateTeams = teams.filter(t => {
      if (teamNameMap[t.name]) {
        teamNameMap[t.name]++;
        return true;
      }
      teamNameMap[t.name] = 1;
      return false;
    });
    if (duplicateTeams.length > 0) {
      newIssues.push({
        id: 'duplicate-teams',
        severity: 'warning',
        title: `${duplicateTeams.length} potential duplicate teams`,
        description: 'Teams with identical names',
        count: duplicateTeams.length,
        type: 'teams',
      });
    }

    // Check for events without tracks
    const eventsWithoutTracks = events.filter(e => !e.track_id);
    if (eventsWithoutTracks.length > 0) {
      newIssues.push({
        id: 'events-no-track',
        severity: 'warning',
        title: `${eventsWithoutTracks.length} events without track assigned`,
        description: 'Events missing track reference',
        count: eventsWithoutTracks.length,
        type: 'events',
      });
    }

    setIssues(newIssues.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }));
    setLoading(false);
  }, [drivers, teams, tracks, results, events]);

  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Scanning data integrity...
        </div>
      </Card>
    );
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <Card className="p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2">Data Health Status</h2>
        <div className="flex gap-4 mb-4">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">{criticalCount} critical</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">{warningCount} warnings</span>
            </div>
          )}
          {issues.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">All systems healthy</span>
            </div>
          )}
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`p-4 rounded-lg border ${
                issue.severity === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              } cursor-pointer transition-all hover:shadow-sm`}
              onClick={() =>
                setExpandedIssue(expandedIssue === issue.id ? null : issue.id)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {issue.severity === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    )}
                    <p
                      className={`font-medium ${
                        issue.severity === 'critical'
                          ? 'text-red-900'
                          : 'text-yellow-900'
                      }`}
                    >
                      {issue.title}
                    </p>
                  </div>
                  <p
                    className={`text-sm ${
                      issue.severity === 'critical'
                        ? 'text-red-700'
                        : 'text-yellow-700'
                    }`}
                  >
                    {issue.description}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    issue.severity === 'critical'
                      ? 'bg-red-200 text-red-900'
                      : 'bg-yellow-200 text-yellow-900'
                  }`}
                >
                  {issue.count}
                </span>
              </div>

              {expandedIssue === issue.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">
                    Issue type: <span className="font-medium">{issue.type}</span>
                  </p>
                  <Button size="sm" variant="outline" className="text-xs">
                    View {issue.type}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center py-8">All data looks good! No issues detected.</p>
      )}
    </Card>
  );
}