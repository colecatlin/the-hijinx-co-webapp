import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import CTAEditor from '../../shared/CTAEditor';
import EntitySelector from '../../shared/EntitySelector';
import ScheduleControl from '../../shared/ScheduleControl';

export default function FromTheOutletSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  return (
    <SectionPanel
      title="6. From The Outlet"
      enabled={v.enabled ?? true}
      onEnabledChange={(val) => set('enabled', val)}
    >
      <SubSection label="Content">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Eyebrow</Label>
          <Input value={v.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Headline</Label>
          <Input value={v.headline || ''} onChange={(e) => set('headline', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Supporting tagline</Label>
          <Input value={v.supporting_tagline || ''} onChange={(e) => set('supporting_tagline', e.target.value)} className="h-8 text-xs" />
        </div>
      </SubSection>

      <SubSection label="CTA">
        <CTAEditor ctaLabel="View All CTA" value={v.view_all_cta} onChange={(val) => set('view_all_cta', val)} />
      </SubSection>

      <SubSection label="Data">
        <div className="flex items-center justify-between p-2 rounded-lg border border-divider">
          <div className="flex items-center gap-2">
            <Select value={v.lead_mode || 'auto'} onValueChange={(val) => set('lead_mode', val)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={v.lead_mode === 'auto' ? 'default' : 'secondary'} className="text-[9px]">{v.lead_mode === 'auto' ? 'Auto' : 'Pinned'}</Badge>
          </div>
          <span className="text-xs text-foreground-quiet">{v.lead_mode === 'auto' ? 'Auto-pick featured/most recent story' : 'Pin a specific lead story'}</span>
        </div>
        {v.lead_mode === 'pinned' && (
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Pinned lead story</Label>
            <EntitySelector entityType="OutletStory" mode="single" value={v.pinned_lead_story_id || ''} onChange={(id) => set('pinned_lead_story_id', id)} placeholder="Search published stories..." />
          </div>
        )}
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Secondary story count</Label>
          <Input type="number" min={0} max={6} value={v.secondary_story_count ?? 3} onChange={(e) => set('secondary_story_count', parseInt(e.target.value) || 3)} className="h-8 text-xs w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={v.category_rail_enabled ?? true} onCheckedChange={(val) => set('category_rail_enabled', val)} />
          <span className="text-xs text-foreground-quiet">Show category rail</span>
        </div>
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}