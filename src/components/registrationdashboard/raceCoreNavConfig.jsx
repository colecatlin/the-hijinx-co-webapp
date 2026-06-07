import {
  LayoutDashboard,
  User,
  Users,
  Trophy,
  MapPin,
  Flag,
  MonitorPlay,
  BarChart3,
  Wrench,
  Camera,
  Clock,
  Award,
  SlidersHorizontal,
  Briefcase,
  Send,
  DollarSign,
  UserCheck,
  Shield,
  FileJson,
  RefreshCw,
  GitMerge,
} from 'lucide-react';

/**
 * Race Core navigation config — single source of truth for RaceCoreSidebar.
 *
 * item fields:
 *   href   — full path (all items are href-driven, no tab/modal keys)
 *   label  — display name
 *   icon   — Lucide icon component
 */

export const RACE_CORE_NAV_GROUPS = [
  {
    id: 'command',
    label: 'Command',
    items: [
      { href: '/racecore',            label: 'RaceCore Dashboard', icon: LayoutDashboard },
      { href: '/race-control/events', label: 'Event Files',        icon: MonitorPlay },
    ],
  },
  {
    id: 'entity-oversight',
    label: 'Entity Oversight',
    items: [
      { href: '/racecore/records/drivers', label: 'Drivers',         icon: User },
      { href: '/racecore/records/teams',   label: 'Teams',           icon: Users },
      { href: '/racecore/records/series',  label: 'Series',          icon: Trophy },
      { href: '/racecore/records/tracks',  label: 'Tracks',          icon: MapPin },
      { href: '/racecore/records/events',  label: 'Events Overview', icon: Flag },
    ],
  },
  {
    id: 'race-records',
    label: 'Race Records',
    items: [
      { href: '/racecore/records/sessions',       label: 'Sessions',        icon: Clock },
      { href: '/racecore/records/results',        label: 'Results',         icon: Award },
      { href: '/racecore/records/points-rulesets',label: 'Points Rulesets', icon: SlidersHorizontal },
      { href: '/racecore/standings',              label: 'Standings Hub',   icon: BarChart3 },
    ],
  },
  {
    id: 'media-ecosystem',
    label: 'Media Ecosystem',
    items: [
      { href: '/racecore/media/applications', label: 'Applications',    icon: Camera },
      { href: '/racecore/media/assignments',  label: 'Assignments',     icon: Briefcase },
      { href: '/racecore/media/requests',     label: 'Requests',        icon: Send },
      { href: '/racecore/media/revenue',      label: 'Revenue & Payouts', icon: DollarSign },
    ],
  },
  {
    id: 'access-claims',
    label: 'Access & Claims',
    items: [
      { href: '/racecore/access/claims',     label: 'Driver Claims',     icon: UserCheck },
      { href: '/racecore/access/management', label: 'Access Management', icon: Shield },
    ],
  },
  {
    id: 'data-integrity',
    label: 'Data Integrity',
    items: [
      { href: '/racecore/data/csv',           label: 'CSV Import/Export',   icon: FileJson },
      { href: '/racecore/data/calendar-sync', label: 'Schedule Sync',       icon: RefreshCw },
      { href: '/racecore/data/champ-import',  label: 'Champ Import',        icon: GitMerge },
      { href: '/racecore/diagnostics',        label: 'System Diagnostics',  icon: Wrench },
    ],
  },
];