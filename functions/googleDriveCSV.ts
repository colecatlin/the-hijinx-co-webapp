import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, fileName, fileContent, fileId } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    if (action === 'upload') {
      // Upload CSV to Google Drive
      const formData = new FormData();
      const metadata = {
        name: fileName,
        mimeType: 'text/csv',
      };
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', new Blob([fileContent], { type: 'text/csv' }));

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        return Response.json({ error: 'Upload failed' }, { status: 500 });
      }

      const fileData = await uploadRes.json();
      return Response.json({ success: true, fileId: fileData.id, fileName: fileData.name });
    }

    if (action === 'list') {
      // List all CSV files in Google Drive
      const listRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType='text/csv'&spaces=drive&pageSize=100&fields=files(id,name,createdTime,modifiedTime,size)",
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await listRes.json();
      return Response.json({ files: data.files || [] });
    }

    if (action === 'download') {
      // Download/read CSV content from Google Drive
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const content = await downloadRes.text();
      return Response.json({ content });
    }

    if (action === 'delete') {
      // Delete CSV file from Google Drive
      const deleteRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteRes.ok) {
        return Response.json({ error: 'Delete failed' }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});