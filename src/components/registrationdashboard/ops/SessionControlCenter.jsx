import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Eye, Lock, Copy, History } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SessionControlCenter({
  sessions,
  results,
  seriesClasses,
  selectedEvent,
  onAddResults,
  onPasteResults,
  onImportCSV,
  onPublishSession,
  onLockSession,
  onViewActivity,
}) {
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'Official': return 'bg-green-900/40 text-green-300 border-green-800';
      case 'Locked': return 'bg-purple-900/40 text-purple-300 border-purple-800';
      case 'Provisional': return 'bg-blue-900/40 text-blue-300 border-blue-800';
      default: return 'bg-gray-800/40 text-gray-300 border-gray-700';
    }
  };

  const getClassNameById = (classId) => {
    return seriesClasses?.find(c => c.id === classId)?.class_name || 'Unknown';
  };

  const getSessionResults = (sessionId) => {
    return results.filter(r => r.session_id === sessionId);
  };

  return (
    <div className="space-y-3 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">Session Control Center</h2>
        <span className="text-xs text-gray-500">{sessions.length} sessions</span>
      </div>

      {sessions.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800 p-6 text-center">
          <p className="text-gray-400 text-sm">No sessions created. Create one to begin managing results.</p>
        </Card>
      ) : (
        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sessions.map((session, idx) => {
            const sessionResults = getSessionResults(session.id);
            const isExpanded = expandedSessionId === session.id;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-[#1a1a1a] border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="p-3 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{session.name}</p>
                        <p className="text-xs text-gray-500">
                          {getClassNameById(session.series_class_id)} • {session.session_type}
                        </p>
                      </div>
                      <Badge className={`${getSessionStatusColor(session.status)} border text-xs`}>
                        {session.status || 'Draft'}
                      </Badge>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-800 pt-2">
                      <span>{sessionResults.length} results</span>
                      {sessionResults.some(r => r.status_state === 'Official') && (
                        <span className="text-green-400">✓ Official</span>
                      )}
                      {session.status === 'Locked' && (
                        <span className="text-purple-400">🔒 Locked</span>
                      )}
                      <span className="text-gray-600 ml-auto">
                        {session.updated_date && new Date(session.updated_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Quick Actions */}
                    {!isExpanded && (
                      <div className="flex gap-1 pt-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => onAddResults && onAddResults(session.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => onPasteResults && onPasteResults(session.id)}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Paste
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => onImportCSV && onImportCSV(session.id)}
                        >
                          <Upload className="w-3 h-3 mr-1" /> CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => setExpandedSessionId(session.id)}
                        >
                          More ↓
                        </Button>
                      </div>
                    )}

                    {/* Expanded Actions */}
                    {isExpanded && (
                      <div className="border-t border-gray-800 pt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-1">
                          {session.status === 'Draft' || session.status === 'Provisional' ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-900/40 text-green-300 hover:bg-green-900/60 border border-green-800"
                              onClick={() => onPublishSession && onPublishSession(session.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Publish
                            </Button>
                          ) : null}
                          {session.status === 'Official' ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-purple-900/40 text-purple-300 hover:bg-purple-900/60 border border-purple-800"
                              onClick={() => onLockSession && onLockSession(session.id)}
                            >
                              <Lock className="w-3 h-3 mr-1" /> Lock
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                            onClick={() => onViewActivity && onViewActivity(session.id)}
                          >
                            <History className="w-3 h-3 mr-1" /> Activity
                          </Button>
                        </div>
                        <button
                          className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 text-center"
                          onClick={() => setExpandedSessionId(null)}
                        >
                          Collapse ↑
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}