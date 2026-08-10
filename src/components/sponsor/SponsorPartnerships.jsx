import React from 'react';
import { Link } from 'react-router-dom';
import { Handshake, Calendar, Trophy } from 'lucide-react';

export default function SponsorPartnerships({ sponsorships }) {
  const { active = [], historical = [], all = [] } = sponsorships || {};

  if (all.length === 0) {
    return (
      <EmptyState icon={Handshake} label="No partnerships yet" />
    );
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--motion))' }}>
            Active Partnerships ({active.length})
          </h3>
          <div className="space-y-2">
            {active.map((s, i) => <PartnershipCard key={s.sponsorship_id || i} sponsorship={s} />)}
          </div>
        </div>
      )}

      {historical.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Historical Partnerships ({historical.length})
          </h3>
          <div className="space-y-2">
            {historical.map((s, i) => <PartnershipCard key={s.sponsorship_id || i} sponsorship={s} historical />)}
          </div>
        </div>
      )}
    </div>
  );
}

function PartnershipCard({ sponsorship, historical }) {
  const targetLabel = formatTargetType(sponsorship.target_entity_type);
  const dateRange = [sponsorship.start_date, sponsorship.end_date].filter(Boolean).join(' — ');

  return (
    <div className="p-4 rounded-xl flex items-center gap-4" style={{
      background: 'hsl(var(--surface-elevated) / 0.8)',
      border: `1px solid ${historical ? 'hsl(var(--divider))' : 'hsl(var(--motion) / 0.2)'}`,
    }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: historical ? 'hsl(var(--surface-interactive))' : 'hsl(var(--motion) / 0.12)' }}>
        <Handshake className="w-5 h-5" style={{ color: historical ? 'hsl(var(--foreground-quiet))' : 'hsl(var(--motion))' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{targetLabel}</span>
          {sponsorship.tier && (
            <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded"
              style={{ background: 'hsl(var(--motion) / 0.12)', color: 'hsl(var(--motion))' }}>
              {sponsorship.tier}
            </span>
          )}
          {sponsorship.relationship_type && (
            <span className="text-[10px] uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>{sponsorship.relationship_type}</span>
          )}
        </div>
        {sponsorship.campaign_name && (
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>{sponsorship.campaign_name}</p>
        )}
        {dateRange && (
          <p className="text-[10px] font-mono mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            <Calendar className="w-3 h-3 inline mr-1" />{dateRange}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded"
          style={{
            background: historical ? 'hsl(var(--surface-interactive))' : 'hsl(var(--success) / 0.12)',
            color: historical ? 'hsl(var(--foreground-quiet))' : 'hsl(var(--success))',
          }}>
          {sponsorship.status}
        </span>
      </div>
    </div>
  );
}

function formatTargetType(type) {
  const map = {
    RacerProfile: 'Racer',
    Team: 'Team',
    Vehicle: 'Vehicle',
    Series: 'Series',
    Event: 'Event',
    Track: 'Track',
    MediaAsset: 'Media Asset',
    Platform: 'Platform',
  };
  return map[type] || type || 'Unknown';
}

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(var(--surface) / 0.5)', border: '1px dashed hsl(var(--divider))' }}>
      <Icon className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }} />
      <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>{label}</p>
    </div>
  );
}