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
  Clock,
  Award,
  SlidersHorizontal,
  Briefcase,
  Send,
  DollarSign,
  Settings,
} from 'lucide-react';

/**
 * Race Core navigation config — single source of truth for RaceCoreSidebar.
 * R9BI: Removed Access & Claims and Data Integrity groups — those belong in Management.
 * Added Platform Administration link pointing to /Management.
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
      { href: '/racecore',                  label: 'RaceCore Dashboard', icon: LayoutDashboard },
      { href: '/racecore/event-files',       label: 'Event Files',        icon: MonitorPlay },
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
      { href: '/racecore/records/sessions',        label: 'Sessions',        icon: Clock },
      { href: '/racecore/records/results',         label: 'Results',         icon: Award },
      { href: '/racecore/records/points-rulesets', label: 'Points Rulesets', icon: SlidersHorizontal },
      { href: '/racecore/standings',               label: 'Standings Hub',   icon: BarChart3 },
    ],
  },
  {
    id: 'media-ecosystem',
    label: 'Media Ecosystem',
    items: [
      { href: '/racecore/media/applications', label: 'Applications',     icon: Camera },
      { href: '/racecore/media/assignments',  label: 'Assignments',      icon: Briefcase },
      { href: '/racecore/media/requests',     label: 'Requests',         icon: Send },
      { href: '/racecore/media/revenue',      label: 'Revenue & Payouts', icon: DollarSign },
    ],
  },
  {
    id: 'platform-admin',
    label: 'Platform',
    items: [
      { href: '/Management', label: 'Platform Administration', icon: Settings },
    ],
  },
];