import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import ResultForm from '@/components/management/results/ResultForm';
import ResultsBulkUpload from '@/components/management/results/ResultsBulkUpload';
import SmartResultsImport from '@/components/management/results/SmartResultsImport';

export default function ManageResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSmartImportDialog, setShowSmartImportDialog] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Results.list('-created_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Results.delete(id);
      await new Promise(r => setTimeout(r, 100));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['results'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.Results.delete(id);
        await new Promise(r => setTimeout(r, 100));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['results'] }),
  });

  const handleDeleteAll = () => {
    if (window.confirm(`Are you sure? This will permanently delete all ${results.length} results.`)) {
      bulkDeleteMutation.mutate(results.map(r => r.id));
    }
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.name : '—';
  };

  const filteredResults = results.filter(result => {
    const driverName = getDriverName(result.driver_id);
    const eventName = getEventName(result.event_id);
    const q = searchQuery.toLowerCase();
    return driverName.toLowerCase().includes(q) || eventName.toLowerCase().includes(q) || (result.series || '').toLowerCase().includes(q);
  });

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Management')}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2">Manage Results</h1>
            <p className="text-gray-600">{results.length} total results</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSmartImportDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Smart Import
            </Button>
            <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            {results.length > 0 && (
              <Button 
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All ({results.length})
              </Button>
            )}
            <Button className="bg-gray-900" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Result
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by driver, event, or series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-4">No results yet. Add one manually or bulk upload a file.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" /> Bulk Upload
              </Button>
              <Button className="bg-gray-900 text-white" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Result
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Pos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Session</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Series</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Pts</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredResults.map(result => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold">{result.position || '—'}</td>
                    <td className="px-4 py-3 font-medium text-sm">{getDriverName(result.driver_id)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">{getEventName(result.event_id)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{result.session_type || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{result.series || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{result.class || '—'}</td>
                    <td className="px-4 py-3 font-bold tabular-nums text-sm">{result.points ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        result.status_text === 'Running' ? 'bg-green-100 text-green-800' :
                        result.status_text === 'DNF' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.status_text || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditingResult(result)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { if (confirm('Delete this result?')) deleteMutation.mutate(result.id); }}
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

      {/* Add result dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Result</DialogTitle>
          </DialogHeader>
          <ResultForm onSuccess={() => setShowAddDialog(false)} onCancel={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit result dialog */}
      <Dialog open={!!editingResult} onOpenChange={() => setEditingResult(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Result</DialogTitle>
          </DialogHeader>
          {editingResult && (
            <ResultForm
              initialData={editingResult}
              onSuccess={() => setEditingResult(null)}
              onCancel={() => setEditingResult(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Smart import dialog */}
      <Dialog open={showSmartImportDialog} onOpenChange={setShowSmartImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Smart Season Import</DialogTitle>
          </DialogHeader>
          <SmartResultsImport onDone={() => setShowSmartImportDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Bulk upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Results</DialogTitle>
          </DialogHeader>
          <ResultsBulkUpload onDone={() => setShowUploadDialog(false)} />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}