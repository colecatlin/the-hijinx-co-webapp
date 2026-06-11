/**
 * R9CS — useDataHealth
 * Data health engine. Runs validation checks across all major entities.
 * Returns structured issues with severity, entity type, and recommendations.
 */
import { useMemo } from 'react';

export function useDataHealth({ entries, drivers, sessions, results, standings, officials, techInspections, incidents, penalties, protests } = {}) {
  const issues = useMemo(() => {
    const found = [];

    const push = (severity, entity_type, issue, record_id, recommendation) => {
      found.push({ severity, entity_type, issue, record_id, recommendation });
    };

    // --- Entries ---
    (entries || []).forEach(e => {
      if (!e.driver_id) push('critical', 'Entry', 'Entry has no driver assigned', e.id, 'Assign a driver to this entry');
      if (!e.event_class_id && !e.series_class_id) push('warning', 'Entry', 'Entry has no class assigned', e.id, 'Assign a class to this entry');
      if (!e.event_id) push('critical', 'Entry', 'Entry has no event assigned', e.id, 'Link this entry to an event');
    });

    // --- Sessions ---
    (sessions || []).forEach(s => {
      if (!s.event_id) push('critical', 'Session', 'Session has no event assigned', s.id, 'Link this session to an event');
    });

    // --- Results ---
    (results || []).forEach(r => {
      if (!r.session_id) push('warning', 'Results', 'Result has no session assigned', r.id, 'Link this result to a session');
      if (!r.driver_id) push('critical', 'Results', 'Result has no driver assigned', r.id, 'Assign a driver to this result');
    });

    // --- Standings ---
    (standings || []).forEach(s => {
      if (!s.driver_id) push('critical', 'Standings', 'Standing has no driver', s.id, 'Link standing to a driver');
      if (s.points_total === undefined || s.points_total === null) push('warning', 'Standings', 'Standing has no points value', s.id, 'Recalculate standings');
    });

    // --- Officials ---
    (officials || []).forEach(o => {
      if (!o.role) push('warning', 'EventOfficial', 'Official has no assigned role', o.id, 'Assign a role to this official');
    });

    // --- Tech Inspections ---
    (techInspections || []).forEach(t => {
      if (!t.inspector_user_id) push('warning', 'TechInspectionRecord', 'Tech inspection has no inspector assigned', t.id, 'Assign an inspector');
    });

    // --- Incidents ---
    (incidents || []).forEach(i => {
      if (!i.incident_type) push('warning', 'Incident', 'Incident missing type', i.id, 'Classify this incident');
    });

    // --- Archived records missing reason ---
    const allArchivable = [
      ...(entries || []).map(r => ({ ...r, _type: 'Entry' })),
      ...(sessions || []).map(r => ({ ...r, _type: 'Session' })),
      ...(results || []).map(r => ({ ...r, _type: 'Results' })),
      ...(officials || []).map(r => ({ ...r, _type: 'EventOfficial' })),
    ];
    allArchivable.forEach(r => {
      if (r.is_archived && !r.archive_reason) {
        push('info', r._type, 'Archived record is missing an archive reason', r.id, 'Add an archive reason for audit compliance');
      }
    });

    // --- Duplicate driver name detection (basic) ---
    const driverNames = {};
    (drivers || []).forEach(d => {
      const key = `${(d.first_name || '').toLowerCase().trim()} ${(d.last_name || '').toLowerCase().trim()}`;
      if (!driverNames[key]) driverNames[key] = [];
      driverNames[key].push(d.id);
    });
    Object.entries(driverNames).forEach(([name, ids]) => {
      if (ids.length > 1) {
        push('warning', 'Driver', `Possible duplicate driver: "${name}" (${ids.length} records)`, ids[0], 'Review and merge duplicate driver records');
      }
    });

    return found;
  }, [entries, drivers, sessions, results, standings, officials, techInspections, incidents, penalties, protests]);

  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info     = issues.filter(i => i.severity === 'info');

  const score = (() => {
    if (issues.length === 0) return 100;
    const penalty = critical.length * 15 + warnings.length * 5 + info.length * 1;
    return Math.max(0, 100 - penalty);
  })();

  return { issues, critical, warnings, info, score };
}

export default useDataHealth;