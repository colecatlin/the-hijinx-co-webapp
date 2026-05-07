import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Globe } from 'lucide-react';
import { SOCIAL_PLATFORM_CONFIG } from '@/components/system/userCapabilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLATFORMS = Object.entries(SOCIAL_PLATFORM_CONFIG);

export default function SocialLinksEditor({ links = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const handle = newUrl.replace(/^https?:\/\/[^/]+\/?/, '').replace(/^@/, '');
    const updated = [...links, { platform: newPlatform, url: newUrl.trim(), handle, public_enabled: true }];
    onChange(updated);
    setNewUrl('');
    setAdding(false);
  };

  const handleRemove = (index) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const handleTogglePublic = (index) => {
    const updated = links.map((l, i) => i === index ? { ...l, public_enabled: !l.public_enabled } : l);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {links.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No social links added yet.</p>
      )}

      {links.map((link, index) => {
        const config = SOCIAL_PLATFORM_CONFIG[link.platform] || { label: link.platform };
        return (
          <div key={index} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl bg-white">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{config.label}</p>
              <p className="text-sm text-gray-800 truncate">{link.handle || link.url}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400">Public</span>
              <Switch
                checked={link.public_enabled !== false}
                onCheckedChange={() => handleTogglePublic(index)}
                className="scale-90"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {adding ? (
        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Platform</label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
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
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAdd} className="bg-[#1A1A1A] text-white text-xs">Add</Button>
            <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => { setAdding(false); setNewUrl(''); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add social link
        </button>
      )}
    </div>
  );
}