import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SOCIAL_PLATFORM_CONFIG } from '@/components/system/userCapabilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLATFORMS = Object.entries(SOCIAL_PLATFORM_CONFIG);
const MOTION = 'hsl(var(--motion))';
const MOTION_HOVER = 'hsl(var(--motion-hover))';
const DANGER = 'hsl(var(--danger))';

const PLATFORM_SHORT = {
  instagram: 'IG', tiktok: 'TK', youtube: 'YT', facebook: 'FB',
  x: 'X', threads: 'TH', linkedin: 'LI', snapchat: 'SC',
  discord: 'DC', twitch: 'TV', website: '🌐',
};

function extractHandle(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/^@/, '');
    return path.split('/')[0] || '';
  } catch {
    return url.replace(/^@/, '').replace(/^https?:\/\//, '').split('/')[0] || '';
  }
}

function cleanDomain(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }
}

export default function SocialLinksEditor({ links = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const url = newUrl.trim();
    const handle = extractHandle(url);
    const updated = [...links, { platform: newPlatform, url, handle, public_enabled: true }];
    onChange(updated);
    setNewUrl('');
    setAdding(false);
  };

  const handleRemove = (index) => onChange(links.filter((_, i) => i !== index));

  const handleTogglePublic = (index) => {
    onChange(links.map((l, i) => i === index ? { ...l, public_enabled: !l.public_enabled } : l));
  };

  return (
    <div className="space-y-2">
      {/* Empty state */}
      {links.length === 0 && !adding && (
        <div className="text-center py-8 rounded-xl"
          style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: `1px dashed hsl(var(--divider))` }}>
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground-secondary))' }}>No social links yet</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Add your socials — they'll appear on your public profile.
          </p>
        </div>
      )}

      {/* Link rows */}
      {links.map((link, index) => {
        const cfg = SOCIAL_PLATFORM_CONFIG[link.platform] || { label: link.platform };
        const shortCode = PLATFORM_SHORT[link.platform] || link.platform.slice(0, 2).toUpperCase();
        const isPublic = link.public_enabled !== false;
        const displayLabel = link.handle || cleanDomain(link.url) || link.url;
        return (
          <div key={index} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
            style={{
              background: isPublic ? `hsl(var(--motion) / 0.05)` : 'hsl(var(--surface-interactive) / 0.2)',
              border: isPublic ? `1px solid ${MOTION} / 0.2)` : '1px solid hsl(var(--divider))',
            }}>
            {/* Platform badge */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black"
              style={{
                background: isPublic ? `hsl(var(--motion) / 0.15)` : 'hsl(var(--surface-interactive) / 0.5)',
                color: isPublic ? MOTION : 'hsl(var(--foreground-quiet))',
              }}>
              {shortCode}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                {cfg.label}
              </p>
              <p className="text-sm font-medium truncate" style={{ color: isPublic ? 'hsl(var(--foreground))' : 'hsl(var(--foreground-quiet))' }}>
                {displayLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Toggle pill */}
              <button type="button" onClick={() => handleTogglePublic(index)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                style={isPublic ? {
                  background: `hsl(var(--motion) / 0.15)`,
                  color: MOTION,
                  border: `1px solid ${MOTION} / 0.3)`,
                } : {
                  background: 'hsl(var(--surface-interactive) / 0.4)',
                  color: 'hsl(var(--foreground-quiet))',
                  border: '1px solid hsl(var(--divider))',
                }}
              >
                {isPublic ? 'Visible' : 'Hidden'}
              </button>
              <button type="button" onClick={() => handleRemove(index)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'hsl(var(--foreground-quiet))' }}
                onMouseEnter={e => { e.currentTarget.style.color = DANGER; e.currentTarget.style.background = `hsl(var(--danger) / 0.1)`; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Add form */}
      {adding ? (
        <div className="p-4 rounded-xl space-y-3"
          style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider))' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>Platform</label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger className="h-9 text-sm"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}>
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
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder={SOCIAL_PLATFORM_CONFIG[newPlatform]?.placeholder || 'https://...'}
                className="flex h-9 w-full rounded-lg px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd}
              className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
              onMouseEnter={e => e.currentTarget.style.background = MOTION_HOVER}
              onMouseLeave={e => e.currentTarget.style.background = MOTION}
            >
              Add
            </button>
            <button type="button" onClick={() => { setAdding(false); setNewUrl(''); }}
              className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{ background: 'hsl(var(--surface-interactive) / 0.4)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}
              onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--foreground))'}
              onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-secondary))'}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'hsl(var(--foreground-quiet))' }}
          onMouseEnter={e => e.currentTarget.style.color = MOTION}
          onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}
        >
          <Plus className="w-4 h-4" /> Add social link
        </button>
      )}
    </div>
  );
}