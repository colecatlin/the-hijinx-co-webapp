import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

const MEDIA_ROLES = ['Photographer', 'Videographer', 'Journalist', 'Content Creator', 'Media Outlet'];
const DISCIPLINES = ['Off Road', 'Dirt Oval', 'Asphalt Oval', 'Road Racing', 'Snowmobile', 'Drag Racing', 'Mixed'];
const REGIONS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Pacific Northwest', 'National', 'International'];

export default function MediaProfileTab({ user }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [roleInterest, setRoleInterest] = useState(user?.role_interest || '');
  const [outletName, setOutletName] = useState(user?.media_outlet_name || '');
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolio_url || '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagram_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.website_url || '');
  const [disciplines, setDisciplines] = useState(user?.disciplines_covered || []);
  const [regions, setRegions] = useState(user?.regions_covered || []);

  const toggle = (list, setList, item) =>
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      role_interest: roleInterest || undefined,
      media_outlet_name: outletName.trim() || undefined,
      portfolio_url: portfolioUrl.trim() || undefined,
      instagram_url: instagramUrl.trim() || undefined,
      website_url: websiteUrl.trim() || undefined,
      disciplines_covered: disciplines.length > 0 ? disciplines : [],
      regions_covered: regions.length > 0 ? regions : [],
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Role */}
      <div>
        <Label className="text-xs font-medium text-gray-700 mb-2 block">Media Role</Label>
        <div className="flex flex-wrap gap-2">
          {MEDIA_ROLES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleInterest(r)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                roleInterest === r
                  ? 'bg-[#232323] text-white border-[#232323]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Outlet name — only for Media Outlet role */}
      {roleInterest === 'Media Outlet' && (
        <div>
          <Label htmlFor="mp_outlet" className="text-xs font-medium text-gray-700">Outlet / Publication Name</Label>
          <Input
            id="mp_outlet"
            value={outletName}
            onChange={e => setOutletName(e.target.value)}
            placeholder="e.g. Racer Magazine"
            className="mt-1"
          />
        </div>
      )}

      {/* Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="mp_portfolio" className="text-xs font-medium text-gray-700">Portfolio URL</Label>
          <Input
            id="mp_portfolio"
            value={portfolioUrl}
            onChange={e => setPortfolioUrl(e.target.value)}
            placeholder="https://yourportfolio.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="mp_instagram" className="text-xs font-medium text-gray-700">Instagram</Label>
          <Input
            id="mp_instagram"
            value={instagramUrl}
            onChange={e => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="mp_website" className="text-xs font-medium text-gray-700">Website</Label>
          <Input
            id="mp_website"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="mt-1"
          />
        </div>
      </div>

      {/* Disciplines */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Disciplines Covered</p>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => toggle(disciplines, setDisciplines, d)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                disciplines.includes(d)
                  ? 'bg-[#232323] text-white border-[#232323]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Regions */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Regions</p>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => toggle(regions, setRegions, r)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                regions.includes(r)
                  ? 'bg-[#232323] text-white border-[#232323]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-[#232323] hover:bg-black text-white gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Media Profile'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}