/**
 * R9CQ — SessionResultsStatusStrip
 * Shows result count + status badge per session.
 * Compact, horizontal strip for Results panel header.
 */
import React from 'react';
import { CheckCircle2, AlertTriangle, Lock, Clock } from 'lucide-react';

const STATE_CONFIG = {
  Draft:       { label: 'Draft',       color: 'text-gray-400', Icon: Clock },
  Provisional: { label: 'Provisional', color: 'text-amber-300', Icon: AlertTriangle },
  Official:    { label: 'Official',    color: 'text-green-300', Icon: CheckCircle2 },
  Locked:      { label: 'Locked',      color: 'text-teal-300',  Icon: Lock },
};

export default function SessionResultsStatusStrip({ sessions = [], results = [], onSelectSession, activeSessionId }) {
  if (sessions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {sessions.map(session => {
        const sessionResults = results.filter(r => r.session_id === session.id);
        const count = sessionResults.length;
        const states = [...new Set(sessionResults.map(r => r.status_state || 'Draft'))];
        const dominantState = states.includes('Locked') ? 'Locked'
          : states.includes('Official') ? 'Official'
          : states.includes('Provisional') ? 'Provisional'
          : 'Draft';
        const cfg = STATE_CONFIG[dominantState] || STATE_CONFIG.Draft;
        const Icon = cfg.Icon;
        const isActive = activeSessionId === session.id;

        return (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] transition-all ${
              isActive
                ? 'bg-white/[0.08] border-teal-600/50 text-white'
                : 'bg-white/[0.03] border-white/[0.07] text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
            }`}
          >
            <Icon className={`w-3 h-3 ${isActive ? cfg.color : 'text-gray-600'}`} />
            <span className="font-medium truncate max-w-[100px]">{session.name}</span>
            {count > 0 && (
              <span className={`text-[10px] font-semibold ${isActive ? cfg.color : 'text-gray-600'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}