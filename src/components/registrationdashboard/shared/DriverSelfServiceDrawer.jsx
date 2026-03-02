import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from '../invalidationHelper';
import useDashboardMutation from '../useDashboardMutation';

const DQ = applyDefaultQueryOptions();

export default function DriverSelfServiceDrawer({
  open,
  onOpenChange,
  selectedEvent,
  dashboardContext,
  invalidateAfterOperation: invalidateAfterOperationProp,
}) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);

  // Local state
  const [driverFormData, setDriverFormData] = useState({});
  const [registrationDefaults, setRegistrationDefaults] = useState({});
  const [entryFormData, setEntryFormData] = useState({});
  const [sponsorInput, setSponsorInput] = useState('');

  // Current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  // Load current user's driver
  const { data: myDriver, isLoading: driverLoading, refetch: refetchDriver } = useQuery({
    queryKey: ['myDriver', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const drivers = await base44.entities.Driver.filter({ owner_user_id: currentUser.id });
      return drivers.length > 0 ? drivers[0] : null;
    },
    enabled: !!currentUser?.id,
    ...DQ,
  });

  // Load my entry for selectedEvent
  const { data: myEntry, isLoading: entryLoading, refetch: refetchEntry } = useQuery({
    queryKey: ['myEntry', myDriver?.id, selectedEvent?.id],
    queryFn: async () => {
      if (!myDriver?.id || !selectedEvent?.id) return null;
      const entries = await base44.entities.Entry.filter({
        event_id: selectedEvent.id,
        driver_id: myDriver.id,
      });
      return entries.length > 0 ? entries[0] : null;
    },
    enabled: !!myDriver?.id && !!selectedEvent?.id,
    ...DQ,
  });

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    ...DQ,
  });

  // Load series classes for selectedEvent
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedEvent?.series_id],
    queryFn: () =>
      selectedEvent?.series_id
        ? base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id })
        : Promise.resolve([]),
    enabled: !!selectedEvent?.series_id,
    ...DQ,
  });

  // Mutations
  const { mutateAsync: createDriver, isPending: creatingDriver } = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: () => {
      refetchDriver();
      toast.success('Driver profile created');
    },
    onError: (err) => toast.error(`Failed to create driver: ${err.message}`),
  });

  const { mutateAsync: updateDriver, isPending: updatingDriver } = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Driver.update(id, data),
    onSuccess: () => {
      refetchDriver();
      toast.success('Driver profile saved');
      invalidateAfterOperation('driver_updated', { driverId: myDriver?.id });
    },
    onError: (err) => toast.error(`Failed to save driver: ${err.message}`),
  });

  const { mutateAsync: createEntry, isPending: creatingEntry } = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      refetchEntry();
      toast.success('Registered for event!');
      invalidateAfterOperation('entry_created', { eventId: selectedEvent?.id });
    },
    onError: (err) => toast.error(`Failed to register: ${err.message}`),
  });

  const { mutateAsync: updateEntry, isPending: updatingEntry } = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    onSuccess: () => {
      refetchEntry();
      toast.success('Registration updated');
      invalidateAfterOperation('entry_updated', { eventId: selectedEvent?.id });
    },
    onError: (err) => toast.error(`Failed to update registration: ${err.message}`),
  });

  // Handlers
  const handleCreateDriver = async () => {
    if (!currentUser) {
      toast.error('Not authenticated');
      return;
    }

    const [firstName, ...lastNameParts] = (currentUser.full_name || '').split(' ');
    const lastName = lastNameParts.join(' ') || 'User';

    await createDriver({
      first_name: firstName || currentUser.full_name,
      last_name: lastName,
      owner_user_id: currentUser.id,
      status: 'Active',
      profile_status: 'draft',
    });
  };

  const handleSaveDriver = async () => {
    if (!myDriver) return;
    await updateDriver({
      id: myDriver.id,
      data: driverFormData,
    });
  };

  const handleSaveDefaults = async () => {
    if (!myDriver) return;

    // Store registration defaults in Driver.notes with JSON prefix
    const defaults = {
      emergency_contact_name: registrationDefaults.emergency_contact_name || '',
      emergency_contact_phone: registrationDefaults.emergency_contact_phone || '',
      transponder_id_default: registrationDefaults.transponder_id_default || '',
      preferred_car_number: registrationDefaults.preferred_car_number || '',
      sponsors: registrationDefaults.sponsors || [],
    };

    const notesBlock = `INDEX46_REG_DEFAULTS_JSON: ${JSON.stringify(defaults)}`;
    await updateDriver({
      id: myDriver.id,
      data: { notes: notesBlock },
    });
  };

  const handleAddSponsor = () => {
    if (!sponsorInput.trim()) return;
    const sponsors = registrationDefaults.sponsors || [];
    if (!sponsors.includes(sponsorInput.trim())) {
      setRegistrationDefaults({
        ...registrationDefaults,
        sponsors: [...sponsors, sponsorInput.trim()],
      });
      setSponsorInput('');
    }
  };

  const handleRemoveSponsor = (sponsor) => {
    setRegistrationDefaults({
      ...registrationDefaults,
      sponsors: (registrationDefaults.sponsors || []).filter((s) => s !== sponsor),
    });
  };

  const handleCreateEntry = async () => {
    if (!myDriver || !selectedEvent) return;

    const data = {
      event_id: selectedEvent.id,
      driver_id: myDriver.id,
      series_id: selectedEvent.series_id,
      team_id: entryFormData.team_id || undefined,
      series_class_id: entryFormData.series_class_id || undefined,
      car_number: entryFormData.car_number || undefined,
      transponder_id: entryFormData.transponder_id || undefined,
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      tech_status: 'Not Inspected',
    };

    await createEntry(data);
  };

  const handleUpdateEntry = async () => {
    if (!myEntry) return;

    const updates = {
      team_id: entryFormData.team_id || undefined,
      series_class_id: entryFormData.series_class_id || undefined,
      car_number: entryFormData.car_number || undefined,
      transponder_id: entryFormData.transponder_id || undefined,
    };

    await updateEntry({ id: myEntry.id, data: updates });
  };

  // Initialize form data when driver/entry loads
  React.useEffect(() => {
    if (myDriver) {
      setDriverFormData({
        first_name: myDriver.first_name || '',
        last_name: myDriver.last_name || '',
        date_of_birth: myDriver.date_of_birth || '',
        contact_email: myDriver.contact_email || '',
        hometown_city: myDriver.hometown_city || '',
        hometown_state: myDriver.hometown_state || '',
        hometown_country: myDriver.hometown_country || '',
        primary_number: myDriver.primary_number || '',
        manufacturer: myDriver.manufacturer || '',
        primary_discipline: myDriver.primary_discipline || '',
        primary_color: myDriver.primary_color || '',
      });

      // Parse registration defaults from notes
      if (myDriver.notes?.includes('INDEX46_REG_DEFAULTS_JSON:')) {
        try {
          const jsonStr = myDriver.notes.split('INDEX46_REG_DEFAULTS_JSON:')[1].trim();
          const parsed = JSON.parse(jsonStr);
          setRegistrationDefaults(parsed);
        } catch {
          setRegistrationDefaults({});
        }
      }
    }
  }, [myDriver]);

  React.useEffect(() => {
    if (myEntry) {
      setEntryFormData({
        team_id: myEntry.team_id || '',
        series_class_id: myEntry.series_class_id || '',
        car_number: myEntry.car_number || '',
        transponder_id: myEntry.transponder_id || '',
      });
    }
  }, [myEntry]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#262626] border-gray-700 w-full sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">My Registration Profile</SheetTitle>
          <SheetClose />
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Section A: Driver Profile */}
          <Collapsible defaultOpen>
            <Card className="bg-[#171717] border-gray-800">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white">Driver Profile</CardTitle>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {driverLoading ? (
                    <p className="text-xs text-gray-400">Loading...</p>
                  ) : !myDriver ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-400">
                        No driver profile yet. Create one to register for events.
                      </p>
                      <Button
                        onClick={handleCreateDriver}
                        disabled={creatingDriver}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Create My Driver Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">First Name</label>
                          <Input
                            value={driverFormData.first_name || ''}
                            onChange={(e) => setDriverFormData({ ...driverFormData, first_name: e.target.value })}
                            className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Last Name</label>
                          <Input
                            value={driverFormData.last_name || ''}
                            onChange={(e) => setDriverFormData({ ...driverFormData, last_name: e.target.value })}
                            className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Date of Birth</label>
                        <Input
                          type="date"
                          value={driverFormData.date_of_birth || ''}
                          onChange={(e) => setDriverFormData({ ...driverFormData, date_of_birth: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Contact Email</label>
                        <Input
                          type="email"
                          value={driverFormData.contact_email || ''}
                          onChange={(e) => setDriverFormData({ ...driverFormData, contact_email: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">City</label>
                          <Input
                            value={driverFormData.hometown_city || ''}
                            onChange={(e) => setDriverFormData({ ...driverFormData, hometown_city: e.target.value })}
                            className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">State</label>
                          <Input
                            value={driverFormData.hometown_state || ''}
                            onChange={(e) => setDriverFormData({ ...driverFormData, hometown_state: e.target.value })}
                            className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Country</label>
                        <Input
                          value={driverFormData.hometown_country || ''}
                          onChange={(e) => setDriverFormData({ ...driverFormData, hometown_country: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Primary #</label>
                          <Input
                            value={driverFormData.primary_number || ''}
                            onChange={(e) => setDriverFormData({ ...driverFormData, primary_number: e.target.value })}
                            className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Manufacturer</label>
                          <Select
                            value={driverFormData.manufacturer || ''}
                            onValueChange={(val) => setDriverFormData({ ...driverFormData, manufacturer: val })}
                          >
                            <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              <SelectItem value="Chevrolet">Chevrolet</SelectItem>
                              <SelectItem value="Ford">Ford</SelectItem>
                              <SelectItem value="Toyota">Toyota</SelectItem>
                              <SelectItem value="Honda">Honda</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Primary Discipline</label>
                        <Select
                          value={driverFormData.primary_discipline || ''}
                          onValueChange={(val) => setDriverFormData({ ...driverFormData, primary_discipline: val })}
                        >
                          <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                            <SelectValue placeholder="Select" />
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

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Brand Color (Hex)</label>
                        <Input
                          placeholder="#FF0000"
                          value={driverFormData.primary_color || ''}
                          onChange={(e) => setDriverFormData({ ...driverFormData, primary_color: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>

                      <Button
                        onClick={handleSaveDriver}
                        disabled={updatingDriver}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        Save Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section B: Registration Defaults */}
          {myDriver && (
            <Collapsible>
              <Card className="bg-[#171717] border-gray-800">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white">Registration Defaults</CardTitle>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Emergency Contact Name</label>
                        <Input
                          value={registrationDefaults.emergency_contact_name || ''}
                          onChange={(e) =>
                            setRegistrationDefaults({
                              ...registrationDefaults,
                              emergency_contact_name: e.target.value,
                            })
                          }
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Contact Phone</label>
                        <Input
                          value={registrationDefaults.emergency_contact_phone || ''}
                          onChange={(e) =>
                            setRegistrationDefaults({
                              ...registrationDefaults,
                              emergency_contact_phone: e.target.value,
                            })
                          }
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
                        <Input
                          value={registrationDefaults.transponder_id_default || ''}
                          onChange={(e) =>
                            setRegistrationDefaults({
                              ...registrationDefaults,
                              transponder_id_default: e.target.value,
                            })
                          }
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Preferred Car #</label>
                        <Input
                          value={registrationDefaults.preferred_car_number || ''}
                          onChange={(e) =>
                            setRegistrationDefaults({
                              ...registrationDefaults,
                              preferred_car_number: e.target.value,
                            })
                          }
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Sponsors</label>
                      <div className="flex gap-1 mb-2">
                        <Input
                          placeholder="Add sponsor..."
                          value={sponsorInput}
                          onChange={(e) => setSponsorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSponsor();
                            }
                          }}
                          className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs flex-1"
                        />
                        <Button
                          onClick={handleAddSponsor}
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 h-8"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(registrationDefaults.sponsors || []).map((sponsor) => (
                          <Badge key={sponsor} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                            {sponsor}
                            <button
                              onClick={() => handleRemoveSponsor(sponsor)}
                              className="ml-1 hover:opacity-75"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveDefaults}
                      disabled={updatingDriver}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save Defaults
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Section C: My Event Registration */}
          {selectedEvent && myDriver && (
            <Collapsible defaultOpen>
              <Card className="bg-[#171717] border-gray-800">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white">Event Registration</CardTitle>
                      {myEntry && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {entryLoading ? (
                      <p className="text-xs text-gray-400">Loading...</p>
                    ) : !myEntry ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-400">
                          Register for {selectedEvent.name} by selecting your class and team details.
                        </p>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Class</label>
                          <Select
                            value={entryFormData.series_class_id || ''}
                            onValueChange={(val) => setEntryFormData({ ...entryFormData, series_class_id: val })}
                          >
                            <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                              <SelectValue placeholder="Select class..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              {seriesClasses.map((sc) => (
                                <SelectItem key={sc.id} value={sc.id}>
                                  {sc.class_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Team (Optional)</label>
                          <Select
                            value={entryFormData.team_id || ''}
                            onValueChange={(val) => setEntryFormData({ ...entryFormData, team_id: val || undefined })}
                          >
                            <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              <SelectItem value={null}>None</SelectItem>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Car #</label>
                            <Input
                              value={entryFormData.car_number || ''}
                              onChange={(e) => setEntryFormData({ ...entryFormData, car_number: e.target.value })}
                              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
                            <Input
                              value={entryFormData.transponder_id || ''}
                              onChange={(e) => setEntryFormData({ ...entryFormData, transponder_id: e.target.value })}
                              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={handleCreateEntry}
                          disabled={creatingEntry}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          Register for Event
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-green-900/20 border border-green-800/50 rounded p-3">
                          <p className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> You are registered for this event
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-900/30 rounded p-2">
                            <p className="text-gray-400 mb-0.5">Status</p>
                            <p className="text-white font-medium">{myEntry.entry_status}</p>
                          </div>
                          <div className="bg-gray-900/30 rounded p-2">
                            <p className="text-gray-400 mb-0.5">Payment</p>
                            <p className="text-white font-medium">{myEntry.payment_status}</p>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400">Update your registration details below:</p>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Class</label>
                          <Select
                            value={entryFormData.series_class_id || ''}
                            onValueChange={(val) => setEntryFormData({ ...entryFormData, series_class_id: val })}
                          >
                            <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                              <SelectValue placeholder="Select class..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              {seriesClasses.map((sc) => (
                                <SelectItem key={sc.id} value={sc.id}>
                                  {sc.class_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Team (Optional)</label>
                          <Select
                            value={entryFormData.team_id || ''}
                            onValueChange={(val) => setEntryFormData({ ...entryFormData, team_id: val || undefined })}
                          >
                            <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              <SelectItem value={null}>None</SelectItem>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Car #</label>
                            <Input
                              value={entryFormData.car_number || ''}
                              onChange={(e) => setEntryFormData({ ...entryFormData, car_number: e.target.value })}
                              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
                            <Input
                              value={entryFormData.transponder_id || ''}
                              onChange={(e) => setEntryFormData({ ...entryFormData, transponder_id: e.target.value })}
                              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={handleUpdateEntry}
                          disabled={updatingEntry}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Empty state if no event selected */}
          {!selectedEvent && (
            <Card className="bg-yellow-900/20 border border-yellow-800/50">
              <CardContent className="py-4">
                <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Select an event above to register
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <SheetFooter className="mt-6" />
      </SheetContent>
    </Sheet>
  );
}