import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Flag, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';

export default function SeriesTeamsSection({ seriesId, seriesName }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedTeams, setExpandedTeams] = useState({});
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [addDriverForTeam, setAddDriverForTeam] = useState(null); // teamId
  const [editingProgram, setEditingProgram] = useState(null); // program id
  const [teamSearch, setTeamSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');

  // Form state for adding a driver to a team
  const [newDriverId, setNewDriverId] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newCarNumber, setNewCarNumber] = useState('');
  const [newSeason, setNewSeason] = useState(String(new Date().getFullYear()));
  const [newStatus, setNewStatus] = useState('active');

  // Edit program inline state
  const [editData, setEditData] = useState({});

  // Data fetches
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

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId, active: true }),
    enabled: !!seriesId,
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

  const teamsWithPrograms = Object.entries(programsByTeam).filter(([k]) => k !== '__no_team__');
  const unaffiliatedPrograms = programsByTeam['__no_team__'] || [];

  // Teams already in this series
  const existingTeamIds = new Set(teamsWithPrograms.map(([k]) => k));

  // Available teams to add (not already in series, filtered by search)
  const availableTeamsToAdd = allTeams.filter(t =>
    !existingTeamIds.has(t.id) &&
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  // Mutations
  const createProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesPrograms', seriesId] });
      toast.success('Program added');
      resetDriverForm();
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DriverProgram.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesPrograms', seriesId] });
      toast.success('Program updated');
      setEditingProgram(null);
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverProgram.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesPrograms', seriesId] });
      toast.success('Program removed');
    },
  });

  const resetDriverForm = () => {
    setAddDriverForTeam(null);
    setNewDriverId('');
    setNewClassName('');
    setNewCarNumber('');
    setNewSeason(String(new Date().getFullYear()));
    setNewStatus('active');
    setDriverSearch('');
  };

  const handleAddDriverToTeam = (teamId) => {
    if (!newDriverId) { toast.error('Select a driver'); return; }
    const driver = driverMap[newDriverId];
    const team = teamMap[teamId];
    createProgramMutation.mutate({
      driver_id: newDriverId,
      series_id: seriesId,
      series_name: seriesName,
      team_id: teamId,
      team_name: team?.name,
      class_name: newClassName || undefined,
      car_number: newCarNumber || undefined,
      season: newSeason,
      status: newStatus,
    });
  };

  const handleAddTeamToSeries = (teamId) => {
    // Expand the team and open add-driver form
    setExpandedTeams(prev => ({ ...prev, [teamId]: true }));
    setAddDriverForTeam(teamId);
    setShowAddTeamForm(false);
    setTeamSearch('');
  };

  const handleDeleteAllTeamPrograms = (teamId) => {
    const teamPrograms = programsByTeam[teamId] || [];
    if (!window.confirm(`Remove all ${teamPrograms.length} program(s) for this team from the series?`)) return;
    teamPrograms.forEach(p => deleteProgramMutation.mutate(p.id));
  };

  const startEdit = (program) => {
    setEditingProgram(program.id);
    setEditData({
      class_name: program.class_name || '',
      car_number: program.car_number || '',
      season: program.season || '',
      status: program.status || 'active',
    });
  };

  const saveEdit = (id) => {
    updateProgramMutation.mutate({ id, data: editData });
  };

  const toggleTeam = (id) => setExpandedTeams(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredDriversForAdd = allDrivers.filter(d =>
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(driverSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{teamsWithPrograms.length}</div>
          <div className="text-sm text-gray-500 mt-1">Teams</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{programs.length}</div>
          <div className="text-sm text-gray-500 mt-1">Driver Programs</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{unaffiliatedPrograms.length}</div>
          <div className="text-sm text-gray-500 mt-1">Unaffiliated</div>
        </Card>
      </div>

      {/* Add team button + picker */}
      {showAddTeamForm ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Add Team to Series</span>
              <Button variant="ghost" size="icon" onClick={() => { setShowAddTeamForm(false); setTeamSearch(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Search teams..."
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableTeamsToAdd.length === 0 && (
                <p className="text-xs text-gray-400 py-2 text-center">No teams available to add.</p>
              )}
              {availableTeamsToAdd.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleAddTeamToSeries(team.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  {team.logo_url && <img src={team.logo_url} alt="" className="h-6 w-6 object-contain rounded" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{team.name}</div>
                    {team.headquarters_city && (
                      <div className="text-xs text-gray-500">{[team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ')}</div>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Teams in this Series
          </CardTitle>
          {!showAddTeamForm && (
            <Button size="sm" onClick={() => setShowAddTeamForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Team
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-gray-500 py-4">Loading...</div>
          ) : teamsWithPrograms.length === 0 && unaffiliatedPrograms.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No teams in this series yet.</p>
              <p className="text-xs mt-1 text-gray-400">Click "Add Team" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamsWithPrograms
                .sort(([a], [b]) => (teamMap[a]?.name || '').localeCompare(teamMap[b]?.name || ''))
                .map(([teamId, teamPrograms]) => {
                  const team = teamMap[teamId];
                  const isExpanded = expandedTeams[teamId] !== false;
                  const isAddingDriver = addDriverForTeam === teamId;

                  return (
                    <div key={teamId} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Team header row */}
                      <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                        <button onClick={() => toggleTeam(teamId)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-70 transition-opacity">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                          {team?.logo_url && (
                            <img src={team.logo_url} alt="" className="h-7 w-7 object-contain rounded shrink-0" />
                          )}
                          <div className="text-left min-w-0">
                            <div className="font-semibold text-sm">{team?.name || 'Unknown Team'}</div>
                            {team && (
                              <div className="text-xs text-gray-500">
                                {[team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </button>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {teamPrograms.length} driver{teamPrograms.length !== 1 ? 's' : ''}
                        </Badge>
                        <button
                          onClick={() => { setAddDriverForTeam(isAddingDriver ? null : teamId); if (!isExpanded) toggleTeam(teamId); }}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors"
                          title="Add driver to team"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        {team && (
                          <button
                            onClick={() => navigate(createPageUrl(`ManageTeams?teamId=${team.id}`))}
                            className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
                            title="Open team editor"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAllTeamPrograms(teamId)}
                          className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove team from series"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Driver rows */}
                      {isExpanded && (
                        <div>
                          <div className="divide-y divide-gray-100">
                            {teamPrograms.map(p => {
                              const driver = driverMap[p.driver_id];
                              const isEditing = editingProgram === p.id;
                              return (
                                <div key={p.id} className="px-4 py-3">
                                  {isEditing ? (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                          <Label className="text-xs text-gray-500">Class</Label>
                                          {seriesClasses.length > 0 ? (
                                            <Select value={editData.class_name} onValueChange={v => setEditData(d => ({ ...d, class_name: v }))}>
                                              <SelectTrigger className="h-8 text-xs mt-1">
                                                <SelectValue placeholder="Select class" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {seriesClasses.map(sc => (
                                                  <SelectItem key={sc.id} value={sc.class_name}>{sc.class_name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <Input className="h-8 text-xs mt-1" value={editData.class_name} onChange={e => setEditData(d => ({ ...d, class_name: e.target.value }))} placeholder="Class" />
                                          )}
                                        </div>
                                        <div>
                                          <Label className="text-xs text-gray-500">Car #</Label>
                                          <Input className="h-8 text-xs mt-1" value={editData.car_number} onChange={e => setEditData(d => ({ ...d, car_number: e.target.value }))} placeholder="#" />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-gray-500">Season</Label>
                                          <Input className="h-8 text-xs mt-1" value={editData.season} onChange={e => setEditData(d => ({ ...d, season: e.target.value }))} placeholder="2025" />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-gray-500">Status</Label>
                                          <Select value={editData.status} onValueChange={v => setEditData(d => ({ ...d, status: v }))}>
                                            <SelectTrigger className="h-8 text-xs mt-1">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="active">Active</SelectItem>
                                              <SelectItem value="completed">Completed</SelectItem>
                                              <SelectItem value="planning">Planning</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(p.id)} disabled={updateProgramMutation.isPending}>
                                          <Check className="w-3 h-3 mr-1" /> Save
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingProgram(null)}>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
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
                                      <button
                                        onClick={() => startEdit(p)}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                        title="Edit program"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      {driver && (
                                        <button
                                          onClick={() => navigate(createPageUrl(`ManageDrivers?driverId=${driver.id}`))}
                                          className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                          title="Open driver editor"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => deleteProgramMutation.mutate(p.id)}
                                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                                        title="Remove from series"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Add driver inline form */}
                          {isAddingDriver && (
                            <div className="border-t border-dashed border-gray-200 bg-gray-50 px-4 py-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-600">Add Driver</span>
                                <button onClick={resetDriverForm} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <Input
                                placeholder="Search driver..."
                                value={driverSearch}
                                onChange={e => setDriverSearch(e.target.value)}
                                className="h-8 text-sm"
                              />
                              {driverSearch && (
                                <div className="max-h-36 overflow-y-auto border rounded bg-white shadow-sm">
                                  {filteredDriversForAdd.length === 0 ? (
                                    <p className="text-xs text-gray-400 p-3 text-center">No drivers found</p>
                                  ) : filteredDriversForAdd.slice(0, 10).map(d => (
                                    <button
                                      key={d.id}
                                      onClick={() => { setNewDriverId(d.id); setDriverSearch(`${d.first_name} ${d.last_name}`); }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${newDriverId === d.id ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}
                                    >
                                      {d.first_name} {d.last_name}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  {seriesClasses.length > 0 ? (
                                    <Select value={newClassName} onValueChange={setNewClassName}>
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Class" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {seriesClasses.map(sc => (
                                          <SelectItem key={sc.id} value={sc.class_name}>{sc.class_name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input className="h-8 text-xs" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Class" />
                                  )}
                                </div>
                                <Input className="h-8 text-xs" value={newCarNumber} onChange={e => setNewCarNumber(e.target.value)} placeholder="Car #" />
                                <Input className="h-8 text-xs" value={newSeason} onChange={e => setNewSeason(e.target.value)} placeholder="Season" />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => handleAddDriverToTeam(teamId)}
                                  disabled={!newDriverId || createProgramMutation.isPending}
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Add Driver
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetDriverForm}>Cancel</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Unaffiliated */}
              {unaffiliatedPrograms.length > 0 && (
                <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
                  <button
                    className="w-full bg-gray-50 px-4 py-3 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleTeam('__no_team__')}
                  >
                    {expandedTeams['__no_team__'] !== false ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="flex-1 text-left text-sm font-medium text-gray-500">No Team Assigned</span>
                    <Badge variant="outline" className="text-xs text-gray-400">{unaffiliatedPrograms.length}</Badge>
                  </button>
                  {expandedTeams['__no_team__'] !== false && (
                    <div className="divide-y divide-gray-100">
                      {unaffiliatedPrograms.map(p => {
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
                              <button
                                onClick={() => navigate(createPageUrl(`ManageDrivers?driverId=${driver.id}`))}
                                className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                title="Open driver editor"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteProgramMutation.mutate(p.id)}
                              className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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