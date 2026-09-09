import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Construction } from 'lucide-react';

/**
 * ManagementPlaceholder — one consistent lightweight placeholder for future
 * Management modules that do not yet have functionality.
 *
 * Props:
 *   purpose         — string, what this module is for
 *   status          — string, current state / what's being rebuilt
 *   managedSystems  — [{ name, description }], what this will eventually manage
 *   relatedLinks    — [{ label, to }], links to existing related tools
 *   notes           — optional ReactNode, free-form documentation block
 *
 * Never fake settings forms or entities. This component only communicates
 * architecture and intent.
 */
export default function ManagementPlaceholder({
  purpose,
  status,
  managedSystems = [],
  relatedLinks = [],
  notes,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-motion/20 bg-motion/5">
        <Construction className="w-5 h-5 text-motion mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Under Development</p>
          <p className="text-xs text-foreground-quiet mt-0.5 leading-snug">
            {status || 'This module is being rebuilt as part of the new Management system.'}
          </p>
        </div>
      </div>

      {purpose && (
        <div className="bg-surface-elevated border border-divider rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-2">Purpose</h3>
          <p className="text-sm text-foreground-secondary leading-relaxed">{purpose}</p>
        </div>
      )}

      {managedSystems.length > 0 && (
        <div className="bg-surface-elevated border border-divider rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Systems this will eventually manage</h3>
          <ul className="space-y-2">
            {managedSystems.map((s) => (
              <li key={s.name} className="text-sm">
                <span className="font-semibold text-foreground">{s.name}</span>
                <span className="text-foreground-quiet"> — {s.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes && (
        <div className="bg-surface-elevated border border-divider rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-2">Current state</h3>
          <div className="text-sm text-foreground-secondary leading-relaxed">{notes}</div>
        </div>
      )}

      {relatedLinks.length > 0 && (
        <div className="bg-surface-elevated border border-divider rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Related tools</h3>
          <div className="flex flex-col gap-2">
            {relatedLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="inline-flex items-center gap-1.5 text-sm text-motion hover:underline w-fit"
              >
                {l.label} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}