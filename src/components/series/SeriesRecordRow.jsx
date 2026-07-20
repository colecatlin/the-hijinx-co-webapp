import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
import RecordRowShell from '@/components/racecore/records/RecordRowShell';
import RecordStatusBadge from '@/components/racecore/records/RecordStatusBadge';

const DISCIPLINE_ABBREV = {
  'Stock Car':    'STK',
  'Off Road':     'OFF',
  'Dirt Oval':    'DO',
  'Snowmobile':   'SNO',
  'Dirt Bike':    'DB',
  'Open Wheel':   'OW',
  'Sports Car':   'SC',
  'Touring Car':  'TC',
  'Rally':        'RLY',
  'Drag':         'DRG',
  'Motorcycle':   'MTO',
  'Karting':      'KRT',
  'Water':        'WTR',
  'Alternative':  'ALT',
};

export default function SeriesRecordRow({ series, isAdmin, isSelected, onSelect, onDelete, isDeleting, onEdit }) {
  const navigate = useNavigate();

  const disciplineDisplay = DISCIPLINE_ABBREV[series.discipline] || series.discipline || '—';
  const sanctioningBody   = series.sanctioning_body || '—';
  const seasonYear        = series.season_year || '—';
  const updatedDisplay    = series.updated_date
    ? new Date(series.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—';

  const actions = (
    <>
      <button
        onClick={() => navigate(buildRaceCoreUrl({ orgType: 'series', orgId: series.id, tab: 'overview' }))}
        title="Open in Race Core Hub"
        aria-label={`Open ${series.name} in Race Core Hub`}
        className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>
      <button
        onClick={() => onEdit ? onEdit(series.id) : navigate('/racecore/series/' + series.id)}
        title="Edit record"
        aria-label={`Edit ${series.name}`}
        className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>
      {isAdmin && (
        <button
          onClick={() => onDelete(series.id)}
          disabled={isDeleting}
          title="Delete"
          aria-label={`Delete ${series.name}`}
          className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <RecordRowShell
      id={series.id}
      status={series.operational_status}
      isAdmin={isAdmin}
      isSelected={isSelected}
      onSelect={onSelect}
      onClick={() => onEdit ? onEdit(series.id) : navigate('/racecore/series/' + series.id)}
      actions={actions}
      label={series.name}
    >
      {/* Identity block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-100 truncate">{series.name}</span>
          <RecordStatusBadge status={series.operational_status} />
          {series.visibility_status && (
            <RecordStatusBadge status={series.visibility_status} />
          )}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{sanctioningBody}</div>
      </div>

      {/* Discipline */}
      <div className="hidden sm:block w-12 shrink-0 text-center">
        <span className="text-[10px] font-mono text-gray-400 tracking-wider">{disciplineDisplay}</span>
      </div>

      {/* Season */}
      <div className="hidden md:block w-16 shrink-0 text-center">
        <span className="text-[10px] font-mono text-gray-500">{seasonYear}</span>
      </div>

      {/* Updated */}
      <div className="hidden lg:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-gray-600">{updatedDisplay}</span>
      </div>
    </RecordRowShell>
  );
}