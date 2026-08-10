import React from 'react';
import { Globe, MapPin, BadgeCheck } from 'lucide-react';
import OrganizationVerificationBadge from '@/components/organizations/OrganizationVerificationBadge';

export default function SponsorHero({ org, settings, statistics, sharing }) {
  const banner = settings?.banner_url || org.banner_url;
  const logo = org.logo_url;
  const socials = [
    { key: 'social_instagram', label: 'Instagram', value: org.social_instagram },
    { key: 'social_x', label: 'X', value: org.social_x },
    { key: 'social_facebook', label: 'Facebook', value: org.social_facebook },
    { key: 'social_youtube', label: 'YouTube', value: org.social_youtube },
    { key: 'social_linkedin', label: 'LinkedIn', value: org.social_linkedin },
    { key: 'social_tiktok', label: 'TikTok', value: org.social_tiktok },
  ].filter(s => s.value);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--surface-elevated) / 0.9)', border: '1px solid hsl(var(--divider))' }}>
      <div className="h-32 lg:h-44 relative" style={{
        background: banner
          ? `url(${banner}) center/cover`
          : 'linear-gradient(135deg, hsl(var(--motion) / 0.25), hsl(var(--canvas)))',
      }} />
      <div className="px-5 pb-5">
        <div className="flex items-end gap-4 -mt-12">
          {logo ? (
            <img src={logo} alt={org.name} className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
              style={{ border: '3px solid hsl(var(--surface-elevated))' }} />
          ) : (
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'hsl(var(--motion) / 0.12)', border: '3px solid hsl(var(--surface-elevated))' }}>
              <span className="text-3xl font-black" style={{ color: 'hsl(var(--motion))' }}>
                {(org.name || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black" style={{ color: 'hsl(var(--foreground))' }}>{org.name}</h1>
              <OrganizationVerificationBadge status={settings?.verification_status || 'unverified'} />
            </div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Sponsor
              {org.industry ? ` · ${org.industry}` : ''}
              {org.location_city || org.location_country
                ? ` · ${[org.location_city, org.location_country].filter(Boolean).join(', ')}`
                : ''}
            </p>
            {org.tagline && (
              <p className="text-sm mt-2 italic" style={{ color: 'hsl(var(--motion))' }}>"{org.tagline}"</p>
            )}
          </div>
        </div>

        {org.description && (
          <p className="text-sm mt-4" style={{ color: 'hsl(var(--foreground-secondary))' }}>{org.description}</p>
        )}

        <div className="flex items-center gap-4 flex-wrap mt-4">
          {org.website_url && (
            <a href={org.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'hsl(var(--motion))' }}>
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          )}
          {socials.map(s => (
            <span key={s.key} className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>{s.label}</span>
          ))}
        </div>

        <div className="flex items-center gap-6 mt-4 pt-3" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
          <Stat label="Active Partnerships" value={statistics?.active_sponsorships ?? 0} />
          <Stat label="Activations" value={statistics?.total_activations ?? 0} />
          <Stat label="Deliverables" value={statistics?.total_deliverables ?? 0} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xl font-black" style={{ color: 'hsl(var(--foreground))' }}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>{label}</div>
    </div>
  );
}