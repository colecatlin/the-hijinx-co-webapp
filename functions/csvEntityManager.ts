import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    if (templateOnly) {
      // Get schema to extract available fields
      try {
        const schema = await entity.schema();
        headers = Object.keys(schema.properties || {}).sort();
        // Add built-in fields
        headers = ['id', ...headers, 'created_date', 'updated_date', 'created_by'].filter(h => h);
      } catch {
        // Fallback: fetch one record to get keys
        const sample = await entity.list(undefined, 1);
        if (sample.length > 0) {
          headers = Object.keys(sample[0]).sort();
        } else {
          headers = [];
        }
      }
    } else {
      // Export all data
      records = await entity.list();
      
      if (records.length === 0) {
        const csv = ''; // Empty CSV for empty entities
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${entityType}_export.csv"`
          }
        });
      }

      // Get all keys from all records
      const allKeys = new Set();
      records.forEach(record => {
        Object.keys(record).forEach(key => allKeys.add(key));
      });
      
      headers = Array.from(allKeys).sort();
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