import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink, Flag } from 'lucide-react';
import { buildRaceCoreUrl, getOrgContextFromEvent, getSeasonFromEvent } from '@/components/registrationdashboard/raceCoreLinks';
import RecordRowShell from '@/components/racecore/records/RecordRowShell';
import RecordStatusBadge from '@/components/racecore/records/RecordStatusBadge';
import { format } from 'date-fns';

// Mini acceptance dot — compact, no badge component needed
function AcceptanceDot({ value }) {
  if (!value) return <span className="text-[9px] font-mono text-foreground-quiet">—</span>;
  const color =
    value === 'approved' || value === 'Accepted' ? 'bg-emerald-500' :
    value === 'rejected' || value === 'Rejected' ? 'bg-red-500' :
    'bg-amber-500';
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[9px] font-mono text-foreground-quiet truncate">{value}</span>
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

  // Date-aware display status. LIVE only on the actual event day(s);
  // UPCOMING before, DONE after. Replaces the legacy "live/published" duo
  // that rendered two identical LIVE badges side-by-side.
  const displayStatus = useMemo(() => {
    if (event.event_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start = new Date(event.event_date + 'T00:00:00'); start.setHours(0, 0, 0, 0);
      const endRaw = event.end_date || event.event_date;
      const end = new Date(endRaw + 'T23:59:59'); end.setHours(23, 59, 59, 999);
      if (today < start) return 'Upcoming';
      if (today > end) return 'Completed';
      return 'Live'; // event day(s)
    }
    return event.status || 'Draft';
  }, [event.event_date, event.end_date, event.status]);

  const updatedDisplay = event.updated_date
    ? format(new Date(event.updated_date), 'MMM d, yy')
    : '—';

  const btnBase = 'p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded transition-colors';

  const actions = (
    <>
      {/* EventFile ops link */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate('/racecore/event-files/' + event.id); }}
        title="Open Event File (Ops)"
        aria-label={`Open ${event.name} in EventFile`}
        className={`${btnBase} text-foreground-quiet hover:text-motion hover:bg-motion/10`}
      >
        <Flag className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
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
        className={`${btnBase} text-foreground-quiet hover:text-motion hover:bg-motion/10`}
      >
        <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>

      {/* Edit → Event File settings panel */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate('/racecore/event-files/' + event.id + '/settings'); }}
        title="Edit event settings"
        aria-label={`Edit ${event.name} settings`}
        className={`${btnBase} text-foreground-quiet hover:text-foreground hover:bg-surface-interactive`}
      >
        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
      </button>

      {/* Delete (admin only) */}
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          disabled={isDeleting}
          title="Delete"
          aria-label={`Delete ${event.name}`}
          className={`${btnBase} text-foreground-quiet hover:text-danger hover:bg-danger/10 disabled:opacity-40`}
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
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
      onClick={() => navigate('/racecore/event-files/' + event.id)}
      actions={actions}
      label={event.name}
    >
      {/* Identity block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">{event.name}</span>
          <RecordStatusBadge status={displayStatus} />
        </div>
        <div className="text-xs text-foreground-quiet truncate mt-0.5">
          {event.series_name || '—'}
        </div>
      </div>

      {/* Date */}
      <div className="hidden sm:block w-24 shrink-0">
        <span className="text-[10px] font-mono text-foreground-quiet">{dateDisplay}{endDisplay}</span>
      </div>

      {/* Acceptance status */}
      <div className="hidden md:flex flex-col w-20 shrink-0 gap-0.5">
        <AcceptanceDot value={event.track_acceptance_status} />
        <AcceptanceDot value={event.series_acceptance_status} />
      </div>

      {/* Season */}
      <div className="hidden lg:block w-12 shrink-0 text-center">
        <span className="text-[10px] font-mono text-foreground-quiet">{event.season || '—'}</span>
      </div>

      {/* Updated */}
      <div className="hidden xl:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-foreground-quiet">{updatedDisplay}</span>
      </div>
    </RecordRowShell>
  );
}