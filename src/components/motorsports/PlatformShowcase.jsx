import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Users, Building2, MapPin, Trophy, CalendarDays, BarChart3,
  ShieldCheck, ClipboardList, Flag, Database, FileSpreadsheet, Gauge,
} from 'lucide-react';
import { Index46ConceptScreen, RaceCoreConceptScreen } from '@/components/motorsports/PlatformConceptScreens';

const ACCENT = 'hsl(var(--motion))';
const ACCENT_MUTED = 'hsl(var(--motion-muted))';
const FG = 'hsl(var(--foreground))';
const FG_SEC = 'hsl(var(--foreground-secondary))';
const FG_QUIET = 'hsl(var(--foreground-quiet))';
const SURF = 'hsl(var(--surface-elevated))';
const DIV = 'hsl(var(--divider))';

const index46Tiles = [
  { icon: Users,        label: 'Drivers',  to: '/DriverDirectory', desc: 'Pro, semi-pro & amateur competitor profiles.', disabled: true },
  { icon: Building2,    label: 'Teams',    to: '/TeamDirectory',   desc: 'Racing teams, builders & programs.',          disabled: true },
  { icon: MapPin,       label: 'Tracks',   to: '/TrackDirectory',  desc: 'Venues & facilities across every discipline.',disabled: true },
  { icon: Trophy,       label: 'Series',    to: '/SeriesHome',      desc: 'Sanctioned series, classes & championships.', disabled: true },
  { icon: CalendarDays, label: 'Events',    to: '/EventDirectory',  desc: 'Race schedules, rounds & results.',          disabled: true },
  { icon: BarChart3,    label: 'Standings', to: '/StandingsHome',    desc: 'Live championship points & rankings.',       disabled: true },
];

const raceCoreTiles = [
  { icon: Gauge,         label: 'Dashboard',     to: '/racecore',                     desc: 'Mission control for event ops.', disabled: true },
  { icon: ClipboardList, label: 'Event Files',   to: '/racecore/event-files',         desc: 'Per-event workspace: entries, sessions, results.', disabled: true },
  { icon: BarChart3,     label: 'Standings Ops',  to: '/racecore/standings',           desc: 'Calculation, tie-breakers & publishing.', disabled: true },
  { icon: Database,      label: 'Records',        to: '/racecore/records/drivers',     desc: 'Drivers, teams, tracks, series, events.', disabled: true },
  { icon: FileSpreadsheet, label: 'Data Tools',   to: '/racecore/data/imports',        desc: 'CSV import, calendar sync, diagnostics.', disabled: true },
  { icon: Flag,          label: 'Race Control',   to: '/racecore/event-files',         desc: 'Incidents, penalties, grids & holds.', disabled: true },
];

function SectionHeader({ kicker, title, blurb }) {
  return (
    <div className="max-w-2xl mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-5 h-[1px]" style={{ background: ACCENT }} />
        <span className="font-mono text-[9px] tracking-[0.45em] uppercase" style={{ color: ACCENT }}>{kicker}</span>
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-[0.95] tracking-tight uppercase mb-3" style={{ color: FG }}>
        {title}
      </h2>
      <p className="text-sm sm:text-base leading-relaxed" style={{ color: FG_SEC }}>{blurb}</p>
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
            className={`group relative overflow-hidden rounded-2xl p-5 ${t.disabled ? 'cursor-default' : 'transition-all duration-200 hover:-translate-y-0.5'}`}
            style={{
              background: SURF,
              border: `1px solid ${DIV}`,
              boxShadow: '0 1px 2px hsl(0 0% 0% / 0.04)',
              opacity: t.disabled ? 0.72 : 1,
            }}
            onMouseEnter={t.disabled ? undefined : e => { e.currentTarget.style.borderColor = `${ACCENT}66`; e.currentTarget.style.boxShadow = `0 8px 24px hsl(var(--motion) / 0.12)`; }}
            onMouseLeave={t.disabled ? undefined : e => { e.currentTarget.style.borderColor = DIV; e.currentTarget.style.boxShadow = '0 1px 2px hsl(0 0% 0% / 0.04)'; }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: `radial-gradient(circle at top left, hsl(var(--motion) / 0.10), transparent 70%)` }}
            />
            <div className="relative flex items-start gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: ACCENT_MUTED, border: `1px solid ${ACCENT}40` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold tracking-wider uppercase" style={{ color: FG }}>{t.label}</h3>
                  {t.disabled ? (
                    <span className="flex-shrink-0 text-[8px] font-mono tracking-[0.25em] uppercase" style={{ color: FG_QUIET }}>
                      Soon
                    </span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-all flex-shrink-0" style={{ color: ACCENT }} />
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: FG_SEC }}>{t.desc}</p>
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
    <div className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-20 space-y-20 md:space-y-28" style={{ background: 'hsl(var(--canvas))' }}>

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
            style={{ background: ACCENT, color: '#fff' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Claim Your Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: FG_QUIET }}>
            Pre-launch · early access for drivers, teams, tracks & series
          </span>
        </div>
        <div className="mt-10">
          <Index46ConceptScreen />
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
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200 cursor-not-allowed"
            style={{ background: SURF, border: `1px solid ${DIV}`, color: FG_QUIET }}
          >
            Open Race Core
            <span className="text-[8px] font-mono tracking-[0.3em] uppercase" style={{ color: ACCENT }}>Soon</span>
          </button>
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: FG_QUIET }}>
            Admins · officials · series & track staff
          </span>
        </div>
        <div className="mt-10">
          <RaceCoreConceptScreen />
        </div>
      </section>

      {/* ── PRE-LAUNCH NOTE ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12"
        style={{ background: `linear-gradient(135deg, hsl(var(--motion) / 0.10) 0%, hsl(var(--surface-elevated)) 60%)`, border: `1px solid ${ACCENT}33`, boxShadow: '0 1px 2px hsl(0 0% 0% / 0.04)' }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, hsl(var(--motion) / 0.40), transparent 70%)` }}
        />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-[1px]" style={{ background: ACCENT }} />
            <span className="font-mono text-[9px] tracking-[0.45em] uppercase" style={{ color: ACCENT }}>Pre-Launch</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-[0.95] tracking-tight uppercase mb-3" style={{ color: FG }}>
            We're building in the open.
          </h2>
          <p className="text-sm sm:text-base leading-relaxed mb-5" style={{ color: FG_SEC }}>
            Profiles are being claimed, events are being scheduled, and the Race Core engine is live with early partners. Browse the directory, claim your stake, or step into Race Core if you're operating an event.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/DriverDirectory"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200 hover:brightness-110"
              style={{ background: ACCENT, color: '#fff' }}
            >
              Browse the Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/join"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200"
              style={{ background: SURF, border: `1px solid ${DIV}`, color: FG }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${ACCENT}66`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = DIV; }}
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: ACCENT }} />
              Claim Your Profile
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}