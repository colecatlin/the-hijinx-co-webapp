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
  LogIn, ExternalLink, LayoutDashboard, UserPlus, Building2, Lock, Check, Radio, Truck,
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
  const queryClient = useQueryClient();

  // URL params
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [orgType, setOrgType] = useState(urlParams.get('orgType') || 'series');
  const [orgId, setOrgId] = useState(urlParams.get('orgId') || '');
  const [seasonYear, setSeasonYear] = useState(urlParams.get('seasonYear') || '');
  const [eventId, setEventId] = useState(urlParams.get('eventId') || '');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(1); // 1=select, 2=driver, 3=details, 4=register
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Driver & Entry form
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [driverFormData, setDriverFormData] = useState({
    first_name: '',
    last_name: '',
    hometown_city: '',
    hometown_state: '',
  });
  const [entryFormData, setEntryFormData] = useState({
    series_class_id: '',
    car_number: '',
    transponder_id: '',
    team_id: '',
  });
  const [registrationResult, setRegistrationResult] = useState(null);

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
    queryKey: getEventKey(eventFilters),
    queryFn: () => Object.keys(eventFilters).length
      ? base44.entities.Event.filter(eventFilters)
      : base44.entities.Event.list('-event_date', 200),
    ...DQ,
  });

  const seasons = useMemo(() => {
    const s = new Set(allEvents.map(e => e.season).filter(Boolean));
    return Array.from(s).sort().reverse();
  }, [allEvents]);

  // ── Driver lookup for current user ──
  const { data: myDriver } = useQuery({
    queryKey: getDriverLookupKey(user?.id, user?.email),
    queryFn: async () => {
      if (!user?.id && !user?.email) return null;
      // Try owner_user_id first
      if (user?.id) {
        const byOwner = await base44.entities.Driver.filter({ owner_user_id: user.id });
        if (byOwner.length) return byOwner[0];
      }
      // Try contact_email
      if (user?.email) {
        const byEmail = await base44.entities.Driver.filter({ contact_email: user.email });
        if (byEmail.length) return byEmail[0];
      }
      return null;
    },
    enabled: !!user?.id || !!user?.email,
    ...DQ,
  });

  // ── Series classes if event selected ──
  const { data: seriesClasses = [] } = useQuery({
    queryKey: getSeriesClassKey(selectedEvent?.series_id),
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id }),
    enabled: !!selectedEvent?.series_id,
    ...DQ,
  });

  // ── Existing entry check ──
  const { data: existingEntry } = useQuery({
    queryKey: getExistingEntryKey(eventId, myDriver?.id),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, driver_id: myDriver.id }),
    enabled: !!eventId && !!myDriver?.id,
    ...DQ,
  });

  // ── Duplicate car number check ──
  const { data: eventEntries = [] } = useQuery({
    queryKey: getEventEntriesKey(eventId, entryFormData.series_class_id),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, series_class_id: entryFormData.series_class_id || undefined }),
    enabled: !!eventId && !!entryFormData.series_class_id && currentStep === 4,
    ...DQ,
  });

  // ── Teams ──
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 100),
    enabled: currentStep >= 3,
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

  // ── Load event from URL ──
  useEffect(() => {
    if (eventId && allEvents.length) {
      const event = allEvents.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setCurrentStep(2);
      }
    }
  }, [eventId, allEvents]);

  // ── Handlers ──
  const handleOrgTypeChange = (type) => {
    setOrgType(type);
    setOrgId('');
    setSeasonYear('');
    setEventId('');
    setSelectedEvent(null);
  };

  const handleSeasonChange = (season) => {
    setSeasonYear(season);
    setEventId('');
    setSelectedEvent(null);
  };

  const handleEventSelect = (eid) => {
    const event = allEvents.find(e => e.id === eid);
    setEventId(eid);
    setSelectedEvent(event);
  };

  // ── Create driver mutation ──
  const createDriverMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.email) throw new Error('User email missing');
      const newDriver = await base44.entities.Driver.create({
        first_name: data.first_name,
        last_name: data.last_name,
        hometown_city: data.hometown_city || undefined,
        hometown_state: data.hometown_state || undefined,
        contact_email: user.email,
        owner_user_id: user.id,
      });
      return newDriver;
    },
    onSuccess: (newDriver) => {
      toast.success('Driver profile created!');
      queryClient.setQueryData(getDriverLookupKey(user?.id, user?.email), newDriver);
      setShowCreateDriver(false);
      setDriverFormData({ first_name: '', last_name: '', hometown_city: '', hometown_state: '' });
      setCurrentStep(3);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create driver');
    },
  });

  // ── Register entry mutation ──
  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !myDriver?.id) throw new Error('Missing event or driver');
      if (selectedEvent?.series_id && !entryFormData.series_class_id) throw new Error('Please select a class');
      if (!entryFormData.car_number.trim()) throw new Error('Car number is required');

      // Check for duplicate car number
      const dupCheck = eventEntries.filter(
        e => e.car_number === entryFormData.car_number.trim() && e.driver_id !== myDriver.id
      );
      if (dupCheck.length) {
        throw new Error(`Car number ${entryFormData.car_number} already registered in this class`);
      }

      const entryPayload = {
        event_id: eventId,
        driver_id: myDriver.id,
        series_id: selectedEvent.series_id || undefined,
        series_class_id: entryFormData.series_class_id || undefined,
        car_number: entryFormData.car_number.trim(),
        transponder_id: entryFormData.transponder_id || undefined,
        team_id: entryFormData.team_id || undefined,
        entry_status: 'Registered',
        payment_status: 'Unpaid',
        tech_status: 'Not Inspected',
        waiver_verified: false,
      };

      // Check for existing entry
      const existing = await base44.entities.Entry.filter({
        event_id: eventId,
        driver_id: myDriver.id,
      });

      let result;
      if (existing.length) {
        // Update existing
        result = await base44.entities.Entry.update(existing[0].id, entryPayload);
        await writeOperationLog('entry_updated', 'Entry', result.id, eventId, myDriver.id, entryFormData.car_number);
      } else {
        // Create new
        result = await base44.entities.Entry.create(entryPayload);
        await writeOperationLog('entry_created', 'Entry', result.id, eventId, myDriver.id, entryFormData.car_number);
      }

      return result;
    },
    onSuccess: (entry) => {
      toast.success(existingEntry ? 'Registration updated!' : 'Registered successfully!');
      setRegistrationResult({
        eventName: selectedEvent.name,
        driverName: `${myDriver.first_name} ${myDriver.last_name}`,
        entryStatus: entry.entry_status,
        paymentStatus: entry.payment_status,
        techStatus: entry.tech_status,
      });
      queryClient.invalidateQueries({ queryKey: getExistingEntryKey(eventId, myDriver.id) });
      setTimeout(() => setCurrentStep(5), 1000);
    },
    onError: (err) => {
      toast.error(err.message || 'Registration failed');
    },
  });

  // Not authenticated state
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center space-y-6">
              <Lock className="w-16 h-16 text-gray-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-white">Sign In to Register</h2>
                <p className="text-gray-400 text-sm mt-2">You need to be logged in to register for events.</p>
              </div>
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-white text-black hover:bg-gray-100 font-semibold"
              >
                <LogIn className="w-4 h-4 mr-2" /> Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Event Registration</h1>
          <p className="text-gray-400 text-sm mt-1">Register for an upcoming event</p>
        </motion.div>

        {/* Step 1: Event Selection */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
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
                  onClick={() => {
                    if (!myDriver) {
                      setShowCreateDriver(true);
                    } else {
                      setCurrentStep(3);
                    }
                  }}
                  disabled={!selectedEvent}
                  className="w-full bg-white text-black hover:bg-gray-100 font-semibold"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Confirm/Create Driver */}
        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" /> Confirm Your Driver Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myDriver ? (
                  <div className="bg-[#262626] rounded-lg p-4 border border-green-800/50 space-y-2">
                    <p className="text-sm text-gray-400">Registered as:</p>
                    <p className="font-semibold text-white">{myDriver.first_name} {myDriver.last_name}</p>
                    {myDriver.contact_email && <p className="text-xs text-gray-400">{myDriver.contact_email}</p>}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Entry Details */}
        {currentStep === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="w-5 h-5" /> Entry Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Series Class selector */}
                {selectedEvent?.series_id && seriesClasses.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-2">
                      Class <span className="text-red-400">*</span>
                    </label>
                    <Select value={entryFormData.series_class_id} onValueChange={val => setEntryFormData({ ...entryFormData, series_class_id: val })}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                        <SelectValue placeholder="Select class..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        {seriesClasses.map(sc => (
                          <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!selectedEvent?.series_id && (
                  <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
                    <p className="text-xs text-blue-400">This event is not linked to a series. Classes are optional.</p>
                  </div>
                )}

                {/* Car number */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">
                    Car Number <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={entryFormData.car_number}
                    onChange={e => setEntryFormData({ ...entryFormData, car_number: e.target.value })}
                    className="bg-[#262626] border-gray-700 text-white"
                    placeholder="e.g. 42"
                  />
                </div>

                {/* Transponder */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Transponder ID</label>
                  <Input
                    value={entryFormData.transponder_id}
                    onChange={e => setEntryFormData({ ...entryFormData, transponder_id: e.target.value })}
                    className="bg-[#262626] border-gray-700 text-white"
                    placeholder="Optional"
                  />
                </div>

                {/* Team selector */}
                {teams.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-2">Team</label>
                    <Select value={entryFormData.team_id} onValueChange={val => setEntryFormData({ ...entryFormData, team_id: val })}>
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

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(4)}
                    disabled={selectedEvent?.series_id && !entryFormData.series_class_id}
                    className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold"
                  >
                    Review <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Review & Register */}
        {currentStep === 4 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Check className="w-5 h-5" /> Review Registration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#262626] rounded-lg p-4 space-y-3 border border-gray-700 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Event</span>
                    <span className="text-white font-medium">{selectedEvent?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Driver</span>
                    <span className="text-white">{myDriver?.first_name} {myDriver?.last_name}</span>
                  </div>
                  {entryFormData.series_class_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Class</span>
                      <span className="text-white">{seriesClasses.find(c => c.id === entryFormData.series_class_id)?.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Car #</span>
                    <span className="text-white">{entryFormData.car_number || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className="text-white">Registered</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => registerMutation.mutate()}
                    disabled={!entryFormData.car_number || registerMutation.isPending}
                    className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold"
                  >
                    {registerMutation.isPending ? 'Submitting...' : (existingEntry ? 'Update Registration' : 'Register')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Success */}
        {currentStep === 5 && registrationResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <Card className="bg-[#171717] border-gray-800">
              <CardContent className="py-12 text-center space-y-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Registration Complete!</h2>
                  <p className="text-gray-400 text-sm mt-2">You're all set.</p>
                </div>
                <div className="bg-[#262626] rounded-lg p-4 space-y-2 text-left text-sm border border-gray-700">
                  <div><span className="text-gray-400">Event:</span> <span className="text-white font-medium">{registrationResult.eventName}</span></div>
                  <div><span className="text-gray-400">Driver:</span> <span className="text-white">{registrationResult.driverName}</span></div>
                  <div><span className="text-gray-400">Status:</span> <span className="text-white">{registrationResult.entryStatus}</span></div>
                  <div><span className="text-gray-400">Payment:</span> <span className="text-white">{registrationResult.paymentStatus}</span></div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentStep(1);
                      setEventId('');
                      setSelectedEvent(null);
                      setEntryFormData({ series_class_id: '', car_number: '', transponder_id: '', team_id: '' });
                      setRegistrationResult(null);
                    }}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Register Another
                  </Button>
                  {user?.role === 'admin' && selectedEvent && (
                    <Link
                      to={`${createPageUrl('RegistrationDashboard')}?orgType=${selectedEvent.series_id ? 'series' : 'track'}&orgId=${selectedEvent.series_id || selectedEvent.track_id}&seasonYear=${selectedEvent.season}&eventId=${selectedEvent.id}`}
                      className="flex-1"
                    >
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 font-semibold">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> View Dashboard
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Create Driver Dialog */}
        <Dialog open={showCreateDriver} onOpenChange={setShowCreateDriver}>
          <DialogContent className="bg-[#171717] border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Create Driver Profile
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Create your driver profile to register for events.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">First Name <span className="text-red-400">*</span></label>
                <Input
                  value={driverFormData.first_name}
                  onChange={e => setDriverFormData({ ...driverFormData, first_name: e.target.value })}
                  className="bg-[#262626] border-gray-700 text-white"
                  placeholder="First"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Last Name <span className="text-red-400">*</span></label>
                <Input
                  value={driverFormData.last_name}
                  onChange={e => setDriverFormData({ ...driverFormData, last_name: e.target.value })}
                  className="bg-[#262626] border-gray-700 text-white"
                  placeholder="Last"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Hometown City</label>
                <Input
                  value={driverFormData.hometown_city}
                  onChange={e => setDriverFormData({ ...driverFormData, hometown_city: e.target.value })}
                  className="bg-[#262626] border-gray-700 text-white"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Hometown State</label>
                <Input
                  value={driverFormData.hometown_state}
                  onChange={e => setDriverFormData({ ...driverFormData, hometown_state: e.target.value })}
                  className="bg-[#262626] border-gray-700 text-white"
                  placeholder="State"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDriver(false)}
                className="flex-1 border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createDriverMutation.mutate(driverFormData)}
                disabled={!driverFormData.first_name || !driverFormData.last_name || createDriverMutation.isPending}
                className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold"
              >
                {createDriverMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}