import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2, ArrowRight, ArrowLeft, AlertCircle, User, Calendar,
  LogIn, ExternalLink, LayoutDashboard, UserPlus, Truck, Building2, FileText, Check,
} from 'lucide-react';

const DQ = { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false };

// ─── Status colours ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Paid: 'bg-green-900/40 text-green-300',
  Unpaid: 'bg-red-900/40 text-red-300',
  Refunded: 'bg-purple-900/40 text-purple-300',
  Verified: 'bg-green-900/40 text-green-300',
  Missing: 'bg-yellow-900/40 text-yellow-300',
  Passed: 'bg-green-900/40 text-green-300',
  Failed: 'bg-red-900/40 text-red-300',
  'Not Inspected': 'bg-gray-700/60 text-gray-400',
  'Recheck Required': 'bg-orange-900/40 text-orange-300',
  Registered: 'bg-blue-900/40 text-blue-300',
  'Checked In': 'bg-teal-900/40 text-teal-300',
  Teched: 'bg-indigo-900/40 text-indigo-300',
  Withdrawn: 'bg-gray-700/60 text-gray-500',
};

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ['Select Event', 'Driver Profile', 'Register'];
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((label, idx) => {
        const step = idx + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                done ? 'bg-white border-white text-black' :
                active ? 'bg-transparent border-white text-white' :
                'bg-transparent border-gray-600 text-gray-600'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : step}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : done ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px max-w-[60px] ${step < current ? 'bg-white' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function writeOperationLog(type, entryId, eventId) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: type,
      source_type: 'Registration',
      entity_name: 'Entry',
      entity_id: entryId,
      status: 'success',
      metadata: { eventId },
    });
  } catch (_) {
    // non-fatal
  }
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Registration() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [trackFilter, setTrackFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Step 3 state
  const [entryForm, setEntryForm] = useState({ car_number: '', transponder_id: '', team_id: '', series_class_id: '', notes: '' });
  const [carNumberError, setCarNumberError] = useState('');
  const [waiverChecked, setWaiverChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Auth ──
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), ...DQ });
  const { data: isAuth } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), ...DQ });

  // ── Selectors data ──
  const { data: tracks = [] } = useQuery({ queryKey: ['tracks', {}], queryFn: () => base44.entities.Track.list('name', 200), ...DQ });
  const { data: seriesList = [] } = useQuery({ queryKey: ['series', {}], queryFn: () => base44.entities.Series.list('name', 200), ...DQ });

  const eventFilters = useMemo(() => {
    const f = {};
    if (trackFilter !== 'all') f.track_id = trackFilter;
    if (seriesFilter !== 'all') f.series_id = seriesFilter;
    if (seasonFilter !== 'all') f.season = seasonFilter;
    return f;
  }, [trackFilter, seriesFilter, seasonFilter]);

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events', eventFilters],
    queryFn: () => Object.keys(eventFilters).length
      ? base44.entities.Event.filter(eventFilters)
      : base44.entities.Event.list('event_date', 200),
    ...DQ,
  });

  const events = useMemo(() =>
    allEvents.filter(e => ['upcoming', 'in_progress', 'Draft', 'Published', 'Live'].includes(e.status)),
    [allEvents]
  );

  const seasons = useMemo(() => {
    const s = new Set(allEvents.map(e => e.season).filter(Boolean));
    return Array.from(s).sort().reverse();
  }, [allEvents]);

  // ── Driver profile (owner_user_id only — no auto-create) ──
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ['userDriver', user?.id],
    queryFn: () => base44.entities.Driver.filter({ owner_user_id: user.id }).then(r => r[0] || null),
    enabled: !!user?.id,
    ...DQ,
  });

  // ── Entry for this event ──
  const { data: existingEntry, refetch: refetchEntry, isLoading: entryLoading } = useQuery({
    queryKey: ['myEntry', selectedEvent?.id, driver?.id],
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEvent.id, driver_id: driver.id }).then(r => r[0] || null),
    enabled: !!selectedEvent?.id && !!driver?.id,
    ...DQ,
  });

  // ── All entries for this event (car number uniqueness check) ──
  const { data: eventEntries = [] } = useQuery({
    queryKey: ['eventEntriesForValidation', selectedEvent?.id],
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id && step === 3,
    ...DQ,
  });

  // ── Series classes ──
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedEvent?.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id }),
    enabled: !!selectedEvent?.series_id && step === 3,
    ...DQ,
  });

  // ── Teams ──
  const { data: teams = [] } = useQuery({
    queryKey: ['teams', {}],
    queryFn: () => base44.entities.Team.list('name', 100),
    enabled: step === 3,
    ...DQ,
  });

  // Pre-fill form when existingEntry loads
  useEffect(() => {
    if (existingEntry) {
      setEntryForm({
        car_number: existingEntry.car_number || '',
        transponder_id: existingEntry.transponder_id || '',
        team_id: existingEntry.team_id || '',
        series_class_id: existingEntry.series_class_id || '',
        license_number: existingEntry.license_number || '',
        license_expiration_date: existingEntry.license_expiration_date || '',
        notes: existingEntry.notes || '',
      });
    }
  }, [existingEntry?.id]);

  // ── Validation helpers ──
  const classesExist = seriesClasses.length > 0;

  function validateForm(form) {
    if (!form.car_number?.trim()) return 'Car number is required.';
    if (classesExist && !form.series_class_id) return 'Please select a class.';
    return null;
  }

  function checkCarNumberUnique(carNumber, currentEntryId) {
    const conflict = eventEntries.find(
      e => e.car_number === carNumber && e.id !== currentEntryId && e.driver_id !== driver?.id
    );
    return conflict ? `Car #${carNumber} is already registered by another driver for this event.` : null;
  }

  // ── Shared invalidation ──
  function invalidateEntries(eventId) {
    queryClient.invalidateQueries({ queryKey: REG_QK.entries(eventId), exact: true });
    queryClient.invalidateQueries({ queryKey: ['entries'] });
    queryClient.invalidateQueries({ queryKey: ['myEntry'] });
    queryClient.invalidateQueries({ queryKey: ['eventEntriesForValidation', eventId] });
    queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
  }

  // ── Mutations ──
  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: async (newEntry) => {
      invalidateEntries(selectedEvent.id);
      await writeOperationLog('entry_created', newEntry.id, selectedEvent.id);
      toast.success('You are registered!');
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    onSuccess: async (_, vars) => {
      invalidateEntries(selectedEvent.id);
      await writeOperationLog('entry_updated', vars.id, selectedEvent.id);
      toast.success('Entry updated');
    },
  });

  // ── Handlers ──
  const handleCreateEntry = () => {
    setCarNumberError('');
    const validErr = validateForm(entryForm);
    if (validErr) { toast.error(validErr); return; }
    const uniqueErr = checkCarNumberUnique(entryForm.car_number, null);
    if (uniqueErr) { setCarNumberError(uniqueErr); return; }

    createEntryMutation.mutate({
      event_id: selectedEvent.id,
      driver_id: driver.id,
      series_id: selectedEvent.series_id || undefined,
      team_id: entryForm.team_id || undefined,
      series_class_id: entryForm.series_class_id || undefined,
      car_number: entryForm.car_number.trim(),
      transponder_id: entryForm.transponder_id || undefined,
      license_number: entryForm.license_number || undefined,
      license_expiration_date: entryForm.license_expiration_date || undefined,
      notes: entryForm.notes || undefined,
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      waiver_status: 'Missing',
      waiver_verified: false,
      compliance_status: 'needs_attention',
      tech_status: 'Not Inspected',
      wristband_count: 0,
    });
  };

  const handleUpdateEntry = () => {
    setCarNumberError('');
    const validErr = validateForm(entryForm);
    if (validErr) { toast.error(validErr); return; }
    const uniqueErr = checkCarNumberUnique(entryForm.car_number, existingEntry.id);
    if (uniqueErr) { setCarNumberError(uniqueErr); return; }

    updateEntryMutation.mutate({
      id: existingEntry.id,
      data: {
        car_number: entryForm.car_number.trim(),
        transponder_id: entryForm.transponder_id || undefined,
        team_id: entryForm.team_id || undefined,
        series_class_id: entryForm.series_class_id || undefined,
        license_number: entryForm.license_number || undefined,
        license_expiration_date: entryForm.license_expiration_date || undefined,
        notes: entryForm.notes || undefined,
      },
    });
  };

  const handleWithdraw = () => {
    updateEntryMutation.mutate({ id: existingEntry.id, data: { entry_status: 'Withdrawn' } });
  };

  const handleMarkWaiver = () => {
    updateEntryMutation.mutate({ id: existingEntry.id, data: { waiver_status: 'Verified' } });
  };

  const handleReRegister = () => {
    createEntryMutation.mutate({
      event_id: selectedEvent.id,
      driver_id: driver.id,
      series_id: selectedEvent.series_id || undefined,
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      waiver_status: 'Missing',
      waiver_verified: false,
      compliance_status: 'needs_attention',
      tech_status: 'Not Inspected',
      wristband_count: 0,
    });
  };

  const qrPayload = existingEntry && existingEntry.entry_status !== 'Withdrawn'
    ? `INDEX46|eventId=${selectedEvent?.id}|entryId=${existingEntry.id}|driverId=${driver?.id}|car=${existingEntry.car_number || ''}`
    : null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canProceedStep1 = !!selectedEvent;
  const canProceedStep2 = !!driver;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Event Registration</h1>
          <p className="text-gray-400 text-sm">Register your driver for an upcoming event</p>
          {isAdmin && (
            <Link to={createPageUrl('RegistrationDashboard')} className="inline-flex items-center gap-1.5 mt-3 text-xs text-amber-400 hover:text-amber-300">
              <LayoutDashboard className="w-3.5 h-3.5" /> Registration Dashboard
            </Link>
          )}
        </motion.div>

        <StepIndicator current={step} />

        <AnimatePresence mode="wait">

          {/* ─────────── STEP 1: Event Selection ─────────── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> Select Event
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Track</label>
                      <Select value={trackFilter} onValueChange={setTrackFilter}>
                        <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-gray-700">
                          <SelectItem value="all">All Tracks</SelectItem>
                          {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Series</label>
                      <Select value={seriesFilter} onValueChange={setSeriesFilter}>
                        <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-gray-700">
                          <SelectItem value="all">All Series</SelectItem>
                          {seriesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Season</label>
                      <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                        <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-gray-700">
                          <SelectItem value="all">All Seasons</SelectItem>
                          {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Event selector */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Event <span className="text-red-400">*</span></label>
                    <Select value={selectedEvent?.id || ''} onValueChange={(val) => {
                      setSelectedEvent(events.find(e => e.id === val) || null);
                    }}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                        <SelectValue placeholder="Choose an event..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                        {events.length === 0
                          ? <SelectItem value="__none" disabled>No events found</SelectItem>
                          : events.map(ev => (
                            <SelectItem key={ev.id} value={ev.id}>
                              {ev.name} — {ev.event_date}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected event preview */}
                  {selectedEvent && (
                    <div className="bg-[#262626] rounded-lg p-4 space-y-2 border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white">{selectedEvent.name}</p>
                          <p className="text-sm text-gray-400">
                            {selectedEvent.event_date}
                            {selectedEvent.series_name ? ` · ${selectedEvent.series_name}` : ''}
                          </p>
                        </div>
                        <Link to={createPageUrl(`EventProfile?id=${selectedEvent.id}`)} target="_blank">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                      <Badge className={`text-xs ${STATUS_COLORS[selectedEvent.status] || 'bg-gray-700/60 text-gray-400'}`}>
                        {selectedEvent.status || 'upcoming'}
                      </Badge>
                    </div>
                  )}

                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="w-full bg-white text-black hover:bg-gray-100 font-semibold"
                  >
                    Next: Driver Profile <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─────────── STEP 2: Driver Identity ─────────── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" /> Driver Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Unauthenticated gate */}
                  {!isAuth && (
                    <div className="text-center py-10 space-y-4">
                      <LogIn className="w-12 h-12 text-gray-500 mx-auto" />
                      <div>
                        <p className="font-semibold text-white text-lg">Login Required</p>
                        <p className="text-sm text-gray-400 mt-1">You need to be logged in to register for an event.</p>
                      </div>
                      <Button
                        onClick={() => base44.auth.redirectToLogin(window.location.href)}
                        className="bg-white text-black hover:bg-gray-100 font-semibold px-8"
                      >
                        <LogIn className="w-4 h-4 mr-2" /> Log In to Continue
                      </Button>
                    </div>
                  )}

                  {/* Authenticated — loading */}
                  {isAuth && driverLoading && (
                    <p className="text-sm text-gray-400 py-4 text-center">Loading your driver profile…</p>
                  )}

                  {/* Authenticated — no driver profile */}
                  {isAuth && !driverLoading && !driver && (
                    <div className="space-y-4 py-4">
                      <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-5 text-center space-y-3">
                        <UserPlus className="w-10 h-10 text-amber-400 mx-auto" />
                        <div>
                          <p className="text-amber-300 font-semibold text-base">No Driver Profile Found</p>
                          <p className="text-amber-200/70 text-sm mt-1">
                            To register for an event, you need a Driver profile linked to your account.
                          </p>
                        </div>
                        <Link to={createPageUrl('Profile')}>
                          <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold mt-2">
                            <UserPlus className="w-4 h-4 mr-2" /> Create Driver Profile
                          </Button>
                        </Link>
                        <p className="text-xs text-gray-500">
                          Visit your Profile page to claim or create a Driver record.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Authenticated — driver found */}
                  {isAuth && driver && (
                    <div className="space-y-4">
                      <div className="bg-[#262626] rounded-lg p-4 border border-green-800/50 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-white text-lg">{driver.first_name} {driver.last_name}</p>
                            <p className="text-sm text-gray-400">{driver.contact_email}</p>
                            {driver.hometown_city && (
                              <p className="text-xs text-gray-500 mt-0.5">{driver.hometown_city}{driver.hometown_state ? `, ${driver.hometown_state}` : ''}</p>
                            )}
                            {driver.primary_number && (
                              <p className="text-xs text-gray-400 mt-1">Primary #: <span className="text-white font-mono">{driver.primary_number}</span></p>
                            )}
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-700 text-gray-300">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    {isAuth && driver && (
                      <Button onClick={() => setStep(3)} disabled={!canProceedStep2}
                        className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold">
                        Next: Register <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─────────── STEP 3: Entry Form / Status ─────────── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Registration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Event + driver summary */}
                  <div className="bg-[#262626] rounded-lg p-4 border border-gray-700 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Event</span>
                      <span className="text-white font-medium">{selectedEvent?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date</span>
                      <span className="text-white">{selectedEvent?.event_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Driver</span>
                      <span className="text-white">{driver?.first_name} {driver?.last_name}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-700 mt-1">
                      <Link to={createPageUrl(`EventProfile?id=${selectedEvent?.id}`)} target="_blank" className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                        View event <ExternalLink className="w-3 h-3" />
                      </Link>
                      {isAdmin && (
                        <Link to={createPageUrl('RegistrationDashboard')} className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                          <LayoutDashboard className="w-3 h-3" /> Dashboard
                        </Link>
                      )}
                    </div>
                  </div>

                  {entryLoading && (
                    <p className="text-sm text-gray-400 text-center py-4">Checking registration…</p>
                  )}

                  {/* ── Already registered ── */}
                  {!entryLoading && existingEntry && existingEntry.entry_status !== 'Withdrawn' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <p className="text-sm font-semibold text-green-400">
                          You are registered
                          <Badge className={`ml-2 text-xs ${STATUS_COLORS[existingEntry.entry_status] || 'bg-gray-700/60 text-gray-400'}`}>
                            {existingEntry.entry_status}
                          </Badge>
                        </p>
                      </div>

                      {/* Compliance pills */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: CreditCard, label: 'Payment', value: existingEntry.payment_status || 'Unpaid' },
                          { icon: Shield, label: 'Waiver', value: existingEntry.waiver_status || 'Missing' },
                          { icon: Wrench, label: 'Tech', value: existingEntry.tech_status || 'Not Inspected' },
                          { icon: Radio, label: 'Transponder', value: existingEntry.transponder_id ? 'Set' : 'Missing' },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="bg-[#262626] rounded p-3 flex items-center gap-2 border border-gray-700">
                            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400">{label}</p>
                              <Badge className={`text-xs mt-0.5 ${STATUS_COLORS[value] || 'bg-gray-700/60 text-gray-400'}`}>{value}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Waiver acknowledgment */}
                      {existingEntry.waiver_status !== 'Verified' ? (
                        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Waiver Required
                          </p>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={waiverChecked}
                              onChange={e => setWaiverChecked(e.target.checked)}
                              className="mt-0.5 w-4 h-4 accent-white"
                            />
                            <span className="text-sm text-gray-300">
                              I confirm I have read and agree to the event waiver terms.
                            </span>
                          </label>
                          <Button
                            onClick={handleMarkWaiver}
                            disabled={!waiverChecked || updateEntryMutation.isPending}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                          >
                            {updateEntryMutation.isPending ? 'Saving…' : 'Mark Waiver Verified'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-3">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Waiver verified
                        </div>
                      )}

                      {/* QR Payload */}
                      {qrPayload && (
                        <div className="bg-[#262626] border border-gray-700 rounded-lg p-4 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-white mb-0.5">Check-In QR</p>
                            <p className="text-xs text-gray-400">Show this at the gate</p>
                          </div>
                          <pre className="bg-[#1A1A1A] text-green-400 text-xs font-mono rounded p-3 whitespace-pre-wrap break-all border border-gray-700">
                            {qrPayload}
                          </pre>
                          <Button onClick={handleCopyPayload} variant="outline" size="sm" className="w-full border-gray-700 text-gray-300">
                            {copied ? <><Check className="w-3.5 h-3.5 mr-2 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-2" /> Copy QR Payload</>}
                          </Button>
                        </div>
                      )}

                      {/* Edit fields */}
                      <EntryFormFields
                        form={entryForm}
                        onChange={setEntryForm}
                        seriesClasses={seriesClasses}
                        teams={teams}
                        classesExist={classesExist}
                        carNumberError={carNumberError}
                        onClearCarError={() => setCarNumberError('')}
                        label="Update Your Entry"
                      />
                      <Button onClick={handleUpdateEntry} disabled={updateEntryMutation.isPending}
                        className="w-full bg-white text-black hover:bg-gray-100 font-semibold">
                        {updateEntryMutation.isPending ? 'Saving…' : 'Save Changes'}
                      </Button>

                      {/* Withdraw */}
                      <div className="border-t border-gray-700 pt-4">
                        <Button variant="outline" onClick={handleWithdraw} disabled={updateEntryMutation.isPending}
                          className="w-full border-red-800 text-red-400 hover:bg-red-900/20">
                          Withdraw Entry
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Withdrawn state ── */}
                  {!entryLoading && existingEntry && existingEntry.entry_status === 'Withdrawn' && (
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 text-center space-y-3">
                      <p className="text-gray-400 text-sm">Your entry has been withdrawn.</p>
                      <Button onClick={handleReRegister} disabled={createEntryMutation.isPending}
                        className="bg-white text-black hover:bg-gray-100">
                        {createEntryMutation.isPending ? 'Registering…' : 'Re-Register'}
                      </Button>
                    </div>
                  )}

                  {/* ── New entry form ── */}
                  {!entryLoading && !existingEntry && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">Complete your entry details below.</p>
                      <EntryFormFields
                        form={entryForm}
                        onChange={setEntryForm}
                        seriesClasses={seriesClasses}
                        teams={teams}
                        classesExist={classesExist}
                        carNumberError={carNumberError}
                        onClearCarError={() => setCarNumberError('')}
                      />
                      <Button onClick={handleCreateEntry} disabled={createEntryMutation.isPending}
                        className="w-full bg-white text-black hover:bg-gray-100 font-semibold py-3">
                        {createEntryMutation.isPending ? 'Registering…' : 'Complete Registration'}
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" onClick={() => setStep(2)} className="w-full border-gray-700 text-gray-400">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Shared entry form fields sub-component ────────────────────────────────────
function EntryFormFields({ form, onChange, seriesClasses, teams, classesExist, carNumberError, onClearCarError, label }) {
  const set = (field, val) => onChange(f => ({ ...f, [field]: val }));
  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-medium text-gray-400 uppercase tracking-wide border-t border-gray-700 pt-4">{label}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Car # <span className="text-red-400">*</span></label>
          <Input
            value={form.car_number}
            onChange={e => { set('car_number', e.target.value); onClearCarError(); }}
            className={`bg-[#262626] border-gray-700 text-white ${carNumberError ? 'border-red-600' : ''}`}
            placeholder="e.g. 42"
          />
          {carNumberError && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{carNumberError}</p>}
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
          <Input
            value={form.transponder_id}
            onChange={e => set('transponder_id', e.target.value)}
            className="bg-[#262626] border-gray-700 text-white"
            placeholder="Optional"
          />
        </div>
      </div>

      {classesExist ? (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Class <span className="text-red-400">*</span></label>
          <Select value={form.series_class_id} onValueChange={val => set('series_class_id', val)}>
            <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
              <SelectValue placeholder="Select class..." />
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-gray-700">
              {seriesClasses.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">No classes configured for this event.</p>
      )}

      {teams.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Team (optional)</label>
          <Select value={form.team_id} onValueChange={val => set('team_id', val)}>
            <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
              <SelectValue placeholder="Select team..." />
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-gray-700">
              <SelectItem value={null}>No team</SelectItem>
              {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
        <Textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="bg-[#262626] border-gray-700 text-white h-20 resize-none"
          placeholder="Any notes for the organizer..."
        />
      </div>
    </div>
  );
}