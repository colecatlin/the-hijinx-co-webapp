import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink, MoreHorizontal } from 'lucide-react';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  Active:   { label: 'ACTIVE',    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30' },
  Seasonal: { label: 'SEASONAL',  color: 'text-amber-400  bg-amber-400/10  border-amber-500/30'  },
  Inactive: { label: 'INACTIVE',  color: 'text-gray-500   bg-gray-500/10   border-gray-600/30'   },
};

const SURFACE_ABBREV = {
  Asphalt:  'ASP',
  Concrete: 'CON',
  Dirt:     'DRT',
  Clay:     'CLY',
  Mixed:    'MIX',
};

const TYPE_ABBREV = {
  'Oval':          'OVL',
  'Road Course':   'RC',
  'Street Circuit':'SC',
  'Short Track':   'ST',
  'Speedway':      'SPD',
  'Off-Road':      'OFF',
  'Dirt Track':    'DT',
  'Other':         '—',
};

export default function TrackRecordRow({
  track,
  isAdmin,
  isSelected,
  onSelect,
  onDelete,
  isDeleting,
}) {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[track.operational_status] || STATUS_CONFIG.Active;
  const surfaceAbbrev = SURFACE_ABBREV[track.surface_type] || track.surface_type || '—';
  const typeAbbrev = TYPE_ABBREV[track.track_type] || track.track_type || '—';

  const locationParts = [track.location_city, track.location_state, track.location_country]
    .filter(Boolean).join(', ');

  const lengthDisplay = track.length ? `${track.length}mi` : '—';

  const updatedDisplay = track.updated_date
    ? new Date(track.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—';

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/60 transition-colors cursor-pointer',
        'hover:bg-gray-800/40',
        isSelected && 'bg-gray-800/30'
      )}
      onClick={() => navigate('/race-core/tracks/' + track.id)}
    >
      {/* Checkbox */}
      {isAdmin && (
        <div
          className="shrink-0"
          onClick={e => { e.stopPropagation(); onSelect(track.id); }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(track.id)}
            className="border-gray-600 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
          />
        </div>
      )}

      {/* Status bar accent */}
      <div className={cn(
        'absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
        track.operational_status === 'Active' ? 'bg-emerald-500' :
        track.operational_status === 'Seasonal' ? 'bg-amber-500' : 'bg-gray-600'
      )} />

      {/* Track Name + Location */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-100 truncate">{track.name}</span>
          <span className={cn(
            'shrink-0 inline-flex items-center px-1.5 py-px text-[9px] font-mono font-bold tracking-widest rounded border',
            status.color
          )}>
            {status.label}
          </span>
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{locationParts || '—'}</div>
      </div>

      {/* Surface + Type */}
      <div className="hidden sm:flex flex-col items-center w-14 shrink-0">
        <span className="text-[10px] font-mono text-gray-400 tracking-wider">{surfaceAbbrev}</span>
        <span className="text-[9px] text-gray-600 mt-0.5">{typeAbbrev}</span>
      </div>

      {/* Length */}
      <div className="hidden md:block w-12 shrink-0 text-center">
        <span className="text-xs font-mono text-gray-400">{lengthDisplay}</span>
      </div>

      {/* Last updated */}
      <div className="hidden lg:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-gray-600">{updatedDisplay}</span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => navigate(buildRaceCoreUrl({ orgType: 'track', orgId: track.id, tab: 'overview' }))}
          title="Open in Race Core Hub"
          className="p-1.5 rounded text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
        <button
          onClick={() => navigate('/race-core/tracks/' + track.id)}
          title="Edit record"
          className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
        {isAdmin && (
          <button
            onClick={() => onDelete(track)}
            disabled={isDeleting}
            title="Delete"
            className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}