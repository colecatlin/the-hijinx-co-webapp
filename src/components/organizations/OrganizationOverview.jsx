import React, { useMemo } from 'react';
import { Globe, Mail, Phone, MapPin, Calendar, Tag } from 'lucide-react';
import OrganizationVerificationBadge from '@/components/organizations/OrganizationVerificationBadge';
import { getOrganizationType } from '@/config/organizationRegistry';

const TEAL = '#1DA1A1';

/** Overview — the at-a-glance profile for any organization. */
export default function OrganizationOverview({ orgType, record, settings, members = [], assets = [] }) {
  const spec = getOrganizationType(orgType);
  const pending = members.filter((m) => m.status === 'pending');
  const approved = members.filter((m) => m.status === 'approved');
  const admins = approved.filter((m) => m.permission_level === 'admin');
  const metadata = useMemo(() => {
    const rows = [];
    rows.push(['Organization Type', spec?.label]);
    rows.push(['Verification', settings?.verification_status]);
    rows.push(['Visibility', settings?.visibility]);
    if (record.location_city || record.location_country) {
      rows.push(['Location', [record.location_city, record.location_state, record.location_country].filter(Boolean).join(', ')]);
    }
    if (record.operational_status) rows.push(['Status', record.operational_status]);
    return rows;
  }, [spec, settings, record]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat Pill icon={Calendar} label="Active Members" value={approved.length} />
        <Stat Pill icon={Calendar} label="Pending Requests" value={pending.length} />
        <Stat Pill icon={Calendar} label="Administrators" value={admins.length} />
        <Stat Pill icon={Calendar} label="Assets" value={assets.length} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl md:col-span-2" style={{ bgStyle }}>
          <h3 className="text-sm font-bold mb-3 text-white">About</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {record.description || 'No description has been added yet.'}
          </p>
          {settings?.tagline && (
            <p className="text-xs mt-2 italic" style={{ color: 'rgba(29,161,161,0.85)' }}>"{settings.tagline}"</p>
          )}

          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mt-5 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact & Links</h4>
          <div className="flex flex-col gap-1.5">
            {record.website_url && <LinkRow icon={Globe} href={record.website_url} text={record.website_url} />}
            {settings?.contact_email && <LinkRow icon={Mail} href={`mailto:${settings.contact_email}`} text={settings.contact_email} />}
            {settings?.contact_phone && <LinkRow icon={Phone} text={settings.contact_phone} />}
          </div>
        </div>

        <div className="p-5 rounded-xl" style={bgStyle}>
          <h3 className="text-sm font-bold mb-3 text-white">Details</h3>
          {metadata.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</span>
              <span className="text-xs font-medium text-right" style={{ color: 'rgba(255,255,255,0.85)' }}>{v || '—'}</span>
            </div>
          ))}
          <div className="pt-3">
            <OrganizationVerificationBadge status={settings?.verification_status || 'unverified'} size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

const bgStyle = { background: 'rgba(4,8,8,0.72)', border: '1px solid rgba(255,255,255,0.08)' };

function Stat({ Pill, label, value }) {
  return (
    <div className="p-3 rounded-xl" style={bgStyle}>
      <div className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

function LinkRow({ icon: Icon, href, text }) {
  const Inner = (
    <span className="flex items-center gap-2 text-xs" style={{ color: href ? TEAL : 'rgba(255,255,255,0.7)' }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer" className="block">{Inner}</a> : <div>{Inner}</div>;
}