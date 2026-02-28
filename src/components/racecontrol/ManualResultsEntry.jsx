import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Save, AlertCircle } from 'lucide-react';

export default function ManualResultsEntry({ sessionId, eventId, classId, results, isLocked }) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState([]);
  const [newEntryCarNumber, setNewEntryCarNumber] = useState('');

  // Fetch race entries for the session
  const { data: raceEntries = [] } = useQuery({
    queryKey: ['eventEntries', eventId, classId],
    queryFn: async () => {
      let allEntries = await base44.entities.RaceControlEntry.filter(
        { racecontrolevent_id: eventId }
      );
      if (classId) {
        allEntries = allEntries.filter(e => e.class_name === classId);
      }
      return allEntries;
    },
    enabled: !!eventId,
  });

  // Fetch drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : '—';
  };

  const handleAddEntry = () => {
    if (!newEntryCarNumber.trim()) return;
    
    const entry = raceEntries.find(e => e.car_number === newEntryCarNumber);
    if (!entry) {
      alert('Car number not found in entries');
      return;
    }

    const newResult = {
      id: `${sessionId}-${entry.id}`,
      entry_id: entry.id,
      car_number: entry.car_number,
      driver_id: entry.driver_id,
      position: entries.length + 1,
      status: 'Running',
      laps_completed: 0,
      total_time: null,
      best_lap: null,
      penalties: 0,
      flags: [],
    };

    setEntries([...entries, newResult]);
    setNewEntryCarNumber('');
  };

  const handleUpdateResult = (index, field, value) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const handleSaveDraft = () => {
    // In production, would save to a results table
    console.log('Saving draft results:', entries);
    alert('Draft saved');
  };

  const handleMarkProvisional = () => {
    // Mark results as provisional (pre-published)
    console.log('Marking as provisional');
    alert('Results marked as provisional');
  };

  if (isLocked) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>This session is locked. Results cannot be edited without unlocking.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Entry Form */}
      <div className="flex gap-2">
        <Input
          placeholder="Car number"
          value={newEntryCarNumber}
          onChange={(e) => setNewEntryCarNumber(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddEntry()}
        />
        <Button onClick={handleAddEntry} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Entry
        </Button>
      </div>

      {/* Results Table */}
      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Pos</TableHead>
                <TableHead>Car #</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Laps</TableHead>
                <TableHead>Total Time</TableHead>
                <TableHead>Best Lap</TableHead>
                <TableHead>Penalties</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((result, index) => (
                <TableRow key={result.id}>
                  <TableCell className="font-bold">{result.position}</TableCell>
                  <TableCell className="font-mono">{result.car_number}</TableCell>
                  <TableCell>{getDriverName(result.driver_id)}</TableCell>
                  <TableCell>
                    <Select
                      value={result.status}
                      onValueChange={(value) => handleUpdateResult(index, 'status', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Running">Running</SelectItem>
                        <SelectItem value="DNF">DNF</SelectItem>
                        <SelectItem value="DNS">DNS</SelectItem>
                        <SelectItem value="DSQ">DSQ</SelectItem>
                        <SelectItem value="DNP">DNP</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={result.laps_completed}
                      onChange={(e) => handleUpdateResult(index, 'laps_completed', parseInt(e.target.value))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="00:00.000"
                      value={result.total_time || ''}
                      onChange={(e) => handleUpdateResult(index, 'total_time', e.target.value)}
                      className="w-28 font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="00:00.000"
                      value={result.best_lap || ''}
                      onChange={(e) => handleUpdateResult(index, 'best_lap', e.target.value)}
                      className="w-28 font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={result.penalties}
                      onChange={(e) => handleUpdateResult(index, 'penalties', parseInt(e.target.value))}
                      className="w-16"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {result.flags.length > 0 ? result.flags.join(', ') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No results entered yet</div>
      )}

      {/* Action Buttons */}
      {entries.length > 0 && (
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button
            onClick={handleMarkProvisional}
            className="gap-2"
          >
            Mark Provisional
          </Button>
        </div>
      )}
    </div>
  );
}