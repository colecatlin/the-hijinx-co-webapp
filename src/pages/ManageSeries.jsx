import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Upload, Download, ArrowLeft } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
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

export default function ManageSeries() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSeries, setEditingSeries] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSeriesForEdit, setSelectedSeriesForEdit] = useState(null);

  const queryClient = useQueryClient();

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

  const filteredSeries = series.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id) => {
    if (confirm('Delete this series?')) {
      deleteSeriesMutation.mutate(id);
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
        <PageShell>
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
        </PageShell>
      );
    }

    return (
      <PageShell>
        <SeriesForm
          series={editingSeries}
          onClose={() => {
            setShowForm(false);
            setEditingSeries(null);
          }}
        />
      </PageShell>
    );
  }

  if (selectedSeriesForEdit) {
    return (
      <PageShell>
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
              <SeriesEventsSection seriesId={selectedSeriesForEdit.id} />
            </TabsContent>
            <TabsContent value="media" className="mt-6">
              <SeriesMediaSection seriesId={selectedSeriesForEdit.id} />
            </TabsContent>
            <TabsContent value="governance" className="mt-6">
              <SeriesGovernanceSection seriesId={selectedSeriesForEdit.id} />
            </TabsContent>
            <TabsContent value="teams" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Teams management coming soon</p>
              </div>
            </TabsContent>
            <TabsContent value="drivers" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Drivers management coming soon</p>
              </div>
            </TabsContent>
            <TabsContent value="tracks" className="mt-6">
              <SeriesTracksSection seriesId={selectedSeriesForEdit.id} seriesName={selectedSeriesForEdit.name} />
            </TabsContent>
          </Tabs>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-gray-50">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}