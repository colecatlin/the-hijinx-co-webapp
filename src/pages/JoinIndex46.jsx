import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, User, Users, MapPin, Trophy, ShieldCheck,
  Clock, FileCheck, Sparkles, CheckCircle2, LogIn, Search, XCircle,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import JoinPreviews from '@/components/onboarding/JoinPreviews';
import PlatformConceptScreens from '@/components/motorsports/PlatformConceptScreens';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d3e32f1e6_46HeaderPhoto.png';

const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

const ENTITY_TYPES = [
  {
    type: 'Driver',
    Icon: User,
    blurb: 'Claim your driver profile to manage bio, career stats, sponsors, media and more.',
    cta: 'Claim a Driver Profile',
  },
  {
    type: 'Team',
    Icon: Users,
    blurb: 'Run a team? Own your team page, roster, vehicles, partners and operations.',
    cta: 'Claim a Team Profile',
  },
  {
    type: 'Track',
    Icon: MapPin,
    blurb: 'Operate a track or facility? Manage your schedule, events and media.',
    cta: 'Claim a Track Profile',
  },
  {
    type: 'Series',
    Icon: Trophy,
    blurb: 'Sanction or run a series? Control classes, points, standings and events.',
    cta: 'Claim a Series Profile',
  },
];

const STEPS = [
  {
    Icon: Search,
    n: '01',
    title: 'Find your profile',
    body: 'Search the INDEX46 database for your existing Driver, Team, Track or Series record.',
  },
  {
    Icon: ShieldCheck,
    n: '02',
    title: 'Submit a claim',
    body: 'Tell us why you\'re the rightful owner. Our team reviews every request by hand.',
  },
  {
    Icon: FileCheck,
    n: '03',
    title: 'Build it out',
    body: 'Once approved, you get full access to edit your profile, media, stats and more.',
  },
];

const PERKS = [
  'Official HIJINX verification badge once reviewed',
  'Full control of your bio, imagery, sponsors and career history',
  'Live entry, results and standings linkage across all your events',
  'Priority access to RaceCore operations tools as they become available',
];

export default function JoinIndex46() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 60_000,
  });

  const goClaim = (entityType) => {
    navigate('/join/sign-up' + (entityType ? `?entityType=${entityType}` : ''));
  };

  return (
    <div className="relative bg-[#050A0A] min-h-screen overflow-hidden">

      {/* texture overlays */}
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ backgroundImage: `url('https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/f16fb8e35_BGRND46Page.png')`, backgroundRepeat: 'repeat', backgroundSize: '1024px auto', opacity: 0.35 }} />

      {/* HERO */}
      <div className="absolute inset-0 z-[2] h-[75vh]">
        <img
          src={BG_IMAGE}
          alt="INDEX46 early access"
          className="w-full h-full object-cover object-top"
          style={{ filter: 'saturate(1.15) contrast(1.08)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(4,8,8,0.92) 0%, rgba(4,8,8,0.72) 38%, rgba(4,8,8,0.25) 65%, rgba(4,8,8,0.45) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,8,8,0.35) 0%, rgba(4,8,8,0.05) 30%, rgba(4,8,8,0.35) 75%, rgba(4,8,8,0.95) 100%)' }} />
        <div className="absolute top-0 left-0 w-[500px] h-[2px] opacity-50" style={{ background: 'linear-gradient(to right, #1DA1A1, transparent)' }} />
        <div className="absolute top-0 left-0 w-[2px] h-40 opacity-40" style={{ background: 'linear-gradient(to bottom, #1DA1A1, transparent)' }} />
        <div className="absolute inset-0 opacity-25 mix-blend-overlay" style={grainStyle} />
      </div>

      {/* HERO CONTENT */}
      <div className="relative z-[3] flex items-center px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-20 min-h-[75vh]">
        <div className="w-full max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-5 h-[1px] bg-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">INDEX46 · Early Access</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.92] tracking-tight uppercase mb-3"
            style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
          >
            BUILD YOUR<br />RACING PROFILE.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase mb-5 leading-tight"
            style={{ color: '#1DA1A1', textShadow: '0 0 40px rgba(29,161,161,0.4)' }}
          >
            Before the hard launch.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
            className="text-white/70 text-sm sm:text-base leading-relaxed mb-8 max-w-xl"
          >
            INDEX46 and RaceCore are still being filled in with live data.
            If you're a driver, team, track or series, claim your profile now and you'll be first
            in line to start building it out the moment your access is approved.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => goClaim('Driver')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110"
              style={{ background: '#1DA1A1', color: '#050A0A' }}
            >
              Claim or Sign Up
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-200"
              style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.04)' }}
            >
              How it works
            </a>
          </motion.div>

          {!user && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-5 flex items-center gap-2 text-xs font-mono tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <LogIn className="w-3.5 h-3.5" />
              You'll be asked to sign in to verify your identity.
            </motion.div>
          )}
        </div>
      </div>

      {/* SNEAK PEEK PREVIEWS */}
      <JoinPreviews />

      {/* CONCEPT SCREENS — INDEX46 network + Race Core engine */}
      <PlatformConceptScreens />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-[1px] bg-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">The Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase mb-4 leading-[0.95]">
            Three steps to your<br />official profile.
          </h2>
          <p className="text-white/55 text-sm sm:text-base max-w-xl mb-12">
            We manually review every claim to keep the data trustworthy. No instant unlocks —
            just real people, real racing, real profiles.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="p-6 rounded-2xl"
                style={{
                  background: 'rgba(8, 14, 14, 0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(29,161,161,0.15)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.3)' }}>
                    <s.Icon className="w-5 h-5" style={{ color: '#1DA1A1' }} />
                  </div>
                  <span className="font-mono text-2xl font-black" style={{ color: 'rgba(255,255,255,0.15)' }}>{s.n}</span>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>

          {/* perks strip */}
          <div className="mt-10 p-6 rounded-2xl" style={{ background: 'rgba(8,14,14,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: '#1DA1A1' }} />
              <span className="font-mono text-[10px] tracking-[0.35em] text-[#1DA1A1] uppercase">What you get</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {PERKS.map(p => (
                <div key={p} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#1DA1A1' }} />
                  <span className="text-sm text-white/75 leading-snug">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OWNERSHIP EDUCATION */}
      <section className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-[1px] bg-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">What Ownership Means</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase mb-4 leading-[0.95]">
            Owner vs. Editor.
          </h2>
          <p className="text-white/55 text-sm sm:text-base max-w-xl mb-10">
            When your claim is approved, you become the <strong className="text-white">Owner</strong> of that profile.
            Owners have full editing control and can invite others as <strong className="text-white">Editors</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(8,14,14,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(29,161,161,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5" style={{ color: '#1DA1A1' }} />
                <h3 className="text-lg font-black text-white uppercase">Owner</h3>
              </div>
              <ul className="space-y-2">
                {[
                  'Edit all profile content (bio, photos, stats, sponsors)',
                  'Add or remove editors',
                  'Manage media uploads and galleries',
                  'Manage schedule, entries, and results (tracks/series)',
                  'Display the verified owner badge',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#1DA1A1' }} />
                    <span className="text-sm text-white/65 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(8,14,14,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                <h3 className="text-lg font-black text-white uppercase">Editor</h3>
              </div>
              <ul className="space-y-2">
                {[
                  'Edit profile content (bio, photos, stats)',
                  'Upload and manage media',
                  'Manage sponsors (as permitted by owner)',
                  'View and update schedule entries',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#1DA1A1' }} />
                    <span className="text-sm text-white/65 leading-snug">{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,100,100,0.7)' }} />
                  <span className="text-sm text-white/65 leading-snug">Cannot transfer ownership or remove other editors</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-5 rounded-2xl" style={{ background: 'rgba(8,14,14,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" style={{ color: '#1DA1A1' }} />
              <span className="font-mono text-[10px] tracking-[0.35em] text-[#1DA1A1] uppercase">Review & Evidence</span>
            </div>
            <p className="text-sm text-white/55 leading-relaxed">
              We manually review every claim to keep the platform trustworthy. Evidence verifies your relationship to the entity —
              this protects racers, teams, tracks, and series from false claims. Most claims are reviewed within <strong className="text-white/80">48 hours</strong>.
              If your claim is denied, you can resubmit with additional evidence — there is no penalty for trying again.
            </p>
          </div>
        </div>
      </section>

      {/* ENTITY CHOOSER */}
      <section className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-[1px] bg-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">Pick Your Lane</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase mb-4 leading-[0.95]">
            What are you claiming?
          </h2>
          <p className="text-white/55 text-sm sm:text-base max-w-xl mb-12">
            Tap a category to jump straight into the search-and-claim flow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ENTITY_TYPES.map((e, i) => (
              <motion.button
                key={e.type}
                onClick={() => goClaim(e.type)}
                onMouseEnter={() => setSelectedType(e.type)}
                onMouseLeave={() => setSelectedType(null)}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="group text-left p-7 rounded-2xl transition-all duration-200"
                style={{
                  background: selectedType === e.type ? 'rgba(29,161,161,0.08)' : 'rgba(8,14,14,0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: selectedType === e.type ? '1px solid rgba(29,161,161,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: selectedType === e.type ? '0 0 40px rgba(29,161,161,0.12)' : 'none',
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.25)' }}>
                    <e.Icon className="w-6 h-6" style={{ color: '#1DA1A1' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1.5">{e.type}</h3>
                    <p className="text-white/55 text-sm leading-relaxed mb-4">{e.blurb}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase" style={{ color: '#1DA1A1' }}>
                      {e.cta}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* STATUS / TRUST STRIP */}
      <section className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 pb-20">
        <div className="max-w-4xl mx-auto p-7 rounded-2xl text-center" style={{ background: 'rgba(8,14,14,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: '#1DA1A1' }} />
            <span className="font-mono text-[10px] tracking-[0.35em] text-[#1DA1A1] uppercase">Review Timeline</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase mb-2">
            Most claims reviewed within 48 hours.
          </h3>
          <p className="text-white/55 text-sm max-w-lg mx-auto">
            You'll see your claim status update inside the Claims Center.
            Once approved, you'll get full editing access to your profile.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => goClaim()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110"
              style={{ background: '#1DA1A1', color: '#050A0A' }}
            >
              {user ? 'Go to Claims Center' : 'Claim or Sign Up'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/ClaimsCenter"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-200"
              style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.04)' }}
            >
              View My Claims
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}