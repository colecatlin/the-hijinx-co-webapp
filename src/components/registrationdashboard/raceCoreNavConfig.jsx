import {
  LayoutDashboard,
  User,
  Users,
  Trophy,
  MapPin,
  Flag,
  MonitorPlay,
  BarChart3,
  Camera,
  Award,
  SlidersHorizontal,
  Briefcase,
  Send,
  DollarSign,
  FileJson,
  RefreshCw,
  Wrench,
  Database,
  Archive,
  ShieldCheck,
  Activity,
  HeartPulse,
  Fingerprint,
} from 'lucide-react';

/**
 * Race Core navigation config — single source of truth for RaceCoreSidebar.
 * R9CA: Rebuilt to match final R9BZ IA.
 * - OPERATIONS: Event Files
 * - RECORDS: Drivers, Teams, Series, Tracks, Events
 * - STANDINGS: Championship Standings
 * - MEDIA: Applications, Assignments, Requests
 * - DATA: Points Rulesets, Imports, Calendar Sync, Results Repair, Diagnostics
 *
 * Sessions and Results removed as top-level nav — owned exclusively by EventFile workspace.
 */

export const RACE_CORE_NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'RaceCore',
    items: [
      { href: '/racecore', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { href: '/racecore/event-files', label: 'Event Files', icon: MonitorPlay },
    ],
  },
  {
    id: 'records',
    label: 'Records',
    items: [
      { href: '/racecore/records/drivers', label: 'Drivers', icon: User },
      { href: '/racecore/records/teams',   label: 'Teams',   icon: Users },
      { href: '/racecore/records/series',  label: 'Series',  icon: Trophy },
      { href: '/racecore/records/tracks',  label: 'Tracks',  icon: MapPin },
      { href: '/racecore/records/events',  label: 'Events',  icon: Flag },
    ],
  },
  {
    id: 'standings',
    label: 'Standings',
    items: [
      { href: '/racecore/standings', label: 'Championship Standings', icon: BarChart3 },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      { href: '/racecore/media/applications', label: 'Applications', icon: Camera },
      { href: '/racecore/media/assignments',  label: 'Assignments',  icon: Briefcase },
      { href: '/racecore/media/requests',     label: 'Requests',     icon: Send },
      { href: '/racecore/media/revenue',      label: 'Revenue',      icon: DollarSign },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    adminOnly: true,
    items: [
      { href: '/racecore/governance',        label: 'Overview',         icon: ShieldCheck,  adminOnly: true },
      { href: '/racecore/archive',           label: 'Archive',          icon: Archive,      adminOnly: true },
      { href: '/racecore/health',            label: 'Data Health',      icon: HeartPulse,   adminOnly: true },
      { href: '/racecore/identity-review',   label: 'Identity Review',  icon: Fingerprint,  adminOnly: true },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [
      { href: '/racecore/data/points-rulesets', label: 'Points Rulesets', icon: SlidersHorizontal },
      { href: '/racecore/data/imports',         label: 'Imports / CSV',   icon: FileJson },
      { href: '/racecore/data/calendar-sync',   label: 'Calendar Sync',   icon: RefreshCw },
      { href: '/racecore/data/results-repair',  label: 'Results Repair',  icon: Award },
      { href: '/racecore/data/diagnostics',     label: 'Diagnostics',     icon: Wrench },
    ],
    adminOnly: true,
  },
];