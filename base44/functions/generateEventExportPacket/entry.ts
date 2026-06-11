/**
 * R9CR — generateEventExportPacket
 * Generates real CSV exports for all event data sets.
 * Returns a signed download URL for each CSV file.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function toCSV(rows, headers) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = headers.map(h => escape(h.label)).join(',');
  const body = rows.map(row => headers.map(h => escape(row[h.key])).join(','));
  return [header, ...body].join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    // Fetch all event data in parallel
    const [event, entries, sessions, results, officials, incidents] = await Promise.all([
      base44.asServiceRole.entities.Event.filter({ id: event_id }).then(r => r[0]),
      base44.asServiceRole.entities.Entry.filter({ event_id }),
      base44.asServiceRole.entities.Session.filter({ event_id }),
      base44.asServiceRole.entities.Results.filter({ event_id }),
      base44.asServiceRole.entities.EventOfficial.filter({ event_id }),
      base44.asServiceRole.entities.Incident.filter({ event_id }),
    ]);

    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Fetch drivers for name resolution
    const driverIds = [...new Set([
      ...entries.map(e => e.driver_id),
      ...results.map(r => r.driver_id),
    ].filter(Boolean))];

    const driverMap = {};
    if (driverIds.length > 0) {
      const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 500);
      allDrivers.forEach(d => { driverMap[d.id] = d; });
    }

    const driverName = (id) => {
      const d = driverMap[id];
      return d ? `${d.first_name} ${d.last_name}` : id || '';
    };

    const eventName = event.name || event_id;
    const generated_at = new Date().toISOString();
    const files = [];

    // ── 1. ENTRIES CSV ───────────────────────────────────────────────────────
    const entriesCSV = toCSV(entries.map(e => ({
      car_number: e.car_number,
      driver: driverName(e.driver_id),
      entry_status: e.entry_status,
      tech_status: e.tech_status || 'Not Inspected',
      payment_status: e.payment_status,
      waiver_verified: e.waiver_verified ? 'Yes' : 'No',
      transponder_id: e.transponder_id || '',
      checkin_time: e.checkin_time || '',
      notes: e.notes || '',
    })), [
      { key: 'car_number', label: 'Car #' },
      { key: 'driver', label: 'Driver' },
      { key: 'entry_status', label: 'Entry Status' },
      { key: 'tech_status', label: 'Tech Status' },
      { key: 'payment_status', label: 'Payment' },
      { key: 'waiver_verified', label: 'Waiver' },
      { key: 'transponder_id', label: 'Transponder' },
      { key: 'checkin_time', label: 'Check-In Time' },
      { key: 'notes', label: 'Notes' },
    ]);
    files.push({ name: `${eventName}_Entries.csv`, content: entriesCSV, type: 'entries' });

    // ── 2. RESULTS CSV ───────────────────────────────────────────────────────
    const sessionMap = {};
    sessions.forEach(s => { sessionMap[s.id] = s; });

    const resultsCSV = toCSV(results.map(r => ({
      session: sessionMap[r.session_id]?.name || r.session_id || '',
      session_type: r.session_type || sessionMap[r.session_id]?.session_type || '',
      position: r.position || '',
      car_number: entries.find(e => e.driver_id === r.driver_id)?.car_number || '',
      driver: driverName(r.driver_id),
      status: r.status || '',
      status_state: r.status_state || '',
      laps_completed: r.laps_completed || '',
      points: r.points || '',
    })), [
      { key: 'session', label: 'Session' },
      { key: 'session_type', label: 'Type' },
      { key: 'position', label: 'Position' },
      { key: 'car_number', label: 'Car #' },
      { key: 'driver', label: 'Driver' },
      { key: 'status', label: 'Race Status' },
      { key: 'status_state', label: 'Result State' },
      { key: 'laps_completed', label: 'Laps' },
      { key: 'points', label: 'Points' },
    ]);
    files.push({ name: `${eventName}_Results.csv`, content: resultsCSV, type: 'results' });

    // ── 3. SESSIONS CSV ──────────────────────────────────────────────────────
    const sessionsCSV = toCSV(sessions.map(s => ({
      name: s.name,
      session_type: s.session_type,
      status: s.status,
      run_order: s.run_order || '',
      laps: s.laps || '',
      duration_minutes: s.duration_minutes || '',
      scheduled_time: s.scheduled_time || '',
      locked: s.locked ? 'Yes' : 'No',
    })), [
      { key: 'run_order', label: 'Order' },
      { key: 'name', label: 'Session' },
      { key: 'session_type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'laps', label: 'Laps' },
      { key: 'duration_minutes', label: 'Duration (min)' },
      { key: 'scheduled_time', label: 'Scheduled Time' },
      { key: 'locked', label: 'Locked' },
    ]);
    files.push({ name: `${eventName}_Sessions.csv`, content: sessionsCSV, type: 'sessions' });

    // ── 4. OFFICIALS CSV ─────────────────────────────────────────────────────
    const officialsCSV = toCSV(officials.map(o => ({
      role: o.role,
      user_id: o.user_id,
      status: o.status,
      confirmed_at: o.confirmed_at || '',
      notes: o.notes || '',
    })), [
      { key: 'role', label: 'Role' },
      { key: 'user_id', label: 'User ID' },
      { key: 'status', label: 'Status' },
      { key: 'confirmed_at', label: 'Confirmed At' },
      { key: 'notes', label: 'Notes' },
    ]);
    files.push({ name: `${eventName}_Officials.csv`, content: officialsCSV, type: 'officials' });

    // ── 5. COMPLIANCE CSV ────────────────────────────────────────────────────
    const complianceCSV = toCSV(entries.map(e => ({
      car_number: e.car_number,
      driver: driverName(e.driver_id),
      payment_status: e.payment_status,
      waiver_verified: e.waiver_verified ? 'Yes' : 'No',
      license_status: e.license_status || '',
      tech_status: e.tech_status || 'Not Inspected',
      transponder_id: e.transponder_id || '',
      missing_transponder: !e.transponder_id ? 'MISSING' : '',
      compliance_notes: e.compliance_notes || '',
    })), [
      { key: 'car_number', label: 'Car #' },
      { key: 'driver', label: 'Driver' },
      { key: 'payment_status', label: 'Payment' },
      { key: 'waiver_verified', label: 'Waiver' },
      { key: 'license_status', label: 'License' },
      { key: 'tech_status', label: 'Tech Status' },
      { key: 'transponder_id', label: 'Transponder' },
      { key: 'missing_transponder', label: 'Missing?' },
      { key: 'compliance_notes', label: 'Notes' },
    ]);
    files.push({ name: `${eventName}_Compliance.csv`, content: complianceCSV, type: 'compliance' });

    // ── 6. INCIDENTS CSV ─────────────────────────────────────────────────────
    if (incidents.length > 0) {
      const incidentsCSV = toCSV(incidents.map(i => ({
        incident_number: i.incident_number || '',
        incident_type: i.incident_type,
        severity: i.severity,
        status: i.status,
        description: i.description,
        location: i.location_description || '',
        resolution: i.resolution || '',
        closed_at: i.closed_at || '',
      })), [
        { key: 'incident_number', label: 'INC #' },
        { key: 'incident_type', label: 'Type' },
        { key: 'severity', label: 'Severity' },
        { key: 'status', label: 'Status' },
        { key: 'description', label: 'Description' },
        { key: 'location', label: 'Location' },
        { key: 'resolution', label: 'Resolution' },
        { key: 'closed_at', label: 'Closed At' },
      ]);
      files.push({ name: `${eventName}_Incidents.csv`, content: incidentsCSV, type: 'incidents' });
    }

    // Upload all CSVs and get signed URLs via UploadFile integration
    const uploadedFiles = await Promise.all(files.map(async (f) => {
      const blob = new Blob([f.content], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, f.name);

      const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({
        file: blob,
        filename: f.name,
      });

      return {
        name: f.name,
        type: f.type,
        url: uploaded.file_url,
        row_count: f.content.split('\n').length - 1,
      };
    }));

    return Response.json({
      packet_generated: true,
      generated_at,
      event_id,
      event_name: eventName,
      files: uploadedFiles,
      summary: {
        entries: entries.length,
        sessions: sessions.length,
        results: results.length,
        officials: officials.length,
        incidents: incidents.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});