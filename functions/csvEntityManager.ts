import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Canonical export column order per entity — keep in sync with entity schemas
const ENTITY_EXPORT_COLUMNS = {
  Driver: [
    'id', 'first_name', 'last_name', 'numeric_id', 'slug', 'date_of_birth',
    'contact_email', 'represented_by',
    'hometown_city', 'hometown_state', 'hometown_country',
    'racing_base_city', 'racing_base_state', 'racing_base_country',
    'primary_number', 'manufacturer', 'primary_discipline',
    'team_id', 'primary_series_id', 'primary_class_id',
    'career_status', 'profile_status', 'status', 'featured',
    'owner_user_id', 'calendar_id', 'primary_color',
    'created_date', 'updated_date', 'created_by',
  ],
  Team: [
    'id', 'name', 'slug', 'numeric_id',
    'headquarters_city', 'headquarters_state', 'country',
    'primary_discipline', 'team_level', 'status', 'founded_year',
    'description_summary', 'logo_url', 'manufacturer', 'manufacturer_logo_url',
    'calendar_id', 'created_date', 'updated_date', 'created_by',
  ],
  Track: [
    'id', 'name', 'slug', 'numeric_id',
    'location_city', 'location_state', 'location_country',
    'track_type', 'surface_type', 'length', 'banking',
    'website_url', 'contact_email', 'phone', 'description',
    'logo_url', 'image_url', 'status', 'calendar_id',
    'created_date', 'updated_date', 'created_by',
  ],
  Series: [
    'id', 'full_name', 'slug', 'numeric_id',
    'discipline', 'geographic_scope', 'sanctioning_body', 'season_year',
    'status', 'calendar_id',
    'created_date', 'updated_date', 'created_by',
  ],
  Event: [
    'id', 'name', 'numeric_id', 'track_id', 'series_id', 'series_name',
    'season', 'event_date', 'end_date', 'status', 'round_number',
    'external_uid', 'location_note',
    'created_date', 'updated_date', 'created_by',
  ],
  Results: [
    'id', 'driver_id', 'program_id', 'event_id', 'session_id',
    'session_type', 'heat_number', 'series_id', 'series_class_id', 'team_id',
    'position', 'status', 'laps_completed', 'best_lap_time_ms', 'points', 'notes',
    'created_date', 'updated_date', 'created_by',
  ],
  DriverProgram: [
    'id', 'driver_id', 'series_id', 'series_class_id', 'team_id',
    'program_type', 'participation_status', 'races_participated',
    'start_year', 'end_year', 'is_rookie', 'car_number',
    'created_date', 'updated_date', 'created_by',
  ],
  SeriesClass: [
    'id', 'series_id', 'class_name', 'competition_level', 'active', 'description',
    'created_date', 'updated_date', 'created_by',
  ],
  Standings: [
    'id', 'driver_id', 'series_class_id', 'total_points', 'final_position',
    'wins', 'podiums', 'dnfs',
    'created_date', 'updated_date', 'created_by',
  ],
  Session: [
    'id', 'event_id', 'session_type', 'heat_number', 'name',
    'scheduled_time', 'laps', 'status',
    'created_date', 'updated_date', 'created_by',
  ],
  OutletStory: [
    'id', 'title', 'slug', 'subtitle', 'body', 'author', 'author_title',
    'photo_credit', 'primary_category', 'sub_category', 'tags',
    'cover_image', 'location_city', 'location_state', 'location_country',
    'issue_id', 'featured', 'status', 'published_date', 'scheduled_publish_date',
    'created_date', 'updated_date', 'created_by',
  ],
  OutletIssue: [
    'id', 'title', 'volume', 'issue_number', 'cover_image', 'description',
    'published_date', 'status',
    'created_date', 'updated_date', 'created_by',
  ],
  Product: [
    'id', 'name', 'slug', 'description', 'price', 'category',
    'images', 'featured', 'status', 'external_link',
    'created_date', 'updated_date', 'created_by',
  ],
  NewsletterSubscriber: [
    'id', 'email', 'name', 'source',
    'created_date', 'updated_date', 'created_by',
  ],
  ContactMessage: [
    'id', 'name', 'email', 'subject', 'message', 'status',
    'created_date', 'updated_date', 'created_by',
  ],
  Announcement: [
    'id', 'message', 'link_url', 'link_text', 'background_color',
    'active', 'priority',
    'created_date', 'updated_date', 'created_by',
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, entityType, templateOnly, csvContent } = await req.json();
    const startTime = Date.now();

    if (!entityType) {
      return Response.json({ error: 'Missing entityType parameter' }, { status: 400 });
    }

    if (action === 'export') {
      const result = await handleExport(base44, entityType, templateOnly);
      if (user?.email) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'export',
          source_type: 'csv_upload',
          entity_name: entityType,
          function_name: 'csvEntityManager',
          status: 'completed',
          total_records: 0,
          initiated_by: user.email,
          execution_time_ms: Date.now() - startTime,
        });
      }
      return result;
    } else if (action === 'import') {
      const result = await handleImport(base44, csvContent, entityType);
      if (user?.email) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'import',
          source_type: 'csv_upload',
          entity_name: entityType,
          function_name: 'csvEntityManager',
          status: result.failed > 0 ? 'completed' : 'completed',
          total_records: result.total || 0,
          created_records: result.created > 0 ? [{ entity: entityType, ids: [] }] : [],
          skipped_count: result.skipped || 0,
          failed_count: result.failed || 0,
          error_details: result.errors?.map(e => `Row ${e.row}: ${e.error}`) || [],
          initiated_by: user.email,
          execution_time_ms: Date.now() - startTime,
        });
      }
      return Response.json(result);
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleExport(base44, entityType, templateOnly = false) {
  try {
    const entity = base44.entities[entityType];
    if (!entity) {
      return Response.json({ error: `Entity ${entityType} not found` }, { status: 404 });
    }

    let records = [];
    let headers = [];

    const canonicalColumns = ENTITY_EXPORT_COLUMNS[entityType] || null;

    if (templateOnly) {
      if (canonicalColumns) {
        headers = canonicalColumns;
      } else {
        try {
          const schema = await entity.schema();
          headers = ['id', ...Object.keys(schema.properties || {}), 'created_date', 'updated_date', 'created_by'];
        } catch {
          const sample = await entity.list(undefined, 1);
          headers = sample.length > 0 ? Object.keys(sample[0]) : [];
        }
      }
    } else {
      // Export all data
      records = await entity.list();
      
      if (records.length === 0) {
        const csv = '';
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${entityType}_export.csv"`
          }
        });
      }

      if (canonicalColumns) {
        // Use canonical column order; include any extra keys from actual data at the end
        const allKeys = new Set();
        records.forEach(record => Object.keys(record).forEach(k => allKeys.add(k)));
        const extras = Array.from(allKeys).filter(k => !canonicalColumns.includes(k));
        headers = [...canonicalColumns, ...extras];
      } else {
        const allKeys = new Set();
        records.forEach(record => Object.keys(record).forEach(k => allKeys.add(k)));
        headers = Array.from(allKeys).sort();
      }
    }

    // Build CSV content
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    
    // Add data rows (only if not template)
    if (!templateOnly && records.length > 0) {
      records.forEach(record => {
        const row = headers.map(header => {
          const value = record[header];
          if (value === null || value === undefined) return '';
          
          // Handle arrays and objects
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          
          // Escape quotes in strings
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        });
        csv += row.join(',') + '\n';
      });
    }

    const filename = templateOnly ? `${entityType}_template.csv` : `${entityType}_export.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleImport(base44, csvText, entityType) {
  try {
    const entity = base44.entities[entityType];
    if (!entity) {
      return { error: `Entity ${entityType} not found` };
    }

    if (!csvText) {
      return { error: 'No CSV content provided' };
    }

    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 1) {
      return { error: 'CSV file is empty' };
    }

    // Parse CSV header
    const headers = parseCSVLine(lines[0]);
    
    const results = { created: 0, updated: 0, failed: 0, skipped: 0, total: lines.length - 1, errors: [] };
    
    // Parse and upsert each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const record = {};
        
        headers.forEach((header, idx) => {
          let value = values[idx] || '';
          
          // Try to parse JSON for arrays/objects
          if (value.startsWith('[') || value.startsWith('{')) {
            try {
              record[header] = JSON.parse(value);
            } catch {
              record[header] = value;
            }
          } else if (value === '') {
            record[header] = null;
          } else {
            record[header] = value;
          }
        });

        // Skip if no id provided (can't update), create new record
        if (!record.id) {
          delete record.id;
          delete record.created_date;
          delete record.updated_date;
          delete record.created_by;
          
          await entity.create(record);
          results.created++;
        } else {
          // Update existing record
          const id = record.id;
          delete record.id;
          delete record.created_date;
          delete record.updated_date;
          delete record.created_by;
          
          await entity.update(id, record);
          results.updated++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, error: error.message });
      }
    }

    return { success: true, ...results };
  } catch (error) {
    return { error: error.message };
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}