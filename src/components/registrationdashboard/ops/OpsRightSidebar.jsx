/**
 * REVISION 6A — OpsRightSidebar
 * Sticky right panel showing Session Health and Activity Log.
 * Desktop-only (xl+). No mutations.
 */
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, History, AlertTriangle, AlertCircle } from 'lucide-react';
import SessionHealthPanel from '../results/SessionHealthPanel';
import SessionActivityLog from '../results/SessionActivityLog';
import { motion, AnimatePresence } from 'framer-motion';
import { isScoringSession } from './sessionOrdering';

export default function OpsRightSidebar({ selectedSession, sessions, results, seriesClasses }) {
  const [activeSection, setActiveSection] = useState('health');

  if (!selectedSession) {
    return (
      <div className="hidden xl:block w-72 flex-shrink-0">
        <Card className="bg-surface-elevated border-divider p-4 sticky top-[200px]">
          <p className="text-xs text-foreground-quiet text-center">Select a session to view health &amp; activity</p>
        </Card>
      </div>
    );
  }

  const sessionResults = results.filter(r => r.session_id === selectedSession.id);
  const hasMissingDriver = sessionResults.some(r => !r.driver_id);
  const hasDuplicatePos = sessionResults.some(
    r => r.position && sessionResults.filter(r2 => r2.position === r.position).length > 1
  );

  const tabs = [
    { id: 'health', label: 'Health', Icon: CheckCircle2 },
    { id: 'activity', label: 'Activity', Icon: History },
  ];

  return (
    <div className="hidden xl:block w-72 flex-shrink-0">
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        className="sticky top-[200px] max-h-[calc(100vh-220px)] overflow-y-auto"
      >
        <Card className="bg-surface-elevated border-divider rounded-lg overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-divider bg-surface-interactive/40">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                  activeSection === id
                    ? 'text-foreground border-b-2 border-motion bg-surface-elevated'
                    : 'text-foreground-quiet hover:text-foreground-secondary'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3">
            <AnimatePresence mode="wait">
              {activeSection === 'health' && (
                <motion.div
                  key="health"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="space-y-3"
                >
                  {/* Quick summary */}
                  <div className="bg-surface-interactive/40 rounded p-2.5 space-y-1.5 border border-divider">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {selectedSession.name}
                    </p>
                    <div className="space-y-1 text-xs text-foreground-secondary">
                      <div className="flex justify-between">
                        <span>Results:</span>
                        <span className="text-foreground font-semibold">{sessionResults.length}</span>
                      </div>
                      {hasMissingDriver && (
                        <div className="flex items-center gap-1 text-warning">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Missing driver ID</span>
                        </div>
                      )}
                      {hasDuplicatePos && (
                        <div className="flex items-center gap-1 text-warning">
                          <AlertCircle className="w-3 h-3" />
                          <span>Duplicate positions</span>
                        </div>
                      )}
                      {/* Part 4: include Feature as scoring session */}
                      {isScoringSession(selectedSession) ? (
                        <div className="flex items-center gap-1 text-success pt-1 border-t border-divider mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Scoring session — standings recalc on Official</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-foreground-quiet pt-1 border-t border-divider mt-1">
                          <span>Non-scoring — no standings impact</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Full panel */}
                  <SessionHealthPanel
                    session={selectedSession}
                    sessionResults={sessionResults}
                    seriesClass={seriesClasses?.find(sc => sc.id === selectedSession.series_class_id)}
                  />
                </motion.div>
              )}

              {activeSection === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  <SessionActivityLog sessionId={selectedSession.id} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}