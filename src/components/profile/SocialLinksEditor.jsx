import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { SOCIAL_PLATFORM_CONFIG } from '@/components/system/userCapabilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLATFORMS = Object.entries(SOCIAL_PLATFORM_CONFIG);

const PLATFORM_SHORT = {
  instagram: 'IG', tiktok: 'TK', youtube: 'YT', facebook: 'FB',
  x: 'X', threads: 'TH', linkedin: 'LI', snapchat: 'SC',
  discord: 'DC', twitch: 'TV', website: '🌐',
};

function cleanHandle(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/^@/, '');
    return path.split('/')[0] || '';
  } catch {
    return url.replace(/^@/, '');
  }
}

export default function SocialLinksEditor({ links = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const handle = cleanHandle(newUrl.trim());
    const updated = [...links, { platform: newPlatform, url: newUrl.trim(), handle, public_enabled: true }];
    onChange(updated);
    setNewUrl('');
    setAdding(false);
  };

  const handleRemove = (index) => onChange(links.filter((_, i) => i !== index));
  const handleTogglePublic = (index) => {
    onChange(links.map((l, i) => i === index ? { ...l, public_enabled: !l.public_enabled } : l));
  };

  return (
    <div className="space-y-3">
      {/* Empty state */}
      {links.length === 0 && !adding && (
        <div className="text-center py-8 rounded-xl" style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed #e5e7eb' }}>
          <p className="text-sm font-medium text-gray-500">No social links yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your socials — they'll appear on your public profile page.</p>
        </div>
      )}

      {/* Link rows */}
      {links.map((link, index) => {
        const cfg = SOCIAL_PLATFORM_CONFIG[link.platform] || { label: link.platform };
        const shortCode = PLATFORM_SHORT[link.platform] || link.platform.slice(0, 2).toUpperCase();
        const isPublic = link.public_enabled !== false;
        return (
          <div key={index} className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
            style={{ borderColor: '#e5e7eb', background: isPublic ? '#fff' : '#f9fafb' }}>
            {/* Platform badge */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black"
              style={{ background: isPublic ? '#f0fafa' : '#f5f5f5', color: isPublic ? '#1DA1A1' : '#aaa' }}>
              {shortCode}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</p>
              <p className="text-sm text-gray-800 truncate font-medium">{link.handle || link.url}</p>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span className="text-xs" style={{ color: isPublic ? '#1DA1A1' : '#aaa' }}>
                {isPublic ? 'Visible' : 'Hidden'}
              </span>
              <Switch
                checked={isPublic}
                onCheckedChange={() => handleTogglePublic(index)}
                className="scale-90"
              />
              <button type="button" onClick={() => handleRemove(index)}
                className="p-1.5 rounded-lg transition-colors text-gray-300 hover:text-red-500 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Add form */}
      {adding ? (
        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Platform</label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder={SOCIAL_PLATFORM_CONFIG[newPlatform]?.placeholder || 'https://...'}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-900"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd}
              className="px-4 py-1.5 text-xs font-bold rounded-lg text-white transition-colors"
              style={{ background: '#1A1A1A' }}
              onMouseEnter={e => e.currentTarget.style.background = '#000'}
              onMouseLeave={e => e.currentTarget.style.background = '#1A1A1A'}
            >
              Add
            </button>
            <button type="button" onClick={() => { setAdding(false); setNewUrl(''); }}
              className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm font-medium transition-colors text-gray-400 hover:text-gray-700">
          <Plus className="w-4 h-4" /> Add social link
        </button>
      )}
    </div>
  );
}