import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState as useToast } from 'react';

export default function AddEntryDialog({ eventId, eventClasses, onClose, onSuccess }) {
  const [driverId, setDriverId] = useState('');
  const [classId, setClassId] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [transponderId, setTransponderId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [waiverStatus, setWaiverStatus] = useState('Missing');
  const [searchDriverName, setSearchDriverName] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Fetch drivers
  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Fetch entries to check duplicates
  const { data: existingEntries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, status: 'active' }),
  });

  // Filter drivers by search
  const filteredDrivers = useMemo(() => {
    if (!searchDriverName) return [];
    return allDrivers.filter((d) => {
      const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
      return fullName.includes(searchDriverName.toLowerCase());
    });
  }, [searchDriverName, allDrivers]);

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
      onSuccess();
    },
  });

  const handleSave = async () => {
    setError('');

    // Validation
    if (!driverId) {
      setError('Please select a driver');
      return;
    }
    if (!classId) {
      setError('Please select a class');
      return;
    }
    if (!carNumber.trim()) {
      setError('Car number is required');
      return;
    }

    // Check duplicate driver in event
    if (existingEntries.some((e) => e.driver_id === driverId && e.entry_status !== 'Withdrawn')) {
      setError('This driver is already registered for this event');
      return;
    }

    // Check duplicate car number in class
    if (
      existingEntries.some(
        (e) =>
          e.event_class_id === classId &&
          e.car_number === carNumber.trim() &&
          e.entry_status !== 'Withdrawn'
      )
    ) {
      setError('This car number already exists in this class');
      return;
    }

    const flags = [];
    if (waiverStatus === 'Missing') flags.push('MissingWaiver');
    if (paymentStatus === 'Unpaid') flags.push('Unpaid');
    if (!transponderId.trim()) flags.push('MissingTransponder');

    await createEntryMutation.mutateAsync({
      event_id: eventId,
      event_class_id: classId,
      driver_id: driverId,
      car_number: carNumber.trim(),
      transponder_id: transponderId.trim() || null,
      payment_status: paymentStatus,
      waiver_status: waiverStatus,
      entry_status: 'Registered',
      tech_status: 'NotInspected',
      flags,
    });
  };

  const selectedDriver = allDrivers.find((d) => d.id === driverId);

  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-[#171717] border-gray-700 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Add Entry</AlertDialogTitle>
          <AlertDialogDescription>Register a new driver for this event</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Driver Search */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Driver *</label>
            {selectedDriver ? (
              <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white flex items-center justify-between">
                <span>
                  {selectedDriver.first_name} {selectedDriver.last_name}
                </span>
                <button
                  onClick={() => {
                    setDriverId('');
                    setSearchDriverName('');
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={searchDriverName}
                  onChange={(e) => {
                    setSearchDriverName(e.target.value);
                    setShowDriverDropdown(true);
                  }}
                  onFocus={() => setShowDriverDropdown(true)}
                  placeholder="Search driver name..."
                  className="bg-gray-900 border-gray-700 text-xs"
                />
                {showDriverDropdown && filteredDrivers.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredDrivers.map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => {
                          setDriverId(driver.id);
                          setSearchDriverName('');
                          setShowDriverDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                      >
                        {driver.first_name} {driver.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Class */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Class *</label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="bg-gray-900 border-gray-700 h-8 text-xs">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {eventClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Car Number */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Car Number *</label>
            <Input
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              placeholder="Enter car number"
              className="bg-gray-900 border-gray-700 h-8 text-xs"
            />
          </div>

          {/* Transponder ID */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Transponder ID (optional)</label>
            <Input
              value={transponderId}
              onChange={(e) => setTransponderId(e.target.value)}
              placeholder="Enter transponder ID"
              className="bg-gray-900 border-gray-700 h-8 text-xs"
            />
          </div>

          {/* Payment Status */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Payment Status</label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
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

          {/* Waiver Status */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Waiver Status</label>
            <Select value={waiverStatus} onValueChange={setWaiverStatus}>
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

        <div className="flex gap-3">
          <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSave}
            disabled={createEntryMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}