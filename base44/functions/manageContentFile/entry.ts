import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SHEET_HEADERS = [
  'File ID (App)', 'File Name', 'File Type', 'Category',
  'Drive File ID', 'Drive URL', 'Linked Entity', 'Entity ID',
  'Status', 'Size (bytes)', 'Uploaded By', 'Uploaded At', 'Notes'
];

function b64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getSheetsAuth(base44) {
  const conn = await base44.asServiceRole.connectors.getConnection('googlesheets');
  return { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' };
}

async function getDriveAuth(base44) {
  const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
  return { Authorization: `Bearer ${conn.accessToken}` };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json();
    const action = body.action;

    // INIT: create the registry spreadsheet + header row + config record
    if (action === 'init') {
      const sheetsAuth = await getSheetsAuth(base44);
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: sheetsAuth,
        body: JSON.stringify({
          properties: { title: 'RaceCore Content File Registry' },
          sheets: [{ properties: { title: 'Files' } }]
        })
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        return Response.json({ error: 'Failed to create spreadsheet', details: err }, { status: 502 });
      }
      const sheet = await createRes.json();
      const spreadsheetId = sheet.spreadsheetId;

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Files!A1:M1?valueInputOption=RAW`, {
        method: 'PUT',
        headers: sheetsAuth,
        body: JSON.stringify({ values: [SHEET_HEADERS] })
      });

      const existing = await base44.asServiceRole.entities.ContentFileConfig.list();
      const now = new Date().toISOString();
      if (existing.length === 0) {
        await base44.asServiceRole.entities.ContentFileConfig.create({
          registry_spreadsheet_id: spreadsheetId,
          registry_spreadsheet_url: sheet.spreadsheetUrl,
          initialized_at: now,
          initialized_by: user.id
        });
      } else {
        await base44.asServiceRole.entities.ContentFileConfig.update(existing[0].id, {
          registry_spreadsheet_id: spreadsheetId,
          registry_spreadsheet_url: sheet.spreadsheetUrl,
          initialized_at: now,
          initialized_by: user.id
        });
      }
      return Response.json({ status: 'initialized', spreadsheetId, spreadsheetUrl: sheet.spreadsheetUrl });
    }

    // Every other action needs the registry config
    const configRecs = await base44.asServiceRole.entities.ContentFileConfig.list();
    if (configRecs.length === 0) {
      return Response.json({ error: 'Registry not initialized. Call action=init first.' }, { status: 400 });
    }
    const spreadsheetId = configRecs[0].registry_spreadsheet_id;
    const spreadsheetUrl = configRecs[0].registry_spreadsheet_url;

    // REGISTER: upload file to Drive, append Sheet row, create ManagedFile record
    if (action === 'register') {
      if (!body.file_base64 || !body.file_name) {
        return Response.json({ error: 'file_base64 and file_name are required' }, { status: 400 });
      }
      const driveAuth = await getDriveAuth(base44);
      const sheetsAuth = await getSheetsAuth(base44);
      const mime = body.mime_type || 'application/octet-stream';
      const bytes = b64ToBytes(body.file_base64);
      const driveToken = driveAuth.Authorization.replace('Bearer ', '');

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media&fields=id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${driveToken}`, 'Content-Type': mime },
        body: bytes
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        return Response.json({ error: 'Drive upload failed', details: err }, { status: 502 });
      }
      const { id: driveFileId } = await uploadRes.json();

      // Patch name + description onto the created file
      await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=name`, {
        method: 'PATCH',
        headers: { ...driveAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: body.file_name, description: body.notes || '' })
      });

      const getFileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=webViewLink,webContentLink,size,mimeType`, {
        headers: driveAuth
      });
      const driveFile = await getFileRes.json();

      const now = new Date().toISOString();
      const managed = await base44.asServiceRole.entities.ManagedFile.create({
        file_name: body.file_name,
        file_type: body.file_type || 'document',
        category: body.category || 'general',
        drive_file_id: driveFileId,
        drive_web_url: driveFile.webViewLink || '',
        drive_download_url: driveFile.webContentLink || '',
        linked_entity_type: body.linked_entity || null,
        linked_entity_id: body.entity_id || null,
        linked_entity_label: body.entity_label || null,
        status: 'active',
        file_size: parseInt(driveFile.size || '0'),
        mime_type: driveFile.mimeType || mime,
        uploaded_by_id: user.id,
        uploaded_by_name: user.full_name || '',
        uploaded_at: now,
        source: 'drive_upload',
        sync_status: 'pending',
        notes: body.notes || ''
      });

      const row = [
        managed.id, body.file_name, body.file_type || 'document', body.category || 'general',
        driveFileId, driveFile.webViewLink || '', body.linked_entity || '', body.entity_id || '',
        'active', parseInt(driveFile.size || '0'), user.full_name || '', now, body.notes || ''
      ];
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Files!A:M:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: 'POST', headers: sheetsAuth, body: JSON.stringify({ values: [row] }) }
      );
      let rowNumber = null;
      if (appendRes.ok) {
        const appendData = await appendRes.json();
        const range = appendData.updates && appendData.updates.updatedRange;
        if (range) {
          const match = range.match(/Files!A(\d+)/);
          if (match) rowNumber = parseInt(match[1]);
        }
      }

      await base44.asServiceRole.entities.ManagedFile.update(managed.id, { sync_status: 'synced', sheet_row_number: rowNumber });

      return Response.json({ status: 'registered', managedFile: managed, driveFile, rowNumber, spreadsheetUrl });
    }

    // LIST: return ManagedFile entity records + registry link (no token fetch needed)
    if (action === 'list') {
      const records = await base44.asServiceRole.entities.ManagedFile.list('-uploaded_at', 500);
      return Response.json({ status: 'ok', records, spreadsheetUrl, spreadsheetId });
    }

    // SYNC: import Sheet rows that have no matching ManagedFile record (handles admin edits made directly in the sheet)
    if (action === 'sync') {
      const sheetsAuth = await getSheetsAuth(base44);
      const records = await base44.asServiceRole.entities.ManagedFile.list('-uploaded_at', 1000);
      const existingIds = new Set(records.map(r => r.id));
      const readRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Files!A2:M`,
        { headers: sheetsAuth }
      );
      if (!readRes.ok) {
        const err = await readRes.json();
        return Response.json({ error: 'Failed to read sheet for sync', details: err }, { status: 502 });
      }
      const data = await readRes.json();
      const rows = data.values || [];
      const imported = [];
      for (const r of rows) {
        const fileId = r[0];
        if (!fileId || existingIds.has(fileId)) continue;
        const created = await base44.asServiceRole.entities.ManagedFile.create({
          file_name: r[1] || 'Untitled',
          file_type: r[2] || 'document',
          category: r[3] || 'general',
          drive_file_id: r[4] || '',
          drive_web_url: r[5] || '',
          linked_entity_type: r[6] || null,
          linked_entity_id: r[7] || null,
          status: (r[8] || 'active'),
          file_size: parseInt(r[9] || '0'),
          uploaded_by_name: r[10] || '',
          uploaded_at: r[11] || new Date().toISOString(),
          source: 'sheet_import',
          sync_status: 'synced',
          notes: r[12] || ''
        });
        imported.push(created.id);
      }
      return Response.json({ status: 'synced', importedCount: imported.length, importedIds: imported, spreadsheetUrl });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});