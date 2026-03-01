import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

export default function CreateEntryModal({
  open,
  onOpenChange,
  eventId,
  seriesId,
}) {
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [transponderId, setTransponderId] = useState('');
  const [error, setError] = useState('');

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () =>
      eventId
        ? base44.entities.EventClass.filter({ event_id: eventId })
        : Promise.resolve([]),
    enabled: !!eventId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
      handleClose();
    },
    onError: (err) => {
      setError(
        err.message || 'Failed to create entry. Please check your input.'
      );
    },
  });

  const handleClose = () => {
    setSelectedDriver('');
    setSelectedClass('');
    setCarNumber('');
    setSelectedTeam('');
    setTransponderId('');
    setError('');
    onOpenChange(false);
  };

  const handleCreate = () => {
    if (!selectedDriver || !selectedClass || !carNumber) {
      setError('Please fill in all required fields');
      return;
    }

    const eventClass = eventClasses.find((c) => c.id === selectedClass);
    const seriesClassId = eventClass?.series_class_id;

    if (!seriesClassId) {
      setError('Selected class is missing series class mapping');
      return;
    }

    const payload = {
      event_id: eventId,
      series_id: seriesId || null,
      series_class_id: seriesClassId,
      driver_id: selectedDriver,
      car_number: carNumber,
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      tech_status: 'NotInspected',
      waiver_verified: false,
    };

    if (selectedTeam) payload.team_id = selectedTeam;
    if (transponderId) payload.transponder_id = transponderId;

    createMutation.mutate(payload);
  };

  const driversByName = useMemo(() => {
    return drivers.sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      )
    );
  }, [drivers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#171717] border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Create Entry</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a new entry to this event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex gap-3 p-3 bg-red-900/20 border border-red-900/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">
              Driver *
            </label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="bg-[#262626] border-gray-700">
                <SelectValue placeholder="Select driver..." />
              </SelectTrigger>
              <SelectContent>
                {driversByName.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">
              Class *
            </label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-[#262626] border-gray-700">
                <SelectValue placeholder="Select class..." />
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

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">
              Car Number *
            </label>
            <Input
              type="text"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              placeholder="e.g., 42"
              className="bg-[#262626] border-gray-700"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">
              Team (Optional)
            </label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="bg-[#262626] border-gray-700">
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">
              Transponder ID (Optional)
            </label>
            <Input
              type="text"
              value={transponderId}
              onChange={(e) => setTransponderId(e.target.value)}
              placeholder="e.g., TRANS123"
              className="bg-[#262626] border-gray-700"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-800">
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Entry'}
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="border-gray-700"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}