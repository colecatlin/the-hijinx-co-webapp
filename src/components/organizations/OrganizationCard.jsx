import React from 'react';
import { Link } from 'react-router-dom';
import OrganizationVerificationBadge from '@/components/organizations/OrganizationVerificationBadge';
import { getOrganizationType } from '@/config/organizationRegistry';

/**
 * Reusable card for any organization across directories, dashboards, and
 * search results. Reads only the canonical record + settings — no type logic.
 */
export default function OrganizationCard({ orgType, record, settings, footer }) {
  const spec = getOrganizationType(orgType);
  if (!spec || !record) return null;
  const Icon = spec.icon;
  const logo = record.logo_url;
  const name = record.name || 'Untitled';
  const sub = settings?.tagline || spec.label;

  return (
    <Link
      to={`/organization/${orgType}/${record.id}`}
      className="block p-4 rounded-xl transition-all h-full"
      style={{ background: 'rgba(4,8,8,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start gap-3">
        {logo ? (
          <img src={logo} alt={name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(29,161,161,0.1)', border: '1px solid rgba(29,161,161,0.25)' }}>
            <Icon className="w-6 h-3" style={{ color: '#1DA1A1' }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white truncate">{name}</h3>
            <OrganizationVerificationBadge status={settings?.verification_status || 'unverified'} />
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
        </div>
      </div>
      {footer && <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>{footer}</div>}
    </Link>
  );
}