import React from 'react';

/**
 * RacerCurrentProgram — the racer's current racing context.
 *
 * Reads the server-computed current_context (canonical SeasonParticipation,
 * falling back to DriverProgram and then the legacy driver record). No
 * client-side resolution and no data-source labelling: the public page states
 * the racing facts, not how they were assembled.
 */
export default function RacerCurrentProgram({ currentContext }) {
  if (!currentContext) return null;

  const { series, class: racerClass, team, car_number: carNumber, vehicle, participations = [] } = currentContext;

  const facts = [
    series?.name && { label: 'Series', value: series.name },
    racerClass?.name && { label: 'Class', value: racerClass.name },
    team?.name && { label: 'Team', value: team.name },
    carNumber && { label: 'Car Number', value: `#${carNumber}` },
    vehicle?.name && { label: 'Vehicle', value: vehicle.name },
  ].filter(Boolean);

  if (facts.length === 0 && participations.length === 0) return null;

  return (
    <div>
      {facts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
          {facts.map((fact) => (
            <div key={fact.label} className="border-t border-divider pt-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-foreground-quiet">{fact.label}</div>
              <div className="mt-1.5 text-base font-semibold text-foreground">{fact.value}</div>
            </div>
          ))}
        </div>
      )}

      {participations.length > 1 && (
        <div className="mt-8 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-foreground-quiet">Active Entries</div>
          {participations.map((participation) => (
            <div
              key={participation.id}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-divider py-2.5 last:border-0"
            >
              <span className="font-mono text-xs text-motion">{participation.season_year || ''}</span>
              <span className="text-sm font-semibold text-foreground">{participation.series_name || '—'}</span>
              {participation.class_name && (
                <span className="text-xs text-foreground-secondary">{participation.class_name}</span>
              )}
              {participation.team_name && (
                <span className="text-xs text-foreground-secondary">{participation.team_name}</span>
              )}
              {participation.car_number && (
                <span className="ml-auto font-mono text-xs text-foreground-quiet">#{participation.car_number}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}