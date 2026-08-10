import React from 'react';
import { Briefcase } from 'lucide-react';

export default function SponsorCommercialSummary({ commercialSummary }) {
  if (!commercialSummary) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
        <h3 className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--motion))' }}>Commercial Summary</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Industries</h4>
          <TagList items={commercialSummary.industries} />
        </div>
        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Categories</h4>
          <TagList items={commercialSummary.categories} />
        </div>
        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Relationship Types</h4>
          <TagList items={commercialSummary.relationship_types} />
        </div>
        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Tiers</h4>
          <TagList items={commercialSummary.tiers} variant="motion" />
        </div>
      </div>

      {commercialSummary.primary_relationship && (
        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--motion) / 0.08)', border: '1px solid hsl(var(--motion) / 0.2)' }}>
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-2" style={{ color: 'hsl(var(--motion))' }}>Primary Relationship</h4>
          <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            {commercialSummary.primary_relationship.relationship_type} · {commercialSummary.primary_relationship.tier}
          </p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            Target: {commercialSummary.primary_relationship.target_entity_type}
            {commercialSummary.primary_relationship.campaign_name ? ` — ${commercialSummary.primary_relationship.campaign_name}` : ''}
          </p>
        </div>
      )}

      {commercialSummary.current_campaigns?.length > 0 && (
        <div>
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-2" style={{ color: 'hsl(var(--motion))' }}>Current Campaigns</h4>
          <div className="space-y-1">
            {commercialSummary.current_campaigns.map((c, i) => (
              <div key={i} className="text-xs p-2 rounded-lg" style={{ background: 'hsl(var(--surface-elevated) / 0.6)', color: 'hsl(var(--foreground-secondary))' }}>
                {c.name} <span style={{ color: 'hsl(var(--foreground-quiet))' }}>— {c.target_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TagList({ items, variant = 'default' }) {
  if (!items || items.length === 0) {
    return <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>None</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item} className="text-xs px-2 py-1 rounded-md"
          style={variant === 'motion'
            ? { background: 'hsl(var(--motion) / 0.12)', color: 'hsl(var(--motion))' }
            : { background: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-secondary))' }}>
          {item}
        </span>
      ))}
    </div>
  );
}