import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DriverProgramsCard({ programs, seriesMap, teamMap }) {
  if (!programs || programs.length === 0) {
    return null;
  }

  const activePrograms = programs.filter(p => p.program_status === 'Active');
  const pastPrograms = programs.filter(p => p.program_status === 'Past');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Racing Programs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {activePrograms.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">Active</h3>
            <div className="space-y-3">
              {activePrograms.map(program => (
                <ProgramEntry key={program.id} program={program} seriesMap={seriesMap} teamMap={teamMap} />
              ))}
            </div>
          </div>
        )}

        {pastPrograms.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">Past Programs</h3>
            <div className="space-y-3">
              {pastPrograms.map(program => (
                <ProgramEntry key={program.id} program={program} seriesMap={seriesMap} teamMap={teamMap} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgramEntry({ program, seriesMap, teamMap }) {
  const series = seriesMap?.[program.series_id];
  const team = teamMap?.[program.team_id];
  const seasonRange = program.season_end_year ? `${program.season_start_year}–${program.season_end_year}` : `${program.season_start_year}–Present`;

  return (
    <div className="border-l-2 border-gray-200 pl-4 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">{series?.name || 'Unknown Series'}</p>
          <p className="text-xs text-gray-600 mt-1">
            #{program.bib_number} • {program.class_name}
          </p>
          {team && (
            <p className="text-xs text-gray-600 mt-1">
              {team.name}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">{seasonRange}</p>
        </div>
        {program.is_primary && (
          <Badge className="bg-yellow-100 text-yellow-900">Primary</Badge>
        )}
      </div>
    </div>
  );
}