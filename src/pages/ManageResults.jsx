import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function ManageResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResultForEdit, setSelectedResultForEdit] = useState(null);
  const queryClient = useQueryClient();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Results.list('-created_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Results.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['results'] }),
  });

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const filteredResults = results.filter(result => {
    const driverName = getDriverName(result.driver_id);
    return driverName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (selectedResultForEdit) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedResultForEdit(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-2">Edit Result</h1>
              <p className="text-gray-600">Manage result details</p>
            </div>
          </div>

          <Tabs defaultValue="core" className="mt-6">
            <TabsList>
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="timing">Timing</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Result core details editor coming soon</p>
              </div>
            </TabsContent>
            <TabsContent value="timing" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Timing details editor coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PageShell>
    );
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `results-export-${new Date().toISOString().split('T')[0]}.json`;
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
        
        await base44.entities.Results.bulkCreate(dataArray.map(({ id, created_date, updated_date, created_by, ...rest }) => rest));
        queryClient.invalidateQueries({ queryKey: ['results'] });
        alert(`Successfully imported ${dataArray.length} result(s)`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
            <h1 className="text-4xl font-black mb-2">Manage Results</h1>
            <p className="text-gray-600">{results.length} total results</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('import-results').click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="import-results"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button className="bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Result
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Series</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredResults.map(result => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold">{result.position || 'N/A'}</td>
                    <td className="px-6 py-4 font-medium">{getDriverName(result.driver_id)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{result.team_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{result.series || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        result.status_text === 'Running' ? 'bg-green-100 text-green-800' :
                        result.status_text === 'DNF' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.status_text || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedResultForEdit(result)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this result?')) {
                            deleteMutation.mutate(result.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
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