import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import RecordRowShell from '@/components/racecore/records/RecordRowShell';

/**
 * StandingRecordRow — tactical read-only standings row.
 * Pattern: DriverRecordRow / EventRecordRow.
 * No mutations. Driver profile link only.
 *
 * Props:
 *   standing   — Standings entity object
 *   driver     — Driver entity object (may be undefined)
 *   index      — 0-based array index (fallback rank display)
 */
export default function StandingRecordRow({ standing, driver, index }) {
  // Canonical rank: position ?? rank ?? index + 1
  const displayRank = standing.position ?? standing.rank ?? index + 1;

  const fullName = driver
    ? [driver.first_name, driver.last_name].filter(Boolean).join(' ')
    : standing.driver_name || '—';

  const hometown = driver
    ? [driver.hometown_city, driver.hometown_state].filter(Boolean).join(', ')
    : null;

  const updatedDisplay = standing.last_calculated
    ? new Date(standing.last_calculated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : standing.updated_date
      ? new Date(standing.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
      : '—';

  const driverProfilePath = driver?.slug
    ? `/drivers/${driver.slug}`
    : driver?.id
      ? `/race-core/drivers/${driver.id}`
      : null;

  const actions = driverProfilePath ? (
    <Link
      to={driverProfilePath}
      onClick={e => e.stopPropagation()}
      title={`View ${fullName} profile`}
      aria-label={`View ${fullName} profile`}
      className="p-2 sm:p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded transition-colors text-foreground-quiet hover:text-motion hover:bg-motion/10"
    >
      <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
    </Link>
  ) : null;

  return (
    <RecordRowShell
      id={standing.id}
      status={null}
      isAdmin={false}
      label={fullName}
      actions={actions}
    >
      {/* Rank */}
      <div className="w-8 sm:w-10 shrink-0 text-center">
        <span className="text-sm font-black font-mono text-foreground tabular-nums">{displayRank}</span>
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{fullName}</div>
        {hometown && (
          <div className="text-[10px] text-foreground-quiet truncate mt-0.5">{hometown}</div>
        )}
      </div>

      {/* Points — always visible */}
      <div className="shrink-0 w-16 text-right">
        <span className="text-sm font-black font-mono text-foreground tabular-nums">
          {standing.points_total ?? 0}
        </span>
        <div className="text-[9px] font-mono text-foreground-quiet uppercase tracking-wider">pts</div>
      </div>

      {/* Wins / Podiums / Starts — hidden on mobile */}
      <div className="hidden sm:flex shrink-0 gap-3">
        <div className="w-8 text-center">
          <span className="text-xs font-mono text-foreground-secondary tabular-nums">{standing.wins ?? 0}</span>
          <div className="text-[8px] font-mono text-foreground-quiet uppercase tracking-wider">W</div>
        </div>
        <div className="hidden md:block w-8 text-center">
          <span className="text-xs font-mono text-foreground-secondary tabular-nums">{standing.podiums ?? 0}</span>
          <div className="text-[8px] font-mono text-foreground-quiet uppercase tracking-wider">Pod</div>
        </div>
        <div className="hidden md:block w-8 text-center">
          <span className="text-xs font-mono text-foreground-secondary tabular-nums">{standing.starts ?? 0}</span>
          <div className="text-[8px] font-mono text-foreground-quiet uppercase tracking-wider">Sts</div>
        </div>
      </div>

      {/* Updated — large screens only */}
      <div className="hidden lg:block w-20 shrink-0 text-right">
        <span className="text-[10px] font-mono text-foreground-quiet">{updatedDisplay}</span>
      </div>
    </RecordRowShell>
  );
}