import React from 'react';
import { Activity as ActivityIcon, UserPlus, ShieldCheck, Boxes } from 'lucide-react';
import { buildActivityFeed } from '@/components/organizations/organizationService';

const TYPE_ICON = {
  relationship_requested: UserPlus,
  relationship_approved: ShieldCheck,
  relationship_revoked: ShieldCheck,
  asset_created: Boxes,
};

/**
 * Activity — a chronological timeline synthesized from members + assets until
 * AuditLog is the canonical source. The contract (buildActivityFeed) stays the
 * same so swapping the data source later requires no UI changes.
 */
export default function OrganizationActivity({ members = [], assets = [] }) {
  const feed = buildActivityFeed(members, assets);
  return (
    <div className="space-y-2">
      {feed.length === 0 ? (
        <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <ActivityIcon className="w-6 h-6 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>No activity yet.</p>
        </div>
      ) : (
        feed.map((item, i) => {
          const Icon = TYPE_ICON[item.type] || ActivityIcon;
          return (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(29,161,161,0.1)', border: '1px solid rgba(29,161,161,0.25)' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: '#1DA1A1' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{item.label}</div>
                {item.detail && <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.detail}</div>}
                <div className="text-[10px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {item.when ? new Date(item.when).toLocaleString() : ''}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}