import React from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  AlertOctagon, Info, ShieldAlert, Database, Link2, Globe, FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// STATUS MODEL
// ═══════════════════════════════════════════════════════════════════════════
export const STATUSES = {
  PASS: { label: 'Pass', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  PARTIAL: { label: 'Partial', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  FAIL: { label: 'Fail', icon: XCircle, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30' },
  NOT_TESTABLE: { label: 'Not Testable', icon: MinusCircle, color: 'text-foreground-quiet', bg: 'bg-surface-interactive', border: 'border-divider' },
};

export function StatusBadge({ status, size = 'sm' }) {
  const config = STATUSES[status] || STATUSES.NOT_TESTABLE;
  const Icon = config.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-md border font-medium',
      config.bg, config.border, config.color,
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY MODEL (no scores, no grades)
// ═══════════════════════════════════════════════════════════════════════════
export const PRIORITIES = {
  BLOCKING: { label: 'Blocking', icon: AlertOctagon, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30' },
  NEEDS_ATTENTION: { label: 'Needs Attention', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  HEALTHY: { label: 'Healthy', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  INFORMATIONAL: { label: 'Informational', icon: Info, color: 'text-foreground-quiet', bg: 'bg-surface-interactive', border: 'border-divider' },
};

export function PriorityBadge({ priority, size = 'sm' }) {
  const config = PRIORITIES[priority] || PRIORITIES.INFORMATIONAL;
  const Icon = config.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-md border font-medium',
      config.bg, config.border, config.color,
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAILURE TYPE MODEL
// ═══════════════════════════════════════════════════════════════════════════
export const FAILURE_TYPES = {
  DATA_COVERAGE: { label: 'Data Coverage', icon: Database, color: 'text-danger', desc: 'No source records exist to answer this question' },
  PUBLIC_PRESENTATION: { label: 'Public Presentation', icon: Globe, color: 'text-warning', desc: 'Data exists but is not exposed in public HTML' },
  STRUCTURED_DATA: { label: 'Structured Data', icon: FileCode, color: 'text-warning', desc: 'Answer exists but JSON-LD is missing or incorrect' },
  INTERNAL_LINKING: { label: 'Internal Linking', icon: Link2, color: 'text-warning', desc: 'Answer and structured data exist but entity relationships are not linked' },
  CANONICAL_DISCOVERY: { label: 'Canonical / Discovery', icon: Globe, color: 'text-warning', desc: 'Canonical URL is missing, relative, or uses a legacy domain' },
  SEMANTIC_AMBIGUITY: { label: 'Semantic Ambiguity', icon: ShieldAlert, color: 'text-warning', desc: 'The data model does not reliably distinguish this concept' },
  SYSTEM_ERROR: { label: 'System Error', icon: AlertOctagon, color: 'text-danger', desc: 'The audit could not execute — distinct from missing data' },
  NONE: { label: 'None', icon: CheckCircle2, color: 'text-success', desc: 'No failure detected' },
};

export function FailureTypeBadge({ type, size = 'sm' }) {
  const config = FAILURE_TYPES[type] || FAILURE_TYPES.NONE;
  const Icon = config.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-md border font-medium',
      'bg-surface-interactive border-divider', config.color,
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════
export function SectionCard({ title, icon: Icon, children, action, className }) {
  return (
    <div className={cn('rounded-xl border border-divider bg-surface-elevated overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-foreground-quiet" />}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, sublabel, icon: Icon, priority }) {
  const pConfig = priority ? PRIORITIES[priority] : null;
  return (
    <div className="rounded-lg border border-divider bg-surface p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-foreground-quiet uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-foreground-quiet" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
        {pConfig && <PriorityBadge priority={priority} size="sm" />}
      </div>
      {sublabel && <p className="text-[11px] text-foreground-quiet mt-1">{sublabel}</p>}
    </div>
  );
}

export function CheckRow({ label, ok, detail }) {
  return (
    <div className="flex items-start gap-2 text-xs py-1">
      {ok === true && <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />}
      {ok === false && <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />}
      {ok === null && <MinusCircle className="w-3.5 h-3.5 text-foreground-quiet flex-shrink-0 mt-0.5" />}
      <div className="flex-1">
        <span className={ok === true ? 'text-foreground' : 'text-foreground-secondary'}>{label}</span>
        {detail && <span className="text-foreground-quiet ml-1">— {detail}</span>}
      </div>
    </div>
  );
}

export function EmptyDiagnostics({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MinusCircle className="w-8 h-8 text-foreground-quiet mb-2" />
      <p className="text-sm text-foreground-quiet">{message}</p>
    </div>
  );
}