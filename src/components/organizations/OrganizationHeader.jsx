import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, Phone, MapPin } from 'lucide-react';
import OrganizationVerificationBadge from '@/components/organizations/OrganizationVerificationBadge';
import { getOrganizationType } from '@/config/organizationRegistry';

/**
 * Organization-header — banner/logo/title block shared by every org page.
 * Type-agnostic: derives everything from the registry + settings overlay.
 */
export default function OrganizationHeader({ orgType, record, settings, stats = {}, isMember, onJoin, joining }) {
  const spec = getOrganizationType(orgType);
  if (!spec || !record) return null;
  const Icon = spec.icon;
  const banner = settings?.banner_url;
  const logo = record.logo_url || (spec.generic ? null : logoFallback(record));
  const socials = [
    { key: 'social_instagram', label: 'Instagram', isHandle: true },
    { key: 'social_x', label: 'X', isHandle: true },
    { key: 'social_facebook', label: 'Facebook' },
    { key: 'social_youtube', label: 'YouTube' },
    { key: 'social_linkedin', label: 'LinkedIn' },
    { key: 'social_tiktok', label: 'TikTok', isHandle: true },
  ].filter((s) => settings?.[s.key]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(4,8,8,0.78)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="h-28 lg:h-36 relative" style={{
        background: banner
          ? `url(${banner}) center/cover`
          : 'linear-gradient(135deg, rgba(29,161,161,0.25), rgba(4,8,8,0.9))',
      }} />
      <div className="px-5 pb-5">
        <div className="flex items-end gap-4 -mt-10">
          {logo ? (
            <img src={logo} alt={record.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              style={{ border: '3px solid rgba(4,8,8,0.9)' }} />
          ) : (
            <div className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(29,161,161,0.12)', border: '3px solid rgba(4,8,8,0.9)' }}>
              <Icon className="w-10 h-10" style={{ color: '#1DA1A1' }} />
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{record.name}</h1>
              <OrganizationVerificationBadge status={settings?.verification_status || 'unverified'} />
            </div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {spec.label}
              {record.location_city || record.location_country
                ? ` · ${[record.location_city, record.location_country].filter(Boolean).join(', ')}`
                : ''}
            </p>
          </div>
          {!isMember && onJoin && (
            <button onClick={onJoin} disabled={joining}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide"
              style={{ background: '#1DA1A1', color: '#050A0A', opacity: joining ? 0.6 : 1 }}>
              {joining ? 'Requesting…' : 'Request Access'}
            </button>
          )}
        </div>

        {record.description && (
          <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{record.description}</p>
        )}

        <div className="flex items-center gap-4 flex-wrap mt-4">
          {record.website_url && (
            <a href={record.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: '#1DA1A1' }}>
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          )}
          {settings?.contact_email && (
            <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Mail className="w-3.5 h-3.5" /> {settings.contact_email}
            </a>
          )}
          {settings?.contact_phone && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Phone className="w-3.5 h-3.5" /> {settings.contact_phone}
            </span>
          )}
          {socials.map((s) => (
            <span key={s.key} className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
          ))}
        </div>

        <div className="flex items-center gap-5 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Stat label="Members" value={stats.approvedCount ?? 0} />
          <Stat label="Pending" value={stats.pendingCount ?? 0} />
          <Stat label="Assets" value={stats.assetCount ?? 0} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
    </div>
  );
}

function logoFallback(record) {
  return record.logo_url || null;
}