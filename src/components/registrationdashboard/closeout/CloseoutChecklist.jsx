/**
 * R9CQ — CloseoutChecklist
 * Renders the event closeout checklist items compactly.
 */
import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function CloseoutChecklist({ items }) {
  return (
    <div className="space-y-0.5">
      {items.map(item => {
        const isPass = item.passed;
        const isBlocker = item.is_blocker;
        const rowBg = isPass
          ? 'border-green-800/30 bg-green-950/10'
          : isBlocker
            ? 'border-red-800/30 bg-red-950/10'
            : 'border-amber-800/30 bg-amber-950/10';

        const Icon = isPass ? CheckCircle2 : isBlocker ? XCircle : AlertTriangle;
        const iconColor = isPass ? 'text-green-400' : isBlocker ? 'text-red-400' : 'text-amber-400';

        return (
          <div
            key={item.id}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded border ${rowBg}`}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
            <span className={`text-[11px] flex-1 ${isPass ? 'text-gray-400 line-through' : isBlocker ? 'text-red-200' : 'text-amber-200'}`}>
              {item.label}
            </span>
            {!isPass && (
              <span className={`text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${isBlocker ? 'text-red-400' : 'text-amber-400'}`}>
                {isBlocker ? 'Blocks' : 'Warning'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}