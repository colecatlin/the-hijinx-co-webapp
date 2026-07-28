import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, User, Users, MapPin, Trophy,
  ShieldCheck, Search, Loader2, CheckCircle2, AlertCircle,
  LogIn,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateDataGroups } from '@/components/data/invalidationContract';

const norm = (s = '') => s.toLowerCase().trim().replace(/\s+/g, ' ');

const ENTITY_TYPES = [
  {
    type: 'Driver',
    Icon: User,
    blurb: 'You race. Claim or set up your driver profile — bio, stats, sponsors, media.',
    nameFields: [
      { key: 'first_name', label: 'First Name', required: true, half: true },
      { key: 'last_name', label: 'Last Name', required: true, half: true },
    ],
  },
  {
    type: 'Team',
    Icon: Users,
    blurb: 'You run a team. Own the roster, vehicles, partners and operations.',
    nameFields: [{ key: 'name', label: 'Team Name', required: true }],
  },
  {
    type: 'Track',
    Icon: MapPin,
    blurb: 'You operate a track. Manage schedule, events and media.',
    nameFields: [{ key: 'name', label: 'Track Name', required: true }],
  },
  {
    type: 'Series',
    Icon: Trophy,
    blurb: 'You sanction a series. Control classes, points, standings, events.',
    nameFields: [{ key: 'name', label: 'Series Name', required: true }],
  },
];

const COMMON_FIELDS = [
  { key: 'city', label: 'City', required: false, half: true },
  { key: 'state', label: 'State / Region', required: false, half: true },
];

function queryName(entityType, info) {
  if (entityType === 'Driver') return `${info.first_name || ''} ${info.last_name || ''}`.trim();
  return info.name || '';
}

function entityNameOf(entityType, e) {
  if (entityType === 'Driver') return `${e.first_name || ''} ${e.last_name || ''}`.trim();
  return e.name || '';
}

function entityLocationOf(entityType, e) {
  if (entityType === 'Driver') return [e.hometown_city, e.hometown_state].filter(Boolean).join(', ');
  if (entityType === 'Team') return [e.location_city, e.location_state].filter(Boolean).join(', ');
  if (entityType === 'Track') return [e.location_city, e.location_state].filter(Boolean).join(', ');
  if (entityType === 'Series') return [e.headquarters_city, e.headquarters_state].filter(Boolean).join(', ');
  return '';
}

async function crossCheck(entityType, info) {
  const map = {
    Driver: base44.entities.Driver,
    Team: base44.entities.Team,
    Track: base44.entities.Track,
    Series: base44.entities.Series,
  };
  const list = await map[entityType].list('-updated_date', 600);
  const qName = norm(queryName(entityType, info));
  const qCity = norm(info.city);

  const scored = [];
  for (const e of list) {
    const eName = norm(entityNameOf(entityType, e));
    if (!eName) continue;
    let score = 0;
    if (eName === qName) score = 100;
    else if (eName.startsWith(qName)) score = 88;
    else if (qName && eName.includes(qName)) score = 72;
    else if (qName && qName.includes(eName)) score = 66;

    // city bump
    const eLoc = norm(entityLocationOf(entityType, e));
    if (qCity && eLoc.includes(qCity)) score += 12;

    if (score > 0) scored.push({ id: e.id, name: entityNameOf(entityType, e), location: entityLocationOf(entityType, e), score: Math.min(score, 100), raw: e });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6);
}

export default function JoinSignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [step, setStep] = useState('entity');
  const [entityType, setEntityType] = useState(null);

  // Deep-link preselect: /join/sign-up?entityType=Driver jumps straight in.
  useEffect(() => {
    const t = searchParams.get('entityType');
    const valid = ENTITY_TYPES.find((e) => e.type === t);
    if (valid && t !== entityType) {
      setEntityType(t);
      setStep('info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [info, setInfo] = useState({});
  const [checking, setChecking] = useState(false);
  const [matches, setMatches] = useState([]);
  const [claiming, setClaiming] = useState(null);
  const [done, setDone] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 60_000,
  });

  const startAuth = () => {
    const returnTo = window.location.pathname + window.location.search;
    base44.auth.redirectToLogin(returnTo);
  };

  const pickEntity = (t) => {
    setEntityType(t);
    setInfo({});
    setStep('info');
  };

  const infoValid = () => {
    if (!entityType) return false;
    const def = ENTITY_TYPES.find((e) => e.type === entityType);
    return def.nameFields.filter((f) => f.required).every((f) => (info[f.key] || '').trim());
  };

  const runCheck = async () => {
    setChecking(true);
    setMatches([]);
    setStep('check');
    try {
      const results = await crossCheck(entityType, info);
      setMatches(results);
      setStep('results');
    } catch {
      toast.error('Search failed. Please try again.');
      setStep('info');
    } finally {
      setChecking(false);
    }
  };

  const claimMatch = async (m) => {
    setClaiming(m.id);
    try {
      const noteParts = [];
      if (info.city) noteParts.push(`City: ${info.city}`);
      if (info.state) noteParts.push(`State: ${info.state}`);
      const message = 'Submitted via early-access sign-up flow.'
        + (noteParts.length ? ` Identifying info: ${noteParts.join(', ')}.` : '');
      const res = await base44.functions.invoke('requestEntityClaim', {
        entity_type: entityType,
        entity_id: m.id,
        message,
        claim_mode: 'claim',
      });
      const data = res?.data || {};
      if (!data.ok) {
        toast.error(data.error || 'Could not submit claim. Please try again.');
        return;
      }
      invalidateDataGroups(qc, ['access']);
      setDone({ entityName: m.name, mode: 'claim' });
      setStep('done');
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Could not submit claim. Please try again.';
      toast.error(msg);
    } finally {
      setClaiming(null);
    }
  };

  const gotoOnboarding = () => {
    navigate('/ProfileSetup');
  };

  const backToInfo = () => setStep('info');
  const backToEntity = () => { setEntityType(null); setInfo({}); setStep('entity'); };

  const def = ENTITY_TYPES.find((e) => e.type === entityType);

  return (
    <div className="relative bg-[#050A0A] min-h-screen overflow-hidden">
      {/* texture overlays */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: "url('https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/f16fb8e35_BGRND46Page.png')",
          backgroundRepeat: 'repeat',
          backgroundSize: '1024px auto',
          opacity: 0.35,
        }}
      />
      <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(4,8,8,0.4), rgba(4,8,8,0.1) 40%, rgba(4,8,8,0.85))' }} />

      <div className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-14 md:py-20">
        <div className="max-w-3xl mx-auto">
          {/* header */}
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/join')} className="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] uppercase text-white/40 hover:text-white/70 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Join
            </button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-[1px] bg-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">Sign Up · Early Access</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase leading-[0.95] mb-3">
            {step === 'done' ? "You're in the queue." : "Let's find your profile."}
          </h1>
          <p className="text-white/55 text-sm sm:text-base max-w-xl mb-10">
            We cross-check your name and details against existing INDEX46 profiles so you get matched
            to the right one — instead of creating a duplicate.
          </p>

          {/* AUTH GATE */}
          {!user && step !== 'done' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="p-7 rounded-2xl"
              style={{ background: 'rgba(8,14,14,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(29,161,161,0.2)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.3)' }}>
                <LogIn className="w-5 h-5" style={{ color: '#1DA1A1' }} />
              </div>
              <h3 className="text-lg font-black text-white uppercase mb-2">Sign in to continue</h3>
              <p className="text-white/55 text-sm mb-6 max-w-md">
                You'll need a HIJINX account so we can verify your identity and attach your claim to it.
                New here? Just sign up from the same screen.
              </p>
              <button
                onClick={startAuth}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all hover:brightness-110"
                style={{ background: '#1DA1A1', color: '#050A0A' }}
              >
                Sign In or Sign Up
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : step === 'entity' ? (
            /* ENTITY PICK */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ENTITY_TYPES.map((e, i) => (
                <motion.button
                  key={e.type}
                  onClick={() => pickEntity(e.type)}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="group text-left p-6 rounded-2xl transition-all duration-200"
                  style={{ background: 'rgba(8,14,14,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = 'rgba(29,161,161,0.4)'; ev.currentTarget.style.boxShadow = '0 0 40px rgba(29,161,161,0.12)'; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; ev.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.25)' }}>
                      <e.Icon className="w-6 h-6" style={{ color: '#1DA1A1' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">{e.type}</h3>
                      <p className="text-white/55 text-sm leading-relaxed mb-3">{e.blurb}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase" style={{ color: '#1DA1A1' }}>
                        I am a {e.type}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : step === 'info' ? (
            /* NAME / INFO ENTRY */
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="p-7 rounded-2xl"
              style={{ background: 'rgba(8,14,14,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(29,161,161,0.15)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.3)' }}>
                  {def && <def.Icon className="w-5 h-5" style={{ color: '#1DA1A1' }} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">{def?.type}</h3>
                  <p className="text-white/45 text-xs mt-1">Tell us who you are so we can match you.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {def && def.nameFields.concat(COMMON_FIELDS).map((f) => (
                  <div key={f.key} className={f.half ? 'sm:col-span-1' : 'sm:col-span-2'}>
                    <label className="block text-[10px] font-mono tracking-[0.25em] uppercase text-white/50 mb-1.5">
                      {f.label}{f.required ? ' *' : ''}
                    </label>
                    <input
                      type="text"
                      value={info[f.key] || ''}
                      onChange={(ev) => setInfo((s) => ({ ...s, [f.key]: ev.target.value }))}
                      onKeyDown={(ev) => { if (ev.key === 'Enter' && infoValid()) runCheck(); }}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 focus:border-[#1DA1A1] focus:outline-none transition"
                      style={{ caretColor: '#1DA1A1' }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-7">
                <button onClick={backToEntity} className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white/55 hover:text-white/85 transition">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={runCheck}
                  disabled={!infoValid()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#1DA1A1', color: '#050A0A' }}
                >
                  <Search className="w-4 h-4" />
                  Cross-Check Profiles
                </button>
              </div>
            </motion.div>
          ) : step === 'check' ? (
            /* CHECKING */
            <div className="p-10 rounded-2xl flex flex-col items-center justify-center text-center" style={{ background: 'rgba(8,14,14,0.6)', border: '1px solid rgba(29,161,161,0.15)' }}>
              <Loader2 className="w-7 h-7 animate-spin mb-4" style={{ color: '#1DA1A1' }} />
              <p className="text-sm font-mono tracking-[0.3em] uppercase text-white/60">Cross-checking existing profiles…</p>
              <p className="text-white/35 text-xs mt-2">{queryName(entityType, info)}</p>
            </div>
          ) : step === 'results' ? (
            /* RESULTS */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4" style={{ color: '#1DA1A1' }} />
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/55">
                  {matches.length ? `${matches.length} possible match${matches.length === 1 ? '' : 'es'}` : 'No existing profile found'}
                </span>
              </div>

              {matches.length > 0 ? (
                <div className="space-y-3">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4"
                      style={{ background: 'rgba(8,14,14,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.25)' }}>
                          {def && <def.Icon className="w-5 h-5" style={{ color: '#1DA1A1' }} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{m.name}</h4>
                            {m.score >= 95 && (
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-widest" style={{ color: '#1DA1A1', background: 'rgba(29,161,161,0.15)' }}>Close Match</span>
                            )}
                          </div>
                          {m.location && <p className="text-white/45 text-xs mt-0.5">{m.location}</p>}
                          <p className="text-white/30 text-[10px] font-mono uppercase tracking-wider mt-1">{entityType} · {m.id.slice(-6)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => claimMatch(m)}
                        disabled={claiming !== null}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ background: '#1DA1A1', color: '#050A0A' }}
                      >
                        {claiming === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {claiming === m.id ? 'Submitting' : 'This is me — Claim'}
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <button onClick={backToInfo} className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white/55 hover:text-white/85 transition">
                      <ArrowLeft className="w-4 h-4" /> Refine search
                    </button>
                    <button onClick={gotoOnboarding} className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white/55 hover:text-white/85 transition">
                      None of these — start new
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                  className="p-7 rounded-2xl text-center"
                  style={{ background: 'rgba(8,14,14,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.3)' }}>
                    <AlertCircle className="w-5 h-5" style={{ color: '#1DA1A1' }} />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase mb-2">No existing profile found</h3>
                  <p className="text-white/55 text-sm mb-6 max-w-md mx-auto">
                    We didn't find a pre-existing {entityType} profile matching your name. No problem —
                    start building it fresh and we'll fold you in.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={gotoOnboarding}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all hover:brightness-110"
                      style={{ background: '#1DA1A1', color: '#050A0A' }}
                    >
                      Create a New Profile
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={backToInfo}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all"
                      style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.04)' }}
                    >
                      <ArrowLeft className="w-4 h-4" /> Refine
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : step === 'done' && done ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="p-8 rounded-2xl text-center"
              style={{ background: 'rgba(8,14,14,0.6)', border: '1px solid rgba(29,161,161,0.3)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.35)' }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: '#1DA1A1' }} />
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-2">Claim submitted</h3>
              <p className="text-white/55 text-sm mb-6 max-w-md mx-auto">
                Your claim for <span className="text-white/85 font-bold">{done.entityName}</span> is in the queue.
                Our team reviews every claim by hand — most within 48 hours.
                You can track status inside the Claims Center.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => navigate('/ClaimsCenter')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all hover:brightness-110"
                  style={{ background: '#1DA1A1', color: '#050A0A' }}
                >
                  View My Claims
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/join')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all"
                  style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.04)' }}
                >
                  Back to Join
                </button>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}