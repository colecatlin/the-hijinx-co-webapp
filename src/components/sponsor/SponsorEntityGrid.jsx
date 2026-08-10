import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Car, Trophy, Calendar, MapPin, Image } from 'lucide-react';

const ICONS = {
  racers: Users,
  teams: Users,
  vehicles: Car,
  series: Trophy,
  events: Calendar,
  tracks: MapPin,
  media: Image,
};

export default function SponsorEntityGrid({ entities = [], entityType, title }) {
  if (entities.length === 0) {
    const Icon = ICONS[entityType] || Users;
    return (
      <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(var(--surface) / 0.5)', border: '1px dashed hsl(var(--divider))' }}>
        <Icon className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No {title.toLowerCase()} yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--motion))' }}>
        {title} ({entities.length})
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {entities.map((e, i) => <EntityCard key={e.id || i} entity={e} entityType={entityType} />)}
      </div>
    </div>
  );
}

function EntityCard({ entity, entityType }) {
  const profileUrl = entity.profile_url;
  const image = entity.profile_image_url || entity.logo_url || entity.profile_image_url;
  const name = entity.display_name || entity.name || entity.nickname || entity.title || 'Unknown';
  const subtitle = entity.hometown_city
    ? [entity.hometown_city, entity.hometown_state].filter(Boolean).join(', ')
    : entity.primary_discipline || entity.discipline || entity.manufacturer
      ? [entity.manufacturer, entity.model].filter(Boolean).join(' ')
      : entity.location_city
        ? [entity.location_city, entity.location_country].filter(Boolean).join(', ')
        : entity.event_date || entity.asset_type || null;

  const inner = (
    <div className="p-4 rounded-xl flex items-center gap-3 transition-all" style={{
      background: 'hsl(var(--surface-elevated) / 0.8)',
      border: '1px solid hsl(var(--divider))',
    }}>
      {image ? (
        <img src={image} alt={name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'hsl(var(--motion) / 0.1)' }}>
          <span className="text-lg font-black" style={{ color: 'hsl(var(--motion))' }}>{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{name}</div>
        {subtitle && <div className="text-[10px] truncate" style={{ color: 'hsl(var(--foreground-quiet))' }}>{subtitle}</div>}
        {entity.tier && (
          <span className="text-[9px] font-mono uppercase mt-1 inline-block px-1.5 py-0.5 rounded"
            style={{ background: 'hsl(var(--motion) / 0.12)', color: 'hsl(var(--motion))' }}>
            {entity.tier}
          </span>
        )}
      </div>
    </div>
  );

  return profileUrl ? <Link to={profileUrl}>{inner}</Link> : inner;
}