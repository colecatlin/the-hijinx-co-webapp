import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { Plus, Search, Pencil, Trash2, Upload, Download, ArrowLeft } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import SeriesForm from '@/components/management/SeriesForm';
import CreateSeriesForm from '@/components/management/CreateSeriesForm';
import { downloadTemplate } from '@/components/shared/downloadTemplate';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import SeriesCoreDetailsSection from '@/components/management/SeriesManagement/SeriesCoreDetailsSection';
import SeriesFormatSection from '@/components/management/SeriesManagement/SeriesFormatSection';
import SeriesClassesSection from '@/components/management/SeriesManagement/SeriesClassesSection';
import SeriesEventsSection from '@/components/management/SeriesManagement/SeriesEventsSection';
import SeriesMediaSection from '@/components/management/SeriesManagement/SeriesMediaSection';
import SeriesGovernanceSection from '@/components/management/SeriesManagement/SeriesGovernanceSection';
import SeriesTracksSection from '@/components/management/SeriesManagement/SeriesTracksSection';
import SeriesDriversSection from '@/components/management/SeriesManagement/SeriesDriversSection';
import SeriesTeamsSection from '@/components/management/SeriesManagement/SeriesTeamsSection';
import { useNavigate } from 'react-router-dom';

export default function ManageSeries() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSeries, setEditingSeries] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSeriesForEdit, setSelectedSeriesForEdit] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState([]);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const handleNavigateToDriver = (driver) => {
    navigate(createPageUrl(`ManageDrivers?driverId=${driver.id}`));
  };

  const handleNavigateToTeam = (team) => {
    navigate(createPageUrl(`ManageTeams?teamId=${team.id}`));
  };

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('-created_date'),
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: async (id, series) => {
      await base44.entities.Series.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Series', recordIds: [id], recordNames: [series?.name] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids, selectedItems) => {
      await Promise.all(ids.map(id => base44.entities.Series.delete(id)));
      const names = selectedItems?.map(s => s.name) || [];
      await base44.functions.invoke('logDeletion', { entityName: 'Series', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setSelectedSeries([]);
    },
  });

  const filteredSeries = series.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id) => {
    if (confirm('Delete this series?')) {
      const ser = series.find(s => s.id === id);
      deleteSeriesMutation.mutate(id, ser);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSeries(filteredSeries.map(s => s.id));
    } else {
      setSelectedSeries([]);
    }
  };

  const handleSelectSeriesItem = (id) => {
    setSelectedSeries(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedSeries.length} selected series?`)) {
      const selectedItems = filteredSeries.filter(s => selectedSeries.includes(s.id));
      bulkDeleteMutation.mutate(selectedSeries, selectedItems);
    }
  };

  const handleEdit = (s) => {
    setSelectedSeriesForEdit(s);
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

  if (showForm) {
    if (!editingSeries) {
      return (
        <ManagementLayout currentPage="ManageSeries">
          <CreateSeriesForm
            onClose={() => {
              setShowForm(false);
              setEditingSeries(null);
            }}
            onSeriesCreated={(newSeries) => {
              setShowForm(false);
              setEditingSeries(null);
              setSelectedSeriesForEdit(newSeries);
            }}
          />
        </ManagementLayout>
        );
        }

        return (
        <ManagementLayout currentPage="ManageSeries">
        <SeriesForm
          series={editingSeries}
          onClose={() => {
            setShowForm(false);
            setEditingSeries(null);
          }}
        />
        </ManagementLayout>
    );
  }

  if (selectedSeriesForEdit) {
    return (
      <ManagementLayout currentPage="ManageSeries">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSeriesForEdit(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-2">{selectedSeriesForEdit.name}</h1>
              <p className="text-gray-600">Manage all series data</p>
            </div>
          </div>

          <Tabs defaultValue="core" className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="core" className="text-xs">Core</TabsTrigger>
              <TabsTrigger value="format" className="text-xs">Format</TabsTrigger>
              <TabsTrigger value="classes" className="text-xs">Classes</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
              <TabsTrigger value="governance" className="text-xs">Governance</TabsTrigger>
              <TabsTrigger value="teams" className="text-xs">Teams</TabsTrigger>
              <TabsTrigger value="drivers" className="text-xs">Drivers</TabsTrigger>
              <TabsTrigger value="tracks" className="text-xs">Tracks</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <SeriesCoreDetailsSection seriesId={selectedSeriesForEdit.id} />
            </TabsContent>
            <TabsContent value="format" className="mt-6">
              <SeriesFormatSection seriesId={selectedSeriesForEdit.id} />
            </TabsContent>
            <TabsContent value="classes" className="mt-6">
              <SeriesClassesSection seriesId={selectedSeriesForEdit.id} userRole="admin" />
            </TabsContent>
            <TabsContent value="calendar" className="mt-6">
              <SeriesEventsSection seriesId={selectedSeriesForEdit.id} series={selectedSeriesForEdit} />
            </TabsContent>
            <TabsContent value="media" className="mt-6">
              <SeriesMediaSection seriesId={selectedSeriesForEdit.id} />
            </TabsContent>
            <TabsContent value="governance" className="mt-6">
              <SeriesGovernanceSection seriesId={selectedSeriesForEdit.id} />
            </TabsContent>
            <TabsContent value="teams" className="mt-6">
              <SeriesTeamsSection seriesId={selectedSeriesForEdit.id} seriesName={selectedSeriesForEdit.name} />
            </TabsContent>
            <TabsContent value="drivers" className="mt-6">
              <SeriesDriversSection
                seriesId={selectedSeriesForEdit.id}
                seriesName={selectedSeriesForEdit.name}
                onNavigateToDriver={handleNavigateToDriver}
                onNavigateToTeam={handleNavigateToTeam}
              />
            </TabsContent>
            <TabsContent value="tracks" className="mt-6">
              <SeriesTracksSection seriesId={selectedSeriesForEdit.id} seriesName={selectedSeriesForEdit.name} />
            </TabsContent>
          </Tabs>
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageSeries">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Series</h1>
            <p className="text-gray-600 mt-1">{series.length} total series</p>
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

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && selectedSeries.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className={bulkDeleteMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {bulkDeleteMutation.isPending ? (
                <BurnoutSpinner />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedSeries.length}`}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No series found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {isAdmin && <th className="w-12 px-4 py-3">
                    <Checkbox 
                      checked={selectedSeries.length === filteredSeries.length && filteredSeries.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>}
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Discipline</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Level</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                  <th className="w-32 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSeries.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {isAdmin && <td className="px-4 py-3">
                      <Checkbox 
                        checked={selectedSeries.includes(s.id)}
                        onCheckedChange={() => handleSelectSeriesItem(s.id)}
                      />
                    </td>}
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{s.discipline}</td>
                    <td className="px-4 py-3 text-gray-600">{s.competition_level}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        s.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(s)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(s.id)}
                          disabled={deleteSeriesMutation.isPending}
                          className={deleteSeriesMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          {deleteSeriesMutation.isPending ? (
                            <BurnoutSpinner />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}