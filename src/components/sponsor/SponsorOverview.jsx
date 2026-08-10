import React from 'react';
import { Globe, Mail, Phone, MapPin } from 'lucide-react';
import SponsorCompletenessIndicator from '@/components/sponsor/SponsorCompletenessIndicator';

export default function SponsorOverview({ org, settings, statistics, commercialSummary, completeness, aboutOnly }) {
  if (aboutOnly) {
    return (
      <div className="space-y-4">
        <Section title="About">
          <p className="text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            {org.description || 'No description has been added yet.'}
          </p>
          {org.tagline && (
            <p className="text-xs mt-2 italic" style={{ color: 'hsl(var(--motion))' }}>"{org.tagline}"</p>
          )}
        </Section>
        <Section title="Contact & Links">
          <div className="flex flex-col gap-2">
            {org.website_url && <LinkRow icon={Globe} href={org.website_url} text={org.website_url} />}
            {org.contact_email && <LinkRow icon={Mail} href={`mailto:${org.contact_email}`} text={org.contact_email} />}
            {org.contact_phone && <LinkRow icon={Phone} text={org.contact_phone} />}
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Partnerships" value={statistics?.active_sponsorships ?? 0} />
        <StatCard label="Total Activations" value={statistics?.total_activations ?? 0} />
        <StatCard label="Completed" value={statistics?.completed_activations ?? 0} />
        <StatCard label="Deliverables" value={statistics?.total_deliverables ?? 0} />
      </div>

      <Section title="About">
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>
          {org.description || 'No description has been added yet.'}
        </p>
        {org.tagline && (
          <p className="text-xs mt-2 italic" style={{ color: 'hsl(var(--motion))' }}>"{org.tagline}"</p>
        )}
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Contact & Links">
          <div className="flex flex-col gap-2">
            {org.website_url && <LinkRow icon={Globe} href={org.website_url} text={org.website_url} />}
            {org.contact_email && <LinkRow icon={Mail} href={`mailto:${org.contact_email}`} text={org.contact_email} />}
            {org.contact_phone && <LinkRow icon={Phone} text={org.contact_phone} />}
            {(org.location_city || org.location_country) && (
              <LinkRow icon={MapPin} text={[org.location_city, org.location_state, org.location_country].filter(Boolean).join(', ')} />
            )}
          </div>
        </Section>

        <Section title="Commercial Profile">
          <div className="flex flex-wrap gap-2">
            {commercialSummary?.industries?.map(i => (
              <Pill key={i} label={i} />
            ))}
            {commercialSummary?.tiers?.map(t => (
              <Pill key={t} label={t} variant="motion" />
            ))}
            {commercialSummary?.relationship_types?.map(r => (
              <Pill key={r} label={r} variant="muted" />
            ))}
          </div>
          {commercialSummary?.industries?.length === 0 && commercialSummary?.tiers?.length === 0 && (
            <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>No commercial classifications yet.</p>
          )}
        </Section>
      </div>

      {completeness && (
        <Section title="Profile Completeness">
          <SponsorCompletenessIndicator completeness={completeness} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
      <div className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>{label}</div>
      <div className="text-2xl font-black mt-1" style={{ color: 'hsl(var(--foreground))' }}>{value}</div>
    </div>
  );
}

function LinkRow({ icon: Icon, href, text }) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: href ? 'hsl(var(--motion))' : 'hsl(var(--foreground-secondary))' }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {href ? <a href={href} target="_blank" rel="noreferrer" className="truncate hover:underline">{text}</a> : <span className="truncate">{text}</span>}
    </div>
  );
}

function Pill({ label, variant = 'default' }) {
  const styles = {
    default: { bg: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-secondary))' },
    motion: { bg: 'hsl(var(--motion) / 0.15)', color: 'hsl(var(--motion))' },
    muted: { bg: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-quiet))' },
  };
  const s = styles[variant] || styles.default;
  return (
    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md"
      style={{ background: s.bg, color: s.color }}>
      {label}
    </span>
  );
}