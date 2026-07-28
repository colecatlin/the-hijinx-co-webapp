import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Calendar, Trophy, BarChart3, Flag, Bell,
  Circle, Search, ChevronRight,
} from 'lucide-react';

/* tiny shared chrome */

function BrowserFrame({ label, url, children, dark = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: dark ? 'rgba(4,8,8,0.72)' : '#ffffff',
        border: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{
          background: dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
          borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex gap-1.5">
          <Circle className="w-2.5 h-2.5" style={{ color: '#ff5f57' }} fill="#ff5f57" />
          <Circle className="w-2.5 h-2.5" style={{ color: '#febc2e' }} fill="#febc2e" />
          <Circle className="w-2.5 h-2.5" style={{ color: '#28c840' }} fill="#28c840" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-[10px] font-mono tracking-wider px-3 py-1 rounded-md"
            style={{
              color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
              background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
              border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {url}
          </div>
        </div>
        <span
          className="text-[9px] font-mono uppercase tracking-widest"
          style={{ color: dark ? 'rgba(29,161,161,0.7)' : '#1DA1A1' }}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 p-4">{children}</div>
    </motion.div>
  );
}

function MonoTag({ children }) {
  return (
    <span
      className="font-mono text-[8px] tracking-[0.35em] uppercase px-2 py-0.5 rounded"
      style={{
        color: '#1DA1A1',
        background: 'rgba(29,161,161,0.12)',
        border: '1px solid rgba(29,161,161,0.25)',
      }}
    >
      {children}
    </span>
  );
}

const PLAYER_AVATAR_BG = 'linear-gradient(135deg, #1DA1A1, #0a3f3f)';

/* Driver profile preview */
function DriverProfilePreview() {
  return (
    <BrowserFrame label="Driver" url="index46.ai/drivers/casey-smith">
      <div className="flex items-start gap-3">
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0"
          style={{ background: PLAYER_AVATAR_BG }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-white tracking-tight uppercase">Casey Smith</h4>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ color: '#1DA1A1', background: 'rgba(29,161,161,0.15)' }}
            >
              VERIFIED
            </span>
          </div>
          <p className="text-[11px] text-white/40 mb-1.5">Pro 4 · #44 · Phoenix, AZ</p>
          <div className="flex gap-1.5">
            <MonoTag>Off Road</MonoTag>
            <MonoTag>Chevrolet</MonoTag>
          </div>
        </div>
        <Bell className="w-3.5 h-3.5 text-white/30" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { l: 'Starts', v: '128' },
          { l: 'Wins', v: '14' },
          { l: 'Podiums', v: '47' },
        ].map((s) => (
          <div
            key={s.l}
            className="p-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-lg font-black text-white leading-none">{s.v}</div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mt-1">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40">
        <Calendar className="w-3 h-3" style={{ color: '#1DA1A1' }} />
        Next: Round 6 · Glen Helen · Aug 3
      </div>
    </BrowserFrame>
  );
}

/* Race Core event file preview */
function RaceCorePreview() {
  const steps = ['Practice', 'Qualify', 'Heat 1', 'Heat 2', 'Final'];
  return (
    <BrowserFrame label="Race Core" url="racecore/event-files/evt-0821">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flag className="w-3.5 h-3.5" style={{ color: '#1DA1A1' }} />
          <h4 className="text-xs font-black text-white uppercase tracking-tight">Round 6 · Glen Helen</h4>
        </div>
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded"
          style={{ color: '#050A0A', background: '#1DA1A1' }}
        >
          LIVE
        </span>
      </div>
      <div className="flex items-center gap-1 mb-3">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: i < 2 ? '#1DA1A1' : 'rgba(255,255,255,0.15)',
                  boxShadow: i < 2 ? '0 0 8px rgba(29,161,161,0.6)' : 'none',
                }}
              />
              <span
                className="text-[8px] font-mono uppercase tracking-wider"
                style={{ color: i < 2 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}
              >
                {s}
              </span>
            </div>
            {i < 4 && (
              <div
                className="h-0.5 flex-1 -mt-3.5"
                style={{ background: i < 2 ? 'rgba(29,161,161,0.4)' : 'rgba(255,255,255,0.08)' }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { n: '44', name: 'Casey Smith', st: 'Teched' },
          { n: '07', name: 'Riley Voss', st: 'Checked In' },
          { n: '22', name: 'Drew Allen', st: 'Registered' },
        ].map((e) => (
          <div
            key={e.n}
            className="flex items-center gap-2 py-1.5 px-2 rounded-md"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <span className="text-[10px] font-mono font-bold w-6" style={{ color: '#1DA1A1' }}>{e.n}</span>
            <span className="text-[11px] text-white/70 flex-1">{e.name}</span>
            <span
              className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)' }}
            >
              {e.st}
            </span>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

/* Standings preview */
function StandingsPreview() {
  const rows = [
    { p: 1, n: 'Casey Smith', pt: 412 },
    { p: 2, n: 'Riley Voss', pt: 388 },
    { p: 3, n: 'Drew Allen', pt: 355 },
    { p: 4, n: 'Marco Reyes', pt: 301 },
  ];
  return (
    <BrowserFrame label="Standings" url="index46.ai/standings/pro-4/2026">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-3.5 h-3.5" style={{ color: '#1DA1A1' }} />
        <h4 className="text-xs font-black text-white uppercase tracking-tight">Pro 4 · 2026</h4>
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.p}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded-md"
            style={{ background: r.p === 1 ? 'rgba(29,161,161,0.08)' : 'rgba(255,255,255,0.02)' }}
          >
            <span
              className="text-xs font-black w-5 text-center"
              style={{ color: r.p === 1 ? '#1DA1A1' : 'rgba(255,255,255,0.6)' }}
            >
              {r.p}
            </span>
            <div
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(29,161,161,0.5), rgba(10,63,63,0.8))' }}
            />
            <span className="text-[11px] text-white/75 flex-1">{r.n}</span>
            <span className="text-[11px] font-mono font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {r.pt}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-white/35">
        <BarChart3 className="w-3 h-3" style={{ color: '#1DA1A1' }} />
        Updated live after each session
      </div>
    </BrowserFrame>
  );
}

/* Team / directory preview (light) */
function DirectoryPreview() {
  const teams = [
    { name: 'Voss Motorsports', loc: 'Mesa, AZ' },
    { name: 'Allen Racing', loc: 'Santee, CA' },
    { name: 'Reyes Off-Road', loc: 'Las Vegas, NV' },
    { name: 'Phoenix Forge', loc: 'Tucson, AZ' },
  ];
  return (
    <BrowserFrame label="Teams" url="index46.ai/teams" dark={false}>
      <div
        className="flex items-center gap-2 mb-3 px-2 py-2 rounded-lg"
        style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[11px] text-gray-400">Search teams...</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {teams.map((t) => (
          <div
            key={t.name}
            className="p-2.5 rounded-lg"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <div
              className="w-7 h-7 rounded-lg mb-1.5"
              style={{ background: 'linear-gradient(135deg, #0a8a8a, #006633)' }}
            />
            <div className="text-[11px] font-bold text-gray-900 leading-tight">{t.name}</div>
            <div className="text-[9px] text-gray-500 mt-0.5 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {t.loc}
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

const PREVIEWS = [
  { Cmp: DriverProfilePreview, label: 'Driver Profile' },
  { Cmp: RaceCorePreview, label: 'Race Core · Event File' },
  { Cmp: StandingsPreview, label: 'Championship Standings' },
  { Cmp: DirectoryPreview, label: 'Team Directory' },
];

export default function JoinPreviews() {
  return (
    <section className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-[1px] bg-[#1DA1A1]" />
          <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">Sneak Peek</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase mb-4 leading-[0.95]">
          Where this is going.
        </h2>
        <p className="text-white/55 text-sm sm:text-base max-w-2xl mb-12">
          A first look at the experiences coming online. Real profiles, real race-day operations,
          live standings — all wired into one platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PREVIEWS.map((p) => (
            <div key={p.label} className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">{p.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              </div>
              <div className="flex-1">
                <p.Cmp />
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] font-mono tracking-[0.35em] uppercase text-white/30 mt-8">
          Pre-launch previews · Final UI subject to evolution
        </p>
      </div>
    </section>
  );
}