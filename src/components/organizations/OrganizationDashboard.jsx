import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Boxes, ShieldCheck, Eye, Link2, Activity } from 'lucide-react';
import OrganizationWidget from '@/components/organizations/OrganizationWidget';

const TEAL = '#1DA1A1';

/**
 * Dashboard — configuration-driven, reusable widget grid. It receives the
 * already-loaded org context and renders widgets + quick links. Every org type
 * uses the same dashboard; types only differ by which modules they enable
 * later.
 */
export default function OrganizationDashboard({ orgType, entityId, members = [], assets = [], settings }) {
  const pending = members.filter((m) => m.status === 'pending');
  const approved = members.filter((m) => m.status === 'approved');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link to={`/organization/${orgType}/${entityId}/people`}>
          <OrganizationWidget icon={Users} label="Members" value={approved.length} hint="Active members" />
        </Link>
        <Link to={`/organization/${orgType}/${entityId}/people`}>
          <OrganizationWidget icon={Clock} label="Pending" value={pending.length} hint="Awaiting approval" color="#f59e0b" />
        </Link>
        <Link to={`/organization/${orgType}/${entityId}/assets`}>
          <OrganizationWidget icon={Boxes} label="Assets" value={assets.length} hint="Across all types" />
        </Link>
        <Link to={`/organization/${orgType}/${entityId}/settings`}>
          <OrganizationWidget icon={ShieldCheck} label="Verification" value={(settings?.verification_status || 'unverified').replace('_', ' ')} color="#1DA1A1" />
        </Link>
        <Link to={`/organization/${orgType}/${entityId}/settings`}>
          <OrganizationWidget icon={Eye} label="Visibility" value={settings?.visibility || 'public'} />
        </Link>
        <Link to={`/organization/${orgType}/${entityId}/relationships`}>
          <OrganizationWidget icon={Link2} label="Relationships" value={approved.length} />
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Recent Activity</h3>
          <Link to={`/organization/${orgType}/${entityId}/activity`} className="text-[11px]" style={{ color: TEAL }}>View all</Link>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'rgba(4,8,8,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {pending.length > 0 ? (
            pending.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Activity className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>New request from {m.user_email || 'a user'}</span>
              </div>
            ))
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}