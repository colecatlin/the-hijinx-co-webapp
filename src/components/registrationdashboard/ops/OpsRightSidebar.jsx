import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, AlertTriangle, ChevronDown, History } from 'lucide-react';
import SessionHealthPanel from '../results/SessionHealthPanel';
import SessionActivityLog from '../results/SessionActivityLog';
import { motion, AnimatePresence } from 'framer-motion';

export default function OpsRightSidebar({ selectedSession, sessions, results, seriesClasses, operationLogs }) {
  const [activeSection, setActiveSection] = useState('health');

  if (!selectedSession) {
    return (
      <div className="hidden xl:block w-80 flex-shrink-0 pl-6">
        <Card className="bg-[#171717] border-gray-800 p-4 sticky top-[200px] max-h-[calc(100vh-200px)] overflow-y-auto">
          <p className="text-xs text-gray-500">Select a session to view health and activity</p>
        </Card>
      </div>
    );
  }

  const sessionResults = results.filter(r => r.session_id === selectedSession.id);

  const SectionButton = ({ id, icon: Icon, label, isActive }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold rounded transition-colors ${
        isActive
          ? 'bg-gray-700 text-white'
          : 'bg-[#262626] text-gray-400 hover:text-gray-300'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );

  return (
    <div className="hidden xl:block w-80 flex-shrink-0 pl-6">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="sticky top-[200px] max-h-[calc(100vh-200px)] overflow-y-auto"
      >
        <Card className="bg-[#171717] border-gray-800 rounded-lg overflow-hidden">
          {/* Section Tabs */}
          <div className="bg-[#262626] border-b border-gray-800 p-2 flex gap-1">
            <SectionButton id="health" icon={CheckCircle2} label="Health" isActive={activeSection === 'health'} />
            <SectionButton id="activity" icon={History} label="Activity" isActive={activeSection === 'activity'} />
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <AnimatePresence mode="wait">
              {activeSection === 'health' && (
                <motion.div
                  key="health"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {/* Quick Health Summary */}
                  <div className="bg-[#262626] rounded p-2 space-y-1.5">
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">Session Health</p>

                    {/* Stats */}
                    <div className="space-y-1 text-xs text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>Results entered:</span>
                        <span className="text-white font-semibold">{sessionResults.length}</span>
                      </div>

                      {sessionResults.some(r => !r.driver_id) && (
                        <div className="flex items-center gap-1 text-orange-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Missing driver ID</span>
                        </div>
                      )}

                      {sessionResults.some(r => r.position && sessionResults.filter(r2 => r2.position === r.position).length > 1) && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Duplicate positions</span>
                        </div>
                      )}

                      {selectedSession.session_type === 'Final' && (
                        <div className="flex items-center gap-1 text-green-400 pt-1 border-t border-gray-700">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Standings will recalc</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Full Health Panel */}
                  <div className="text-xs">
                    <SessionHealthPanel
                      session={selectedSession}
                      sessionResults={sessionResults}
                      seriesClass={seriesClasses.find(sc => sc.id === selectedSession.series_class_id)}
                    />
                  </div>
                </motion.div>
              )}

              {activeSection === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
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