import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Copy, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function DriverDuplicateFinder({ drivers, open, onOpenChange, onSuccess }) {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const getCompletionScore = (driver) => {
    let score = 0;
    const fields = ['date_of_birth', 'contact_email', 'represented_by', 'hometown_city', 'hometown_state', 'hometown_country', 'racing_base_city', 'racing_base_state', 'racing_base_country', 'primary_number', 'manufacturer', 'primary_discipline', 'team_id', 'primary_series_id', 'primary_class_id', 'career_status', 'primary_color'];
    fields.forEach(field => {
      if (driver[field]) score += 1;
    });
    return score;
  };

  const findDuplicates = () => {
    setLoading(true);
    const groups = {};
    
    drivers.forEach(driver => {
      const key = `${driver.first_name}${driver.last_name}`.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(driver);
    });

    const duplicateGroups = Object.entries(groups)
      .filter(([_, group]) => group.length > 1)
      .map(([_, group]) => {
        const sorted = [...group].sort((a, b) => getCompletionScore(b) - getCompletionScore(a));
        return sorted;
      });

    setDuplicates(duplicateGroups);
    setLoading(false);
  };

  React.useEffect(() => {
    if (open) {
      findDuplicates();
    }
  }, [open]);

  const deleteMutation = useMutation({
    mutationFn: async (driverId) => {
      await base44.entities.Driver.delete(driverId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver deleted');
      findDuplicates();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.Driver.delete(id);
        await new Promise(r => setTimeout(r, 150));
      }
    },
    onSuccess: (_, ids) => {
      base44.functions.invoke('logOperation', {
        entity_type: 'Driver',
        action: 'bulk_delete_duplicates',
        count: ids.length,
        description: `Deleted ${ids.length} duplicate driver(s)`
      });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('All duplicates deleted');
      findDuplicates();
    },
  });

  const handleDelete = (driverId) => {
    if (window.confirm('Delete this driver?')) {
      deleteMutation.mutate(driverId);
    }
  };

  const handleDeleteAll = () => {
    const allDuplicateIds = duplicates.flatMap(group => group.slice(1).map(d => d.id));
    if (window.confirm(`Delete ${allDuplicateIds.length} duplicate(s) across all groups?`)) {
      bulkDeleteMutation.mutate(allDuplicateIds);
    }
  };

  const handleMerge = (keepDriverId, deleteDriverIds) => {
    if (window.confirm(`Keep the first driver and delete ${deleteDriverIds.length} duplicate(s)?`)) {
      deleteDriverIds.forEach(id => deleteMutation.mutate(id));
    }
  };

  if (duplicates.length === 0 && !loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Find Duplicate Drivers</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-gray-600 mb-4">✓ No duplicates found</p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Found {duplicates.length} Duplicate Group{duplicates.length !== 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {duplicates.map((group, groupIdx) => (
            <div key={groupIdx} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900">
                    {group[0].first_name} {group[0].last_name}
                  </h3>
                  <p className="text-sm text-yellow-800">{group.length} entries found</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {group.map((driver, idx) => (
                  <div
                    key={driver.id}
                    className={`p-3 rounded border ${
                      idx === 0
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          {driver.first_name} {driver.last_name}
                          {idx === 0 && (
                            <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                              Keep
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {driver.hometown_city}, {driver.hometown_state} • {driver.primary_discipline}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {driver.id}
                        </div>
                      </div>
                      {idx > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(driver.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {group.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    handleMerge(
                      group[0].id,
                      group.slice(1).map(d => d.id)
                    )
                  }
                  disabled={deleteMutation.isPending}
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Merge (Delete Other {group.length - 1})
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-2">
            {duplicates.length > 0 && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAll}
                  disabled={bulkDeleteMutation.isPending}
                  className="text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete All Duplicates
                </Button>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}