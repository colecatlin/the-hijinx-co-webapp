import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';
import CareerStatusTag from '@/components/competition/CareerStatusTag';
import { ArrowRight, BarChart2, Globe, Users, Layers, Info } from 'lucide-react';

const LEVELS = [
  {
    level: 1,
    label: 'Foundation',
    description: 'Entry competition — club and local events, primarily a learning stage. Minimal travel, volunteer operations, grassroots feel.',
    traits: ['Club or local events', 'Volunteer-run', 'Learning environment', 'Minimal prize purse'],
  },
  {
    level: 2,
    label: 'Development',
    description: 'Structured regional competition with a clear growth pathway. Regular travel within a region, organized officiating, modest media coverage.',
    traits: ['Regional travel', 'Structured championship', 'Some media coverage', 'Clear path to higher levels'],
  },
  {
    level: 3,
    label: 'National',
    description: 'Recognized national championship tier. Professional team operations, major streaming or TV broadcast, significant prize purses.',
    traits: ['Nationwide schedule', 'Professional operations', 'TV or streaming deals', 'Major manufacturer involvement'],
  },
  {
    level: 4,
    label: 'Premier',
    description: 'The highest competitive tier within a national ecosystem. Elite driver pool, substantial sponsor presence, national media footprint.',
    traits: ['Elite competition', 'Top national sponsors', 'High team budgets', 'Iconic within its discipline'],
  },
  {
    level: 5,
    label: 'World',
    description: 'Global championship tier with multi-continent infrastructure and world championship identity. The apex of the sport.',
    traits: ['Multi-continent events', 'Global broadcast rights', 'World championship title', 'International driver pool'],
  },
];

const EXAMPLES = [
  {
    name: 'NASCAR Cup Series',
    level: 4,
    scope: 'National',
    note: 'Premier national tier — elite U.S.-based stock car racing with national TV and major manufacturers.',
  },
  {
    name: 'Formula 1',
    level: 5,
    scope: 'Global',
    note: 'World tier — multi-continent calendar, global broadcast, and the pinnacle of single-seater racing.',
  },
  {
    name: 'CHAMP Off Road',
    level: 3,
    scope: 'National',
    note: 'National tier — recognized U.S. short-course championship with professional operations and media.',
  },
  {
    name: 'Local Club Series',
    level: 1,
    scope: 'Local',
    note: 'Foundation tier — grassroots competition where drivers of any career status can participate.',
  },
];

export default function CompetitionSystem() {
  return (
    <PageShell className="bg-white">
      {/* Hero */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs font-mono uppercase tracking-widest px-4 py-2 rounded-full mb-8">
            <Layers className="w-3 h-3" />
            HIJINX Classification Framework
          </div>
          <h1 className="text-5xl lg:text-6xl font-black leading-none mb-6">
            The Hijinx Competition<br />Level System
          </h1>
          <p className="text-gray-400 text-xl leading-relaxed max-w-2xl mx-auto">
            A universal framework built to classify competitive ceiling across all racing disciplines — from grassroots clubs to world championships.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        {/* Why This Exists */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <Info className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-black">Why This Exists</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              'Motorsport lacks a universal, cross-discipline classification framework.',
              'Terms like "Pro" and "Elite" are used inconsistently across series and disciplines.',
              'Hijinx separates competition level, geographic scope, and career status into three independent dimensions.',
              'The goal is clarity — for fans, sponsors, teams, drivers, and media.',
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-3 p-5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="w-6 h-6 bg-[#0A0A0A] text-white text-xs font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The 5 Levels */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-black">The 5-Level Scale</h2>
          </div>
          <p className="text-gray-600 mb-8">Levels are assigned at the Class level, not the series level. A series derives its level from the highest-level active class it contains.</p>
          <div className="space-y-4">
            {LEVELS.map(({ level, label, description, traits }) => (
              <div key={level} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-4 mb-3">
                  <CompetitionLevelBadge level={level} size="lg" />
                </div>
                <p className="text-gray-700 mb-4 text-sm leading-relaxed">{description}</p>
                <div className="flex flex-wrap gap-2">
                  {traits.map((trait, i) => (
                    <span key={i} className="text-[11px] bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{trait}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How Levels Are Assigned */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-black">How Levels Are Assigned</h2>
          </div>
          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100 space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>Levels are assigned to <strong>Classes</strong>, not to individual drivers or series directly.</p>
            <p>A series may operate multiple classes — for example, Pro 4 and Pro Lite. Each class carries its own Competition Level based on its actual competitive ceiling.</p>
            <p>The <strong>Series Competition Level</strong> is automatically derived from the highest-level active class within that series. If a series has no active classes, no level is displayed.</p>
            <p>Scoring metrics used to inform level assignments include: media reach, prize purse, attendance, manufacturer involvement, geographic diversity, and team budget scale. These are scored 1–10 per category and used as internal reference by administrators.</p>
            <p>In rare cases, administrators may manually override a derived level with a reason noted for transparency.</p>
          </div>
        </section>

        {/* Three Dimensions */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-black">Three Separate Dimensions</h2>
          </div>
          <p className="text-gray-600 mb-8">These three tags are independent — a driver can be a Novice in a National-level series, or a Professional competing at a Local-level event.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold mb-2 text-sm uppercase tracking-wide text-gray-500">Competition Level</h3>
              <p className="text-sm text-gray-700 mb-4">Measures the overall competitive ceiling of a class or series — infrastructure, operator quality, media reach, manufacturer involvement.</p>
              <div className="flex flex-wrap gap-2">
                {[1,2,3,4,5].map(l => <CompetitionLevelBadge key={l} level={l} size="sm" />)}
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold mb-2 text-sm uppercase tracking-wide text-gray-500">Geographic Scope</h3>
              <p className="text-sm text-gray-700 mb-4">Defines the physical footprint of a series or class — not its prestige, just how widely it travels.</p>
              <div className="flex flex-wrap gap-2">
                {['Local','Regional','National','Global'].map(s => <GeographicScopeTag key={s} scope={s} size="sm" />)}
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold mb-2 text-sm uppercase tracking-wide text-gray-500">Career Status</h3>
              <p className="text-sm text-gray-700 mb-4">Reflects the individual driver's professional standing — independent of what series or class they compete in.</p>
              <div className="flex flex-wrap gap-2">
                {['Novice','Amateur','Semi-Professional','Professional'].map(s => <CareerStatusTag key={s} status={s} size="sm" />)}
              </div>
            </div>
          </div>
        </section>

        {/* Examples */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-black">Real-World Examples</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXAMPLES.map((ex) => (
              <div key={ex.name} className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-black text-lg mb-3">{ex.name}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <CompetitionLevelBadge level={ex.level} />
                  <GeographicScopeTag scope={ex.scope} />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{ex.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Lives in the Platform */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-black">How It Lives in the Platform</h2>
          </div>
          <div className="space-y-3">
            {[
              'Every Series profile displays its Competition Level and Geographic Scope, derived from its highest-level active Class.',
              'Every Class has its own Level, Geographic Scope, and scoring framework visible on its detail view.',
              'Every Driver profile shows their Career Status tag.',
              'Directories and search use these tags as filters to help fans, sponsors, and media find the right competition tier quickly.',
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-3 py-4 border-b border-gray-100 last:border-0">
                <span className="text-[#0A0A0A] font-black text-lg leading-none mt-0.5">→</span>
                <p className="text-gray-700 text-sm leading-relaxed">{line}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#0A0A0A] rounded-2xl p-10 text-white text-center">
          <h2 className="text-2xl font-black mb-3">Explore the Series Directory</h2>
          <p className="text-gray-400 mb-6 text-sm">Browse every series with Competition Level and Geographic Scope tags applied.</p>
          <Link
            to={createPageUrl('SeriesHome')}
            className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] font-bold text-sm px-6 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            Browse Series
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </PageShell>
  );
}