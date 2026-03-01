import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function ResultsSessionMeta({
  session,
  event,
  operationLogs,
  eventId,
}) {
  const statusColors = {
    Draft: 'bg-gray-900/40 text-gray-300',
    Provisional: 'bg-yellow-900/40 text-yellow-300',
    Official: 'bg-green-900/40 text-green-300',
    Locked: 'bg-red-900/40 text-red-300',
  };

  const relevantLogs = useMemo(() => {
    if (!eventId) return [];
    return operationLogs
      .filter(
        (log) =>
          log.event_id === eventId &&
          ['Results', 'Session'].includes(log.entity_name)
      )
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 10);
  }, [operationLogs, eventId]);

  if (!session) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-8 text-center">
          <p className="text-gray-400">Select a session to view details</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Meta Card */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Session Name
            </p>
            <p className="text-sm text-white">{session.name || '-'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Type
            </p>
            <p className="text-sm text-white">{session.session_type || '-'}</p>
          </div>

          {session.scheduled_time && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Scheduled Time
              </p>
              <p className="text-sm text-white">
                {format(new Date(session.scheduled_time), 'MMM dd, HH:mm')}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Status
            </p>
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                statusColors[session.status] || statusColors['Draft']
              }`}
            >
              {session.status || 'Draft'}
            </span>
          </div>

          {session.updated_date && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Last Updated
              </p>
              <p className="text-sm text-gray-400">
                {format(new Date(session.updated_date), 'MMM dd, HH:mm')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Card */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          {relevantLogs.length === 0 ? (
            <p className="text-xs text-gray-400">No changes yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {relevantLogs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs p-2 bg-[#262626] rounded border border-gray-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-gray-300 font-medium">
                        {log.operation_type || 'Update'} — {log.entity_name}
                      </p>
                      {log.source_type && (
                        <p className="text-gray-500 text-xs mt-1">
                          Via {log.source_type}
                        </p>
                      )}
                    </div>
                    <p className="text-gray-500 flex-shrink-0">
                      {format(new Date(log.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}