/**
 * REVISION 5E — SessionCard
 * Compact session card with operational state, round awareness,
 * dependency warnings, and standings visibility.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Copy, History, ChevronDown, ChevronUp, AlertTriangle, Trophy } from 'lucide-react';
import {
  deriveSessionOperationalState,
  deriveSessionDependencyWarnings,
  deriveStandingsTag,
  SESSION_STATE_CONFIG,
  STANDINGS_TAG_CONFIG,
} from './sessionStateIntelligence';
import { getSessionDisplayLabel, isScoringSession } from './sessionOrdering';

export default function SessionCard({
  session,
  sessionResults,
  allSessions,
  seriesClasses,
  eventClasses,
  onSelectSession,
  isSelected,
}) {
  const [expanded, setExpanded] = useState(false);

  const state = deriveSessionOperationalState(session, sessionResults);
  const stateConfig = SESSION_STATE_CONFIG[state];
  const warnings = deriveSessionDependencyWarnings(session, allSessions, sessionResults);
  const standingsTag = deriveStandingsTag(session, sessionResults);
  const standingsConfig = STANDINGS_TAG_CONFIG[standingsTag];
  const scoring = isScoringSession(session);

  const displayLabel = getSessionDisplayLabel(session, seriesClasses, eventClasses);

  // Time display
  const timeStr = session.scheduled_time
    ? new Date(session.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  return (
    <div
      className={`rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-[#1e2a1e] border-green-700'
          : 'bg-[#1a1a1a] border-gray-700 hover:border-gray-500'
      }`}
      onClick={() => onSelectSession && onSelectSession(session.id)}
    >
      <div className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-start gap-2">
          {/* State dot */}
          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${stateConfig.dot}`} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">{displayLabel}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {timeStr && <span className="text-xs text-gray-500">{timeStr}</span>}
              {/* Part 5 + 7 — scoring indicator */}
              {scoring ? (
                <span className="flex items-center gap-0.5 text-xs text-amber-400 font-medium">
                  <Trophy className="w-2.5 h-2.5" /> Scores
                </span>
              ) : (
                <span className="text-xs text-gray-600">⚪ Non-scoring</span>
              )}
              {session.round_number && (
                <span className="text-xs text-gray-400 font-mono">R{session.round_number}</span>
              )}
            </div>
          </div>

          {/* State badge */}
          <Badge className={`${stateConfig.badge} text-xs flex-shrink-0`}>
            {stateConfig.icon} {stateConfig.label}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 pl-4">
          <span>{sessionResults.length} results</span>
          <span className={standingsConfig.color}>{standingsConfig.label}</span>
          <button
            className="ml-auto text-gray-600 hover:text-gray-300 transition-colors"
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Dependency warnings */}
        {warnings.length > 0 && (
          <div className="pl-4 space-y-0.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-orange-400">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Expanded quick actions */}
        {expanded && (
          <div
            className="border-t border-gray-800 pt-2 flex gap-1 flex-wrap pl-4"
            onClick={e => e.stopPropagation()}
          >
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => onSelectSession && onSelectSession(session.id)}>
              <Plus className="w-3 h-3 mr-1" /> Enter Results
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800">
              <Upload className="w-3 h-3 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800">
              <Copy className="w-3 h-3 mr-1" /> Paste
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800">
              <History className="w-3 h-3 mr-1" /> Log
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}