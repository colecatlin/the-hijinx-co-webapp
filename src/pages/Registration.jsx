import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle2, ArrowRight, ArrowLeft, AlertCircle, User, Calendar,
  LogIn, ExternalLink, LayoutDashboard, Shield, CreditCard, Wrench, Radio, Copy, Check,
} from 'lucide-react';

const DQ = { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false };

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ['Select Event', 'Driver Profile', 'Confirm Entry'];
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Registration() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [trackFilter, setTrackFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Step 2 state
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [showEditDriver, setShowEditDriver] = useState(false);
  const [driverForm, setDriverForm] = useState({});

  // Step 3 state
  const [entryForm, setEntryForm] = useState({ car_number: '', transponder_id: '', team_id: '', series_class_id: '' });

  // ── Auth ──
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), ...DQ });
  const { data: isAuth } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), ...DQ });

  // ── Selectors data ──
  const { data: tracks = [] } = useQuery({ queryKey: ['tracks', {}], queryFn: () => base44.entities.Track.list('name', 200), ...DQ });
  const { data: series = [] } = useQuery({ queryKey: ['series', {}], queryFn: () => base44.entities.Series.list('name', 200), ...DQ });

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

  // ── Driver profile ──
  const { data: driver, refetch: refetchDriver } = useQuery({
    queryKey: ['userDriver', user?.id],
    queryFn: async () => {
      const byOwner = await base44.entities.Driver.filter({ owner_user_id: user.id });
      if (byOwner.length > 0) return byOwner[0];
      const byEmail = await base44.entities.Driver.filter({ contact_email: user.email });
      return byEmail[0] || null;
    },
    enabled: !!user?.id,
    ...DQ,
  });

  const { data: driverClaims = [] } = useQuery({
    queryKey: ['driverClaims', user?.email],
    queryFn: () => base44.entities.DriverClaim.filter({ claimant_email: user.email }),
    enabled: !!user?.email && step === 2 && !driver,
    ...DQ,
  });

  // ── Entry for this event ──
  const { data: existingEntry, refetch: refetchEntry } = useQuery({
    queryKey: ['myEntry', selectedEvent?.id, driver?.id],
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEvent.id, driver_id: driver.id }),
    enabled: !!selectedEvent?.id && !!driver?.id,
    select: (data) => data[0] || null,
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

  // ── Mutations ──
  const createDriverMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.create({ ...data, owner_user_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDriver'] });
      setShowCreateDriver(false);
      setDriverForm({});
      toast.success('Driver profile created');
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Driver.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDriver'] });
      setShowEditDriver(false);
      toast.success('Profile updated');
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEntry'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('Entry created! You are registered.');
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEntry'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('Entry updated');
    },
  });

  // ── Handlers ──
  const handleCreateDriver = () => {
    const { first_name, last_name, contact_email } = driverForm;
    if (!first_name || !last_name || !contact_email) {
      toast.error('First name, last name and email are required');
      return;
    }
    createDriverMutation.mutate(driverForm);
  };

  const handleUpdateDriver = () => {
    updateDriverMutation.mutate({ id: driver.id, data: driverForm });
  };

  const handleCreateEntry = () => {
    createEntryMutation.mutate({
      event_id: selectedEvent.id,
      driver_id: driver.id,
      series_id: selectedEvent.series_id || undefined,
      team_id: entryForm.team_id || undefined,
      series_class_id: entryForm.series_class_id || undefined,
      car_number: entryForm.car_number || undefined,
      transponder_id: entryForm.transponder_id || undefined,
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      waiver_status: 'Missing',
      tech_status: 'Not Inspected',
    });
  };

  const handleUpdateEntry = () => {
    updateEntryMutation.mutate({
      id: existingEntry.id,
      data: {
        car_number: entryForm.car_number || existingEntry.car_number,
        transponder_id: entryForm.transponder_id || existingEntry.transponder_id,
        team_id: entryForm.team_id || existingEntry.team_id,
        series_class_id: entryForm.series_class_id || existingEntry.series_class_id,
      },
    });
  };

  const handleWithdraw = () => {
    updateEntryMutation.mutate({ id: existingEntry.id, data: { entry_status: 'Withdrawn' } });
  };

  const handleMarkWaiver = () => {
    updateEntryMutation.mutate({ id: existingEntry.id, data: { waiver_status: 'Verified' } });
  };

  const qrPayload = existingEntry && existingEntry.entry_status !== 'Withdrawn'
    ? `INDEX46|eventId=${selectedEvent?.id}|entryId=${existingEntry.id}|driverId=${driver?.id}|car=${existingEntry.car_number || ''}`
    : null;

  const [waiverChecked, setWaiverChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canProceedStep1 = !!selectedEvent;
  const canProceedStep2 = !!driver && !!driver.first_name && !!driver.last_name && !!driver.contact_email;

  // ── Status badge helpers ──
  const statusColors = {
    Paid: 'bg-green-900/40 text-green-300',
    Unpaid: 'bg-red-900/40 text-red-300',
    Verified: 'bg-green-900/40 text-green-300',
    Missing: 'bg-yellow-900/40 text-yellow-300',
    Passed: 'bg-green-900/40 text-green-300',
    Failed: 'bg-red-900/40 text-red-300',
    'Not Inspected': 'bg-gray-700/60 text-gray-400',
    'Recheck Required': 'bg-orange-900/40 text-orange-300',
    Registered: 'bg-blue-900/40 text-blue-300',
    'Checked In': 'bg-teal-900/40 text-teal-300',
    Withdrawn: 'bg-gray-700/60 text-gray-500',
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Event Registration</h1>
          <p className="text-gray-400 text-sm">Register your driver for an upcoming event</p>
        </motion.div>

        <StepIndicator current={step} />

        <AnimatePresence mode="wait">
          {/* ───────────────── STEP 1 ───────────────── */}
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
                      <label className="text-xs text-gray-400 block mb-1">Track (optional)</label>
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
                      <label className="text-xs text-gray-400 block mb-1">Series (optional)</label>
                      <Select value={seriesFilter} onValueChange={setSeriesFilter}>
                        <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-gray-700">
                          <SelectItem value="all">All Series</SelectItem>
                          {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Season (optional)</label>
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
                      const ev = events.find(e => e.id === val);
                      setSelectedEvent(ev || null);
                    }}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                        <SelectValue placeholder="Choose an event..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                        {events.length === 0
                          ? <SelectItem value="none" disabled>No events found</SelectItem>
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
                          <p className="text-sm text-gray-400">{selectedEvent.event_date}{selectedEvent.series_name ? ` · ${selectedEvent.series_name}` : ''}</p>
                        </div>
                        <Link to={createPageUrl(`EventProfile?id=${selectedEvent.id}`)} target="_blank">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                      <Badge className={`text-xs ${statusColors[selectedEvent.status] || 'bg-gray-700/60 text-gray-400'}`}>
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

          {/* ───────────────── STEP 2 ───────────────── */}
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
                    <div className="text-center py-6 space-y-4">
                      <LogIn className="w-10 h-10 text-gray-500 mx-auto" />
                      <div>
                        <p className="font-semibold text-white">Login Required</p>
                        <p className="text-sm text-gray-400 mt-1">You need to be logged in to register for an event.</p>
                      </div>
                      <Button
                        onClick={() => base44.auth.redirectToLogin(window.location.href)}
                        className="bg-white text-black hover:bg-gray-100"
                      >
                        <LogIn className="w-4 h-4 mr-2" /> Log In to Continue
                      </Button>
                    </div>
                  )}

                  {/* Authenticated — no driver yet */}
                  {isAuth && !driver && (
                    <div className="space-y-4">
                      <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4">
                        <p className="text-sm text-amber-300 font-medium">No driver profile found for your account.</p>
                        {driverClaims.length > 0 && (
                          <p className="text-xs text-amber-200/70 mt-1">
                            You have a pending claim — <Link to={createPageUrl('Profile')} className="underline">visit your profile</Link> to complete it.
                          </p>
                        )}
                      </div>

                      {!showCreateDriver ? (
                        <Button onClick={() => { setShowCreateDriver(true); setDriverForm({ contact_email: user?.email || '' }); }}
                          className="w-full bg-white text-black hover:bg-gray-100">
                          Create Driver Profile
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-300">New Driver Profile</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">First Name *</label>
                              <Input value={driverForm.first_name || ''} onChange={e => setDriverForm({ ...driverForm, first_name: e.target.value })}
                                className="bg-[#262626] border-gray-700 text-white" placeholder="First" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Last Name *</label>
                              <Input value={driverForm.last_name || ''} onChange={e => setDriverForm({ ...driverForm, last_name: e.target.value })}
                                className="bg-[#262626] border-gray-700 text-white" placeholder="Last" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Contact Email *</label>
                            <Input value={driverForm.contact_email || ''} onChange={e => setDriverForm({ ...driverForm, contact_email: e.target.value })}
                              className="bg-[#262626] border-gray-700 text-white" type="email" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">City</label>
                              <Input value={driverForm.hometown_city || ''} onChange={e => setDriverForm({ ...driverForm, hometown_city: e.target.value })}
                                className="bg-[#262626] border-gray-700 text-white" placeholder="City" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">State</label>
                              <Input value={driverForm.hometown_state || ''} onChange={e => setDriverForm({ ...driverForm, hometown_state: e.target.value })}
                                className="bg-[#262626] border-gray-700 text-white" placeholder="State" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Primary Car # (optional)</label>
                            <Input value={driverForm.primary_number || ''} onChange={e => setDriverForm({ ...driverForm, primary_number: e.target.value })}
                              className="bg-[#262626] border-gray-700 text-white" placeholder="e.g. 42" />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowCreateDriver(false)} className="flex-1 border-gray-700 text-gray-300">Cancel</Button>
                            <Button onClick={handleCreateDriver} disabled={createDriverMutation.isPending} className="flex-1 bg-white text-black hover:bg-gray-100">
                              {createDriverMutation.isPending ? 'Creating…' : 'Create Profile'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Authenticated — driver found */}
                  {isAuth && driver && (
                    <div className="space-y-4">
                      <div className="bg-[#262626] rounded-lg p-4 border border-gray-700 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-white text-lg">{driver.first_name} {driver.last_name}</p>
                            <p className="text-sm text-gray-400">{driver.contact_email}</p>
                            {driver.hometown_city && (
                              <p className="text-xs text-gray-500 mt-0.5">{driver.hometown_city}{driver.hometown_state ? `, ${driver.hometown_state}` : ''}</p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white"
                            onClick={() => { setDriverForm({ ...driver }); setShowEditDriver(true); }}>
                            Edit
                          </Button>
                        </div>
                        {driver.primary_number && (
                          <p className="text-xs text-gray-400">Primary #: <span className="text-white font-mono">{driver.primary_number}</span></p>
                        )}
                        {(!driver.first_name || !driver.last_name || !driver.contact_email) && (
                          <div className="flex items-center gap-2 text-xs text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Profile incomplete — first name, last name, and email required to register.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-700 text-gray-300">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!canProceedStep2}
                      className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold">
                      Next: Confirm Entry <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Edit Driver Dialog */}
              <Dialog open={showEditDriver} onOpenChange={setShowEditDriver}>
                <DialogContent className="bg-[#262626] border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Edit Driver Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">First Name *</label>
                        <Input value={driverForm.first_name || ''} onChange={e => setDriverForm({ ...driverForm, first_name: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Last Name *</label>
                        <Input value={driverForm.last_name || ''} onChange={e => setDriverForm({ ...driverForm, last_name: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Contact Email *</label>
                      <Input value={driverForm.contact_email || ''} onChange={e => setDriverForm({ ...driverForm, contact_email: e.target.value })}
                        className="bg-[#1A1A1A] border-gray-600 text-white" type="email" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">City</label>
                        <Input value={driverForm.hometown_city || ''} onChange={e => setDriverForm({ ...driverForm, hometown_city: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">State</label>
                        <Input value={driverForm.hometown_state || ''} onChange={e => setDriverForm({ ...driverForm, hometown_state: e.target.value })}
                          className="bg-[#1A1A1A] border-gray-600 text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Primary Car #</label>
                      <Input value={driverForm.primary_number || ''} onChange={e => setDriverForm({ ...driverForm, primary_number: e.target.value })}
                        className="bg-[#1A1A1A] border-gray-600 text-white" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEditDriver(false)} className="border-gray-700">Cancel</Button>
                    <Button onClick={handleUpdateDriver} disabled={updateDriverMutation.isPending} className="bg-white text-black">
                      {updateDriverMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}

          {/* ───────────────── STEP 3 ───────────────── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Confirm Entry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Event + driver summary */}
                  <div className="bg-[#262626] rounded-lg p-4 border border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Event</span>
                      <span className="text-white font-medium">{selectedEvent?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Date</span>
                      <span className="text-white">{selectedEvent?.event_date}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Driver</span>
                      <span className="text-white">{driver?.first_name} {driver?.last_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1 border-t border-gray-700 mt-2">
                      <Link to={createPageUrl(`EventProfile?id=${selectedEvent?.id}`)} target="_blank" className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                        View Event Details <ExternalLink className="w-3 h-3" />
                      </Link>
                      <Link to={createPageUrl('MyDashboard')} className="text-gray-400 hover:text-white text-xs flex items-center gap-1">
                        <LayoutDashboard className="w-3 h-3" /> My Dashboard
                      </Link>
                    </div>
                  </div>

                  {/* Existing entry — show status */}
                  {existingEntry && existingEntry.entry_status !== 'Withdrawn' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <p className="text-sm font-semibold text-green-400">You are registered for this event</p>
                      </div>

                      {/* Compliance status */}
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
                              <Badge className={`text-xs mt-0.5 ${statusColors[value] || 'bg-gray-700/60 text-gray-400'}`}>{value}</Badge>
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
                            <p className="text-sm font-semibold text-white mb-0.5">Check In QR</p>
                            <p className="text-xs text-gray-400">Show this at the gate</p>
                          </div>
                          <pre className="bg-[#1A1A1A] text-green-400 text-xs font-mono rounded p-3 whitespace-pre-wrap break-all border border-gray-700">
                            {qrPayload}
                          </pre>
                          <Button
                            onClick={handleCopyPayload}
                            variant="outline"
                            size="sm"
                            className="w-full border-gray-700 text-gray-300"
                          >
                            {copied ? <><Check className="w-3.5 h-3.5 mr-2 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-2" /> Copy QR Payload</>}
                          </Button>
                        </div>
                      )}

                      {/* Edit fields */}
                      <div className="space-y-3 border-t border-gray-700 pt-4">
                        <p className="text-xs font-medium text-gray-400 uppercase">Update Your Entry</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Car #</label>
                            <Input
                              defaultValue={existingEntry.car_number || ''}
                              onChange={e => setEntryForm(f => ({ ...f, car_number: e.target.value }))}
                              className="bg-[#262626] border-gray-700 text-white"
                              placeholder="Car number"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
                            <Input
                              defaultValue={existingEntry.transponder_id || ''}
                              onChange={e => setEntryForm(f => ({ ...f, transponder_id: e.target.value }))}
                              className="bg-[#262626] border-gray-700 text-white"
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                        {seriesClasses.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Class</label>
                            <Select
                              defaultValue={existingEntry.series_class_id || ''}
                              onValueChange={val => setEntryForm(f => ({ ...f, series_class_id: val }))}
                            >
                              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                                <SelectValue placeholder="Select class..." />
                              </SelectTrigger>
                              <SelectContent className="bg-[#262626] border-gray-700">
                                {seriesClasses.map(sc => (
                                  <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {teams.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Team (optional)</label>
                            <Select
                              defaultValue={existingEntry.team_id || ''}
                              onValueChange={val => setEntryForm(f => ({ ...f, team_id: val }))}
                            >
                              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                                <SelectValue placeholder="Select team..." />
                              </SelectTrigger>
                              <SelectContent className="bg-[#262626] border-gray-700">
                                {teams.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button onClick={handleUpdateEntry} disabled={updateEntryMutation.isPending}
                          className="w-full bg-white text-black hover:bg-gray-100 font-semibold">
                          {updateEntryMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </div>

                      {/* Withdraw */}
                      {existingEntry.entry_status !== 'Withdrawn' && (
                        <div className="border-t border-gray-700 pt-4">
                          <Button variant="outline" onClick={handleWithdraw} disabled={updateEntryMutation.isPending}
                            className="w-full border-red-800 text-red-400 hover:bg-red-900/20">
                            Withdraw Entry
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Withdrawn state */}
                  {existingEntry && existingEntry.entry_status === 'Withdrawn' && (
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 text-center space-y-3">
                      <p className="text-gray-400 text-sm">Your entry has been withdrawn.</p>
                      <Button onClick={() => createEntryMutation.mutate({
                        event_id: selectedEvent.id,
                        driver_id: driver.id,
                        series_id: selectedEvent.series_id || undefined,
                        entry_status: 'Registered',
                        payment_status: 'Unpaid',
                        waiver_status: 'Missing',
                        tech_status: 'Not Inspected',
                      })} disabled={createEntryMutation.isPending}
                        className="bg-white text-black hover:bg-gray-100">
                        Re-Register
                      </Button>
                    </div>
                  )}

                  {/* No entry yet */}
                  {!existingEntry && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">Complete your entry details below.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Car #</label>
                          <Input value={entryForm.car_number} onChange={e => setEntryForm(f => ({ ...f, car_number: e.target.value }))}
                            className="bg-[#262626] border-gray-700 text-white" placeholder="Car number" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
                          <Input value={entryForm.transponder_id} onChange={e => setEntryForm(f => ({ ...f, transponder_id: e.target.value }))}
                            className="bg-[#262626] border-gray-700 text-white" placeholder="Optional" />
                        </div>
                      </div>
                      {seriesClasses.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Class</label>
                          <Select value={entryForm.series_class_id} onValueChange={val => setEntryForm(f => ({ ...f, series_class_id: val }))}>
                            <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                              <SelectValue placeholder="Select class..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              {seriesClasses.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {teams.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Team (optional)</label>
                          <Select value={entryForm.team_id} onValueChange={val => setEntryForm(f => ({ ...f, team_id: val }))}>
                            <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                              <SelectValue placeholder="Select team..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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