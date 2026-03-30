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
  Upload,
  Download,
  Plug,
  History,
  Mic,
  Clock,
  Gauge,
  Camera,
  BookOpen,
  User,
  MapPin,
} from 'lucide-react';

/**
 * Race Core navigation config — single source of truth for sidebar.
 *
 * item fields:
 *   tab         — activeTab string value (for tab-based navigation)
 *   href        — full path (for link-based navigation outside dashboard tabs)
 *   label       — display name
 *   icon        — Lucide icon component
 *   canTabKey   — permission key checked via canTab()
 *   requiresEvent — greyed out when no event is selected
 *   adminOnly   — only shown to role === 'admin'
 *   ownerOnly   — shown to admins and entity owners/editors
 *   quickAction — true: shown in quick actions section, not primary nav
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
    items: [
      { tab: 'eventBuilder',    label: 'Event Setup',        icon: Plus,           canTabKey: 'event_builder' },
      { tab: 'classesSessions', label: 'Classes & Sessions', icon: ClipboardCheck, canTabKey: 'classes_sessions', requiresEvent: true },
      { tab: 'entries',         label: 'Entries',            icon: Users,          canTabKey: 'entries',          requiresEvent: true },
    ],
  },
  {
    id: 'operate',
    label: 'Operate',
    items: [
      { tab: 'checkIn',    label: 'Check In',        icon: Car,         canTabKey: 'checkin',      requiresEvent: true },
      { tab: 'compliance', label: 'Compliance',      icon: AlertCircle, canTabKey: 'compliance',   requiresEvent: true },
      { tab: 'tech',       label: 'Tech Inspection', icon: Wrench,      canTabKey: 'tech',         requiresEvent: true },
      { tab: 'results',    label: 'Results',         icon: Flag,        canTabKey: 'results' },
      { tab: 'raceControlConsole', label: 'Race Control', icon: Radio,  canTabKey: 'race_control', requiresEvent: true },
      { tab: 'gateConsole',label: 'Gate Console',    icon: DoorOpen,    canTabKey: 'gate',         requiresEvent: true },
    ],
  },
  {
    id: 'championship',
    label: 'Championship',
    items: [
      { tab: 'pointsStandings', label: 'Points & Standings', icon: Trophy, canTabKey: 'points_standings' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { tab: 'imports',       label: 'Imports',      icon: Upload,  canTabKey: 'imports' },
      { tab: 'exportsDataHub',label: 'Data Hub',     icon: Download, canTabKey: 'exports', requiresEvent: true },
      { tab: 'integrations',  label: 'Integrations', icon: Plug,    canTabKey: 'integrations' },
      { tab: 'auditLog',      label: 'Audit Log',    icon: History, canTabKey: 'audit_log' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      { tab: 'media',        label: 'Media Governance', icon: Camera,   canTabKey: 'media' },
      { tab: 'media_portal', label: 'Media Portal',     icon: Camera,   canTabKey: 'media_portal', requiresEvent: true },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      { href: '/ManageDrivers', label: 'Drivers', icon: User,   canTabKey: null },
      { href: '/ManageTeams',   label: 'Teams',   icon: Users,  canTabKey: null },
      { href: '/ManageSeries',  label: 'Series',  icon: Trophy, canTabKey: null },
      { href: '/ManageTracks',  label: 'Tracks',  icon: MapPin, canTabKey: null },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    adminOnly: true,
    items: [
      { tab: 'opsCenter',   label: 'Ops Center',    icon: Gauge,    adminOnly: true, requiresEvent: true },
      { tab: 'raceControl', label: 'Race Ctrl Mgr', icon: Radio,    ownerOnly: true, requiresEvent: true },
      { tab: 'gateManager', label: 'Gate Manager',  icon: DoorOpen, ownerOnly: true, requiresEvent: true },
      { tab: 'paddock',     label: 'Paddock',       icon: Users,    ownerOnly: true, requiresEvent: true },
      { tab: 'timing_sync', label: 'Timing Sync',   icon: Clock,    ownerOnly: true, requiresEvent: true },
      { tab: 'announcer_pack', label: 'Announcer Pack', icon: BookOpen, canTabKey: 'announcer_pack' },
      { tab: 'announcer',   label: 'Announcer',     icon: Mic,      canTabKey: 'announcer', requiresEvent: true },
    ],
  },
];

/**
 * Quick actions surfaced on the Race Core Home for role-aware shortcuts.
 * These are contextual — shown based on what's available / needed.
 */
export const RACE_CORE_QUICK_ACTIONS = [
  { id: 'create_event',     label: 'Create Event',      icon: Plus,     tab: 'eventBuilder',    canActionKey: 'create_event' },
  { id: 'import_entries',   label: 'Import Entries',    icon: Upload,   modal: 'importEntries', canActionKey: 'import_csv',     requiresEvent: true },
  { id: 'sync_timing',      label: 'Sync Timing',       icon: Clock,    modal: 'syncTiming',    canActionKey: 'sync_timing',    requiresEvent: true, ownerOnly: true },
  { id: 'publish_results',  label: 'Publish Results',   icon: Flag,     tab: 'results',         canActionKey: 'publish_official', requiresEvent: true },
  { id: 'data_hub',         label: 'Export / Data Hub', icon: Download, tab: 'exportsDataHub',  canActionKey: 'export',         requiresEvent: true },
  { id: 'media_portal',     label: 'Media Portal',      icon: Camera,   tab: 'media_portal',    canTabKey: 'media_portal',      requiresEvent: true },
];