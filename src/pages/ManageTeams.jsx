import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import TeamForm from '@/components/management/TeamForm';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadTemplate } from '@/components/shared/downloadTemplate';
import TeamCoreDetailsSection from '@/components/management/TeamManagement/TeamCoreDetailsSection';
import TeamProgramsSection from '@/components/management/TeamManagement/TeamProgramsSection';
import TeamVehiclesSection from '@/components/management/TeamManagement/TeamVehiclesSection';
import TeamRosterSection from '@/components/management/TeamManagement/TeamRosterSection';
import TeamPerformanceSection from '@/components/management/TeamManagement/TeamPerformanceSection';
import TeamPartnersSection from '@/components/management/TeamManagement/TeamPartnersSection';
import TeamMediaSection from '@/components/management/TeamManagement/TeamMediaSection';
import TeamOperationsSection from '@/components/management/TeamManagement/TeamOperationsSection';
import TeamCommunitySection from '@/components/management/TeamManagement/TeamCommunitySection';

export default function ManageTeams() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('-updated_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const filteredTeams = teams.filter(team => {
    const query = searchQuery.toLowerCase();
    return team.name?.toLowerCase().includes(query);
  });;

  const handleEdit = (team) => {
    setSelectedTeamForEdit(team);
  };

  const handleDelete = async (team) => {
    if (window.confirm(`Delete ${team.name}?`)) {
      deleteMutation.mutate(team.id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTeam(null);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(teams, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teams-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        const dataArray = Array.isArray(importedData) ? importedData : [importedData];
        
        await base44.entities.Team.bulkCreate(dataArray.map(({ id, created_date, updated_date, created_by, ...rest }) => rest));
        queryClient.invalidateQueries({ queryKey: ['teams'] });
        alert(`Successfully imported ${dataArray.length} team(s)`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (showForm) {
    return <TeamForm team={editingTeam} onClose={handleFormClose} />;
  }

  if (selectedTeamForEdit) {
    const isNewTeam = selectedTeamForEdit.id === 'new';
    const hasCoreDetails = selectedTeamForEdit.name && selectedTeamForEdit.slug && selectedTeamForEdit.headquarters_city;
    const tabsLocked = isNewTeam || !hasCoreDetails;

    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTeamForEdit(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-2">{selectedTeamForEdit.name || 'New Team'}</h1>
              <p className="text-gray-600">Manage all team data</p>
            </div>
          </div>

          {tabsLocked && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Complete the core details first to unlock other sections
            </div>
          )}

          <Tabs defaultValue="core" className="w-full">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="core">Core</TabsTrigger>
              <TabsTrigger value="programs" disabled={tabsLocked}>Programs</TabsTrigger>
              <TabsTrigger value="vehicles" disabled={tabsLocked}>Vehicles</TabsTrigger>
              <TabsTrigger value="roster" disabled={tabsLocked}>Roster</TabsTrigger>
              <TabsTrigger value="performance" disabled={tabsLocked}>Performance</TabsTrigger>
              <TabsTrigger value="partners" disabled={tabsLocked}>Partners</TabsTrigger>
              <TabsTrigger value="media" disabled={tabsLocked}>Media</TabsTrigger>
              <TabsTrigger value="operations" disabled={tabsLocked}>Operations</TabsTrigger>
              <TabsTrigger value="community" disabled={tabsLocked}>Community</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <TeamCoreDetailsSection 
                teamId={selectedTeamForEdit.id} 
                onTeamCreated={(newTeam) => setSelectedTeamForEdit(newTeam)}
              />
            </TabsContent>
            <TabsContent value="programs" className="mt-6">
              <TeamProgramsSection teamId={selectedTeamForEdit.id} />
            </TabsContent>
            <TabsContent value="vehicles" className="mt-6">
              <TeamVehiclesSection teamId={selectedTeamForEdit.id} />
            </TabsContent>
            <TabsContent value="roster" className="mt-6">
              <TeamRosterSection teamId={selectedTeamForEdit.id} />
            </TabsContent>
            <TabsContent value="performance" className="mt-6">
              <TeamPerformanceSection teamId={selectedTeamForEdit.id} />
            </TabsContent>
            <TabsContent value="partners" className="mt-6">
              <TeamPartnersSection teamId={selectedTeamForEdit.id} />
            </TabsContent>
            <TabsContent value="media" className="mt-6">
              <TeamMediaSection teamId={selectedTeamForEdit.id} />
            </TabsContent>
            <TabsContent value="operations" className="mt-6">
              <TeamOperationsSection teamId={selectedTeamForEdit.id} />
            </TabsContent>
            <TabsContent value="community" className="mt-6">
              <TeamCommunitySection teamId={selectedTeamForEdit.id} />
            </TabsContent>
          </Tabs>
        </div>
      </PageShell>
    );
  }

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
            <h1 className="text-4xl font-black mb-2">Manage Teams</h1>
            <p className="text-gray-600">{teams.length} total teams</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadTemplate('team', 'Team')} title="Download import template">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('import-teams').click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="import-teams"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button onClick={() => setSelectedTeamForEdit({ id: 'new', name: '', slug: '', headquarters_city: '', headquarters_state: '', primary_discipline: '', status: 'Active' })} className="bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Team
            </Button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Discipline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-gray-500">{team.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {team.headquarters_city}, {team.headquarters_state}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {team.primary_discipline}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        team.status === 'Active' ? 'bg-green-100 text-green-800' :
                        team.status === 'Part Time' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {team.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(team)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(team)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredTeams.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No teams found
          </div>
        )}
      </div>
    </PageShell>
  );
}