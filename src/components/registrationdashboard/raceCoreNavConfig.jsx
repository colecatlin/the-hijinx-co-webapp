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
  MonitorPlay,
  BarChart3,
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
    label: 'Command',
    items: [
      { tab: 'overview',  label: 'RaceCore Dashboard', icon: LayoutDashboard, canTabKey: 'overview' },
      { href: '/race-control/events', label: 'Event Files', icon: MonitorPlay, canTabKey: null },
    ],
  },
  {
    id: 'build',
    label: 'Governance',
    items: [
      { tab: 'eventBuilder',    label: 'Event Setup',        icon: Plus,           canTabKey: 'event_builder' },
      { tab: 'integrations',    label: 'Integrations',       icon: Plug,           canTabKey: 'integrations' },
      { href: '/racecore/standings', label: 'Standings',      icon: BarChart3,      canTabKey: null },
    ],
  },
  {
    id: 'people',
    label: 'Entity Records',
    items: [
      { href: '/racecore/records/drivers', label: 'Drivers', icon: User,   canTabKey: null },
      { href: '/racecore/records/teams',   label: 'Teams',   icon: Users,  canTabKey: null },
      { href: '/racecore/records/series',  label: 'Series',  icon: Trophy, canTabKey: null },
      { href: '/racecore/records/tracks',  label: 'Tracks',  icon: MapPin, canTabKey: null },
      { href: '/racecore/records/events',  label: 'Events',  icon: Flag,   canTabKey: null },
    ],
  },
  {
    id: 'admin',
    label: 'Admin Tools',
    adminOnly: true,
    items: [
      { tab: 'announcer_pack', label: 'Announcer Pack',   icon: BookOpen, canTabKey: 'announcer_pack' },
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