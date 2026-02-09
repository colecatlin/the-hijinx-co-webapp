import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import TeamForm from '@/components/management/TeamForm';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadTemplate } from '@/components/shared/downloadTemplate';
import DirectoryFilters from '@/components/shared/DirectoryFilters';

export default function ManageTeams() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    discipline: 'all',
    level: 'all',
    status: 'all',
    state: 'all',
  });
  const [sortBy, setSortBy] = useState('name');
  const queryClient = useQueryClient();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Team.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setSelectedTeams([]);
    },
  });

  const uniqueStates = [...new Set(teams.map(t => t.headquarters_state).filter(Boolean))].sort();

  const filteredTeams = teams
    .filter(team => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = team.name?.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      if (filters.discipline !== 'all' && team.primary_discipline !== filters.discipline) return false;
      if (filters.level !== 'all' && team.team_level !== filters.level) return false;
      if (filters.status !== 'all' && team.status !== filters.status) return false;
      if (filters.state !== 'all' && team.headquarters_state !== filters.state) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'discipline') return (a.primary_discipline || '').localeCompare(b.primary_discipline || '');
      if (sortBy === 'level') {
        const order = { International: 1, National: 2, Regional: 3, Local: 4 };
        return (order[a.team_level] || 5) - (order[b.team_level] || 5);
      }
      if (sortBy === 'founded') return (b.founded_year || 0) - (a.founded_year || 0);
      if (sortBy === 'content_value') {
        const order = { High: 1, Medium: 2, Low: 3, Unknown: 4 };
        return (order[a.content_value] || 4) - (order[b.content_value] || 4);
      }
      return 0;
    });

  const handleEdit = (team) => {
    setEditingTeam(team);
    setShowForm(true);
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

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-[#232323] mb-2">Manage Teams</h1>
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
            <Button onClick={() => setShowForm(true)} className="bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Team
            </Button>
          </div>
        </div>

        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={[
            {
              key: 'discipline',
              label: 'Discipline',
              options: [
                { value: 'all', label: 'All Disciplines' },
                { value: 'Off Road', label: 'Off Road' },
                { value: 'Snowmobile', label: 'Snowmobile' },
                { value: 'Asphalt Oval', label: 'Asphalt Oval' },
                { value: 'Road Racing', label: 'Road Racing' },
                { value: 'Rallycross', label: 'Rallycross' },
                { value: 'Drag Racing', label: 'Drag Racing' },
                { value: 'Mixed', label: 'Mixed' },
              ]
            },
            {
              key: 'level',
              label: 'Level',
              options: [
                { value: 'all', label: 'All Levels' },
                { value: 'International', label: 'International' },
                { value: 'National', label: 'National' },
                { value: 'Regional', label: 'Regional' },
                { value: 'Local', label: 'Local' },
              ]
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Part Time', label: 'Part Time' },
                { value: 'Historic', label: 'Historic' },
              ]
            },
            {
              key: 'state',
              label: 'State',
              options: [
                { value: 'all', label: 'All States' },
                ...uniqueStates.map(s => ({ value: s, label: s }))
              ]
            },
          ]}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: 'Name' },
            { value: 'discipline', label: 'Discipline' },
            { value: 'level', label: 'Level' },
            { value: 'founded', label: 'Founded Year' },
            { value: 'content_value', label: 'Content Value' },
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <div key={team.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{team.name}</h3>
                    <p className="text-sm text-gray-500">{team.primary_discipline}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(team)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(team)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <p className="text-gray-600"><span className="font-medium">Location:</span> {team.headquarters_city}, {team.headquarters_state}</p>
                  <p className="text-gray-600"><span className="font-medium">Level:</span> {team.team_level}</p>
                  <p className="text-gray-600"><span className="font-medium">Founded:</span> {team.founded_year || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                    team.status === 'Active' ? 'bg-green-100 text-green-800' :
                    team.status === 'Part Time' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {team.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No teams found matching your filters.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}