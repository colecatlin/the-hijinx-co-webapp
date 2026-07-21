import React from 'react';
import { Link2 } from 'lucide-react';

const TEAL = '#1DA1A1';

/**
 * Relationships — surfaces every EntityCollaborator relationship involving
 * this organization. The same store powers People; here we group by role to
 * expose connected-organization / staff / sponsor / media relationships. When
 * future cross-org relationship entities land, they integrate here unchanged.
 */
export default function OrganizationRelationships({ orgType, entityId, members = [] }) {
  const approved = members.filter((m) => m.status === 'approved');
  const byRole = {};
  approved.forEach((m) => { (byRole[m.role_key || 'member'] ||= []).push(m); });

  return (
    <div className="space-y-4">
      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Every relationship connected to this organization — staff, sponsor, media, and future
        connected-organization links — flows through the central EntityCollaborator store.
      </p>

      {Object.keys(byRole).length === 0 ? (
        <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Link2 className="w-6 h-6 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>No active relationships.</p>
        </div>
      ) : (
        Object.entries(byRole).map(([role, list]) => (
          <div key={role}>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {role} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({list.length})</span>
            </h4>
            <div className="space-y-1.5">
              {list.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div className="text-sm font-medium text-white">{m.user_email}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: TEAL }}>
                      {m.permission_level || '—'} {m.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}