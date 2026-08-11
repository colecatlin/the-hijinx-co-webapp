import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function EventRacerCard({ racer, car_number, class_name, team, vehicle, result }) {
  if (!racer) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-divider hover:border-motion/40 transition-colors group">
      <div className="relative flex-shrink-0">
        {racer.profile_image_url ? (
          <img src={racer.profile_image_url} alt={racer.display_name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-interactive flex items-center justify-center text-sm font-bold text-foreground-secondary">
            {racer.display_name?.charAt(0) || '?'}
          </div>
        )}
        {car_number && (
          <span className="absolute -bottom-1 -right-1 text-[9px] font-mono font-bold bg-motion text-canvas px-1 py-0.5 rounded">#{car_number}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {racer.profile_url ? (
          <Link to={racer.profile_url} className="text-sm font-semibold text-foreground group-hover:text-motion transition-colors truncate block">
            {racer.display_name}
          </Link>
        ) : (
          <div className="text-sm font-semibold text-foreground truncate">{racer.display_name}</div>
        )}
        <div className="flex items-center gap-2 text-xs text-foreground-quiet">
          {class_name && <span>{class_name}</span>}
          {team?.name && (
            <span className="truncate">
              · {team.profile_url
                ? <Link to={team.profile_url} className="hover:text-motion transition-colors" onClick={e => e.stopPropagation()}>{team.name}</Link>
                : team.name}
            </span>
          )}
          {vehicle?.nickname && (
            <span className="truncate">
              · {vehicle.profile_url
                ? <Link to={vehicle.profile_url} className="hover:text-motion transition-colors" onClick={e => e.stopPropagation()}>{vehicle.nickname}</Link>
                : vehicle.nickname}
            </span>
          )}
        </div>
        {result?.position && (
          <div className="text-xs font-mono text-motion mt-0.5">P{result.position}{result.points ? ` · ${result.points}pts` : ''}</div>
        )}
      </div>
    </div>
  );
}