import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import StandingsForm from '@/components/management/StandingsForm';

export default function ManageStandings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState([]);

  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.StandingsEntry.list('-season'),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.StandingsEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.StandingsEntry.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      setSelectedEntries([]);
    },
  });

  const filteredEntries = entries.filter(entry =>
    entry.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.series_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.team_name?.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <PageShell className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Standings</h1>
            <p className="text-gray-600 mt-1">Update championship standings</p>
          </div>
          <Button onClick={handleAdd} className="bg-[#232323] hover:bg-[#1A3249]">
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {showForm ? (
          <StandingsForm
            entry={editingEntry}
            onClose={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
          />
        ) : (
          <>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search standings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedEntries.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedEntries.length}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No standings entries found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Pos</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Driver</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Team</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Series</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Class</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Season</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Points</th>
                      <th className="w-32 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedEntries.includes(entry.id)}
                            onCheckedChange={(checked) => handleSelectEntry(entry.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-bold">{entry.position}</td>
                        <td className="px-4 py-3 font-medium">{entry.driver_name}</td>
                        <td className="px-4 py-3 text-gray-600">{entry.team_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entry.series_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entry.class_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{entry.season}</td>
                        <td className="px-4 py-3 font-semibold">{entry.points}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(entry)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
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
          </>
        )}
      </div>
    </PageShell>
  );
}