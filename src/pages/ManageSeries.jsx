import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Upload, Download } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import SeriesForm from '@/components/management/SeriesForm';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { downloadTemplate } from '@/components/shared/downloadTemplate';

export default function ManageSeries() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSeries, setEditingSeries] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [filters, setFilters] = useState({
    discipline: 'all',
    region: 'all',
    competition_level: 'all',
    status: 'all',
  });
  const [sortBy, setSortBy] = useState('name');

  const queryClient = useQueryClient();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('-created_date'),
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: (id) => base44.entities.Series.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Series.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setSelectedSeries([]);
    },
  });

  const filteredSeries = series
    .filter(s => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      if (filters.discipline !== 'all' && s.discipline !== filters.discipline) return false;
      if (filters.region !== 'all' && s.region !== filters.region) return false;
      if (filters.competition_level !== 'all' && s.competition_level !== filters.competition_level) return false;
      if (filters.status !== 'all' && s.status !== filters.status) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'founded') return (b.founded_year || 0) - (a.founded_year || 0);
      if (sortBy === 'discipline') return (a.discipline || '').localeCompare(b.discipline || '');
      if (sortBy === 'content_value') {
        const order = { High: 1, Medium: 2, Low: 3, Unknown: 4 };
        return (order[a.content_value] || 4) - (order[b.content_value] || 4);
      }
      return 0;
    });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSeries(filteredSeries.map(s => s.id));
    } else {
      setSelectedSeries([]);
    }
  };

  const handleSelectSeries = (id, checked) => {
    if (checked) {
      setSelectedSeries([...selectedSeries, id]);
    } else {
      setSelectedSeries(selectedSeries.filter(sid => sid !== id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedSeries.length} series?`)) {
      bulkDeleteMutation.mutate(selectedSeries);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this series?')) {
      deleteSeriesMutation.mutate(id);
    }
  };

  const handleEdit = (s) => {
    setEditingSeries(s);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingSeries(null);
    setShowForm(true);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(series, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `series-export-${new Date().toISOString().split('T')[0]}.json`;
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
        
        await base44.entities.Series.bulkCreate(dataArray.map(({ id, created_date, updated_date, created_by, ...rest }) => rest));
        queryClient.invalidateQueries({ queryKey: ['series'] });
        alert(`Successfully imported ${dataArray.length} series`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <PageShell className="bg-white">
      <div className="min-h-screen bg-white">
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl lg:text-5xl font-black mb-2">Manage Series</h1>
                <p className="text-gray-600 text-lg">{series.length} total series</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadTemplate('series', 'Series')} title="Download import template">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" onClick={() => document.getElementById('import-series').click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <input
                  id="import-series"
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button onClick={handleAdd} className="bg-[#232323] hover:bg-[#1A3249]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Series
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showForm ? (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <SeriesForm
              series={editingSeries}
              onClose={() => {
                setShowForm(false);
                setEditingSeries(null);
              }}
            />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-8">
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
                    { value: 'Asphalt Oval', label: 'Asphalt Oval' },
                    { value: 'Road Racing', label: 'Road Racing' },
                    { value: 'Off Road', label: 'Off Road' },
                    { value: 'Snowmobile', label: 'Snowmobile' },
                    { value: 'Rallycross', label: 'Rallycross' },
                    { value: 'Mixed', label: 'Mixed' },
                  ]
                },
                {
                  key: 'region',
                  label: 'Region',
                  options: [
                    { value: 'all', label: 'All Regions' },
                    { value: 'Global', label: 'Global' },
                    { value: 'North America', label: 'North America' },
                    { value: 'Europe', label: 'Europe' },
                    { value: 'Regional', label: 'Regional' },
                  ]
                },
                {
                  key: 'competition_level',
                  label: 'Level',
                  options: [
                    { value: 'all', label: 'All Levels' },
                    { value: 'Professional', label: 'Professional' },
                    { value: 'Semi Pro', label: 'Semi Pro' },
                    { value: 'Amateur', label: 'Amateur' },
                  ]
                },
                {
                  key: 'status',
                  label: 'Status',
                  options: [
                    { value: 'all', label: 'All Status' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Historic', label: 'Historic' },
                  ]
                },
              ]}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOptions={[
                { value: 'name', label: 'Name' },
                { value: 'founded', label: 'Founded' },
                { value: 'discipline', label: 'Discipline' },
                { value: 'content_value', label: 'Content Value' },
              ]}
            />

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : filteredSeries.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">No series found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {filteredSeries.map((s) => (
                  <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg mb-1">{s.name}</h3>
                        <p className="text-sm text-gray-500">{s.discipline}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(s)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-gray-600"><span className="font-medium">Region:</span> {s.region}</p>
                      <p className="text-gray-600"><span className="font-medium">Level:</span> {s.competition_level}</p>
                      <p className="text-gray-600"><span className="font-medium">Founded:</span> {s.founded_year || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        s.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}