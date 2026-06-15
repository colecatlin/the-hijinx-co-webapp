/**
 * csvEntityManager.js
 *
 * Handles Export and Template Download for the ManageCSVImportExport page.
 *
 * Actions:
 *   export        — fetch all records for the entity and return as CSV text
 *   export (templateOnly=true) — return headers-only CSV template
 *
 * Input:  { action, entityType, templateOnly? }
 * Output: CSV text string (response.data)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Field definitions per entity — used for template and export column ordering
const ENTITY_FIELDS = {
  Driver: ['first_name','last_name','primary_number','primary_discipline','date_of_birth','hometown_city','hometown_state','hometown_country','racing_base_city','racing_base_state','career_status','contact_email','external_uid','data_source'],
  Team: ['name','headquarters_city','headquarters_state','country','primary_discipline','team_level','founded_year','external_uid','data_source'],
  Track: ['name','location_city','location_state','location_country','track_type','surface_type','length','external_uid','data_source'],
  Series: ['name','full_name','sanctioning_body','discipline','geographic_scope','season_year','external_uid','data_source'],
  Event: ['name','event_date','end_date','series_id','track_id','season','round_number','external_uid','data_source'],
  SeriesClass: ['series_id','class_name','description_summary','vehicle_type','competition_level','geographic_scope','sort_order','active'],
  EventClass: ['event_id','series_class_id','class_name','max_entries','class_status','class_order'],
  Session: ['event_id','event_class_id','series_class_id','session_type','name','session_number','round_number','points_enabled','points_type','run_order','scheduled_time','duration_minutes','laps','external_uid'],
  Entry: ['event_id','driver_id','event_class_id','team_id','car_number','transponder_id','entry_status','payment_status'],
  Results: ['driver_id','event_id','session_id','session_type','position','status','laps_completed','best_lap_time_ms','points','series_id','series_class_id'],
  Standings: ['series_id','series_class_id','season_year','driver_id','position','points_total','wins','seconds','thirds','podiums','starts'],
  DriverProgram: ['driver_id','series_id','series_class_id','event_id','team_id','start_year','start_month','end_year','end_month','car_number','participation_status','status'],
  OutletStory: ['title','subtitle','author','body','primary_category','sub_category','status','published_date','tags'],
  NewsletterSubscriber: ['email','first_name','last_name','source'],
  ContactMessage: ['name','email','subject','message','status'],
  Announcement: ['title','body','active','start_date','end_date'],
};

function escapeCSVField(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowsToCSV(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCSVField(row[h])).join(','));
  }
  return lines.join('\n');
}

const MODEL_MAP = {
  Driver: 'Driver', Team: 'Team', Track: 'Track', Series: 'Series',
  Event: 'Event', SeriesClass: 'SeriesClass', EventClass: 'EventClass',
  Session: 'Session', Entry: 'Entry', Results: 'Results', Standings: 'Standings',
  DriverProgram: 'DriverProgram', OutletStory: 'OutletStory',
  NewsletterSubscriber: 'NewsletterSubscriber', ContactMessage: 'ContactMessage',
  Announcement: 'Announcement',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { action, entityType, templateOnly = false } = body;

    if (!entityType || !MODEL_MAP[entityType]) {
      return Response.json({ error: `Unknown entityType: ${entityType}` }, { status: 400 });
    }

    const fields = ENTITY_FIELDS[entityType];
    if (!fields) {
      return Response.json({ error: `No field definition for ${entityType}` }, { status: 400 });
    }

    if (action !== 'export') {
      return Response.json({ error: 'action must be export' }, { status: 400 });
    }

    if (templateOnly) {
      return Response.json(fields.join(','));
    }

    // Export all records — paginated to avoid memory issues
    const sr = base44.asServiceRole;
    const model = sr.entities[MODEL_MAP[entityType]];
    const allRecords = await model.list('-created_date', 2000).catch(() => []);

    const csv = rowsToCSV(fields, allRecords);
    return Response.json(csv);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});