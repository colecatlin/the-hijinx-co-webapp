import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  CheckCircle2, ArrowRight, AlertCircle, User, Calendar,
  LogIn, ExternalLink, LayoutDashboard, UserPlus, Building2, Lock, Check, Radio, Truck,
  ClipboardList, ShieldCheck, Trophy, FileDown, Link2, BookOpen, ChevronRight,
  Users, Zap, Star,
} from 'lucide-react';
import { getPermissionsForRole } from '@/components/access/accessControl';

const DQ = { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false };

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function writeOperationLog(type, entityName, entryId, eventId, driverId, carNumber) {
  try {
    await base44.entities.OperationLog.create({
      operation_type: type,
      source_type: 'Registration',
      entity_name: entityName,
      entity_id: entryId,
      event_id: eventId,
      status: 'success',
      metadata: { driverId, carNumber, timestamp: new Date().toISOString() },
    });
  } catch (_) {}
}

function hasDashboardAccess(user) {
  if (!user) return false;
  const role = user.role || 'public';
  if (role === 'admin') return true;
  const perms = getPermissionsForRole(role);
  return Object.keys(perms?.tabs || {}).length > 0;
}

// ─── Access Required Dialog ───────────────────────────────────────────────────
function AccessRequiredDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#171717] border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" /> Access Required
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Race Core Dashboard access is granted by a track, series, or admin.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Link to={createPageUrl('Contact')} onClick={onClose}>
            <Button className="w-full bg-white text-black hover:bg-gray-100 font-semibold">
              Request Access
            </Button>
          </Link>
          <Link to={createPageUrl('Profile')} onClick={onClose}>
            <Button variant="outline" className="w-full border-gray-700 text-gray-300">
              Go to Profile
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Landing hero + sections ──────────────────────────────────────────────────
function LandingPage({ user, isAuth, onOpenRegistration }) {
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => base44.auth.redirectToLogin();

  const handleProfile = () => {
    if (!isAuth) { base44.auth.redirectToLogin(); return; }
    navigate(createPageUrl('Profile'));
  };

  const handleDashboard = () => {
    if (!isAuth) { base44.auth.redirectToLogin(); return; }
    if (hasDashboardAccess(user)) {
      navigate(createPageUrl('RegistrationDashboard'));
    } else {
      setAccessDenied(true);
    }
  };

  const features = [
    { icon: ClipboardList, label: 'Event Registration', desc: 'Self-service driver registration with car number and class selection.' },
    { icon: CheckCircle2, label: 'Check-In & Wristbands', desc: 'QR and manual check-in with compliance gating and wristband tracking.' },
    { icon: ShieldCheck, label: 'Tech Inspection', desc: 'Digital tech queue with pass/fail states and recheck workflows.' },
    { icon: Trophy, label: 'Results & Standings', desc: 'Manual entry, CSV import, and session lifecycle from Draft to Locked.' },
    { icon: Star, label: 'Points & Standings', desc: 'Configurable points tables with season-wide recalculation and publish.' },
    { icon: FileDown, label: 'Exports', desc: 'Download entry sheets, results, and standings as CSV at any time.' },
    { icon: Link2, label: 'Integrations', desc: 'Google Sheets sync, timing system hooks, and API endpoints.' },
    { icon: BookOpen, label: 'Audit Log', desc: 'Full operation history — every import, change, and publish is logged.' },
  ];

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      {/* Hero */}
      <section className="border-b border-gray-100 py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="bg-[#0A0A0A] text-white mb-5 text-xs font-mono tracking-widest px-4 py-1.5 rounded-full">
            RACE CORE
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
            Race Core<br />
            <span className="text-gray-400">by Index46</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The registration and race operations engine for motorsports events — from grassroots to professional.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isAuth ? (
              <Button
                onClick={handleLogin}
                className="bg-[#0A0A0A] text-white hover:bg-[#1a1a1a] font-semibold px-8 py-3 h-auto text-base"
              >
                <LogIn className="w-4 h-4 mr-2" /> Sign up or Log in
              </Button>
            ) : (
              <Button
                onClick={handleProfile}
                className="bg-[#0A0A0A] text-white hover:bg-[#1a1a1a] font-semibold px-8 py-3 h-auto text-base"
              >
                <User className="w-4 h-4 mr-2" /> My Profile
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleProfile}
              className="border-gray-300 text-gray-700 font-semibold px-8 py-3 h-auto text-base hover:bg-gray-50"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Build my Driver Profile
            </Button>
            <Button
              variant="outline"
              onClick={handleDashboard}
              className="border-gray-300 text-gray-700 font-semibold px-8 py-3 h-auto text-base hover:bg-gray-50"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" /> Open Race Core Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="py-20 px-6 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black tracking-tight mb-3">Everything the tower needs</h2>
          <p className="text-gray-500 mb-12 max-w-xl">One system, eight modules. Built for the people running events.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                <Icon className="w-6 h-6 text-[#0A0A0A] mb-3" />
                <p className="font-semibold text-sm mb-1">{label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for grassroots */}
      <section className="py-20 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-4">Built for grassroots.<br />Scales to all racing.</h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Race Core started as a tool for local dirt tracks and regional series. Every feature is designed to work with a volunteer crew on race day, while scaling up to multi-round professional championships.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                'Works on any device — tablet, phone, or laptop at the tower',
                'No app install required — browser only',
                'Offline-tolerant — key data is cached locally',
                'Role-based access — admins, owners, editors, and volunteers',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tracks & Series', value: 'Multi-org', icon: Building2 },
              { label: 'Role Levels', value: '4 tiers', icon: Users },
              { label: 'Data logged', value: 'Every action', icon: BookOpen },
              { label: 'Session types', value: '5 types', icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-[#FAFAFA] border border-gray-100 rounded-xl p-5 text-center">
                <Icon className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                <p className="text-2xl font-black tracking-tight">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified vs Unverified */}
      <section className="py-20 px-6 bg-[#FAFAFA] border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black tracking-tight mb-3">Verified vs. unverified data</h2>
          <p className="text-gray-500 mb-10 max-w-2xl">
            Index46 distinguishes between data entered by credentialed admins and data submitted by users, keeping the public record clean.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Verified</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Results published through Race Core by an admin or series official</li>
                <li>Standings calculated and published via the dashboard</li>
                <li>Driver profiles claimed and managed by verified owners</li>
                <li>Tech inspections logged by authorized tech officials</li>
              </ul>
            </div>
            <div className="bg-white border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-amber-800">Unverified</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Driver profiles without a verified claim</li>
                <li>Self-reported results submitted by drivers</li>
                <li>Program data entered without series confirmation</li>
                <li>Historical data imported without audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-gray-100 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-black tracking-tight mb-4">Ready to run your event?</h2>
          <p className="text-gray-500 mb-8">Start with a driver profile, or open the dashboard if you're running operations.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isAuth ? (
              <Button
                onClick={handleLogin}
                className="bg-[#0A0A0A] text-white hover:bg-[#1a1a1a] font-semibold px-8 py-3 h-auto"
              >
                <LogIn className="w-4 h-4 mr-2" /> Sign up or Log in
              </Button>
            ) : (
              <Button
                onClick={handleProfile}
                className="bg-[#0A0A0A] text-white hover:bg-[#1a1a1a] font-semibold px-8 py-3 h-auto"
              >
                <User className="w-4 h-4 mr-2" /> Build my Driver Profile
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onOpenRegistration}
              className="border-gray-300 text-gray-700 font-semibold px-8 py-3 h-auto hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 mr-2" /> Register for an Event
            </Button>
            <Button
              variant="outline"
              onClick={handleDashboard}
              className="border-gray-300 text-gray-700 font-semibold px-8 py-3 h-auto hover:bg-gray-50"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" /> Open Race Core Dashboard
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      <AccessRequiredDialog open={accessDenied} onClose={() => setAccessDenied(false)} />
    </div>
  );
}

// ─── Event Registration Flow (preserved) ─────────────────────────────────────
function RegistrationFlow({ user }) {
  const queryClient = useQueryClient();

  const [orgType, setOrgType] = useState('series');
  const [orgId, setOrgId] = useState('');
  const [seasonYear, setSeasonYear] = useState('');
  const [eventId, setEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [driverFormData, setDriverFormData] = useState({ first_name: '', last_name: '', hometown_city: '', hometown_state: '' });
  const [entryFormData, setEntryFormData] = useState({ event_class_id: '', car_number: '', transponder_id: '', team_id: '' });
  const [registrationResult, setRegistrationResult] = useState(null);

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

  const { data: myDriver } = useQuery({
    queryKey: ['myDriver', user?.id, user?.email],
    queryFn: async () => {
      if (user?.id) {
        const byOwner = await base44.entities.Driver.filter({ owner_user_id: user.id });
        if (byOwner.length) return byOwner[0];
      }
      if (user?.email) {
        const byEmail = await base44.entities.Driver.filter({ contact_email: user.email });
        if (byEmail.length) return byEmail[0];
      }
      return null;
    },
    enabled: !!user?.id || !!user?.email,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', selectedEvent?.id],
    queryFn: () => base44.entities.EventClass.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  const { data: existingEntry } = useQuery({
    queryKey: ['myEntry', eventId, myDriver?.id],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, driver_id: myDriver.id }),
    enabled: !!eventId && !!myDriver?.id,
    ...DQ,
  });

  const { data: eventEntries = [] } = useQuery({
    queryKey: ['entries', eventId, entryFormData.event_class_id],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, event_class_id: entryFormData.event_class_id || undefined }),
    enabled: !!eventId && !!entryFormData.event_class_id && currentStep === 4,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 100),
    enabled: currentStep >= 3,
    ...DQ,
  });

  const handleOrgTypeChange = (type) => { setOrgType(type); setOrgId(''); setSeasonYear(''); setEventId(''); setSelectedEvent(null); };
  const handleSeasonChange = (season) => { setSeasonYear(season); setEventId(''); setSelectedEvent(null); };
  const handleEventSelect = (eid) => { const event = allEvents.find(e => e.id === eid); setEventId(eid); setSelectedEvent(event); };

  const createDriverMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.email) throw new Error('User email missing');
      return base44.entities.Driver.create({
        first_name: data.first_name, last_name: data.last_name,
        hometown_city: data.hometown_city || undefined,
        hometown_state: data.hometown_state || undefined,
        contact_email: user.email, owner_user_id: user.id,
      });
    },
    onSuccess: (newDriver) => {
      toast.success('Driver profile created!');
      queryClient.setQueryData(['myDriver', user?.id, user?.email], newDriver);
      setShowCreateDriver(false);
      setDriverFormData({ first_name: '', last_name: '', hometown_city: '', hometown_state: '' });
      setCurrentStep(3);
    },
    onError: (err) => toast.error(err.message || 'Failed to create driver'),
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !myDriver?.id) throw new Error('Missing event or driver');
      if (eventClasses.length > 0 && !entryFormData.event_class_id) throw new Error('Please select a class');
      if (!entryFormData.car_number.trim()) throw new Error('Car number is required');
      const dupCheck = eventEntries.filter(e => e.car_number === entryFormData.car_number.trim() && e.driver_id !== myDriver.id);
      if (dupCheck.length) throw new Error(`Car number ${entryFormData.car_number} already registered in this class`);
      const selectedEventClass = eventClasses.find(ec => ec.id === entryFormData.event_class_id);
      const payload = {
        event_id: eventId,
        driver_id: myDriver.id,
        event_class_id: entryFormData.event_class_id || undefined,
        series_id: selectedEvent.series_id || undefined,
        series_class_id: selectedEventClass?.series_class_id || undefined,
        car_number: entryFormData.car_number.trim(),
        transponder_id: entryFormData.transponder_id || undefined,
        team_id: entryFormData.team_id || undefined,
        entry_status: 'Registered',
        payment_status: 'Unpaid',
        tech_status: 'Not Inspected',
        waiver_verified: false,
        license_verified: false,
        transponder_verified: false,
        created_by_user_id: user?.id,
      };
      const existing = await base44.entities.Entry.filter({ event_id: eventId, driver_id: myDriver.id });
      if (existing.length) throw new Error('You are already registered for this event');
      const result = await base44.entities.Entry.create(payload);
      await writeOperationLog('entry_created', 'Entry', result.id, eventId, myDriver.id, entryFormData.car_number);
      return result;
    },
    onSuccess: (entry) => {
      toast.success('Registered successfully!');
      setRegistrationResult({
        eventName: selectedEvent.name,
        driverName: `${myDriver.first_name} ${myDriver.last_name}`,
        entryStatus: entry.entry_status,
        paymentStatus: entry.payment_status,
      });
      queryClient.invalidateQueries({ queryKey: ['myEntry', eventId, myDriver.id] });
      setTimeout(() => setCurrentStep(5), 1000);
    },
    onError: (err) => toast.error(err.message || 'Registration failed'),
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Event Registration</h1>
          <p className="text-gray-400 text-sm mt-1">Register for an upcoming event</p>
        </motion.div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Calendar className="w-5 h-5" /> Select Event</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Organization Type</label>
                  <div className="flex gap-2">
                    {[{ val: 'track', label: 'Track', icon: Radio }, { val: 'series', label: 'Series', icon: Building2 }].map(({ val, label, icon: Icon }) => (
                      <button key={val} onClick={() => handleOrgTypeChange(val)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${orgType === val ? 'bg-white text-black' : 'bg-[#262626] text-gray-300 border border-gray-700 hover:bg-[#333333]'}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                {orgType && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">{orgType === 'track' ? 'Track' : 'Series'}</label>
                    <Select value={orgId} onValueChange={setOrgId}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white"><SelectValue placeholder={`Choose a ${orgType}...`} /></SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        {(orgType === 'track' ? tracks : series).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {orgId && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Season</label>
                    <Select value={seasonYear} onValueChange={handleSeasonChange}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white"><SelectValue placeholder="Choose season..." /></SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {seasonYear && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Event</label>
                    <Select value={eventId} onValueChange={handleEventSelect}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white"><SelectValue placeholder="Choose event..." /></SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                        {allEvents.length === 0
                          ? <SelectItem value="__none" disabled>No events found</SelectItem>
                          : allEvents.map(ev => <SelectItem key={ev.id} value={ev.id}>{ev.name} — {ev.event_date}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedEvent && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#262626] rounded-lg p-4 space-y-2 border border-gray-700">
                    <p className="font-semibold text-white">{selectedEvent.name}</p>
                    <p className="text-xs text-gray-400">{selectedEvent.event_date}</p>
                    {selectedEvent.series_name && <p className="text-xs text-gray-500">{selectedEvent.series_name}</p>}
                    <Link to={createPageUrl(`EventProfile?id=${selectedEvent.id}`)} target="_blank">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white w-full justify-start">
                        <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Event Profile
                      </Button>
                    </Link>
                  </motion.div>
                )}
                <Button
                  onClick={() => { if (!myDriver) setShowCreateDriver(true); else setCurrentStep(3); }}
                  disabled={!selectedEvent}
                  className="w-full bg-white text-black hover:bg-gray-100 font-semibold"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><User className="w-5 h-5" /> Confirm Driver Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {myDriver && (
                  <div className="bg-[#262626] rounded-lg p-4 border border-green-800/50 space-y-1">
                    <p className="text-xs text-gray-400">Registered as:</p>
                    <p className="font-semibold text-white">{myDriver.first_name} {myDriver.last_name}</p>
                    {myDriver.contact_email && <p className="text-xs text-gray-400">{myDriver.contact_email}</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 border-gray-700 text-gray-300">Back</Button>
                  <Button onClick={() => setCurrentStep(3)} className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold">Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Truck className="w-5 h-5" /> Entry Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {eventClasses.length > 0 && (
                   <div>
                     <label className="text-xs text-gray-400 block mb-2">Class <span className="text-red-400">*</span></label>
                     <Select value={entryFormData.event_class_id} onValueChange={val => setEntryFormData({ ...entryFormData, event_class_id: val })}>
                       <SelectTrigger className="bg-[#262626] border-gray-700 text-white"><SelectValue placeholder="Select class..." /></SelectTrigger>
                       <SelectContent className="bg-[#262626] border-gray-700">
                         {eventClasses.map(ec => <SelectItem key={ec.id} value={ec.id}>{ec.class_name}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
                 {eventClasses.length === 0 && (
                   <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
                     <p className="text-xs text-blue-400">No classes yet. Check with event organizer or register without a class.</p>
                   </div>
                 )}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Car Number <span className="text-red-400">*</span></label>
                  <Input value={entryFormData.car_number} onChange={e => setEntryFormData({ ...entryFormData, car_number: e.target.value })} className="bg-[#262626] border-gray-700 text-white" placeholder="e.g. 42" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Transponder ID</label>
                  <Input value={entryFormData.transponder_id} onChange={e => setEntryFormData({ ...entryFormData, transponder_id: e.target.value })} className="bg-[#262626] border-gray-700 text-white" placeholder="Optional" />
                </div>
                {teams.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-2">Team</label>
                    <Select value={entryFormData.team_id} onValueChange={val => setEntryFormData({ ...entryFormData, team_id: val })}>
                      <SelectTrigger className="bg-[#262626] border-gray-700 text-white"><SelectValue placeholder="Select team..." /></SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1 border-gray-700 text-gray-300">Back</Button>
                  <Button onClick={() => setCurrentStep(4)} disabled={eventClasses.length > 0 && !entryFormData.event_class_id} className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold">Review <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4 */}
        {currentStep === 4 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Check className="w-5 h-5" /> Review Registration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#262626] rounded-lg p-4 space-y-3 border border-gray-700 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Event</span><span className="text-white font-medium">{selectedEvent?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Driver</span><span className="text-white">{myDriver?.first_name} {myDriver?.last_name}</span></div>
                  {entryFormData.event_class_id && (
                    <div className="flex justify-between"><span className="text-gray-400">Class</span><span className="text-white">{eventClasses.find(c => c.id === entryFormData.event_class_id)?.class_name}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-400">Car #</span><span className="text-white">{entryFormData.car_number || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Status</span><span className="text-white">Registered</span></div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(3)} className="flex-1 border-gray-700 text-gray-300">Back</Button>
                  <Button onClick={() => registerMutation.mutate()} disabled={!entryFormData.car_number || registerMutation.isPending} className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold">
                    {registerMutation.isPending ? 'Submitting...' : 'Register'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 5 */}
        {currentStep === 5 && registrationResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                <div className="flex gap-2 pt-4 flex-wrap">
                  <Button variant="outline" onClick={() => { setCurrentStep(1); setEventId(''); setSelectedEvent(null); setEntryFormData({ event_class_id: '', car_number: '', transponder_id: '', team_id: '' }); setRegistrationResult(null); }} className="flex-1 border-gray-700 text-gray-300">
                    Register Another
                  </Button>
                  {user?.role === 'admin' && selectedEvent && (
                    <Link to={`${createPageUrl('RegistrationDashboard')}?orgType=${selectedEvent.series_id ? 'series' : 'track'}&orgId=${selectedEvent.series_id || selectedEvent.track_id}&seasonYear=${selectedEvent.season}&eventId=${selectedEvent.id}`} className="flex-1">
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
              <DialogTitle className="text-white flex items-center gap-2"><UserPlus className="w-5 h-5" /> Create Driver Profile</DialogTitle>
              <DialogDescription className="text-gray-400">Create your driver profile to register for events.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {[['first_name', 'First Name', 'First', true], ['last_name', 'Last Name', 'Last', true], ['hometown_city', 'Hometown City', 'City', false], ['hometown_state', 'Hometown State', 'State', false]].map(([field, label, ph, req]) => (
                <div key={field}>
                  <label className="text-xs text-gray-400 block mb-1">{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
                  <Input value={driverFormData[field]} onChange={e => setDriverFormData({ ...driverFormData, [field]: e.target.value })} className="bg-[#262626] border-gray-700 text-white" placeholder={ph} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreateDriver(false)} className="flex-1 border-gray-700 text-gray-300">Cancel</Button>
              <Button onClick={() => createDriverMutation.mutate(driverFormData)} disabled={!driverFormData.first_name || !driverFormData.last_name || createDriverMutation.isPending} className="flex-1 bg-white text-black hover:bg-gray-100 font-semibold">
                {createDriverMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Registration() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [showRegistrationFlow, setShowRegistrationFlow] = useState(
    urlParams.get('register') === 'true'
  );
  const [autoDashboard] = useState(urlParams.get('dashboard') === 'true');
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();

  const { data: isAuth } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), ...DQ });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), enabled: !!isAuth, ...DQ });

  // Handle ?dashboard=true deep link
  useEffect(() => {
    if (!autoDashboard || isAuth === undefined) return;
    if (!isAuth) { base44.auth.redirectToLogin(); return; }
    if (user === undefined) return;
    if (hasDashboardAccess(user)) {
      navigate(createPageUrl('RegistrationDashboard'));
    } else {
      setAccessDenied(true);
    }
  }, [autoDashboard, isAuth, user]);

  if (showRegistrationFlow) {
    if (!isAuth) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4 flex items-center justify-center">
          <Card className="bg-[#171717] border-gray-800 max-w-sm w-full">
            <CardContent className="py-12 text-center space-y-5">
              <Lock className="w-12 h-12 text-gray-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-white">Sign In to Register</h2>
                <p className="text-gray-400 text-sm mt-2">You need to be logged in to register for events.</p>
              </div>
              <Button onClick={() => base44.auth.redirectToLogin()} className="bg-white text-black hover:bg-gray-100 font-semibold w-full">
                <LogIn className="w-4 h-4 mr-2" /> Sign In
              </Button>
              <button onClick={() => setShowRegistrationFlow(false)} className="text-xs text-gray-500 hover:text-gray-300 underline">← Back to Race Core</button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <>
        <div className="bg-[#0A0A0A] border-b border-gray-800 px-6 py-2">
          <button onClick={() => setShowRegistrationFlow(false)} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
            ← Back to Race Core
          </button>
        </div>
        <RegistrationFlow user={user} />
      </>
    );
  }

  return (
    <>
      <LandingPage
        user={user}
        isAuth={isAuth}
        onOpenRegistration={() => setShowRegistrationFlow(true)}
      />
      <AccessRequiredDialog open={accessDenied} onClose={() => setAccessDenied(false)} />
    </>
  );
}