import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SectionCard, PriorityBadge } from './shared';

export default function WinnerSemanticsWarning() {
  return (
    <SectionCard title="Winner Semantics" icon={ShieldAlert}>
      <div className="flex items-start gap-3">
        <PriorityBadge priority="NEEDS_ATTENTION" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Semantic Ambiguity</p>
          <p className="text-xs text-foreground-secondary mt-1">
            The current competition data model does not reliably distinguish every winner type.
            This is a data-model semantics issue, not a public SEO problem.
          </p>
          <div className="mt-2 rounded-lg border border-divider bg-surface-interactive px-3 py-2">
            <p className="text-[11px] font-semibold text-foreground-quiet uppercase tracking-wide mb-1">Potentially affected questions:</p>
            <ul className="text-xs text-foreground-secondary space-y-0.5">
              <li>• Who won the round?</li>
              <li>• Who won the event?</li>
              <li>• Who won the championship?</li>
              <li>• Who won the World Championship?</li>
              <li>• Who won the Cup?</li>
            </ul>
          </div>
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-foreground-quiet uppercase tracking-wide mb-1">Action note (RaceCore — future work):</p>
            <p className="text-xs text-foreground-quiet">
              Add <code className="text-motion">championship_type</code> enum to Series/PointsConfig and <code className="text-motion">round_winner_id</code> to Event/Session.
              This is RaceCore architecture work — do NOT modify from Management.
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}