import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

/**
 * SectionPanel — consistent collapsible management panel for Home sections.
 *
 * Header: title, status indicator, enabled toggle, collapse/expand.
 * Body: children (CONTENT / MEDIA / CTA / DATA / DISPLAY / SCHEDULE subsections).
 */
export default function SectionPanel({
  title,
  enabled = true,
  onEnabledChange,
  isOpen: controlledOpen,
  children,
  rightSlot,
}) {
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const toggle = () => (controlledOpen !== undefined ? null : setInternalOpen(!internalOpen));

  return (
    <div className="rounded-xl border border-divider bg-surface-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={toggle}>
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4 text-foreground-quiet" /> : <ChevronRight className="w-4 h-4 text-foreground-quiet" />}
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <Badge variant={enabled ? 'default' : 'secondary'} className="text-[9px] uppercase tracking-wider">
            {enabled ? 'On' : 'Off'}
          </Badge>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {rightSlot}
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-quiet">Enabled</span>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} />
          </div>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-divider">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * SubSection — labeled group within a section panel (CONTENT, MEDIA, CTA, etc.)
 */
export function SubSection({ label, children }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground-quiet font-bold">{label}</p>
      {children}
    </div>
  );
}