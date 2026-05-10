import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const QuickEntryRow = ({
  result,
  drivers,
  allResults,
  onUpdate,
  onNavigate,
  rowIndex,
  totalRows,
}) => {
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState(result);
  const [error, setError] = useState(null);
  const driver = drivers.find((d) => d.id === formData.driver_id);

  const queryClient = useQueryClient();

  const saveRowMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        driver_id: data.driver_id,
        event_id: data.event_id,
        position: data.position ? parseInt(data.position) : null,
        status: data.status || 'Running',
        laps_completed: data.laps_completed ? parseInt(data.laps_completed) : null,
        session_id: data.session_id,
        session_type: data.session_type,
        series_class_id: data.series_class_id,
        series_id: data.series_id,
        status_state: data.status_state || 'Draft',
      };
      return data.id
        ? base44.entities.Results.update(data.id, payload)
        : base44.entities.Results.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Save failed');
    },
  });

  // Validation
  const positionDuplicate =
    formData.position &&
    allResults.filter((r) => r.position === formData.position && r.id !== result.id).length > 0;
  const missingDriver = !formData.driver_id;
  const invalidPosition = formData.position && (isNaN(formData.position) || formData.position < 1);

  const handleSaveField = useCallback(
    async (field, value) => {
      const updated = { ...formData, [field]: value };
      setFormData(updated);

      // Debounced save
      const timeout = setTimeout(() => {
        saveRowMutation.mutate(updated);
      }, 300);

      return () => clearTimeout(timeout);
    },
    [formData, saveRowMutation]
  );

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex < totalRows - 1) {
        // Move to next row's driver field
        onNavigate(rowIndex + 1, 'driver');
      } else {
        // Last row; blur to save
        setEditingField(null);
      }
    } else if (e.key === 'Tab') {
      // Tab moves to next field in SAME row (position, status, laps, notes)
      const fields = ['driver', 'position', 'status', 'laps_completed'];
      const currentIdx = fields.indexOf(field);
      if (e.shiftKey && currentIdx > 0) {
        e.preventDefault();
        setEditingField(fields[currentIdx - 1]);
      } else if (!e.shiftKey && currentIdx < fields.length - 1) {
        e.preventDefault();
        setEditingField(fields[currentIdx + 1]);
      }
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setFormData(result);
    }
  };

  return (
    <TableRow className="hover:bg-[#262626] h-12">
      {/* Position */}
      <TableCell className="p-1 w-16">
        {editingField === 'position' ? (
          <Input
            type="number"
            min="1"
            value={formData.position || ''}
            onChange={(e) => handleSaveField('position', e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => handleKeyDown(e, 'position')}
            autoFocus
            className={`bg-[#171717] border h-8 text-xs p-1 ${
              positionDuplicate || invalidPosition ? 'border-red-600' : 'border-gray-700'
            }`}
          />
        ) : (
          <div
            onClick={() => setEditingField('position')}
            className={`cursor-pointer px-2 py-1 text-xs rounded ${
              positionDuplicate || invalidPosition ? 'bg-red-900/30 text-red-400' : 'text-gray-300'
            }`}
          >
            {formData.position || '—'}
          </div>
        )}
      </TableCell>

      {/* Driver */}
      <TableCell className="p-1 flex-1 min-w-[150px]">
        {editingField === 'driver' ? (
          <Select
            value={formData.driver_id || ''}
            onValueChange={(value) => {
              handleSaveField('driver_id', value);
              setEditingField('position');
            }}
          >
            <SelectTrigger className="bg-[#171717] border-gray-700 text-white h-8 text-xs">
              <SelectValue placeholder="Select driver" />
            </SelectTrigger>
            <SelectContent className="bg-[#171717] border-gray-700">
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-white text-xs">
                  {d.first_name} {d.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div
            onClick={() => setEditingField('driver')}
            className={`cursor-pointer px-2 py-1 text-xs rounded truncate ${
              missingDriver ? 'bg-red-900/30 text-red-400' : 'text-gray-300'
            }`}
          >
            {driver ? `${driver.first_name} ${driver.last_name}` : '—'}
          </div>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="p-1 w-24">
        {editingField === 'status' ? (
          <Select
            value={formData.status || 'Running'}
            onValueChange={(value) => {
              handleSaveField('status', value);
              setEditingField('laps_completed');
            }}
          >
            <SelectTrigger className="bg-[#171717] border-gray-700 text-white h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#171717] border-gray-700">
              {['Running', 'DNF', 'DNS', 'DSQ', 'DNP'].map((s) => (
                <SelectItem key={s} value={s} className="text-white text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div
            onClick={() => setEditingField('status')}
            className="cursor-pointer px-2 py-1 text-xs rounded text-gray-300"
          >
            {formData.status || 'Running'}
          </div>
        )}
      </TableCell>

      {/* Laps */}
      <TableCell className="p-1 w-20">
        {editingField === 'laps_completed' ? (
          <Input
            type="number"
            min="0"
            value={formData.laps_completed || ''}
            onChange={(e) => handleSaveField('laps_completed', e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => handleKeyDown(e, 'laps_completed')}
            autoFocus
            className="bg-[#171717] border-gray-700 h-8 text-xs p-1"
          />
        ) : (
          <div
            onClick={() => setEditingField('laps_completed')}
            className="cursor-pointer px-2 py-1 text-xs rounded text-gray-300"
          >
            {formData.laps_completed || '—'}
          </div>
        )}
      </TableCell>

      {/* Error indicator */}
      {error && (
        <TableCell className="p-1">
          <AlertCircle className="w-4 h-4 text-red-500" title={error} />
        </TableCell>
      )}
    </TableRow>
  );
};

export default function ResultsQuickEntryTable({
  session,
  results,
  drivers,
  selectedEvent,
  onSave,
  saving,
}) {
  const [sessionResults, setSessionResults] = useState(results);
  const focusRef = useRef({});

  const handleNavigate = (rowIndex, field) => {
    focusRef.current = { rowIndex, field };
    // Will be used to restore focus after render
  };

  const handleAddRow = async () => {
    const newRow = {
      event_id: selectedEvent?.id,
      session_id: session?.id,
      session_type: session?.session_type,
      series_class_id: session?.series_class_id,
      series_id: selectedEvent?.series_id,
      driver_id: '',
      position: null,
      status: 'Running',
      laps_completed: null,
      status_state: 'Draft',
    };
    // Create empty result
    const created = await base44.entities.Results.create(newRow);
    setSessionResults([...sessionResults, created]);
    toast.info('Row added');
  };

  return (
    <div className="space-y-3">
      {/* Compact results table */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <Table className="text-xs">
          <TableHeader className="bg-[#262626]">
            <TableRow className="h-10">
              <TableHead className="text-gray-400 p-1 w-16">Pos</TableHead>
              <TableHead className="text-gray-400 p-1">Driver</TableHead>
              <TableHead className="text-gray-400 p-1 w-24">Status</TableHead>
              <TableHead className="text-gray-400 p-1 w-20">Laps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessionResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan="4" className="text-center py-4 text-gray-400 text-xs">
                  No results. Click "Add Row" to begin.
                </TableCell>
              </TableRow>
            ) : (
              sessionResults.map((result, idx) => (
                <QuickEntryRow
                  key={result.id}
                  result={result}
                  drivers={drivers}
                  allResults={sessionResults}
                  onUpdate={() => {}}
                  onNavigate={handleNavigate}
                  rowIndex={idx}
                  totalRows={sessionResults.length}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add row + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500">
          {sessionResults.length} row{sessionResults.length !== 1 ? 's' : ''}
        </div>
        <Button
          size="sm"
          onClick={handleAddRow}
          disabled={saving}
          className="bg-blue-700 hover:bg-blue-600 text-xs gap-1"
        >
          <Plus className="w-3 h-3" /> Add Row
        </Button>
      </div>
    </div>
  );
}