import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldCheck, Wrench, Calculator, UserCheck, FileText } from 'lucide-react';

export default function RacerHealthActions({ busy, onAudit, onDryRun, onApply, onRecalculate }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-divider bg-surface p-3">
      <Button variant="outline" size="sm" disabled={busy} onClick={onAudit}>
        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
        Run Relationship Audit
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={onDryRun}>
        <Wrench className="mr-1.5 h-3.5 w-3.5" />
        Run Dry-Run Repair
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={onApply}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Apply Approved Repair
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={onRecalculate}>
        <Calculator className="mr-1.5 h-3.5 w-3.5" />
        Recalculate Career Stats
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/racecore/identity-review">
          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          Review Identity Matches
        </Link>
      </Button>
      <span className="flex items-center gap-1.5 px-2 text-[11px] text-foreground-quiet">
        <FileText className="h-3.5 w-3.5" />
        Review Draft Profiles below — publication is always an explicit action.
      </span>
      {busy && <span className="text-[11px] font-semibold text-motion">WORKING…</span>}
    </div>
  );
}