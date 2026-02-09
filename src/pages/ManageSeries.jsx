import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import SeriesForm from '@/components/management/SeriesForm';

export default function ManageSeries() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSeries, setEditingSeries] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState([]);

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

  return (
    <PageShell className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Series</h1>
            <p className="text-gray-600 mt-1">Define racing series and classes</p>
          </div>
          <Button onClick={handleAdd} className="bg-[#232323] hover:bg-[#1A3249]">
            <Plus className="w-4 h-4 mr-2" />
            Add Series
          </Button>
        </div>

        {showForm ? (
          <SeriesForm
            series={editingSeries}
            onClose={() => {
              setShowForm(false);
              setEditingSeries(null);
            }}
          />
        ) : (
          <>
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
              {selectedSeries.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedSeries.length}
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
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedSeries.length === filteredSeries.length && filteredSeries.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Classes</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Current Season</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="w-32 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeries.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedSeries.includes(s.id)}
                            onCheckedChange={(checked) => handleSelectSeries(s.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {s.classes?.join(', ') || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.current_season || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
          </>
        )}
      </div>
    </PageShell>
  );
}