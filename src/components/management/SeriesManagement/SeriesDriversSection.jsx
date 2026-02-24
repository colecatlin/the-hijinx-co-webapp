import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, ExternalLink, Trash2, Search, User, Flag, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';

export default function SeriesDriversSection({ seriesId, seriesName }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [expandedClasses, setExpandedClasses] = useState({});

  // Programs for this series
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['seriesPrograms', seriesId],
    queryFn: () => base44.entities.DriverProgram.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  // All drivers
  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('last_name', 500),
  });

  // All teams
  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 200),
  });

  // Classes for this series
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId, active: true }),
    enabled: !!seriesId,
  });

  const driverMap = Object.fromEntries(allDrivers.map(d => [d.id, d]));
  const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));

  const createProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverProgram.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesPrograms', seriesId] });
      toast.success('Driver added to series');
      setShowAddForm(false);
      setSelectedDriverId('');
      setSelectedTeamId('');
      setSelectedClassName('');
      setCarNumber('');
      setSeason(String(new Date().getFullYear()));
      setDriverSearch('');
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverProgram.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesPrograms', seriesId] });
      toast.success('Driver removed from series');
    },
  });

  const handleAddDriver = () => {
    if (!selectedDriverId) { toast.error('Select a driver'); return; }
    const driver = driverMap[selectedDriverId];
    createProgramMutation.mutate({
      driver_id: selectedDriverId,
      series_id: seriesId,
      series_name: seriesName,
      team_id: selectedTeamId || undefined,
      team_name: selectedTeamId ? teamMap[selectedTeamId]?.name : undefined,
      class_name: selectedClassName || undefined,
      car_number: carNumber || undefined,
      season,
      status: 'active',
    });
  };

  // Group programs by class
  const programsByClass = {};
  programs.forEach(p => {
    const key = p.class_name || 'No Class';
    if (!programsByClass[key]) programsByClass[key] = [];
    programsByClass[key].push(p);
  });

  // Filter available drivers (not already in series for this season)
  const existingDriverIds = new Set(programs.map(p => p.driver_id));
  const availableDrivers = allDrivers.filter(d => {
    const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
    return fullName.includes(driverSearch.toLowerCase());
  });

  const toggleClass = (cls) => {
    setExpandedClasses(prev => ({ ...prev, [cls]: !prev[cls] }));
  };

  const totalDrivers = programs.length;
  const activeDrivers = programs.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{totalDrivers}</div>
          <div className="text-sm text-gray-500 mt-1">Total Drivers</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{activeDrivers}</div>
          <div className="text-sm text-gray-500 mt-1">Active</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{Object.keys(programsByClass).length}</div>
          <div className="text-sm text-gray-500 mt-1">Classes</div>
        </Card>
      </div>

      {/* Driver roster */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Driver Roster
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Driver
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-gray-500 py-4">Loading...</div>
          ) : programs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No drivers linked to this series.</p>
              <p className="text-xs mt-1">Add drivers via "Add Driver" or from the Driver management page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(programsByClass).sort(([a], [b]) => a.localeCompare(b)).map(([className, classPrograms]) => {
                const isExpanded = expandedClasses[className] !== false; // default open
                return (
                  <div key={className} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Class header */}
                    <button
                      className="w-full bg-gray-50 px-4 py-3 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                      onClick={() => toggleClass(className)}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className="font-semibold text-sm flex-1 text-left">{className}</span>
                      <Badge variant="outline" className="text-xs">{classPrograms.length} driver{classPrograms.length !== 1 ? 's' : ''}</Badge>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {classPrograms.map(program => {
                          const driver = driverMap[program.driver_id];
                          const team = program.team_id ? teamMap[program.team_id] : null;
                          return (
                            <div key={program.id} className="px-4 py-3 flex items-center gap-3">
                              {/* Car number */}
                              {program.car_number && (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 min-w-[40px] text-center font-bold">
                                  #{program.car_number}
                                </span>
                              )}

                              {/* Driver info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">
                                    {driver ? `${driver.first_name} ${driver.last_name}` : program.driver_id}
                                  </span>
                                  {driver?.hometown_country && (
                                    <span className="text-xs text-gray-400">{driver.hometown_country}</span>
                                  )}
                                  {program.season && (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{program.season}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {team && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Flag className="w-3 h-3" />
                                      {team.name}
                                    </span>
                                  )}
                                  {!team && program.team_name && (
                                    <span className="text-xs text-gray-500">{program.team_name}</span>
                                  )}
                                </div>
                              </div>

                              {/* Status */}
                              <StatusBadge status={program.status} />

                              {/* Links to entities */}
                              <div className="flex items-center gap-1">
                                {driver && (
                                  <button
                                    onClick={() => onNavigateToDriver && onNavigateToDriver(driver)}
                                    title="Edit Driver"
                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                  >
                                    <User className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {team && (
                                  <button
                                    onClick={() => onNavigateToTeam && onNavigateToTeam(team)}
                                    title="Edit Team"
                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                  >
                                    <Flag className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm('Remove this driver from the series?')) {
                                      deleteProgramMutation.mutate(program.id);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add driver form */}
      {showAddForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Add Driver to Series</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Driver search */}
            <div>
              <label className="text-sm font-medium mb-1 block">Search & Select Driver *</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name..."
                  value={driverSearch}
                  onChange={e => { setDriverSearch(e.target.value); setSelectedDriverId(''); }}
                  className="pl-9"
                />
              </div>
              <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto">
                {availableDrivers.slice(0, 25).map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => {
                      setSelectedDriverId(driver.id);
                      setDriverSearch(`${driver.first_name} ${driver.last_name}`);
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                      selectedDriverId === driver.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{driver.first_name} {driver.last_name}</div>
                      <div className="text-xs text-gray-500">
                        {[driver.primary_discipline, driver.hometown_state, driver.hometown_country].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    {existingDriverIds.has(driver.id) && (
                      <span className="ml-auto text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded">Already in series</span>
                    )}
                  </button>
                ))}
                {availableDrivers.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-400 text-center">No drivers found</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Class */}
              <div>
                <label className="text-sm font-medium mb-1 block">Class</label>
                {seriesClasses.length > 0 ? (
                  <Select value={selectedClassName} onValueChange={setSelectedClassName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesClasses.map(cls => (
                        <SelectItem key={cls.id} value={cls.class_name}>{cls.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g. Pro 4, Open"
                    value={selectedClassName}
                    onChange={e => setSelectedClassName(e.target.value)}
                  />
                )}
              </div>

              {/* Car number */}
              <div>
                <label className="text-sm font-medium mb-1 block">Car / Bib #</label>
                <Input
                  placeholder="e.g. 14"
                  value={carNumber}
                  onChange={e => setCarNumber(e.target.value)}
                />
              </div>

              {/* Team */}
              <div>
                <label className="text-sm font-medium mb-1 block">Team <span className="text-gray-400 font-normal">(optional)</span></label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Season */}
              <div>
                <label className="text-sm font-medium mb-1 block">Season</label>
                <Input
                  placeholder="e.g. 2026"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAddDriver}
                disabled={createProgramMutation.isPending || !selectedDriverId}
                className="bg-[#232323]"
              >
                {createProgramMutation.isPending ? 'Adding...' : 'Add Driver'}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowAddForm(false);
                setSelectedDriverId('');
                setDriverSearch('');
                setSelectedClassName('');
                setCarNumber('');
                setSelectedTeamId('');
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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