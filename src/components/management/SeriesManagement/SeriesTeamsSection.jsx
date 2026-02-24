import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, Users, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function SeriesTeamsSection({ seriesId, seriesName }) {
  const navigate = useNavigate();
  const [expandedTeams, setExpandedTeams] = useState({});

  // Programs for this series
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['seriesPrograms', seriesId],
    queryFn: () => base44.entities.DriverProgram.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('last_name', 500),
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 200),
  });

  const driverMap = Object.fromEntries(allDrivers.map(d => [d.id, d]));
  const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));

  // Group programs by team
  const programsByTeam = {};
  programs.forEach(p => {
    const key = p.team_id || '__no_team__';
    if (!programsByTeam[key]) programsByTeam[key] = [];
    programsByTeam[key].push(p);
  });

  const teamsWithDrivers = Object.entries(programsByTeam).filter(([k]) => k !== '__no_team__');
  const unaffiliatedDrivers = programsByTeam['__no_team__'] || [];

  const toggleTeam = (id) => setExpandedTeams(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{teamsWithDrivers.length}</div>
          <div className="text-sm text-gray-500 mt-1">Teams</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{programs.length}</div>
          <div className="text-sm text-gray-500 mt-1">Driver Programs</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{unaffiliatedDrivers.length}</div>
          <div className="text-sm text-gray-500 mt-1">Unaffiliated</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Teams in this Series
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-gray-500 py-4">Loading...</div>
          ) : teamsWithDrivers.length === 0 && unaffiliatedDrivers.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No team data yet.</p>
              <p className="text-xs mt-1 text-gray-400">Add drivers with team assignments from the Drivers tab.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamsWithDrivers.sort(([a], [b]) => {
                const ta = teamMap[a]?.name || '';
                const tb = teamMap[b]?.name || '';
                return ta.localeCompare(tb);
              }).map(([teamId, teamPrograms]) => {
                const team = teamMap[teamId];
                const isExpanded = expandedTeams[teamId] !== false;
                return (
                  <div key={teamId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      className="w-full bg-gray-50 px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                      onClick={() => toggleTeam(teamId)}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                      {team?.logo_url && (
                        <img src={team.logo_url} alt="" className="h-7 w-7 object-contain rounded" />
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-semibold text-sm">{team?.name || 'Unknown Team'}</div>
                        {team && (
                          <div className="text-xs text-gray-500">
                            {[team.location_city, team.location_state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {teamPrograms.length} driver{teamPrograms.length !== 1 ? 's' : ''}
                      </Badge>
                      {team && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(createPageUrl(`ManageTeams?teamId=${team.id}`)); }}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
                          title="Go to team editor"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {teamPrograms.map(p => {
                          const driver = driverMap[p.driver_id];
                          return (
                            <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                              {p.car_number && (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 min-w-[40px] text-center font-bold">
                                  #{p.car_number}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">
                                  {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {[p.class_name, p.season].filter(Boolean).join(' • ')}
                                </div>
                              </div>
                              <StatusBadge status={p.status} />
                              {driver && (
                                <Link
                                  to={createPageUrl('ManageDrivers')}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                  title="Edit driver"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unaffiliated drivers */}
              {unaffiliatedDrivers.length > 0 && (
                <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
                  <button
                    className="w-full bg-gray-50 px-4 py-3 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleTeam('__no_team__')}
                  >
                    {expandedTeams['__no_team__'] !== false ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="flex-1 text-left text-sm font-medium text-gray-500">No Team Assigned</span>
                    <Badge variant="outline" className="text-xs text-gray-400">{unaffiliatedDrivers.length}</Badge>
                  </button>
                  {expandedTeams['__no_team__'] !== false && (
                    <div className="divide-y divide-gray-100">
                      {unaffiliatedDrivers.map(p => {
                        const driver = driverMap[p.driver_id];
                        return (
                          <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                            {p.car_number && (
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 min-w-[40px] text-center font-bold">
                                #{p.car_number}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">
                                {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {[p.class_name, p.season].filter(Boolean).join(' • ')}
                              </div>
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    planning: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'active'}
    </span>
  );
}