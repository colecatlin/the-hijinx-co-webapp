import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
import RecordRowShell from '@/components/racecore/records/RecordRowShell';
import RecordStatusBadge from '@/components/racecore/records/RecordStatusBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DISCIPLINE_ABBREV = {
  'Off Road':     'OFF RD',
  'Snowmobile':   'SNOW',
  'Asphalt Oval': 'OVL',
  'Road Racing':  'RD RC',
  'Rallycross':   'RLX',
  'Drag Racing':  'DRAG',
  'Mixed':        'MIX',
};

/**
 * DriverRecordRow — tactical dense row for ManageDrivers.
 *
 * Props:
 *   driver                   — Driver entity object
 *   isAdmin                  — boolean
 *   isSelected               — boolean
 *   onSelect                 — (id) => void
 *   onDelete                 — (driver) => void
 *   isDeleting               — boolean
 *   onToggleVisibility       — ({ id, visibility_status }) => void  (toggleProfileStatusMutation)
 *   getProfileReadiness      — (driver) => { isReady, missing }
 */
export default function DriverRecordRow({
  driver,
  isAdmin,
  isSelected,
  onSelect,
  onDelete,
  isDeleting,
  onToggleVisibility,
  getProfileReadiness,
  onEdit,
}) {
  const navigate = useNavigate();

  const fullName = [driver.first_name, driver.last_name].filter(Boolean).join(' ') || '—';
  const locationParts = [driver.hometown_city, driver.hometown_state].filter(Boolean).join(', ');
  const disciplineAbbrev = DISCIPLINE_ABBREV[driver.primary_discipline] || driver.primary_discipline || '—';
  const isLive = driver.visibility_status === 'live';
  const updatedDisplay = driver.updated_date
    ? new Date(driver.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—';

  const { isReady, missing } = getProfileReadiness(driver);

  const btnBase = 'p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded transition-colors';

  const actions = (
    <TooltipProvider>
      {/* Visibility toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isReady && !isLive) return;
              onToggleVisibility({ id: driver.id, visibility_status: isLive ? 'draft' : 'live' });
            }}
            aria-label={isLive ? 'Set profile to draft' : 'Set profile to live'}
            className={`${btnBase} ${
              isLive
                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10'
                : isReady
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
                : 'text-gray-700 cursor-not-allowed'
            }`}
          >
            {isLive ? <Eye className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" /> : <EyeOff className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          {isLive
            ? 'Live — click to set draft'
            : isReady
            ? 'Ready — click to go live'
            : `Not ready. Missing: ${missing.join(', ')}`}
        </TooltipContent>
      </Tooltip>

      {/* Open in Race Core hub */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate(buildRaceCoreUrl({ tab: 'entries', focusDriverId: driver.id })); }}
        title="Open in Race Core Hub"
        aria-label={`Open ${fullName} in Race Core Hub`}
        className={`${btnBase} text-gray-500 hover:text-teal-400 hover:bg-teal-400/10`}
      >
        <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>

      {/* Edit */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit ? onEdit(driver.id) : navigate('/racecore/drivers/' + driver.id); }}
        title="Edit driver record"
        aria-label={`Edit ${fullName}`}
        className={`${btnBase} text-gray-500 hover:text-gray-200 hover:bg-gray-700/60`}
      >
        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>

      {/* Delete (admin only) */}
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(driver); }}
          disabled={isDeleting}
          title="Delete"
          aria-label={`Delete ${fullName}`}
          className={`${btnBase} text-gray-600 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40`}
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
        </button>
      )}
    </TooltipProvider>
  );

  return (
    <RecordRowShell
      id={driver.id}
      status={driver.racing_status}
      isAdmin={isAdmin}
      isSelected={isSelected}
      onSelect={onSelect}
      onClick={() => onEdit ? onEdit(driver.id) : navigate('/racecore/drivers/' + driver.id)}
      actions={actions}
      label={fullName}
    >
      {/* Identity block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-100 truncate">{fullName}</span>
          {driver.primary_number && (
            <span className="text-[9px] font-mono text-gray-600">#{driver.primary_number}</span>
          )}
          <RecordStatusBadge status={driver.racing_status} />
          <RecordStatusBadge status={driver.visibility_status} />
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{locationParts || '—'}</div>
      </div>

      {/* Discipline */}
      <div className="hidden sm:block w-16 shrink-0 text-center">
        <span className="text-[10px] font-mono text-gray-400 tracking-wider">{disciplineAbbrev}</span>
      </div>

      {/* Career status */}
      <div className="hidden md:block w-16 shrink-0 text-center">
        {driver.career_status
          ? <RecordStatusBadge status={driver.career_status} />
          : <span className="text-[9px] font-mono text-gray-700">—</span>}
      </div>

      {/* Updated */}
      <div className="hidden lg:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-gray-600">{updatedDisplay}</span>
      </div>
    </RecordRowShell>
  );
}