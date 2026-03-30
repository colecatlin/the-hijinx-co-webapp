import {
  LayoutDashboard,
  Plus,
  ClipboardCheck,
  Users,
  Car,
  AlertCircle,
  Wrench,
  Flag,
  Radio,
  DoorOpen,
  Trophy,
  BookOpen,
  Upload,
  Download,
  Plug,
  History,
  Mic,
  Clock,
  Gauge,
  Camera,
  Film,
} from 'lucide-react';

/**
 * Race Core navigation groups — single source of truth for sidebar.
 * Each item maps `tab` to the existing activeTab string value.
 * `canTabKey` is the permission key used by canTab().
 * `requiresEvent` items are disabled when no event is selected.
 * `adminOnly` items are only shown to admins.
 * `ownerOnly` items are shown to admins and entity owners/editors.
 */
export const RACE_CORE_NAV_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    items: [
      { tab: 'overview', label: 'Overview', icon: LayoutDashboard, canTabKey: 'overview' },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    description: 'Set up events, classes, entries',
    items: [
      { tab: 'eventBuilder',     label: 'Event Setup',        icon: Plus,           canTabKey: 'event_builder' },
      { tab: 'classesSessions',  label: 'Classes & Sessions', icon: ClipboardCheck, canTabKey: 'classes_sessions', requiresEvent: true },
      { tab: 'entries',          label: 'Entries',            icon: Users,          canTabKey: 'entries',          requiresEvent: true },
    ],
  },
  {
    id: 'operate',
    label: 'Operate',
    description: 'Race-day operational tools',
    items: [
      { tab: 'checkIn',           label: 'Check In',           icon: Car,       canTabKey: 'checkin',      requiresEvent: true },
      { tab: 'compliance',        label: 'Compliance',         icon: AlertCircle, canTabKey: 'compliance', requiresEvent: true },
      { tab: 'tech',              label: 'Tech Inspection',    icon: Wrench,    canTabKey: 'tech',         requiresEvent: true },
      { tab: 'results',           label: 'Results',            icon: Flag,      canTabKey: 'results' },
      { tab: 'raceControlConsole',label: 'Race Control',       icon: Radio,     canTabKey: 'race_control', requiresEvent: true },
      { tab: 'gateConsole',       label: 'Gate Console',       icon: DoorOpen,  canTabKey: 'gate',         requiresEvent: true },
      { tab: 'paddock',           label: 'Paddock',            icon: Users,     ownerOnly: true,           requiresEvent: true },
      { tab: 'timing_sync',       label: 'Timing Sync',        icon: Clock,     ownerOnly: true,           requiresEvent: true },
      { tab: 'announcer',         label: 'Announcer',          icon: Mic,       canTabKey: 'announcer',    requiresEvent: true },
    ],
  },
  {
    id: 'championship',
    label: 'Championship',
    description: 'Standings, points, season view',
    items: [
      { tab: 'pointsStandings',  label: 'Points & Standings', icon: Trophy,   canTabKey: 'points_standings' },
      { tab: 'announcer_pack',   label: 'Announcer Pack',     icon: BookOpen, canTabKey: 'announcer_pack' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    description: 'Imports, exports, integrations',
    items: [
      { tab: 'imports',       label: 'Imports',      icon: Upload,   canTabKey: 'imports' },
      { tab: 'exportsDataHub',label: 'Data Hub',     icon: Download, canTabKey: 'exports',      requiresEvent: true },
      { tab: 'integrations',  label: 'Integrations', icon: Plug,     canTabKey: 'integrations' },
      { tab: 'auditLog',      label: 'Audit Log',    icon: History,  canTabKey: 'audit_log' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      { tab: 'media',        label: 'Media Governance', icon: Camera, canTabKey: 'media' },
      { tab: 'media_portal', label: 'Media Portal',     icon: Film,   canTabKey: 'media_portal', requiresEvent: true },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    adminOnly: true,
    items: [
      { tab: 'opsCenter',    label: 'Ops Center',      icon: Gauge, adminOnly: true, requiresEvent: true },
      { tab: 'raceControl',  label: 'Race Ctrl Mgr',   icon: Radio, ownerOnly: true, requiresEvent: true },
      { tab: 'gateManager',  label: 'Gate Manager',    icon: DoorOpen, ownerOnly: true, requiresEvent: true },
    ],
  },
];