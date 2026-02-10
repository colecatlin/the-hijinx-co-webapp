import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entityName, filename, data, columns } = body;

    if (!entityName || !filename || !data || !columns) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Create CSV content
    const csvContent = convertToCSV(data, columns);

    // Create a text file that will be converted to Google Sheets
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], `${filename}.csv`, { type: 'text/csv' });

    // Upload to Google Drive
    const formData = new FormData();
    formData.append('file', file);
    formData.append('parents', '[]');

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      return Response.json({ error: 'Failed to upload to Google Drive', details: error }, { status: 500 });
    }

    const uploadedFile = await uploadResponse.json();

    return Response.json({
      success: true,
      fileId: uploadedFile.id,
      filename: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function convertToCSV(data, columns) {
  // Header row
  const header = columns.map(col => `"${col.label}"`).join(',');

  // Data rows
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      const stringValue = String(value || '').replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',')
  );

  return [header, ...rows].join('\n');
}