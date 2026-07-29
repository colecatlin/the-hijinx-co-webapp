import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Users, Building2, MapPin, Trophy, CalendarDays, BarChart3,
  ShieldCheck, ClipboardList, Flag, Database, FileSpreadsheet, Gauge,
} from 'lucide-react';

const index46Tiles = [
  { icon: Users,        label: 'Drivers',  to: '/DriverDirectory', desc: 'Pro, semi-pro & amateur competitor profiles.', disabled: true },
  { icon: Building2,    label: 'Teams',    to: '/TeamDirectory',   desc: 'Racing teams, builders & programs.',          disabled: true },
  { icon: MapPin,       label: 'Tracks',   to: '/TrackDirectory',  desc: 'Venues & facilities across every discipline.',disabled: true },
  { icon: Trophy,       label: 'Series',    to: '/SeriesHome',      desc: 'Sanctioned series, classes & championships.', disabled: true },
  { icon: CalendarDays, label: 'Events',    to: '/EventDirectory',  desc: 'Race schedules, rounds & results.',          disabled: true },
  { icon: BarChart3,    label: 'Standings', to: '/StandingsHome',    desc: 'Live championship points & rankings.',       disabled: true },
];

const raceCoreTiles = [
  { icon: Gauge,         label: 'Dashboard',     to: '/racecore',                     desc: 'Mission control for event ops.' },
  { icon: ClipboardList, label: 'Event Files',   to: '/racecore/event-files',         desc: 'Per-event workspace: entries, sessions, results.' },
  { icon: BarChart3,     label: 'Standings Ops',  to: '/racecore/standings',           desc: 'Calculation, tie-breakers & publishing.' },
  { icon: Database,      label: 'Records',        to: '/racecore/records/drivers',     desc: 'Drivers, teams, tracks, series, events.' },
  { icon: FileSpreadsheet, label: 'Data Tools',   to: '/racecore/data/imports',        desc: 'CSV import, calendar sync, diagnostics.' },
  { icon: Flag,          label: 'Race Control',   to: '/racecore/event-files',         desc: 'Incidents, penalties, grids & holds.' },
];

function SectionHeader({ kicker, title, blurb }) {
  return (
    <div className="max-w-2xl mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-5 h-[1px] bg-[#1DA1A1]" />
        <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">{kicker}</span>
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tight uppercase mb-3">
        {title}
      </h2>
      <p className="text-white/55 text-sm sm:text-base leading-relaxed">{blurb}</p>
    </div>
  );
}

function TileGrid({ tiles }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        const Wrapper = t.disabled ? 'div' : Link;
        const wrapperProps = t.disabled ? {} : { to: t.to };
        return (
          <Wrapper
            key={t.label}
            {...wrapperProps}
            aria-disabled={t.disabled ? true : undefined}
            className={`group relative overflow-hidden rounded-2xl p-5 ${t.disabled ? 'cursor-default opacity-60' : 'transition-all duration-200 hover:-translate-y-0.5'}`}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: 'radial-gradient(circle at top left, rgba(29,161,161,0.12), transparent 70%)' }}
            />
            <div className="relative flex items-start gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(29,161,161,0.12)', border: '1px solid rgba(29,161,161,0.25)' }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: '#1DA1A1' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white">{t.label}</h3>
                  {t.disabled ? (
                    <span className="flex-shrink-0 text-[8px] font-mono tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      Soon
                    </span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-[#1DA1A1] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs leading-relaxed text-white/50">{t.desc}</p>
              </div>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}

export default function PlatformShowcase() {
  return (
    <div className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-20 space-y-20 md:space-y-28">

      {/* ── INDEX46 ── */}
      <section>
        <SectionHeader
          kicker="INDEX46 · The Network"
          title={<>The motorsports<br />ecosystem.</>}
          blurb="The public side of the platform — a living directory of the people, teams, places and series that make up racing culture. Profiles, schedules, results and standings, all in one place."
        />
        <TileGrid tiles={index46Tiles} />
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/join"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200 hover:brightness-110"
            style={{ background: '#1DA1A1', color: '#050A0A' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Claim Your Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/35">
            Pre-launch · early access for drivers, teams, tracks & series
          </span>
        </div>
      </section>

      {/* ── RACE CORE ── */}
      <section>
        <SectionHeader
          kicker="Race Core · The Engine"
          title={<>Operate the<br />race weekend.</>}
          blurb="The back-office that runs the show — event files, entries, tech, sessions, results, standings, grids, race control and governance. Built for officials, series staff and track operators."
        />
        <TileGrid tiles={raceCoreTiles} />
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/racecore"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200 hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}
          >
            Open Race Core
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/35">
            Admins · officials · series & track staff
          </span>
        </div>
      </section>

      {/* ── PRE-LAUNCH NOTE ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12"
        style={{ background: 'linear-gradient(135deg, rgba(29,161,161,0.10) 0%, rgba(4,8,8,0.4) 60%)', border: '1px solid rgba(29,161,161,0.20)' }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29,161,161,0.4), transparent 70%)' }}
        />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-[1px] bg-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">Pre-Launch</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-[0.95] tracking-tight uppercase mb-3">
            We're building in the open.
          </h2>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-5">
            Profiles are being claimed, events are being scheduled, and the Race Core engine is live with early partners. Browse the directory, claim your stake, or step into Race Core if you're operating an event.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/DriverDirectory"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200 hover:brightness-110"
              style={{ background: '#1DA1A1', color: '#050A0A' }}
            >
              Browse the Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/join"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200 hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#1DA1A1' }} />
              Claim Your Profile
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}