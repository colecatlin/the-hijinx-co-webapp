import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
import RecordRowShell from '@/components/racecore/records/RecordRowShell';
import RecordStatusBadge from '@/components/racecore/records/RecordStatusBadge';

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

export default function TrackRecordRow({ track, isAdmin, isSelected, onSelect, onDelete, isDeleting, onEdit }) {
  const navigate = useNavigate();

  const surfaceAbbrev = SURFACE_ABBREV[track.surface_type] || track.surface_type || '—';
  const typeAbbrev    = TYPE_ABBREV[track.track_type]   || track.track_type || '—';
  const locationParts = [track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ');
  const lengthDisplay = track.length ? `${track.length}mi` : '—';
  const updatedDisplay = track.updated_date
    ? new Date(track.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—';

  const actions = (
    <>
      <button
        onClick={() => navigate(buildRaceCoreUrl({ orgType: 'track', orgId: track.id, tab: 'overview' }))}
        title="Open in Race Core Hub"
        aria-label={`Open ${track.name} in Race Core Hub`}
        className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>
      <button
        onClick={() => onEdit ? onEdit(track.id) : navigate('/racecore/tracks/' + track.id)}
        title="Edit record"
        aria-label={`Edit ${track.name}`}
        className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>
      {isAdmin && (
        <button
          onClick={() => onDelete(track)}
          disabled={isDeleting}
          title="Delete"
          aria-label={`Delete ${track.name}`}
          className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <RecordRowShell
      id={track.id}
      status={track.operational_status}
      isAdmin={isAdmin}
      isSelected={isSelected}
      onSelect={onSelect}
      onClick={() => onEdit ? onEdit(track.id) : navigate('/racecore/tracks/' + track.id)}
      actions={actions}
      label={track.name}
    >
      {/* Identity block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-100 truncate">{track.name}</span>
          <RecordStatusBadge status={track.operational_status} />
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

      {/* Updated */}
      <div className="hidden lg:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-gray-600">{updatedDisplay}</span>
      </div>
    </RecordRowShell>
  );
}