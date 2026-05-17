import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink, Flag } from 'lucide-react';
import { buildRaceCoreUrl, getOrgContextFromEvent, getSeasonFromEvent } from '@/components/registrationdashboard/raceCoreLinks';
import RecordRowShell from '@/components/racecore/records/RecordRowShell';
import RecordStatusBadge from '@/components/racecore/records/RecordStatusBadge';
import { format } from 'date-fns';

// Mini acceptance dot — compact, no badge component needed
function AcceptanceDot({ value }) {
  if (!value) return <span className="text-[9px] font-mono text-gray-700">—</span>;
  const color =
    value === 'approved' || value === 'Accepted' ? 'bg-emerald-500' :
    value === 'rejected' || value === 'Rejected' ? 'bg-red-500' :
    'bg-amber-500';
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[9px] font-mono text-gray-500 truncate">{value}</span>
    </span>
  );
}

/**
 * EventRecordRow — tactical dense row for ManageEvents.
 *
 * Props:
 *   event        — Event entity
 *   isAdmin      — boolean
 *   isSelected   — boolean
 *   onSelect     — (id) => void
 *   onDelete     — (event) => void
 *   isDeleting   — boolean (for this specific event.id)
 */
export default function EventRecordRow({ event, isAdmin, isSelected, onSelect, onDelete, isDeleting }) {
  const navigate = useNavigate();

  const dateDisplay = event.event_date
    ? format(new Date(event.event_date + 'T12:00:00'), 'MMM d, yy')
    : 'TBA';
  const endDisplay = event.end_date && event.end_date !== event.event_date
    ? ' – ' + format(new Date(event.end_date + 'T12:00:00'), 'MMM d')
    : '';

  const updatedDisplay = event.updated_date
    ? format(new Date(event.updated_date), 'MMM d, yy')
    : '—';

  const actions = (
    <>
      {/* EventFile ops link */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate('/race-control/events/' + event.id); }}
        title="Open Event File (Ops)"
        aria-label={`Open ${event.name} in EventFile`}
        className="p-1.5 rounded text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
      >
        <Flag className="w-3 h-3" />
      </button>

      {/* Race Core Hub link — preserve exact buildRaceCoreUrl call */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const { orgType, orgId } = getOrgContextFromEvent(event);
          const seasonYear = getSeasonFromEvent(event);
          navigate(buildRaceCoreUrl({ orgType, orgId, seasonYear, eventId: event.id, tab: 'overview' }));
        }}
        title="Open in Race Core Ops"
        aria-label={`Open ${event.name} in Race Core`}
        className="p-1.5 rounded text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
      </button>

      {/* Edit → canonical editor */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate('/race-core/events/' + event.id); }}
        title="Edit record"
        aria-label={`Edit ${event.name}`}
        className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
      >
        <Pencil className="w-3 h-3" />
      </button>

      {/* Delete (admin only) */}
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          disabled={isDeleting}
          title="Delete"
          aria-label={`Delete ${event.name}`}
          className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </>
  );

  return (
    <RecordRowShell
      id={event.id}
      status={event.status}
      isAdmin={isAdmin}
      isSelected={isSelected}
      onSelect={onSelect}
      onClick={() => navigate('/race-core/events/' + event.id)}
      actions={actions}
      label={event.name}
    >
      {/* Identity block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-100 truncate">{event.name}</span>
          <RecordStatusBadge status={event.status} />
          {event.published_flag && (
            <RecordStatusBadge status="live" />
          )}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {event.series_name || '—'}
        </div>
      </div>

      {/* Date */}
      <div className="hidden sm:block w-24 shrink-0">
        <span className="text-[10px] font-mono text-gray-400">{dateDisplay}{endDisplay}</span>
      </div>

      {/* Acceptance status */}
      <div className="hidden md:flex flex-col w-20 shrink-0 gap-0.5">
        <AcceptanceDot value={event.track_acceptance_status} />
        <AcceptanceDot value={event.series_acceptance_status} />
      </div>

      {/* Season */}
      <div className="hidden lg:block w-12 shrink-0 text-center">
        <span className="text-[10px] font-mono text-gray-600">{event.season || '—'}</span>
      </div>

      {/* Updated */}
      <div className="hidden xl:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-gray-600">{updatedDisplay}</span>
      </div>
    </RecordRowShell>
  );
}