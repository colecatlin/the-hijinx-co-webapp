import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2, ArrowRight, ArrowLeft, AlertCircle, User, Calendar,
  LogIn, ExternalLink, LayoutDashboard, UserPlus, Building2, Lock, Check, Radio,
} from 'lucide-react';

const DQ = { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false };

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function writeOperationLog(type, entityName, entryId, eventId, driverId, carNumber) {
  try {
    if (await base44.asServiceRole.entities.OperationLog) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: type,
        source_type: 'Registration',
        entity_name: entityName,
        entity_id: entryId,
        event_id: eventId,
        status: 'success',
        metadata: { driverId, carNumber, timestamp: new Date().toISOString() },
      });
    }
  } catch (_) {
    // non-fatal
  }
}

function getDriverLookupKey(userId, email) {
  return ['myDriver', userId || email];
}

function getEventKey(filters) {
  const norm = { ...filters };
  delete norm.undefined;
  return ['events', norm];
}

function getSeriesClassKey(seriesId) {
  return ['seriesClasses', seriesId];
}

function getExistingEntryKey(eventId, driverId) {
  return ['myEntry', eventId, driverId];
}

function getEventEntriesKey(eventId, seriesClassId) {
  return ['entries', eventId, seriesClassId];
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Registration() {
  const navigate = useNavigate();

  // URL params
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [orgType, setOrgType] = useState(urlParams.get('orgType') || '');
  const [orgId, setOrgId] = useState(urlParams.get('orgId') || '');
  const [seasonYear, setSeasonYear] = useState(urlParams.get('seasonYear') || '');
  const [eventId, setEventId] = useState(urlParams.get('eventId') || '');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form state
  const [formStep, setFormStep] = useState(1); // 1=driver, 2=vehicle, 3=sponsors, 4=confirm
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [formData, setFormData] = useState({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    license_number: '',
    license_expiration_date: '',
    car_number: '',
    transponder_id: '',
    team_id: '',
    manufacturer: '',
    vehicle_notes: '',
    sponsors: '',
  });
  const [confirmChecked, setConfirmChecked] = useState(false);

  // ── Auth ──
  const { data: isAuth } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), ...DQ });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), enabled: isAuth, ...DQ });

  // ── Event selection data ──
  const { data: tracks = [] } = useQuery({ queryKey: ['tracks'], queryFn: () => base44.entities.Track.list('name', 200), ...DQ });
  const { data: series = [] } = useQuery({ queryKey: ['series'], queryFn: () => base44.entities.Series.list('name', 200), ...DQ });

  const eventFilters = useMemo(() => {
    const f = {};
    if (orgType === 'track' && orgId) f.track_id = orgId;
    if (orgType === 'series' && orgId) f.series_id = orgId;
    if (seasonYear) f.season = seasonYear;
    return f;
  }, [orgType, orgId, seasonYear]);

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events', eventFilters],
    queryFn: () => Object.keys(eventFilters).length
      ? base44.entities.Event.filter(eventFilters)
      : base44.entities.Event.list('-event_date', 200),
    ...DQ,
  });

  const seasons = useMemo(() => {
    const s = new Set(allEvents.map(e => e.season).filter(Boolean));
    return Array.from(s).sort().reverse();
  }, [allEvents]);

  // ── Driver data for authenticated users ──
  const { data: userDrivers = [] } = useQuery({
    queryKey: ['userDrivers', user?.id],
    queryFn: () => base44.entities.Driver.filter({ owner_user_id: user.id }),
    enabled: !!user?.id,
    ...DQ,
  });

  const selectedDriver = selectedDriverId && userDrivers.find(d => d.id === selectedDriverId);

  // ── Teams ──
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 100),
    enabled: formStep >= 2,
    ...DQ,
  });

  // ── Series classes if event selected ──
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedEvent?.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id }),
    enabled: !!selectedEvent?.series_id,
    ...DQ,
  });

  // ── Update URL params when selections change ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (orgType) params.set('orgType', orgType);
    if (orgId) params.set('orgId', orgId);
    if (seasonYear) params.set('seasonYear', seasonYear);
    if (eventId) params.set('eventId', eventId);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [orgType, orgId, seasonYear, eventId]);

  // ── Load event from URL or selection ──
  useEffect(() => {
    if (eventId && allEvents.length) {
      const event = allEvents.find(e => e.id === eventId);
      if (event) setSelectedEvent(event);
    }
  }, [eventId, allEvents]);

  // ── Handle org type change ──
  const handleOrgTypeChange = (type) => {
    setOrgType(type);
    setOrgId('');
    setSeasonYear('');
    setEventId('');
    setSelectedEvent(null);
  };

  // ── Handle season change ──
  const handleSeasonChange = (season) => {
    setSeasonYear(season);
    setEventId('');
    setSelectedEvent(null);
  };

  // ── Handle event selection ──
  const handleEventSelect = (eid) => {
    const event = allEvents.find(e => e.id === eid);
    setEventId(eid);
    setSelectedEvent(event);
  };

  // ── Handle continue to registration ──
  const handleContinueRegistration = () => {
    if (!isAuth) {
      setShowAuthDialog(true);
      return;
    }
    if (!user) return;
    if (userDrivers.length === 0) {
      toast.error('Create a Driver Profile first');
      navigate(createPageUrl('Profile?tab=driver'));
      return;
    }
    setFormStep(1);
  };

  // ── Handle submit ──
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedEvent || !selectedDriver) throw new Error('Missing required data');

      const entryData = {
        event_id: selectedEvent.id,
        driver_id: selectedDriver.id,
        series_id: selectedEvent.series_id || undefined,
        team_id: formData.team_id || undefined,
        car_number: formData.car_number.trim(),
        transponder_id: formData.transponder_id || undefined,
        entry_status: 'Registered',
        payment_status: 'Unpaid',
        waiver_verified: false,
        compliance_status: 'needs_attention',
        tech_status: 'Not Inspected',
        wristband_count: 0,
      };

      // Add optional fields if they exist
      if (formData.license_number) entryData.license_number = formData.license_number;
      if (formData.license_expiration_date) entryData.license_expiration_date = formData.license_expiration_date;

      // Store contact info in notes if fields don't exist
      const notes = [];
      if (formData.emergency_contact_name) notes.push(`Emergency Contact: ${formData.emergency_contact_name}`);
      if (formData.emergency_contact_phone) notes.push(`Phone: ${formData.emergency_contact_phone}`);
      if (formData.sponsors) notes.push(`Sponsors: ${formData.sponsors}`);
      if (formData.vehicle_notes) notes.push(`Vehicle Notes: ${formData.vehicle_notes}`);
      if (notes.length) entryData.notes = notes.join('\n');

      // Try Entry first, fallback to DriverProgram
      try {
        const entry = await base44.entities.Entry.create(entryData);
        await writeOperationLog('registration_submitted', 'Entry', entry.id, selectedEvent.id, selectedDriver.id, formData.car_number);
        return { type: 'Entry', id: entry.id };
      } catch (e) {
        // Fallback to DriverProgram
        const dpData = {
          event_id: selectedEvent.id,
          driver_id: selectedDriver.id,
          series_id: selectedEvent.series_id || undefined,
        };
        const dp = await base44.entities.DriverProgram.create(dpData);
        await writeOperationLog('registration_submitted', 'DriverProgram', dp.id, selectedEvent.id, selectedDriver.id, formData.car_number);
        return { type: 'DriverProgram', id: dp.id };
      }
    },
    onSuccess: (result) => {
      toast.success('Registered successfully! You are locked in.');
      setTimeout(() => {
        navigate(createPageUrl('MyDashboard'));
      }, 1500);
    },
    onError: (err) => {
      toast.error(err.message || 'Registration failed');
    },
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Event Registration</h1>
          <p className="text-gray-400 text-sm mt-1">Register for an upcoming event</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Event Selection */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Select Event
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Org Type Selector */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Organization Type</label>
                  <div className="flex gap-2">
                    {[{ val: 'track', label: 'Track', icon: Radio }, { val: 'series', label: 'Series', icon: Building2 }].map(({ val, label, icon: Icon }) => (
                      <button
                        key={val}
                        onClick={() => handleOrgTypeChange(val)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          orgType === val
                            ? 'bg-white text-black'
                            : 'bg-[#262626] text-gray-300 border border-gray-700 hover:bg-[#333333]'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Org Selector */}
                {orgType && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">{orgType === 'track' ? 'Track' : 'Series'}</label>
                    <Select value={orgId} onValueChange={setOrgId}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                        <SelectValue placeholder={`Choose a ${orgType}...`} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        {(orgType === 'track' ? tracks : series).map(item => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Season Selector */}
                {orgId && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Season</label>
                    <Select value={seasonYear} onValueChange={handleSeasonChange}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                        <SelectValue placeholder="Choose season..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        {seasons.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Event Selector */}
                {seasonYear && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Event</label>
                    <Select value={eventId} onValueChange={handleEventSelect}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                        <SelectValue placeholder="Choose event..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                        {allEvents.length === 0 ? (
                          <SelectItem value="__none" disabled>No events found</SelectItem>
                        ) : (
                          allEvents.map(ev => (
                            <SelectItem key={ev.id} value={ev.id}>
                              {ev.name} — {ev.event_date}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Event Preview */}
                {selectedEvent && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#262626] rounded-lg p-4 space-y-3 border border-gray-700">
                    <div>
                      <p className="font-semibold text-white">{selectedEvent.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{selectedEvent.event_date}</p>
                      {selectedEvent.series_name && <p className="text-xs text-gray-500">{selectedEvent.series_name}</p>}
                    </div>
                    <Badge className={`text-xs bg-blue-900/40 text-blue-300`}>{selectedEvent.status || 'upcoming'}</Badge>
                    <Link to={createPageUrl(`EventProfile?id=${selectedEvent.id}`)} target="_blank">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white w-full justify-start">
                        <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Event Profile
                      </Button>
                    </Link>
                  </motion.div>
                )}

                <Button
                  onClick={handleContinueRegistration}
                  disabled={!selectedEvent}
                  className="w-full bg-white text-black hover:bg-gray-100 font-semibold"
                >
                  Continue to Registration <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* RIGHT: Registration Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className={`bg-[#171717] border-gray-800 ${formStep === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <CardHeader>
                <CardTitle className="text-white">Your Registration</CardTitle>
              </CardHeader>
              <CardContent>
                {formStep === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-gray-400 text-sm">Select an event to begin registration</p>
                  </div>
                ) : (
                  <Tabs value={`step-${formStep}`} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-[#262626] border border-gray-700">
                      {['Driver', 'Vehicle', 'Sponsors', 'Confirm'].map((label, idx) => (
                        <TabsTrigger
                          key={idx}
                          value={`step-${idx + 1}`}
                          disabled={formStep < idx + 1}
                          className="text-xs data-[state=active]:bg-white data-[state=active]:text-black"
                        >
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Step 1: Driver */}
                    <TabsContent value="step-1" className="space-y-4 mt-4">
                      {userDrivers.length === 0 ? (
                        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 text-center space-y-3">
                          <UserPlus className="w-8 h-8 text-amber-400 mx-auto" />
                          <div>
                            <p className="text-amber-300 font-semibold text-sm">No Driver Profile</p>
                            <p className="text-amber-200/70 text-xs mt-1">Create one on your Profile page to register.</p>
                          </div>
                          <Link to={createPageUrl('Profile?tab=driver')}>
                            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold w-full">
                              <UserPlus className="w-4 h-4 mr-2" /> Create Driver Profile
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userDrivers.length > 1 && (
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Driver</label>
                              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                                  <SelectValue placeholder="Select driver..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#262626] border-gray-700">
                                  {userDrivers.map(d => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.first_name} {d.last_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {userDrivers.length === 1 && !selectedDriverId && selectedDriverId !== userDrivers[0].id && setSelectedDriverId(userDrivers[0].id)}

                          {selectedDriver && (
                            <div className="bg-[#262626] rounded-lg p-3 border border-green-800/50 space-y-1">
                              <p className="font-semibold text-white text-sm">{selectedDriver.first_name} {selectedDriver.last_name}</p>
                              {selectedDriver.contact_email && <p className="text-xs text-gray-400">{selectedDriver.contact_email}</p>}
                            </div>
                          )}

                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Emergency Contact Name</label>
                            <Input
                              value={formData.emergency_contact_name}
                              onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                              className="bg-[#262626] border-gray-700 text-white"
                              placeholder="Full name"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Emergency Contact Phone</label>
                            <Input
                              value={formData.emergency_contact_phone}
                              onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                              className="bg-[#262626] border-gray-700 text-white"
                              placeholder="Phone number"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">License #</label>
                              <Input
                                value={formData.license_number}
                                onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                                className="bg-[#262626] border-gray-700 text-white"
                                placeholder="License"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">License Expiration</label>
                              <Input
                                type="date"
                                value={formData.license_expiration_date}
                                onChange={e => setFormData({ ...formData, license_expiration_date: e.target.value })}
                                className="bg-[#262626] border-gray-700 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Step 2: Vehicle */}
                    <TabsContent value="step-2" className="space-y-3 mt-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Car Number <span className="text-red-400">*</span></label>
                        <Input
                          value={formData.car_number}
                          onChange={e => setFormData({ ...formData, car_number: e.target.value })}
                          className="bg-[#262626] border-gray-700 text-white"
                          placeholder="e.g. 42"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
                        <Input
                          value={formData.transponder_id}
                          onChange={e => setFormData({ ...formData, transponder_id: e.target.value })}
                          className="bg-[#262626] border-gray-700 text-white"
                          placeholder="Optional"
                        />
                      </div>

                      {teams.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Team (optional)</label>
                          <Select value={formData.team_id} onValueChange={val => setFormData({ ...formData, team_id: val })}>
                            <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                              <SelectValue placeholder="Select team..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              <SelectItem value={null}>No team</SelectItem>
                              {teams.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Manufacturer</label>
                        <Input
                          value={formData.manufacturer}
                          onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                          className="bg-[#262626] border-gray-700 text-white"
                          placeholder="e.g. Chevrolet"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Vehicle Notes</label>
                        <Textarea
                          value={formData.vehicle_notes}
                          onChange={e => setFormData({ ...formData, vehicle_notes: e.target.value })}
                          className="bg-[#262626] border-gray-700 text-white h-16 resize-none"
                          placeholder="Any notes..."
                        />
                      </div>
                    </TabsContent>

                    {/* Step 3: Sponsors */}
                    <TabsContent value="step-3" className="space-y-3 mt-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Sponsors</label>
                        <Textarea
                          value={formData.sponsors}
                          onChange={e => setFormData({ ...formData, sponsors: e.target.value })}
                          className="bg-[#262626] border-gray-700 text-white h-20 resize-none"
                          placeholder="Comma-separated or one per line"
                        />
                      </div>
                    </TabsContent>

                    {/* Step 4: Confirm */}
                    <TabsContent value="step-4" className="space-y-3 mt-4">
                      <div className="bg-[#262626] rounded-lg p-4 space-y-2 text-sm border border-gray-700">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Event</span>
                          <span className="text-white font-medium">{selectedEvent?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Driver</span>
                          <span className="text-white">{selectedDriver?.first_name} {selectedDriver?.last_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Car #</span>
                          <span className="text-white">{formData.car_number || '—'}</span>
                        </div>
                      </div>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmChecked}
                          onChange={e => setConfirmChecked(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-white"
                        />
                        <span className="text-xs text-gray-300">
                          I confirm this registration is accurate and complete
                        </span>
                      </label>
                    </TabsContent>
                  </Tabs>
                )}

                {/* Buttons */}
                {formStep > 0 && (
                  <div className="flex gap-2 mt-6">
                    {formStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => setFormStep(formStep - 1)}
                        className="flex-1 border-gray-700 text-gray-300"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                    )}
                    {formStep < 4 && (
                      <Button
                        onClick={() => setFormStep(formStep + 1)}
                        className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold"
                        disabled={formStep === 1 && !selectedDriverId}
                      >
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                    {formStep === 4 && (
                      <Button
                        onClick={() => submitMutation.mutate()}
                        disabled={!confirmChecked || !formData.car_number || submitMutation.isPending}
                        className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold"
                      >
                        {submitMutation.isPending ? 'Submitting...' : 'Submit Registration'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Auth Dialog */}
        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="bg-[#171717] border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Sign In to Register</DialogTitle>
              <DialogDescription className="text-gray-400">
                You need to be logged in to complete your registration.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAuthDialog(false)}
                className="flex-1 border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold"
              >
                <LogIn className="w-4 h-4 mr-2" /> Sign In
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}