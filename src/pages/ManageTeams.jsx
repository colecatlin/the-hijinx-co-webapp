import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Pencil, Trash2, Upload, Download, Sparkles, ExternalLink } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { useNavigate } from 'react-router-dom';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadTemplate } from '@/components/shared/downloadTemplate';
import ActivityTab from '@/components/management/ActivityTab';
import PublishTab from '@/components/management/PublishTab';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import ProfileTasksSummary from '@/components/management/ProfileTasksSummary';
import { toast } from 'sonner';

export default function ManageTeams() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // Deep-link: ?teamId=xxx → route directly to Race Core canonical editor
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('teamId');
    if (teamId) {
      navigate('/race-core/teams/' + teamId);
    }
  }, []);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('-updated_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      await base44.entities.Team.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Team', recordIds: [id], recordNames: [name] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, names }) => {
      for (const id of ids) {
        await base44.entities.Team.delete(id);
      }
      await base44.functions.invoke('logDeletion', { entityName: 'Team', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setSelectedTeams([]);
      toast.success('Teams deleted successfully');
    },
  });

  const filteredTeams = teams.filter(team =>
    team.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (team) => navigate('/race-core/teams/' + team.id);

  const handleDelete = (team) => {
    setTeamToDelete(team);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!teamToDelete) return;
    setShowDeleteConfirm(false);
    deleteMutation.mutate({ id: teamToDelete.id, name: teamToDelete.name });
    setTeamToDelete(null);
  };

  const handleBulkDelete = () => setBulkDeleteConfirm(true);

  const confirmBulkDelete = () => {
    setBulkDeleteConfirm(false);
    const selectedItems = filteredTeams.filter(t => selectedTeams.includes(t.id));
    bulkDeleteMutation.mutate({
      ids: selectedTeams,
      names: selectedItems.map(t => t.name),
    });
  };

  const handleSelectAll = (checked) => {
    setSelectedTeams(checked ? filteredTeams.map(t => t.id) : []);
  };

  const handleSelectTeam = (id) => {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    const res = await base44.functions.invoke('enrichTeamData');
    setEnriching(false);
    setEnrichResult(res.data);
    if (res.data?.success) queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  const handleNascarImport = async () => {
    setImporting(true);
    setImportResult(null);
    const res = await base44.functions.invoke('importNascarStandings', { series: 'nascar-cup-series' });
    setImporting(false);
    setImportResult(res.data);
    if (res.data?.success) queryClient.invalidateQueries({ queryKey: ['teams'] });
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
        toast.success(`Successfully imported ${dataArray.length} team(s)`);
      } catch (error) {
        toast.error('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <ManagementLayout currentPage="ManageTeams">
      <ManagementShell
        title="Teams"
        subtitle={`${teams.length} total teams`}
        actions={activeTab === 'data' ? <>
          <input id="import-teams" type="file" accept=".json" onChange={handleImport} className="hidden" />
          <Button variant="outline" onClick={() => downloadTemplate('team', 'Team')} title="Download import template"><Download className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button variant="outline" onClick={() => document.getElementById('import-teams').click()}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button onClick={handleNascarImport} disabled={importing} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50"><Sparkles className="w-4 h-4 mr-2" />{importing ? 'Importing...' : 'NASCAR Import'}</Button>
          <Button onClick={handleEnrich} disabled={enriching} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50"><Sparkles className="w-4 h-4 mr-2" />{enriching ? 'Enriching...' : 'AI Enrich'}</Button>
          <Button onClick={() => navigate('/race-core/teams/new')} className="bg-gray-900"><Plus className="w-4 h-4 mr-2" />Add Team</Button>
        </> : undefined}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Teams</p>
                <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">{teams.filter(t => t.racing_status === 'Active').length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{teams.filter(t => t.racing_status !== 'Active').length}</p>
              </div>
            </div>
            <ProfileTasksSummary entityType="Team" records={teams} />
            <Button onClick={() => navigate('/race-core/teams/new')} className="w-full bg-[#232323] hover:bg-[#1A3249]">
              <Plus className="w-4 h-4 mr-2" />Add Team
            </Button>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            {importResult && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${importResult.success ? 'bg-blue-50 border border-blue-200 text-blue-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {importResult.success
                  ? `✓ ${importResult.series_name} (${importResult.season}) — Teams: ${importResult.teams?.created} created, ${importResult.teams?.skipped} already existed.`
                  : importResult.error}
              </div>
            )}
            {enrichResult && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${enrichResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {enrichResult.message || enrichResult.error}
              </div>
            )}

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
              {isAdmin && selectedTeams.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  {bulkDeleteMutation.isPending ? <BurnoutSpinner /> : <Trash2 className="w-4 h-4 mr-2" />}
                  {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedTeams.length}`}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {isAdmin && <th className="px-6 py-3 text-left w-12">
                        <Checkbox
                          checked={selectedTeams.length === filteredTeams.length && filteredTeams.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>}
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Discipline</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTeams.map((team) => (
                      <tr key={team.id} className="hover:bg-gray-50">
                        {isAdmin && <td className="px-6 py-4">
                          <Checkbox
                            checked={selectedTeams.includes(team.id)}
                            onCheckedChange={() => handleSelectTeam(team.id)}
                          />
                        </td>}
                        <td className="px-6 py-4">
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-gray-500">{team.slug}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{team.headquarters_city}, {team.headquarters_state}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{team.primary_discipline}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            team.racing_status === 'Active' ? 'bg-green-100 text-green-800' :
                            team.racing_status === 'Part Time' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {team.racing_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate(buildRaceCoreUrl({ tab: 'entries', focusTeamId: team.id }))} title="Open in Race Core">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(team)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(team)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending
                                  ? <div className="text-gray-400"><BurnoutSpinner /></div>
                                  : <Trash2 className="w-4 h-4 text-red-600" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && filteredTeams.length === 0 && (
              <div className="text-center py-12 text-gray-500">No teams found</div>
            )}
          </TabsContent>

          <TabsContent value="relationships" className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Team Relationships</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Drivers</p>
                  <p className="text-lg font-semibold">In Roster</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Series</p>
                  <p className="text-lg font-semibold">Programs</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Vehicles</p>
                  <p className="text-lg font-semibold">Fleet</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Manage team relationships by editing the team's sections.</p>
            </div>
          </TabsContent>

          <TabsContent value="publish">
            <PublishTab entityCount={teams.length} draftCount={0} liveCount={teams.length} hasPublishControl={false} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab entityName="Team" />
          </TabsContent>
        </Tabs>
      </ManagementShell>

      {/* Single delete confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{teamToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTeams.length} team(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedTeams.length} selected teams</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700">Yes, delete all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ManagementLayout>
  );
}