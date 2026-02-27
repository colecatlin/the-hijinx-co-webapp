import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, entityType } = await req.json();

    if (!entityType) {
      return Response.json({ error: 'Missing entityType parameter' }, { status: 400 });
    }

    if (action === 'export') {
      return await handleExport(base44, entityType);
    } else if (action === 'import') {
      return await handleImport(base44, req, entityType);
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleExport(base44, entityType) {
  try {
    const entity = base44.entities[entityType];
    if (!entity) {
      return Response.json({ error: `Entity ${entityType} not found` }, { status: 404 });
    }

    const records = await entity.list();
    
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
    
    const headers = Array.from(allKeys).sort();
    
    // Build CSV content
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    
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

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${entityType}_export.csv"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleImport(base44, req, entityType) {
  try {
    const entity = base44.entities[entityType];
    if (!entity) {
      return Response.json({ error: `Entity ${entityType} not found` }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 1) {
      return Response.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    // Parse CSV header
    const headers = parseCSVLine(lines[0]);
    
    const results = { created: 0, updated: 0, failed: 0, errors: [] };
    
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

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
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