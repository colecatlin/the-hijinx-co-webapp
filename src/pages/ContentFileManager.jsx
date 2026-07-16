import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ContentFileUploader from '@/components/contentfiles/ContentFileUploader';
import { FileSpreadsheet, ExternalLink, Loader2, RefreshCw, Database, Sparkles } from 'lucide-react';

export default function ContentFileManager() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contentFiles'],
    queryFn: async () => {
      const res = await base44.functions.invoke('manageContentFile', { action: 'list' });
      return res.data;
    }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const init = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await base44.functions.invoke('manageContentFile', { action: 'init' });
      if (res.data?.error) throw new Error(res.data.error);
      setMsg('Registry spreadsheet created. Open it from the button above.');
      qc.invalidateQueries(['contentFiles']);
    } catch (e) { setMsg('Init error: ' + e.message); }
    finally { setBusy(false); }
  };

  const sync = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await base44.functions.invoke('manageContentFile', { action: 'sync' });
      if (res.data?.error) throw new Error(res.data.error);
      setMsg(`Synced. Imported ${res.data.importedCount} new record(s) from the sheet.`);
      qc.invalidateQueries(['contentFiles']);
    } catch (e) { setMsg('Sync error: ' + e.message); }
    finally { setBusy(false); }
  };

  const records = data?.records || [];
  const spreadsheetUrl = data?.spreadsheetUrl;
  const initialized = !!spreadsheetUrl;

  if (user && user.role !== 'admin') {
    return <div className="p-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Admin access required.</div>;
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Content File Manager</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Files stored in Google Drive · cataloged in Google Sheets · mirrored as entity records</p>
        </div>
        {initialized && (
          <a href={spreadsheetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(29,161,161,0.12)', color: '#1DA1A1', border: '1px solid rgba(29,161,161,0.25)' }}>
            <FileSpreadsheet className="w-4 h-4" /> Open Registry Sheet <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {!initialized && (
        <div className="rounded-xl border p-6 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(29,161,161,0.04)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: '#1DA1A1' }} />
            <h2 className="text-base font-bold">Initialize the registry</h2>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>This creates a new Google Sheet (file registry) in your connected account. After init you can upload files and browse the catalog here.</p>
          <button onClick={init} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(29,161,161,0.15)', color: '#1DA1A1', border: '1px solid rgba(29,161,161,0.3)' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Initialize Registry
          </button>
        </div>
      )}

      {msg && <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' }}>{msg}</div>}

      {initialized && (
        <>
          <ContentFileUploader onUploaded={() => qc.invalidateQueries(['contentFiles'])} />

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Files ({records.length})</h2>
            <button onClick={sync} disabled={busy} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync from Sheet
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</p>
          ) : records.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No files yet. Upload one above.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-mono tracking-widest uppercase text-left" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <th className="px-3 py-2">Name</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Linked</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Sync</th><th className="px-3 py-2">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <td className="px-3 py-2"><a href={r.drive_web_url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: '#fff' }}>{r.file_name}</a></td>
                      <td className="px-3 py-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.file_type}</td>
                      <td className="px-3 py-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.category}</td>
                      <td className="px-3 py-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.linked_entity_label || (r.linked_entity_type ? `${r.linked_entity_type}:${(r.linked_entity_id || '').slice(0,8)}` : '—')}</td>
                      <td className="px-3 py-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.file_size ? (r.file_size/1024).toFixed(0)+'KB' : '—'}</td>
                      <td className="px-3 py-2"><span style={{ color: r.sync_status === 'synced' ? '#1DA1A1' : '#f59e0b' }}>{r.sync_status}</span></td>
                      <td className="px-3 py-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}