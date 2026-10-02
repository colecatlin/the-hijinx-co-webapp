import React from 'react';

const OUTCOME_STYLE = {
  REPAIRED: 'text-success',
  ALREADY_VALID: 'text-foreground-quiet',
  REVIEW_REQUIRED: 'text-warning',
  MISSING_RACER_PROFILE: 'text-danger',
  AMBIGUOUS_RACER_PROFILE: 'text-danger',
  MISSING_CANONICAL_DRIVER: 'text-warning',
  MISSING_PERSON_IDENTITY: 'text-warning',
  SKIPPED: 'text-foreground-quiet',
  ERROR: 'text-danger',
};

export default function RacerRepairReport({ report }) {
  if (!report) return null;
  const entries = Object.entries(report.counts || {});
  const shown = (report.actions || []).filter((a) => a.outcome !== 'ALREADY_VALID').slice(0, 200);

  return (
    <div className="rounded-xl border border-divider bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          {report.dry_run ? 'Dry-run report — nothing was written' : 'Applied repair'}
        </h3>
        <span className="text-[11px] text-foreground-quiet">
          {report.dry_run ? `${report.actions?.length || 0} records examined` : `${report.applied} changes applied`} ·{' '}
          {report.review_required} need review
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(([outcome, count]) => (
          <span
            key={outcome}
            className={`rounded-lg border border-divider bg-surface-elevated px-2.5 py-1 text-[11px] font-semibold ${OUTCOME_STYLE[outcome] || 'text-foreground-secondary'}`}
          >
            {outcome.replace(/_/g, ' ')} · {count}
          </span>
        ))}
      </div>

      {shown.length > 0 && (
        <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-divider">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-elevated text-[10px] uppercase tracking-[0.12em] text-foreground-quiet">
              <tr>
                <th className="px-3 py-2">Phase</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((action, index) => (
                <tr key={`${action.entity}-${action.id}-${index}`} className="border-t border-divider/60">
                  <td className="px-3 py-2 text-foreground-quiet">{action.phase.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-foreground-secondary">
                    {action.entity}
                    <span className="ml-1 text-foreground-quiet">{String(action.id).slice(-6)}</span>
                  </td>
                  <td className={`px-3 py-2 font-semibold ${OUTCOME_STYLE[action.outcome] || 'text-foreground-secondary'}`}>
                    {action.outcome.replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2 text-foreground-secondary">{action.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] text-foreground-quiet">
        Repair never deletes, never guesses and never fabricates a Driver to satisfy a field. Reviewed records stay
        untouched until their relationship can be proven.
      </p>
    </div>
  );
}