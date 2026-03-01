import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';

export default function EntryDetailDrawer({ entryId, eventId, onClose, onUpdate }) {
  const [entry, setEntry] = useState(null);
  const [transponderInput, setTransponderInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const queryClient = useQueryClient();

  // Fetch entry
  const { data: entryData, isLoading } = useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => base44.entities.Entry.list(),
    select: (data) => data.find((e) => e.id === entryId),
  });

  // Fetch driver
  const { data: driver } = useQuery({
    queryKey: ['driver', entry?.driver_id],
    queryFn: () => base44.entities.Driver.list(),
    select: (data) => data.find((d) => d.id === entry?.driver_id),
    enabled: !!entry?.driver_id,
  });

  // Fetch team
  const { data: team } = useQuery({
    queryKey: ['team', entry?.team_id],
    queryFn: () => base44.entities.Team.list(),
    select: (data) => data.find((t) => t.id === entry?.team_id),
    enabled: !!entry?.team_id,
  });

  // Fetch vehicle
  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', entry?.vehicle_id],
    queryFn: () => base44.entities.Vehicle.list(),
    select: (data) => data.find((v) => v.id === entry?.vehicle_id),
    enabled: !!entry?.vehicle_id,
  });

  const updateEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
      onUpdate();
    },
  });

  // Set initial state
  useEffect(() => {
    if (entryData) {
      setEntry(entryData);
      setTransponderInput(entryData.transponder_id || '');
      setNotesInput(entryData.notes || '');
    }
  }, [entryData]);

  if (isLoading || !entry) {
    return null;
  }

  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  const flags = entry.flags || [];

  const handleCheckIn = async () => {
    await updateEntryMutation.mutateAsync({
      entry_status: 'CheckedIn',
      checked_in_at: new Date().toISOString(),
    });
  };

  const handleMarkPaid = async () => {
    await updateEntryMutation.mutateAsync({
      payment_status: 'Paid',
      paid_at: new Date().toISOString(),
    });
  };

  const handleAssignTransponder = async () => {
    if (!transponderInput.trim()) return;
    await updateEntryMutation.mutateAsync({
      transponder_id: transponderInput.trim(),
    });
  };

  const handleStatusChange = async (field, value) => {
    await updateEntryMutation.mutateAsync({
      [field]: value,
    });
  };

  const handleNotesChange = async () => {
    await updateEntryMutation.mutateAsync({
      notes: notesInput,
    });
  };

  const handleRecheckCompliance = async () => {
    // Recompute flags and save
    const newFlags = [];
    if (entry.waiver_status === 'Missing') newFlags.push('MissingWaiver');
    if (entry.payment_status === 'Unpaid') newFlags.push('Unpaid');
    if (!entry.transponder_id) newFlags.push('MissingTransponder');
    
    await updateEntryMutation.mutateAsync({
      flags: newFlags,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-md bg-[#171717] border-l border-gray-700 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Entry Details</h2>
            <p className="text-sm text-gray-400">
              #{entry.car_number} • {driverName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Status Toggles */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Status</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Entry Status</label>
                <Select value={entry.entry_status} onValueChange={(v) => handleStatusChange('entry_status', v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Registered">Registered</SelectItem>
                    <SelectItem value="CheckedIn">Checked In</SelectItem>
                    <SelectItem value="Teched">Teched</SelectItem>
                    <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Payment Status</label>
                <Select value={entry.payment_status} onValueChange={(v) => handleStatusChange('payment_status', v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tech Status</label>
                <Select value={entry.tech_status} onValueChange={(v) => handleStatusChange('tech_status', v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NotInspected">Not Inspected</SelectItem>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="RecheckRequired">Recheck Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Waiver Status</label>
                <Select value={entry.waiver_status} onValueChange={(v) => handleStatusChange('waiver_status', v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Missing">Missing</SelectItem>
                    <SelectItem value="Verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Actions</h3>
            <Button
              onClick={handleCheckIn}
              disabled={entry.entry_status === 'CheckedIn'}
              variant="outline"
              size="sm"
              className="w-full border-gray-700 hover:bg-gray-900 text-xs"
            >
              {entry.entry_status === 'CheckedIn' ? 'Checked In' : 'Check In'}
            </Button>
            <Button
              onClick={handleMarkPaid}
              disabled={entry.payment_status === 'Paid'}
              variant="outline"
              size="sm"
              className="w-full border-gray-700 hover:bg-gray-900 text-xs"
            >
              {entry.payment_status === 'Paid' ? 'Paid' : 'Mark Paid'}
            </Button>
          </div>

          {/* Transponder Assignment */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Transponder</h3>
            <div className="flex gap-2">
              <Input
                value={transponderInput}
                onChange={(e) => setTransponderInput(e.target.value)}
                placeholder="Enter transponder ID"
                className="bg-gray-900 border-gray-700 h-8 text-xs"
              />
              <Button
                onClick={handleAssignTransponder}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Set
              </Button>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Links</h3>
            <div className="space-y-1">
              {driver && (
                <Link
                  to={createPageUrl(`DriverProfile?id=${entry.driver_id}`)}
                  className="block text-xs text-blue-400 hover:text-blue-300 p-2 bg-gray-900 rounded"
                >
                  → View Driver Profile
                </Link>
              )}
              {team && (
                <Link
                  to={createPageUrl(`TeamProfile?id=${entry.team_id}`)}
                  className="block text-xs text-blue-400 hover:text-blue-300 p-2 bg-gray-900 rounded"
                >
                  → View Team Profile
                </Link>
              )}
              {vehicle && (
                <div className="text-xs text-blue-400 p-2 bg-gray-900 rounded">
                  → {vehicle.nickname || vehicle.vehicle_type || 'Vehicle'}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Notes</h3>
            <Textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              onBlur={handleNotesChange}
              placeholder="Add notes..."
              className="bg-gray-900 border-gray-700 text-xs min-h-24"
            />
          </div>

          {/* Compliance Flags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-400 uppercase">Compliance Flags</h3>
              <Button
                onClick={handleRecheckCompliance}
                size="sm"
                variant="ghost"
                className="text-xs h-6"
              >
                Recheck
              </Button>
            </div>
            {flags.length > 0 ? (
              <div className="space-y-1">
                {flags.map((flag) => (
                  <Badge
                    key={flag}
                    className={
                      flag === 'MissingWaiver' || flag === 'Unpaid'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }
                  >
                    {flag}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded text-xs text-green-400">
                <CheckCircle2 className="w-4 h-4" /> All clear
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-gray-700 hover:bg-gray-900"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}