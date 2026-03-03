import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Upload, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import StandingsForm from '@/components/management/StandingsForm';

export default function ManageStandings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');

  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Standings.list('-season'),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.Standings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Standings.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      setSelectedEntries([]);
    },
  });

  const filteredEntries = entries.filter(entry =>
    entry.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.series_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEntries(filteredEntries.map(e => e.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleSelectEntry = (id, checked) => {
    if (checked) {
      setSelectedEntries([...selectedEntries, id]);
    } else {
      setSelectedEntries(selectedEntries.filter(eid => eid !== id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedEntries.length} entries?`)) {
      bulkDeleteMutation.mutate(selectedEntries);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this standings entry?')) {
      deleteEntryMutation.mutate(id);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `standings-export-${new Date().toISOString().split('T')[0]}.json`;
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
        
        await base44.entities.Standings.bulkCreate(dataArray.map(({ id, created_date, updated_date, created_by, ...rest }) => rest));
        queryClient.invalidateQueries({ queryKey: ['standings'] });
        alert(`Successfully imported ${dataArray.length} standings entries`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSyncFromSheets = async () => {
    setSyncStatus('loading');
    setSyncMessage('Syncing standings from Google Sheets...');
    
    try {
      const response = await base44.functions.invoke('syncStandingsFromSheets', {});
      if (response.data.success) {
        setSyncStatus('success');
        setSyncMessage(`${response.data.message} (${response.data.series.join(', ')})`);
        queryClient.invalidateQueries({ queryKey: ['standings'] });
        setTimeout(() => setSyncStatus(null), 5000);
      } else {
        setSyncStatus('error');
        setSyncMessage(response.data.error || 'Sync failed');
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(error.message || 'Error syncing standings');
    }
  };

  return (
    <ManagementLayout currentPage="ManageStandings">
      <ManagementShell title="Manage Standings" subtitle="Update championship standings">
        <div className="flex justify-end gap-2 mb-6">
            <Button
              variant="outline"
              onClick={handleSyncFromSheets}
              disabled={syncStatus === 'loading'}
              className={syncStatus === 'success' ? 'border-green-500 text-green-700' : syncStatus === 'error' ? 'border-red-500 text-red-700' : ''}
            >
              {syncStatus === 'loading' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : syncStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-4 h-4 mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Sync from Sheets
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('import-standings').click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="import-standings"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button onClick={handleAdd} className="bg-[#232323] hover:bg-[#1A3249]">
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
        </div>

        {syncMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            syncStatus === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            syncStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {syncMessage}
          </div>
        )}

        {showForm ? (
          <StandingsForm
            entry={editingEntry}
            onClose={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['standings'] });
              setShowForm(false);
              setEditingEntry(null);
            }}
          />
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by driver, series, or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {selectedEntries.length > 0 && (
              <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
                <span className="text-sm font-medium">{selectedEntries.length} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 mb-2" />
                ))}
              </div>
            ) : filteredEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <Checkbox
                          checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Series / Class</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Points</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Wins</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Checkbox
                            checked={selectedEntries.includes(entry.id)}
                            onChange={(e) => handleSelectEntry(entry.id, e.target.checked)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-lg">{entry.position}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold">{entry.first_name} {entry.last_name}</div>
                          {entry.bib_number && <div className="text-sm text-gray-600">#{entry.bib_number}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">{entry.series_name}</div>
                          <div className="text-xs text-gray-600">{entry.class_name}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold">{entry.total_points}</td>
                        <td className="px-6 py-4">{entry.wins}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <p>No standings entries found</p>
              </div>
            )}
          </div>
        )}
      </ManagementShell>
    </ManagementLayout>
  );
}