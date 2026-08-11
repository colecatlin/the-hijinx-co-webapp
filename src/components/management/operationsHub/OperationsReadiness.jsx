import React from 'react';
import { Rocket, CheckCircle2 } from 'lucide-react';

/**
 * OperationsReadiness — Friends & Family release readiness banner.
 * Static card reflecting Sprint 1F certification status.
 */
export default function OperationsReadiness() {
  const checks = [
    'Test data archived',
    'Real entities live',
    'Claims operational',
    'Directories clean',
    'Search clean',
    'Admin tools protected',
  ];

  return (
    <div className="bg-gradient-to-br from-motion/10 to-surface-elevated border border-motion/20 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-motion/15 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-motion" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Release Candidate</h3>
          <p className="text-xs text-foreground-quiet">Friends &amp; Family certification</p>
        </div>
        <span className="ml-auto text-[10px] font-mono font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg">
          CERTIFIED
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {checks.map((check) => (
          <div key={check} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
            <span className="text-[11px] text-foreground-secondary">{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
}