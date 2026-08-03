import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
import RecordRowShell from '@/components/racecore/records/RecordRowShell';
import RecordStatusBadge from '@/components/racecore/records/RecordStatusBadge';

const DISCIPLINE_ABBREV = {
  'Stock Car':    'STK',
  'Open Wheel':   'OW',
  'Sports Car':   'SC',
  'Touring Car':  'TC',
  'Off Road':     'OFF',
  'Dirt Oval':    'DO',
  'Rally':        'RLY',
  'Rallycross':   'RX',
  'Drift':        'DFT',
  'Drag Racing':  'DRG',
  'Motorcycle':   'MTO',
  'Karting':      'KRT',
  'Snowmobile':   'SNO',
  'Watercraft':   'WTR',
  'Aviation':     'AVI',
  'Alternative':  'ALT',
};

const LEVEL_ABBREV = {
  'Local':         'LCL',
  'Regional':      'REG',
  'National':      'NAT',
  'International': 'INTL',
};

export default function TeamRecordRow({ team, isAdmin, isSelected, onSelect, onDelete, isDeleting, onEdit }) {
  const navigate = useNavigate();

  const locationParts = [team.headquarters_city, team.headquarters_state, team.country].filter(Boolean).join(', ');
  const disciplineDisplay = DISCIPLINE_ABBREV[team.primary_discipline] || team.primary_discipline || '—';
  const levelDisplay = LEVEL_ABBREV[team.team_level] || team.team_level || '—';
  const updatedDisplay = team.updated_date
    ? new Date(team.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—';

  const actions = (
    <>
      <button
        onClick={() => navigate(buildRaceCoreUrl({ tab: 'entries', focusTeamId: team.id }))}
        title="Open in Race Core Hub"
        aria-label={`Open ${team.name} in Race Core Hub`}
        className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>
      <button
        onClick={() => onEdit ? onEdit(team.id) : navigate('/racecore/teams/' + team.id)}
        title="Edit record"
        aria-label={`Edit ${team.name}`}
        className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>
      {isAdmin && (
        <button
          onClick={() => onDelete(team)}
          disabled={isDeleting}
          title="Delete"
          aria-label={`Delete ${team.name}`}
          className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <RecordRowShell
      id={team.id}
      status={team.racing_status}
      isAdmin={isAdmin}
      isSelected={isSelected}
      onSelect={onSelect}
      onClick={() => onEdit ? onEdit(team.id) : navigate('/racecore/teams/' + team.id)}
      actions={actions}
      label={team.name}
    >
      {/* Identity block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{team.name}</span>
          <RecordStatusBadge status={team.racing_status} variant="operational" />
          {team.visibility_status && (
            <RecordStatusBadge status={team.visibility_status} variant="visibility" />
          )}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{locationParts || '—'}</div>
      </div>

      {/* Discipline */}
      <div className="hidden sm:block w-16 shrink-0 text-center">
        <span className="text-[10px] font-mono text-gray-400 tracking-wider">{disciplineDisplay}</span>
      </div>

      {/* Level */}
      <div className="hidden md:block w-12 shrink-0 text-center">
        <span className="text-[10px] font-mono text-gray-500">{levelDisplay}</span>
      </div>

      {/* Updated */}
      <div className="hidden lg:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-gray-600">{updatedDisplay}</span>
      </div>
    </RecordRowShell>
  );
}