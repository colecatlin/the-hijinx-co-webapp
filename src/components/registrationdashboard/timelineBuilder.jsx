/**
 * Timeline Builder
 * Build chronological timeline from event data
 */

/**
 * Build event timeline from all sources
 * @param {Object} params
 * @param {Array} params.sessions - Session records
 * @param {Array} params.results - Results records
 * @param {Array} params.entries - Entry records
 * @param {Array} params.operationLogs - OperationLog records
 * @returns {Array} Timeline items sorted by timestamp
 */
export function buildEventTimeline({
  sessions = [],
  results = [],
  entries = [],
  operationLogs = [],
}) {
  const items = [];

  // Sessions: scheduled, started, completed
  sessions.forEach((session) => {
    if (session.scheduled_time) {
      items.push({
        timestamp: new Date(session.scheduled_time),
        type: 'session_scheduled',
        title: `${session.session_type} Scheduled`,
        description: session.name || session.session_type,
        icon: '📋',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        data: { session_id: session.id, session_type: session.session_type },
      });
    }

    // Session status changes
    if (session.status === 'in_progress') {
      items.push({
        timestamp: new Date(session.updated_date || Date.now()),
        type: 'session_started',
        title: `${session.session_type} Started`,
        description: session.name || session.session_type,
        icon: '🚩',
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        data: { session_id: session.id, session_type: session.session_type },
      });
    }

    if (session.status === 'completed' || session.status === 'Locked') {
      items.push({
        timestamp: new Date(session.updated_date || Date.now()),
        type: 'session_completed',
        title: `${session.session_type} Completed`,
        description: session.name || session.session_type,
        icon: '✅',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        data: { session_id: session.id, session_type: session.session_type },
      });
    }

    if (session.status === 'Official' || session.status === 'Locked') {
      items.push({
        timestamp: new Date(session.updated_date || Date.now()),
        type: 'results_published',
        title: `Results Published`,
        description: `${session.session_type} results official`,
        icon: '📊',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        data: { session_id: session.id, session_type: session.session_type },
      });
    }
  });

  // Operation logs: check-ins, tech, race control, standings
  operationLogs.forEach((log) => {
    const timestamp = new Date(log.created_date || log.updated_date || Date.now());

    switch (log.operation_type) {
      case 'entry_checked_in':
      case 'gate_checkin':
      case 'checkin_updated':
        items.push({
          timestamp,
          type: 'checkin',
          title: 'Driver Check In',
          description: log.message || 'Entry checked in',
          icon: '🎟️',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          data: log.metadata || {},
        });
        break;

      case 'tech_updated':
      case 'tech_created':
        items.push({
          timestamp,
          type: 'tech',
          title: 'Tech Inspection',
          description: log.message || 'Tech inspection updated',
          icon: '🔧',
          color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          data: log.metadata || {},
        });
        break;

      case 'gate_verify':
      case 'gate_updated':
      case 'gate_override_checkin':
        items.push({
          timestamp,
          type: 'gate',
          title: 'Gate Action',
          description: log.message || 'Gate verification',
          icon: '🚪',
          color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          data: log.metadata || {},
        });
        break;

      case 'race_control_override':
      case 'race_control_incident':
      case 'red_flag':
        items.push({
          timestamp,
          type: 'race_control',
          title: 'Race Control Action',
          description: log.message || 'Race control action',
          icon: '⚠️',
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
          data: log.metadata || {},
        });
        break;

      case 'standings_recalculated':
        items.push({
          timestamp,
          type: 'standings',
          title: 'Standings Recalculated',
          description: log.message || 'Standings updated',
          icon: '🏆',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          data: log.metadata || {},
        });
        break;

      case 'results_saved_draft':
      case 'results_saved':
      case 'results_imported_csv':
        items.push({
          timestamp,
          type: 'results_entry',
          title: 'Results Entry',
          description: log.message || 'Results recorded',
          icon: '📝',
          color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          data: log.metadata || {},
        });
        break;

      default:
        break;
    }
  });

  // Sort by timestamp descending (newest first)
  items.sort((a, b) => b.timestamp - a.timestamp);

  return items;
}