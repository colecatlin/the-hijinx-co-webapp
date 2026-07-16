import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2 } from 'lucide-react';

const FILE_TYPES = ['document', 'image', 'video', 'audio', 'archive', 'data', 'spreadsheet', 'other'];

const field = { borderColor: 'rgba(255,255,255,0.15)', color: '#fff' };

export default function ContentFileUploader({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('document');
  const [category, setCategory] = useState('general');
  const [linkedEntity, setLinkedEntity] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entityLabel, setEntityLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const toBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.toString().split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const submit = async () => {
    if (!file) { setErr('Select a file first'); return; }
    setBusy(true); setErr(null);
    try {
      const file_base64 = await toBase64(file);
      const res = await base44.functions.invoke('manageContentFile', {
        action: 'register',
        file_base64,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_type: fileType,
        category,
        linked_entity: linkedEntity || null,
        entity_id: entityId || null,
        entity_label: entityLabel || null,
        notes
      });
      if (res.data?.error) throw new Error(res.data.error);
      setFile(null); setNotes(''); setLinkedEntity(''); setEntityId(''); setEntityLabel('');
      onUploaded?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
      <h3 className="text-sm font-bold tracking-wider uppercase" style={{ color: '#1DA1A1' }}>Upload Content File</h3>
      <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} className="block w-full text-sm" />
      {file && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{file.name} · {(file.size/1024).toFixed(1)} KB · {file.type || 'unknown type'}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Type</label>
          <select value={fileType} onChange={e => setFileType(e.target.value)} className="w-full mt-1 bg-transparent text-sm rounded-lg border px-2 py-1.5" style={field}>
            {FILE_TYPES.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Category</label>
          <input value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 bg-transparent text-sm rounded-lg border px-2 py-1.5" style={field} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input value={linkedEntity} onChange={e => setLinkedEntity(e.target.value)} placeholder="Link entity type" className="bg-transparent text-sm rounded-lg border px-2 py-1.5" style={field} />
        <input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Entity ID" className="bg-transparent text-sm rounded-lg border px-2 py-1.5" style={field} />
        <input value={entityLabel} onChange={e => setEntityLabel(e.target.value)} placeholder="Entity label" className="bg-transparent text-sm rounded-lg border px-2 py-1.5" style={field} />
      </div>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className="w-full bg-transparent text-sm rounded-lg border px-2 py-1.5" style={field} />
      {err && <p className="text-xs" style={{ color: '#ef4444' }}>{err}</p>}
      <button onClick={submit} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition" style={{ background: busy ? 'rgba(29,161,161,0.3)' : 'rgba(29,161,161,0.15)', color: '#1DA1A1', border: '1px solid rgba(29,161,161,0.3)' }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy ? 'Uploading...' : 'Upload to Drive + Sheet'}
      </button>
    </div>
  );
}