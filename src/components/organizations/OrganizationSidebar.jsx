import React from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { CORE_SECTIONS, getOrganizationType } from '@/config/organizationRegistry';
import { LayoutDashboard, Users, Boxes, Link2, Activity, Settings as SettingsIcon } from 'lucide-react';

const ICONS = {
  overview: LayoutDashboard,
  people: Users,
  assets: Boxes,
  relationships: Link2,
  activity: Activity,
  settings: SettingsIcon,
};

/**
 * Organization sidebar — the shared navigation for every org page. Derives
 * its items from the CORE_SECTIONS registry so future types inherit them with
 * no component edits.
 */
export default function OrganizationSidebar({ orgType, entityId }) {
  const { entityType } = useParams();
  const loc = useLocation();
  const spec = getOrganizationType(orgType);
  if (!spec) return null;

  const active = (key) => loc.pathname.endsWith(`/${key}`);

  return (
    <aside className="w-full lg:w-56 flex-shrink-0">
      <nav className="space-y-1 p-2 rounded-xl" style={{ background: 'rgba(4,8,8,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {CORE_SECTIONS.map((s) => {
          const Icon = ICONS[s.key] || Users;
          const to = s.key === 'overview'
            ? `/organization/${orgType}/${entityId}`
            : `/organization/${orgType}/${entityId}/${s.key}`;
          return (
            <Link
              key={s.key}
              to={to}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: active(s.key) ? 'rgba(29,161,161,0.12)' : 'transparent',
                color: active(s.key) ? '#1DA1A1' : 'rgba(255,255,255,0.6)',
                fontWeight: active(s.key) ? 700 : 500,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: active(s.key) ? '#1DA1A1' : 'rgba(255,255,255,0.4)' }} />
              {s.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}