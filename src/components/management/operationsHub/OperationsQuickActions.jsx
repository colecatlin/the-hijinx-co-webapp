import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  FileText, Building2, Handshake, PenLine, Image as ImageIcon,
  MessageSquare, Activity, UserPlus, Gauge,
} from 'lucide-react';

/**
 * OperationsQuickActions — shortcut bar for common admin tasks.
 * Links only — no logic.
 */
const ACTIONS = [
  { label: 'Review Claims',   href: createPageUrl('ManageDriverClaims'),         icon: FileText },
  { label: 'Create Org',      href: '/organization/create',                       icon: Building2 },
  { label: 'Access Mgmt',     href: createPageUrl('ManageAccess'),                icon: Handshake },
  { label: 'Publish Story',   href: createPageUrl('ManageStories'),               icon: PenLine },
  { label: 'Manage Media',    href: createPageUrl('MediaPortal'),                 icon: ImageIcon },
  { label: 'Review Queue',    href: createPageUrl('management/editorial/review-queue'), icon: MessageSquare },
  { label: 'Run Audits',      href: '/racecore/data/diagnostics',                 icon: Activity },
  { label: 'Invite User',     href: createPageUrl('ManageAccess'),                icon: UserPlus },
  { label: 'Open RaceCore',   href: '/racecore',                                   icon: Gauge },
];

export default function OperationsQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map(({ label, href, icon: Icon }) => (
        <Link
          key={label}
          to={href}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-elevated border border-divider rounded-lg text-foreground-secondary hover:bg-surface-interactive hover:text-foreground hover:border-motion/30 transition-all"
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </Link>
      ))}
    </div>
  );
}