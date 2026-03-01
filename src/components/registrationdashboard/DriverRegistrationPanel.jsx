import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle, LogIn, Plus, CheckCircle, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function DriverRegistrationPanel({ selectedEvent, user }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('driver'); // driver, class, confirm, done
  const [myDriver, setMyDriver] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [newDriverForm, setNewDriverForm] = useState({
    first_name: '',
    last_name: '',
    contact_email: user?.email || '',
    hometown_city: '',
    hometown_state: '',
    hometown_country: '',
    primary_number: '',
    primary_discipline: '',
  });

  // Check if user already has a driver profile
  const { data: existingDriver } = useQuery({
    queryKey: ['myDriver', user?.id],
    queryFn: () =>
      user?.id
        ? base44.entities.Driver.filter({ owner_user_id: user.id })
        : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // Search for drivers by email or name
  const { data: driverSearchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['driverSearch', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const allDrivers = await base44.entities.Driver.list('first_name', 200);
      const lower = searchQuery.toLowerCase();
      return allDrivers.filter(
        (d) =>
          (d.contact_email && d.contact_email.toLowerCase().includes(lower)) ||
          `${d.first_name} ${d.last_name}`.toLowerCase().includes(lower)
      );
    },
    enabled: showSearchResults && !!searchQuery.trim(),
  });

  // Get series classes if event has series
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['eventSeriesClasses', selectedEvent?.series_id],
    queryFn: () =>
      selectedEvent?.series_id
        ? base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id })
        : Promise.resolve([]),
    enabled: !!selectedEvent?.series_id,
  });

  // Check for existing entry
  const { data: existingEntry } = useQuery({
    queryKey: ['myEntry', selectedEvent?.id, myDriver?.id, selectedClass],
    queryFn: () => {
      if (!selectedEvent?.id || !myDriver?.id) return null;
      return base44.entities.Entry.filter({
        event_id: selectedEvent.id,
        driver_id: myDriver.id,
        series_class_id: selectedClass,
      }).then((entries) => entries?.[0] || null);
    },
    enabled: !!selectedEvent?.id && !!myDriver?.id && !!selectedClass,
  });

  // Mutations
  const createClaimMutation = useMutation({
    mutationFn: (driverId) =>
      base44.entities.DriverClaim.create({
        driver_id: driverId,
        status: 'pending',
        notes: 'Claim requested from RegistrationDashboard',
      }),
    onSuccess: () => {
      toast.success('Claim submitted for approval');
      setSearchQuery('');
      setShowSearchResults(false);
    },
  });

  const createDriverMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Driver.create({
        ...data,
        owner_user_id: user?.id,
      }),
    onSuccess: (newDriver) => {
      setMyDriver(newDriver);
      setCreatingDriver(false);
      setNewDriverForm({
        first_name: '',
        last_name: '',
        contact_email: user?.email || '',
        hometown_city: '',
        hometown_state: '',
        hometown_country: '',
        primary_number: '',
        primary_discipline: '',
      });
      queryClient.invalidateQueries({ queryKey: ['myDriver', user?.id] });
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', selectedEvent?.id] });
      setStep('done');
      toast.success('Registration confirmed!');
    },
  });

  const withdrawEntryMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.Entry.update(id, { entry_status: 'Withdrawn' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEntry', selectedEvent?.id, myDriver?.id, selectedClass] });
      queryClient.invalidateQueries({ queryKey: ['entries', selectedEvent?.id] });
      toast.success('Entry withdrawn');
    },
  });

  // Init myDriver from existing
  React.useEffect(() => {
    if (existingDriver && existingDriver.length > 0 && !myDriver) {
      setMyDriver(existingDriver[0]);
      setStep('class');
    }
  }, [existingDriver, myDriver]);

  const handleClaimDriver = (driver) => {
    createClaimMutation.mutate(driver.id);
  };

  const handleCreateDriver = () => {
    if (!newDriverForm.first_name.trim() || !newDriverForm.last_name.trim()) {
      toast.error('First and last name required');
      return;
    }
    createDriverMutation.mutate(newDriverForm);
  };

  const handleCreateEntry = () => {
    if (!myDriver || !selectedClass || !selectedEvent) {
      toast.error('Missing required information');
      return;
    }

    const entryData = {
      event_id: selectedEvent.id,
      driver_id: myDriver.id,
      series_class_id: selectedClass,
    };

    if (selectedEvent.series_id) {
      entryData.series_id = selectedEvent.series_id;
    }

    // Only add status if Entry entity supports it (will fail gracefully if not)
    if (selectedEvent) {
      entryData.entry_status = 'Registered';
    }

    createEntryMutation.mutate(entryData);
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">
            Select an event in the top bar to register
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEvent.series_id) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-gray-400">
            This event is missing a series connection
          </p>
          <p className="text-xs text-gray-500 mt-2">Ask an admin to set series_id</p>
        </CardContent>
      </Card>
    );
  }

  // DONE state
  if (step === 'done' && existingEntry) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="bg-green-900/20 border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" /> Registration Confirmed
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 space-y-4">
          <div className="bg-gray-900/50 rounded p-4 space-y-2">
            <div>
              <p className="text-xs text-gray-400">Driver</p>
              <p className="text-sm font-semibold text-white">
                {myDriver.first_name} {myDriver.last_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Event</p>
              <p className="text-sm font-semibold text-white">{selectedEvent.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Class</p>
              <p className="text-sm font-semibold text-white">
                {seriesClasses.find((c) => c.id === selectedClass)?.class_name || selectedClass}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <Badge className="bg-blue-500/20 text-blue-400">
                {existingEntry.entry_status || 'Registered'}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 space-y-3">
            <a
              href={createPageUrl(`DriverProfile?id=${myDriver.id}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                View Driver Profile ↗
              </Button>
            </a>

            {existingEntry.entry_status !== 'Withdrawn' && (
              <Button
                onClick={() => withdrawEntryMutation.mutate(existingEntry.id)}
                variant="outline"
                className="w-full border-red-700 text-red-400 hover:bg-red-900/20"
                disabled={withdrawEntryMutation.isPending}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {withdrawEntryMutation.isPending ? 'Withdrawing...' : 'Withdraw Entry'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // DRIVER selection step
  if (step === 'driver') {
    if (myDriver) {
      return (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="bg-blue-900/20 border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" /> Driver Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6 space-y-4">
            <div className="bg-gray-900/50 rounded p-4 space-y-2">
              <div>
                <p className="text-xs text-gray-400">Name</p>
                <p className="text-sm font-semibold text-white">
                  {myDriver.first_name} {myDriver.last_name}
                </p>
              </div>
              {myDriver.contact_email && (
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-xs text-gray-300 font-mono">{myDriver.contact_email}</p>
                </div>
              )}
              {myDriver.primary_number && (
                <div>
                  <p className="text-xs text-gray-400">Primary #</p>
                  <p className="text-xs font-mono text-white">{myDriver.primary_number}</p>
                </div>
              )}
            </div>
            <Button
              onClick={() => setStep('class')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continue to Class Selection
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Find or Create Driver Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-3">
              Search for an existing driver profile using your email or name
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-900 border-gray-600 text-white"
              />
              <Button
                onClick={() => setShowSearchResults(!showSearchResults)}
                className="bg-gray-700 hover:bg-gray-600"
              >
                Search
              </Button>
            </div>
          </div>

          {showSearchResults && (
            <div className="space-y-2">
              {searchLoading ? (
                <p className="text-xs text-gray-400">Searching...</p>
              ) : driverSearchResults.length === 0 ? (
                <p className="text-xs text-gray-400">No drivers found</p>
              ) : (
                <div className="space-y-2">
                  {driverSearchResults.slice(0, 5).map((driver) => (
                    <div
                      key={driver.id}
                      className="bg-gray-900/50 border border-gray-700 rounded p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {driver.first_name} {driver.last_name}
                        </p>
                        {driver.contact_email && (
                          <p className="text-xs text-gray-400">{driver.contact_email}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleClaimDriver(driver)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={createClaimMutation.isPending}
                      >
                        {createClaimMutation.isPending ? 'Submitting...' : 'Claim'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-700 pt-4">
            <Button
              onClick={() => setCreatingDriver(true)}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" /> Create New Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CREATE DRIVER dialog
  if (creatingDriver) {
    return (
      <Dialog open={creatingDriver} onOpenChange={setCreatingDriver}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create Driver Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">First Name *</label>
                <Input
                  value={newDriverForm.first_name}
                  onChange={(e) =>
                    setNewDriverForm({ ...newDriverForm, first_name: e.target.value })
                  }
                  className="bg-[#1A1A1A] border-gray-600 text-white"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Last Name *</label>
                <Input
                  value={newDriverForm.last_name}
                  onChange={(e) =>
                    setNewDriverForm({ ...newDriverForm, last_name: e.target.value })
                  }
                  className="bg-[#1A1A1A] border-gray-600 text-white"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Email</label>
              <Input
                value={newDriverForm.contact_email}
                onChange={(e) =>
                  setNewDriverForm({ ...newDriverForm, contact_email: e.target.value })
                }
                className="bg-[#1A1A1A] border-gray-600 text-white"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Car Number</label>
              <Input
                value={newDriverForm.primary_number}
                onChange={(e) =>
                  setNewDriverForm({ ...newDriverForm, primary_number: e.target.value })
                }
                className="bg-[#1A1A1A] border-gray-600 text-white"
                placeholder="00"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Primary Discipline</label>
              <Select
                value={newDriverForm.primary_discipline}
                onValueChange={(val) =>
                  setNewDriverForm({ ...newDriverForm, primary_discipline: val })
                }
              >
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Off Road">Off Road</SelectItem>
                  <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                  <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                  <SelectItem value="Road Racing">Road Racing</SelectItem>
                  <SelectItem value="Rallycross">Rallycross</SelectItem>
                  <SelectItem value="Drag Racing">Drag Racing</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreatingDriver(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDriver}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createDriverMutation.isPending}
            >
              {createDriverMutation.isPending ? 'Creating...' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // CLASS selection step
  if (step === 'class') {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Select Class</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Register {myDriver.first_name} {myDriver.last_name} for {selectedEvent.name}
          </p>

          <div>
            <label className="text-xs text-gray-400 block mb-2">Class *</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                <SelectValue placeholder="Select class..." />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {seriesClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => {
                setStep('driver');
                setSelectedClass('');
              }}
              variant="outline"
              className="border-gray-700 text-gray-300 flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              disabled={!selectedClass}
              className="bg-blue-600 hover:bg-blue-700 flex-1"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CONFIRM step
  if (step === 'confirm') {
    const selectedClassObj = seriesClasses.find((c) => c.id === selectedClass);
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="bg-purple-900/20 border-b border-gray-800">
          <CardTitle className="text-white">Review Registration</CardTitle>
        </CardHeader>
        <CardContent className="py-6 space-y-4">
          <div className="bg-gray-900/50 rounded p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400">Driver</p>
              <p className="text-sm font-semibold text-white">
                {myDriver.first_name} {myDriver.last_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Event</p>
              <p className="text-sm font-semibold text-white">{selectedEvent.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Class</p>
              <p className="text-sm font-semibold text-white">
                {selectedClassObj?.class_name || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => setStep('class')}
              variant="outline"
              className="border-gray-700 text-gray-300 flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleCreateEntry}
              className="bg-green-600 hover:bg-green-700 flex-1"
              disabled={createEntryMutation.isPending}
            >
              {createEntryMutation.isPending ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}