/**
 * HomepageEditorialSettings
 *
 * Lightweight admin UI for homepage manual override controls.
 * Plain and functional — no redesign.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, Save, CheckCircle } from 'lucide-react';

// ── tiny helpers ──────────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };

  const remove = (item) => onChange(value.filter(x => x !== item));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Enter ID or value…'}
          className="text-sm h-8"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 px-3">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono">
              {item}
              <button type="button" onClick={() => remove(item)} className="text-gray-400 hover:text-red-500 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-700">{label}</Label>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function HomepageEditorialSettings() {
  const queryClient = useQueryClient();

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['homepageEditorialSettings'],
    queryFn: () => base44.entities.HomepageSettings.filter({ active: true }, '-created_date', 1),
  });

  const existing = settingsList[0] || null;

  const EMPTY = {
    featured_story_id: '',
    featured_driver_ids: [],
    featured_track_ids: [],
    featured_series_ids: [],
    featured_event_ids: [],
    featured_media_ids: [],
    featured_product_ids: [],
    hero_ticker_items: [],
    activity_feed_mode: 'auto',
    featured_entities_mode: 'mixed',
  };

  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        featured_story_id:    existing.featured_story_id    || '',
        featured_driver_ids:  existing.featured_driver_ids  || [],
        featured_track_ids:   existing.featured_track_ids   || [],
        featured_series_ids:  existing.featured_series_ids  || [],
        featured_event_ids:   existing.featured_event_ids   || [],
        featured_media_ids:   existing.featured_media_ids   || [],
        featured_product_ids: existing.featured_product_ids || [],
        hero_ticker_items:    existing.hero_ticker_items     || [],
        activity_feed_mode:   existing.activity_feed_mode   || 'auto',
        featured_entities_mode: existing.featured_entities_mode || 'mixed',
      });
    }
  }, [existing?.id]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const now = new Date().toISOString();
      if (existing) {
        return base44.entities.HomepageSettings.update(existing.id, { ...payload, updated_at: now });
      } else {
        return base44.entities.HomepageSettings.create({ ...payload, active: true, created_at: now, updated_at: now });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepageEditorialSettings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading editorial settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Editorial Overrides</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Override homepage buckets with specific records. Leave blank to use automatic data.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
          className="bg-[#232323] text-white h-8 gap-1.5"
        >
          {mutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>
      </div>

      {/* Mode controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <FieldRow label="Featured Entities Mode" hint="auto = live data only · manual = IDs below only · mixed = IDs first, then fill from live">
          <Select value={form.featured_entities_mode} onValueChange={v => set('featured_entities_mode', v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Activity Feed Mode" hint="Controls ticker source behavior">
          <Select value={form.activity_feed_mode} onValueChange={v => set('activity_feed_mode', v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>

      {/* Override IDs */}
      <div className="space-y-5 p-4 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Featured Record Overrides</h4>

        <FieldRow label="Featured Story ID" hint="Paste the OutletStory ID to pin a specific story">
          <Input
            value={form.featured_story_id}
            onChange={e => set('featured_story_id', e.target.value.trim())}
            placeholder="e.g. abc123"
            className="text-sm h-8 font-mono"
          />
        </FieldRow>

        <FieldRow label="Featured Driver IDs">
          <TagInput value={form.featured_driver_ids} onChange={v => set('featured_driver_ids', v)} placeholder="Paste a Driver ID…" />
        </FieldRow>

        <FieldRow label="Featured Track IDs">
          <TagInput value={form.featured_track_ids} onChange={v => set('featured_track_ids', v)} placeholder="Paste a Track ID…" />
        </FieldRow>

        <FieldRow label="Featured Series IDs">
          <TagInput value={form.featured_series_ids} onChange={v => set('featured_series_ids', v)} placeholder="Paste a Series ID…" />
        </FieldRow>

        <FieldRow label="Featured Event IDs">
          <TagInput value={form.featured_event_ids} onChange={v => set('featured_event_ids', v)} placeholder="Paste an Event ID…" />
        </FieldRow>

        <FieldRow label="Featured Media IDs">
          <TagInput value={form.featured_media_ids} onChange={v => set('featured_media_ids', v)} placeholder="Paste a MediaAsset ID…" />
        </FieldRow>

        <FieldRow label="Featured Product IDs">
          <TagInput value={form.featured_product_ids} onChange={v => set('featured_product_ids', v)} placeholder="Paste a Product ID…" />
        </FieldRow>
      </div>

      {/* Ticker */}
      <div className="space-y-3 p-4 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hero Ticker Items</h4>
        <p className="text-[11px] text-gray-400">Enter text labels to display in the homepage ticker. Leave empty to use live activity feed.</p>
        <TagInput
          value={form.hero_ticker_items}
          onChange={v => set('hero_ticker_items', v)}
          placeholder="e.g. RACE DAY AT DAYTONA"
        />
      </div>
    </div>
  );
}